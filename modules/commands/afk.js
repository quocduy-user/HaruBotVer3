module.exports.config = {
  name: "afk",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "D-Jukie • improved by Cascade",
  description: "Bật/tắt AFK với lý do, lưu lại ai đã tag bạn khi vắng mặt",
  commandCategory: "Box",
  usages: "afk [on|off|list] [lý do]",
  cooldowns: 5,
  dependencies: {
    "fs-extra": "",
    "path": "",
    "moment-timezone": ""
  }
};

const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');

const DATA_FILE = path.join(__dirname, 'data', 'afk.json');
// Chống spam thông báo khi tag người AFK
const NOTIFY_COOLDOWN_MS = 2 * 60 * 1000; // 2 phút giữa các lần thông báo từ cùng một người
const NOTIFY_MAX_PER_USER = 3;            // tối đa 3 lần thông báo cho mỗi người trong 1 phiên AFK

function nowVN() { return Date.now(); }
function fmtTime(ts) { return moment(ts).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY'); }

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || {};
  } catch { return {}; }
}
function saveData(db) {
  try { fs.outputFileSync(DATA_FILE, JSON.stringify(db, null, 2)); } catch {}
}

module.exports.onLoad = () => {
  try { if (!fs.existsSync(DATA_FILE)) saveData({}); } catch {}
};

module.exports.run = async ({ event, api, args, Users }) => {
  const { threadID, messageID, senderID } = event;
  const db = loadData();
  db[threadID] = db[threadID] || [];

  const sub = (args[0] || '').toLowerCase();
  if (sub === 'off') {
    const idx = db[threadID].findIndex(x => x.uid == senderID);
    if (idx === -1) return api.sendMessage('⚠️ Bạn chưa bật AFK.', threadID, messageID);
    const entry = db[threadID][idx];
    db[threadID].splice(idx, 1);
    saveData(db);
    let msg = `✅ Đã tắt AFK cho bạn.\n`;
    msg += `🕒 Từ: ${fmtTime(entry.since)}\n`;
    msg += `📌 Lý do: ${entry.reason}\n`;
    msg += `🔔 Có ${entry.mentions.length} lượt tag khi bạn AFK.`;
    if (entry.mentions.length) {
      const lines = await Promise.all(entry.mentions.map(async m => `• ${(await Users.getNameUser(m.uid)) || m.uid}: ${m.body || '(không có nội dung)'}`));
      msg += `\n\n${lines.join('\n')}`;
    }
    return api.sendMessage(msg, threadID, messageID);
  }
  if (sub === 'list') {
    if (!db[threadID].length) return api.sendMessage('📭 Nhóm hiện không có ai AFK.', threadID, messageID);
    const lines = await Promise.all(db[threadID].map(async (e, i) => `#${i + 1} ${await Users.getNameUser(e.uid) || e.uid}\n- Lý do: ${e.reason}\n- Từ: ${fmtTime(e.since)}\n- Bị tag: ${e.mentions.length} lần`));
    return api.sendMessage(`📋 Danh sách AFK (${db[threadID].length})\n\n${lines.join('\n\n')}`, threadID, messageID);
  }

  // Bật AFK
  const reason = (sub === 'on' ? args.slice(1) : args).join(' ').trim() || 'Không có lý do';
  if (db[threadID].some(x => x.uid == senderID)) return api.sendMessage('⚠️ Bạn đã bật AFK rồi. Dùng "afk off" để tắt.', threadID, messageID);
  db[threadID].push({ uid: senderID, reason, since: nowVN(), mentions: [] });
  saveData(db);
  return api.sendMessage(`✅ Đã bật AFK!\n📌 Lý do: ${reason}`, threadID, messageID);
};

module.exports.handleEvent = async function({ event, api, Users }) {
  const { threadID, messageID, senderID, body, mentions } = event;
  if (!body) return;
  const db = loadData();
  const list = db[threadID] || [];

  // Nếu người đang AFK gửi tin → tắt AFK tự động và báo tóm tắt
  const meIdx = list.findIndex(x => x.uid == senderID);
  if (meIdx !== -1) {
    const entry = list[meIdx];
    list.splice(meIdx, 1);
    db[threadID] = list; saveData(db);
    let msg = `👋 Chào mừng bạn trở lại! AFK đã tắt.\n`;
    msg += `🕒 Từ: ${fmtTime(entry.since)}\n`;
    msg += `📌 Lý do: ${entry.reason}\n`;
    msg += `🔔 Có ${entry.mentions.length} lượt tag trong lúc bạn AFK.`;
    if (entry.mentions.length) {
      const lines = await Promise.all(entry.mentions.map(async m => `• ${(await Users.getNameUser(m.uid)) || m.uid}: ${m.body || '(không có nội dung)'}`));
      msg += `\n\n${lines.join('\n')}`;
    }
    return api.sendMessage(msg, threadID, messageID);
  }

  // Nếu tag người đang AFK → thông báo
  const taggedIds = Object.keys(mentions || {});
  if (taggedIds.length) {
    for (const uid of taggedIds) {
      const target = list.find(x => x.uid == uid);
      if (target) {
        try {
          // Kiểm tra chống spam: cooldown và giới hạn số lần
          const now = Date.now();
          const history = target.mentions.filter(m => m.uid == senderID).sort((a,b)=> (b.time||0)-(a.time||0));
          const last = history[0];
          const tooSoon = last && last.time && (now - last.time < NOTIFY_COOLDOWN_MS);
          const overLimit = history.length >= NOTIFY_MAX_PER_USER;

          // Luôn ghi nhận mention để tổng kết, nhưng chỉ gửi thông báo nếu không vi phạm hạn chế
          target.mentions.push({ uid: senderID, body, time: now });
          saveData(db);

          if (tooSoon || overLimit) continue;

          const name = (await Users.getNameUser(uid)) || 'Người dùng';
          api.sendMessage(`📴 ${name} hiện đang AFK\n📌 Lý do: ${target.reason}\n🕒 Từ: ${fmtTime(target.since)}`, threadID, messageID);
        } catch {}
      }
    }
  }
};