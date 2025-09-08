module.exports.config = {
  name: "cleandata",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "Cascade",
  description: "Dọn dẹp thư mục dữ liệu của commands để gọn nhẹ và ổn định",
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

const DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_DAYS = 30;          // Xóa file cũ hơn 30 ngày (dữ liệu lâu đời)
const DEFAULT_MAX_MB = 50;        // Tổng dung lượng tối đa 50MB (nhỏ gọn, vì chủ yếu JSON)

// Một số file quan trọng KHÔNG nên xóa mặc định
const DEFAULT_EXCLUDES = [
  'thuebot.json',
  'rules.json',
  'leaderboard.json',
  'commands-banned.json',
  'approvedThreads.json',
  'gojo_state.json'
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
    // hỗ trợ wildcard đơn giản: *.json, prefix*, *suffix
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
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}

async function getFilesRecursively(root) {
  const files = [];
  if (!await fs.pathExists(root)) return files;
  for await (const file of walk(root)) files.push(file);
  return files;
}

module.exports.run = async function({ api, event, args }) {
  try {
    const { threadID } = event;
    const now = Date.now();

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

    if (!await fs.pathExists(DATA_DIR)) {
      return api.sendMessage("✅ Thư mục data hiện không tồn tại hoặc đã trống.", threadID);
    }

    const files = await getFilesRecursively(DATA_DIR);

    const meta = await Promise.all(files.map(async f => {
      const stat = await fs.stat(f);
      return { path: f, base: path.basename(f), size: stat.size, mtime: stat.mtimeMs };
    }));

    // Loại trừ file theo danh sách exclude
    const filtered = meta.filter(m => !anyMatch(m.base, excludes));

    const zeroByte = filtered.filter(m => m.size === 0);
    const tooOld = filtered.filter(m => now - m.mtime > olderThanMs);

    const candidatesSet = new Set([...zeroByte.map(m => m.path), ...tooOld.map(m => m.path)]);
    let candidates = [...candidatesSet].map(p => filtered.find(m => m.path === p));

    const totalBefore = filtered.reduce((s, m) => s + m.size, 0);

    // Nếu vượt limit sau khi xóa ứng viên, xóa thêm file cũ đến khi đạt ngưỡng
    const remaining = filtered.filter(m => !candidatesSet.has(m.path)).sort((a, b) => a.mtime - b.mtime);

    let willDelete = [...candidates];
    let totalAfterCandidates = totalBefore - willDelete.reduce((s, m) => s + (m?.size || 0), 0);

    let idx = 0;
    while (totalAfterCandidates > maxBytes && idx < remaining.length) {
      willDelete.push(remaining[idx]);
      totalAfterCandidates -= remaining[idx].size;
      idx++;
    }

    const uniqueDelete = Array.from(new Set(willDelete.map(m => m.path))).map(p => willDelete.find(m => m.path === p));
    const bytesToDelete = uniqueDelete.reduce((s, m) => s + (m?.size || 0), 0);

    // Báo cáo
    const summary = [];
    summary.push(`• Chế độ: ${isDry || !isRun ? (isDry ? 'Dry-run' : 'Preview') : 'Run'}`);
    summary.push(`• Ngưỡng ngày: > ${days} ngày`);
    summary.push(`• Giới hạn dung lượng: ${maxMB} MB`);
    summary.push(`• Số file (đã loại trừ): ${filtered.length}`);
    summary.push(`• Dung lượng hiện tại: ${formatBytes(totalBefore)}`);
    summary.push(`• Exclude: ${excludes.join(', ') || 'Không'}`);
    summary.push(`• File 0 byte: ${zeroByte.length}`);
    summary.push(`• File quá ${days} ngày: ${tooOld.length}`);
    summary.push(`• Số file dự kiến xóa: ${uniqueDelete.length}`);
    summary.push(`• Dự kiến giải phóng: ${formatBytes(bytesToDelete)}`);
    summary.push(`• Ước tính còn lại: ${formatBytes(totalAfterCandidates)}`);

    if (isDry || !isRun) {
      return api.sendMessage(
        `DỌN DATA (Xem trước)\n\n${summary.join('\n')}\n\nDùng: ${global.config.PREFIX}cleandata run days=${days} max=${maxMB} để thực thi`,
        threadID
      );
    }

    // Thực thi xóa
    for (const file of uniqueDelete) {
      try { await fs.remove(file.path); } catch {}
    }

    // Xóa thư mục rỗng còn lại nếu có
    try {
      const pruneEmptyDirs = async (dir) => {
        const entries = await fs.readdir(dir);
        if (entries.length === 0) return fs.remove(dir);
        await Promise.all(entries.map(async e => {
          const p = path.join(dir, e);
          const st = await fs.stat(p);
          if (st.isDirectory()) await pruneEmptyDirs(p);
        }));
      };
      await pruneEmptyDirs(DATA_DIR);
    } catch {}

    return api.sendMessage(
      `✅ Đã dọn dẹp data\n• Đã xóa: ${uniqueDelete.length} file\n• Giải phóng: ${formatBytes(bytesToDelete)}\n• Dung lượng còn lại ước tính: ${formatBytes(totalAfterCandidates)}`,
      threadID
    );
  } catch (e) {
    console.error('[cleandata] error:', e);
    return api.sendMessage('❎ Đã xảy ra lỗi khi dọn dẹp data', event.threadID);
  }
};
