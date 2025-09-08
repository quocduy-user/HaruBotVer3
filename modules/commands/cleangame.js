module.exports.config = {
  name: "cleangame",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "Cascade",
  description: "Dọn gọn thư mục game: xóa file 0 byte, thư mục rỗng, file cũ; giới hạn tổng dung lượng; hỗ trợ exclude",
  commandCategory: "Admin",
  usages: "[run|dry] [days=<số ngày>] [max=<MB>] [exclude=<pattern1,pattern2,...>]",
  cooldowns: 5,
  dependencies: {
    "fs-extra": "",
    "path": ""
  }
};

const fs = require('fs-extra');
const path = require('path');

const GAME_DIR = path.join(__dirname, 'game');
const DEFAULT_DAYS = 30;    // xóa file cũ hơn 30 ngày
const DEFAULT_MAX_MB = 200; // tổng dung lượng tối đa 200MB

// Loại trừ mặc định: dữ liệu game quan trọng thường dùng
const DEFAULT_EXCLUDES = [
  'farmData.json',
  'farmGameData.json',
  'userInventories.json',
  'fishInventories.json',
  'dientu.json',
  'taixiu.json',
  'taixiu_history.json',
  'taixiu_jackpot.json',
  'xoso_data.json'
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function anyMatch(basename, patterns) {
  return patterns.some(p => {
    if (p === basename) return true;
    if (p.startsWith('*.')) return basename.endsWith(p.slice(1));
    if (p.endsWith('*')) return basename.startsWith(p.slice(0, -1));
    if (p.startsWith('*')) return basename.endsWith(p.slice(1));
    return false;
  });
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield { path: fullPath, isDir: true };
      yield* walk(fullPath);
    } else {
      yield { path: fullPath, isDir: false };
    }
  }
}

async function getEntriesRecursively(root) {
  const items = [];
  if (!await fs.pathExists(root)) return items;
  for await (const item of walk(root)) items.push(item);
  return items;
}

