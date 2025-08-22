module.exports.config = {
    name: "antiout",
    eventType: ["log:unsubscribe"],
    version: "1.0.7",
    credits: "ProCoderMew",
    description: "Listen events",
    dependencies: {
        "path": ""
    }
};

module.exports.run = async function ({ api, event, Users }) {
  const fs = require("fs-extra");
  const { resolve } = require("path");
  const moment = require("moment-timezone");

  const path = resolve(__dirname, '../commands', 'data', 'antiout.json');
  const { logMessageData, author, threadID } = event;
  const leftId = String(logMessageData?.leftParticipantFbId || "");
  const botId = String(api.getCurrentUserID());

  // Chỉ xử lý khi tự rời (author == leftId) và không phải bot
  if (!leftId || String(author) !== leftId || leftId === botId) return;

  // Cooldown theo user để tránh spam (1 phút)
  if (!global.__antioutCooldown) global.__antioutCooldown = new Map();
  const key = `${threadID}:${leftId}`;
  const now = Date.now();
  const last = global.__antioutCooldown.get(key) || 0;
  if (now - last < 60 * 1000) return;

  try {
    // Đảm bảo file cấu hình tồn tại
    if (!(await fs.pathExists(path))) {
      await fs.ensureFile(path);
      await fs.writeJson(path, { antiout: {} }, { spaces: 2 });
    }
    let store = await fs.readJson(path).catch(() => ({ antiout: {} }));
    // Hỗ trợ cả 2 dạng: { antiout: {...} } hoặc { threadID: true }
    const enabled = store?.antiout?.[threadID] === true || store?.[threadID] === true;
    if (!enabled) return;

    // Whitelist: NDH/ADMINBOT không bị auto-add lại nếu họ tự rời
    const ndh = Array.isArray(global?.config?.NDH) ? global.config.NDH.map(String) : [];
    const adminbot = Array.isArray(global?.config?.ADMINBOT) ? global.config.ADMINBOT.map(String) : [];
    const whitelist = new Set([...ndh, ...adminbot, botId]);
    if (whitelist.has(leftId)) return;

    // Lấy tên an toàn
    let name = "Người dùng Facebook";
    try { name = await Users.getNameUser(leftId) || name; } catch (_) {}

    const timeNow = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");
    const fullYear = global?.client?.getTime ? global.client.getTime("fullYear") : moment().format("YYYY");

    try {
      await api.addUserToGroup(leftId, threadID);
      global.__antioutCooldown.set(key, now);
      return api.sendMessage(
        `[ ANTIOUT ]\n────────────────────\n⚠️ Bật chế độ tự động thêm lại khi tự rời nhóm\n🔰 Trạng thái: Thành công\n👤 Người dùng: ${name}\n⏰ Thời gian: ${timeNow} - ${fullYear}\n────────────────────\n⛔ Nếu thêm thất bại có thể do người dùng chặn bot hoặc cài đặt quyền riêng tư`,
        threadID,
        async (err, info) => {
          await new Promise(r => setTimeout(r, 60 * 1000));
          if (info?.messageID) api.unsendMessage(info.messageID);
        },
        event.messageID
      );
    } catch (e) {
      global.__antioutCooldown.set(key, now);
      return api.sendMessage(
        `[ ANTIOUT ]\n────────────────────\n⚠️ Bật chế độ tự động thêm lại khi tự rời nhóm\n🔰 Trạng thái: Thất bại\n👤 Người dùng: ${name}\n⏰ Thời gian: ${timeNow} - ${fullYear}\n────────────────────\n⛔ Có thể do người dùng chặn bot hoặc cài đặt quyền riêng tư`,
        threadID,
        async (err, info) => {
          await new Promise(r => setTimeout(r, 60 * 1000));
          if (info?.messageID) api.unsendMessage(info.messageID);
        },
        event.messageID
      );
    }
  } catch (error) {
    const logger = require("../../utils/log");
    logger(`AntiOut error: ${error?.message || error}`, "[ EVENT ]");
  }
};