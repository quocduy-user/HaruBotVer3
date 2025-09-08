module.exports.config = {
    "name": "sendnoti",
    "version": "1.1.1",
    "hasPermssion": 2,
    "credits": "Niiozic",
    "description": "Gửi tin nhắn đến tất cả nhóm và reply để phản hồi",
    "commandCategory": "Admin",
    "usages": "[ Nội dung ]",
    "cooldowns": 0
};
const request = require("request");
const fse = require("fs-extra");
const imageDownload = require("image-downloader");
const moment = require("moment-timezone");
const path = require("path");

const fullTime = () => moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || DD/MM/YYYY");

module.exports.run = async ({ api, event, Users, Threads }) => {
  const { threadID: tid, messageID: mid, senderID: sid } = event;
  const args = Array.isArray(event.args) ? event.args : (event.body ? event.body.trim().split(/\s+/) : []);
  const atms = Array.isArray(event.attachments) ? event.attachments : [];
  const mR = event.messageReply;
  const type = event.type;

  const allTid = global.data.allThreadID || [];

  const attachments = (type === "message_reply" && mR && Array.isArray(mR.attachments) && mR.attachments.length > 0)
    ? mR.attachments
    : (atms.length > 0 ? atms : []);

  const content = args.length > 1 ? args.slice(1).join(" ") : (attachments.length ? "chỉ có tệp" : "");

  if (!content && attachments.length === 0) {
    return api.sendMessage(`⚠️ Vui lòng sử dụng như sau:\n${global.config.PREFIX}sendnoti + ND cần gửi\nVí dụ: ${global.config.PREFIX}sendnoti Alo`, tid, mid);
  }

  let currentThreadName = "";
  try {
    const info = global.data.threadInfo.get(tid) || (await Threads.getData(tid)).threadInfo || {};
    currentThreadName = info.threadName || "(không xác định)";
  } catch {
    currentThreadName = "(không xác định)";
  }

  const adminName = (await Users.getData(sid))?.name || "Admin";

  const header = `[ Thông Báo Admin ]`;
  const bodyMsg = `\n\n👤 Từ Admin: ${adminName}\n🔗 Link: https://www.facebook.com/profile.php?id=${event.senderID}\n🏘️ Nơi gửi: ${event.isGroup ? 'Nhóm ' + currentThreadName : 'từ cuộc trò chuyện riêng với bot '}\n⏰ Time: ${fullTime()}\n📝 Nội dung: ${content}`;

  const msgText = header + bodyMsg;
  const files = attachments.length ? await DownLoad(attachments) : [];
  const messagePayload = files.length ? { body: msgText, attachment: files } : msgText;

  const CONCURRENCY = 5;
  let cSuccess = 0, cFail = 0;

  async function sendOne(threadId) {
    return new Promise((resolve) => {
      api.sendMessage(messagePayload, threadId, (e, i) => {
        if (e) { cFail++; return resolve(false); }
        cSuccess++;
        // Bỏ cơ chế reply: không đăng ký handleReply nữa
        resolve(true);
      });
    });
  }

  for (let i = 0; i < allTid.length; i += CONCURRENCY) {
    const chunk = allTid.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(id => sendOne(id)));
  }

  return api.sendMessage(`✅ Đã gửi thông báo. Thành công: ${cSuccess}, thất bại: ${cFail}`, tid, mid);
};

// Bỏ hoàn toàn cơ chế reply: không còn define handleReply

const DownLoad = async (atm) => {
  const out = [];
  for (let i = 0; i < atm.length; i++) {
    const nameUrl = request.get(atm[i].url).uri.pathname;
    const namefile = atm[i].type !== "audio" ? nameUrl : nameUrl.replace(/\.mp4/g, ".m4a");
    const fileName = namefile.slice(namefile.lastIndexOf("/") + 1);
    const filePath = path.join(__dirname, "cache", fileName);
    await imageDownload.image({ url: atm[i].url, dest: filePath });
    const stream = fse.createReadStream(filePath);
    stream.on('close', () => { try { fse.unlinkSync(filePath); } catch {} });
    out.push(stream);
  }
  return out;
};