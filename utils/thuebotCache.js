const fs = require('fs');
const path = require('path');

// Path tới file thuê bot
const THUEBOT_PATH = path.resolve(process.cwd(), 'modules/commands/data/thuebot.json');

let cache = [];
let lastLoaded = 0;
const RELOAD_INTERVAL_MS = 5 * 60 * 1000; // 5 phút

function safeLoad() {
  try {
    const raw = fs.readFileSync(THUEBOT_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      cache = data;
      lastLoaded = Date.now();
    } else {
      cache = [];
    }
  } catch {
    cache = [];
  }
}

function lazyReload() {
  if (Date.now() - lastLoaded > RELOAD_INTERVAL_MS) {
    safeLoad();
  }
}

// Theo dõi file để cập nhật cache ngay khi thay đổi (nếu có)
try {
  fs.watchFile(THUEBOT_PATH, { interval: 2000 }, () => safeLoad());
} catch {}

// Tải lần đầu
safeLoad();

function isThreadRented(threadID) {
  lazyReload();
  return cache.find((e) => String(e.t_id) === String(threadID)) || null;
}

module.exports = {
  isThreadRented,
  _debug: () => ({ cache, lastLoaded })
};