module.exports.run = async function({ api, event, args }) {
  try {
    const { threadID } = event;

    const isDry = args.includes('dry');
    const isRun = args.includes('run');
    let daysArg = args.find(a => a.startsWith('days='));
    let maxArg = args.find(a => a.startsWith('max='));
    let excludeArg = args.find(a => a.startsWith('exclude='));

    const days = daysArg ? Math.max(0, parseInt(daysArg.split('=')[1], 10) || DEFAULT_DAYS) : DEFAULT_DAYS;
    const maxMB = maxArg ? Math.max(1, parseInt(maxArg.split('=')[1], 10) || DEFAULT_MAX_MB) : DEFAULT_MAX_MB;

    const olderThanMs = days * 24 * 60 * 60 * 1000;
    const maxBytes = maxMB * 1024 * 1024;

    const extraExcludes = excludeArg ? excludeArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean) : [];
    const excludes = [...DEFAULT_EXCLUDES, ...extraExcludes];

    if (!await fs.pathExists(GAME_DIR)) {
      return api.sendMessage("✅ Thư mục game hiện không tồn tại hoặc đã trống.", threadID);
    }

    const entries = await getEntriesRecursively(GAME_DIR);
    const files = entries.filter(e => !e.isDir);

    const meta = await Promise.all(files.map(async f => {
      const stat = await fs.stat(f.path);
      return { path: f.path, base: path.basename(f.path), size: stat.size, mtime: stat.mtimeMs };
    }));

    // Loại trừ file quan trọng
    const filtered = meta.filter(m => !anyMatch(m.base, excludes));

    // Tìm file 0 byte và file quá ngày
    const now = Date.now();
    const zeroByte = filtered.filter(m => m.size === 0);
    const tooOld = filtered.filter(m => now - m.mtime > olderThanMs);

    const candidatesSet = new Set([...zeroByte.map(m => m.path), ...tooOld.map(m => m.path)]);
    let candidates = [...candidatesSet].map(p => filtered.find(m => m.path === p));

    const totalBefore = filtered.reduce((s, m) => s + m.size, 0);

    // Nếu vẫn vượt giới hạn, xóa thêm file cũ nhất đến khi đạt ngưỡng
    const remaining = filtered.filter(m => !candidatesSet.has(m.path)).sort((a, b) => a.mtime - b.mtime);

    let willDelete = [...candidates];
    let totalAfterCandidates = totalBefore - willDelete.reduce((s, m) => s + (m?.size || 0), 0);

    let idx = 0;
    while (totalAfterCandidates > maxBytes && idx < remaining.length) {
      willDelete.push(remaining[idx]);
      totalAfterCandidates -= remaining[idx].size;
      idx++;
    }

    const uniqueDeleteFiles = Array.from(new Set(willDelete.map(m => m.path))).map(p => willDelete.find(m => m.path === p));
    const bytesToDelete = uniqueDeleteFiles.reduce((s, m) => s + (m?.size || 0), 0);

    // Thư mục rỗng: liệt kê sau khi dự kiến xóa file
    async function listEmptyDirs(root) {
      const dirs = entries.filter(e => e.isDir).map(d => d.path).sort((a, b) => b.length - a.length); // con trước
      const empties = [];
      for (const d of dirs) {
        try {
          const list = await fs.readdir(d);
          // Giả định các file dự kiến xóa sẽ biến mất → xem d như rỗng nếu (list - toDeleteInThisDir) = 0
          const stillHas = list.filter(name => !uniqueDeleteFiles.some(f => path.dirname(f.path) === d && path.basename(f.path) === name));
          if (stillHas.length === 0) empties.push(d);
        } catch {}
      }
      return empties;
    }

    const emptyDirs = await listEmptyDirs(GAME_DIR);

    // Báo cáo (xem trước)
    const summary = [];
    summary.push(`• Chế độ: ${isDry || !isRun ? (isDry ? 'Dry-run' : 'Preview') : 'Run'}`);
    summary.push(`• Ngưỡng ngày: > ${days} ngày`);
    summary.push(`• Giới hạn dung lượng: ${maxMB} MB`);
    summary.push(`• Số file (đã loại trừ): ${filtered.length}`);
    summary.push(`• Dung lượng hiện tại: ${formatBytes(totalBefore)}`);
    summary.push(`• Exclude: ${excludes.join(', ') || 'Không'}`);
    summary.push(`• File 0 byte: ${zeroByte.length}`);
    summary.push(`• File quá ${days} ngày: ${tooOld.length}`);
    summary.push(`• File dự kiến xóa: ${uniqueDeleteFiles.length}`);
    summary.push(`• Dự kiến giải phóng: ${formatBytes(bytesToDelete)}`);
    summary.push(`• Ước tính còn lại: ${formatBytes(totalAfterCandidates)}`);
    summary.push(`• Thư mục rỗng dự kiến xóa: ${emptyDirs.length}`);

    if (isDry || !isRun) {
      return api.sendMessage(
        `DỌN GAME (Xem trước)\n\n${summary.join('\n')}\n\nDùng: ${global.config.PREFIX}cleangame run days=${days} max=${maxMB} để thực thi`,
        threadID
      );
    }

    // Thực thi xóa file
    for (const file of uniqueDeleteFiles) {
      try { await fs.remove(file.path); } catch {}
    }

    // Xóa thư mục rỗng (từ sâu lên)
    for (const dir of emptyDirs) {
      try { await fs.remove(dir); } catch {}
    }

    return api.sendMessage(
      `✅ Đã dọn gọn thư mục game\n• Đã xóa: ${uniqueDeleteFiles.length} file\n• Giải phóng: ${formatBytes(bytesToDelete)}\n• Thư mục rỗng đã xóa: ${emptyDirs.length}\n• Dung lượng còn lại ước tính: ${formatBytes(totalAfterCandidates)}`,
      threadID
    );
  } catch (e) {
    console.error('[cleangame] error:', e);
    return api.sendMessage('❎ Đã xảy ra lỗi khi dọn game', event.threadID);
  }
};
