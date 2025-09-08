module.exports.config = {
  name: "cleancache",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "Cascade",
  description: "Dọn dẹp thư mục cache của commands để tiết kiệm dung lượng",
  commandCategory: "Admin",
  usages: "[run|dry] [days=<số ngày>] [max=<MB>]",
  cooldowns: 5,
  dependencies: {
    "fs-extra": "",
    "path": ""
  }
};

const fs = require('fs-extra');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'cache');
const DEFAULT_DAYS = 7;           // Xóa file cũ hơn 7 ngày
const DEFAULT_MAX_MB = 200;       // Tổng dung lượng tối đa 200MB

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  for await (const file of walk(root)) files.push(file);
  return files;
}

module.exports.run = async function({ api, event, args }) {
  try {
    const { threadID } = event;
    const now = Date.now();

    // Parse args
    const isDry = args.includes('dry');
    const isRun = args.includes('run');

    let daysArg = args.find(a => a.startsWith('days='));
    let maxArg = args.find(a => a.startsWith('max='));

    const days = daysArg ? Math.max(0, parseInt(daysArg.split('=')[1], 10) || DEFAULT_DAYS) : DEFAULT_DAYS;
    const maxMB = maxArg ? Math.max(1, parseInt(maxArg.split('=')[1], 10) || DEFAULT_MAX_MB) : DEFAULT_MAX_MB;

    const olderThanMs = days * 24 * 60 * 60 * 1000;
    const maxBytes = maxMB * 1024 * 1024;

    if (!await fs.pathExists(CACHE_DIR)) {
      return api.sendMessage("✅ Thư mục cache hiện không tồn tại hoặc đã trống.", threadID);
    }

    // Thu thập thông tin file
    const files = await getFilesRecursively(CACHE_DIR);

    const meta = await Promise.all(files.map(async f => {
      const stat = await fs.stat(f);
      return { path: f, size: stat.size, mtime: stat.mtimeMs };
    }));

    const zeroByte = meta.filter(m => m.size === 0);
    const tooOld = meta.filter(m => now - m.mtime > olderThanMs);

    // Danh sách ứng viên xóa: zero-byte U union old files, unique
    const candidatesSet = new Set([...zeroByte.map(m => m.path), ...tooOld.map(m => m.path)]);
    let candidates = [...candidatesSet].map(p => meta.find(m => m.path === p));

    // Tổng dung lượng trước khi xóa
    const totalBefore = meta.reduce((s, m) => s + m.size, 0);

    // Nếu vẫn vượt quá limit sau khi xóa ứng viên, tiếp tục xóa file cũ nhất đến khi đạt ngưỡng
    // Chuẩn bị danh sách file còn lại (không nằm trong candidates)
    const remaining = meta.filter(m => !candidatesSet.has(m.path)).sort((a, b) => a.mtime - b.mtime); // cũ -> mới

    let willDelete = [...candidates];

    // Tính tổng sau khi xóa ứng viên
    let totalAfterCandidates = totalBefore - willDelete.reduce((s, m) => s + (m?.size || 0), 0);

    // Nếu vẫn lớn hơn maxBytes, xóa thêm từ file cũ nhất
    let idx = 0;
    while (totalAfterCandidates > maxBytes && idx < remaining.length) {
      willDelete.push(remaining[idx]);
      totalAfterCandidates -= remaining[idx].size;
      idx++;
    }

    const uniqueDelete = Array.from(new Set(willDelete.map(m => m.path))).map(p => willDelete.find(m => m.path === p));
    const bytesToDelete = uniqueDelete.reduce((s, m) => s + (m?.size || 0), 0);

    if (isDry || !isRun) {
      const summary = [];
      summary.push(`• Chế độ: ${isDry ? 'Dry-run' : 'Preview'}`);
      summary.push(`• Ngưỡng ngày: > ${days} ngày`);
      summary.push(`• Giới hạn dung lượng: ${maxMB} MB`);
      summary.push(`• Tổng số file: ${meta.length}`);
      summary.push(`• Dung lượng hiện tại: ${formatBytes(totalBefore)}`);
      summary.push(`• Số file 0 byte: ${zeroByte.length}`);
      summary.push(`• Số file quá ${days} ngày: ${tooOld.length}`);
      summary.push(`• Số file dự kiến xóa: ${uniqueDelete.length}`);
      summary.push(`• Dung lượng dự kiến giải phóng: ${formatBytes(bytesToDelete)}`);
      summary.push(`• Dung lượng ước tính sau dọn: ${formatBytes(totalAfterCandidates)}`);

      return api.sendMessage(
        `DỌN CACHE (Xem trước)\n\n${summary.join('\n')}\n\nDùng: ${global.config.PREFIX}cleancache run days=${days} max=${maxMB} để thực thi`,
        threadID
      );
    }

    // Thực thi xóa
    for (const file of uniqueDelete) {
      try { await fs.remove(file.path); } catch {}
    }

    // Cố gắng xóa thư mục rỗng còn lại
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
      await pruneEmptyDirs(CACHE_DIR);
    } catch {}

    return api.sendMessage(
      `✅ Đã dọn dẹp cache\n• Đã xóa: ${uniqueDelete.length} file\n• Giải phóng: ${formatBytes(bytesToDelete)}\n• Dung lượng còn lại ước tính: ${formatBytes(totalAfterCandidates)}`,
      threadID
    );
  } catch (e) {
    console.error('[cleancache] error:', e);
    return api.sendMessage('❎ Đã xảy ra lỗi khi dọn dẹp cache', event.threadID);
  }
};
