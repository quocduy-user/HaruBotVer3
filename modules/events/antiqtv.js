const fs = require("fs-extra");
const { resolve } = require("path");

module.exports.config = {
    name: "antiqtv",
    eventType: ["log:thread-admins"],
    version: "1.0.0",
    credits: "DongDev",
    description: "Ngăn chặn việc thay đổi admin",
};


module.exports.run = async function ({ event, api }) {
  const { logMessageType, logMessageData, author, threadID } = event;
  const botID = api.getCurrentUserID();
  // Bỏ qua nếu bot là tác giả sự kiện
  if (String(author) === String(botID)) return;

  // Debounce để tránh vòng lặp chỉnh quyền (30s mỗi thread)
  const COOLDOWN_MS = 30 * 1000;
  if (!global.__antiqtvCooldown) global.__antiqtvCooldown = new Map();
  const last = global.__antiqtvCooldown.get(threadID) || 0;
  const now = Date.now();
  const withinCooldown = now - last < COOLDOWN_MS;

  const path = resolve(__dirname, '../commands', 'data', 'antiqtv.json');

  try {
    // Đảm bảo file config tồn tại
    if (!await fs.pathExists(path)) {
      await fs.ensureFile(path);
      await fs.writeJson(path, {}, { spaces: 2 });
    }
    let dataA = {};
    try { dataA = await fs.readJson(path); } catch (_) { dataA = {}; }

    const enabled = dataA && dataA[threadID] === true;
    if (!enabled) return;

    if (logMessageType !== "log:thread-admins") return;
    const eventType = logMessageData?.ADMIN_EVENT; // add_admin | remove_admin
    const targetId = String(logMessageData?.TARGET_ID || "");
    if (!eventType || !targetId) return;

    // Whitelist: NDH/ADMINBOT không bị can thiệp
    const ndh = Array.isArray(global?.config?.NDH) ? global.config.NDH.map(String) : [];
    const adminbot = Array.isArray(global?.config?.ADMINBOT) ? global.config.ADMINBOT.map(String) : [];
    const whitelist = new Set([...ndh, ...adminbot, String(botID)]);
    if (whitelist.has(String(author))) return; // Bỏ qua nếu người thực hiện thuộc whitelist

    // Không can thiệp nếu mục tiêu là bot
    if (String(targetId) === String(botID)) return;

    if (withinCooldown) {
      // Trong cooldown, chỉ thông báo nhẹ nếu cần
      return; 
    }

    // Thực hiện hoàn tác thay đổi quyền
    if (eventType === "remove_admin") {
      // Gỡ quyền người thực hiện và thêm lại quyền cho target
      await api.changeAdminStatus(threadID, author, false);
      await api.changeAdminStatus(threadID, targetId, true);
      api.sendMessage("» AntiQTV: Đã khôi phục quyền admin cho thành viên vừa bị gỡ và thu hồi quyền của người thực hiện.", threadID);
    } else if (eventType === "add_admin") {
      // Thu hồi quyền của người thêm và người được thêm
      await api.changeAdminStatus(threadID, author, false);
      await api.changeAdminStatus(threadID, targetId, false);
      api.sendMessage("» AntiQTV: Đã thu hồi quyền admin được thêm trái phép và quyền của người thực hiện.", threadID);
    }

    // Đặt cooldown
    global.__antiqtvCooldown.set(threadID, now);
  } catch (error) {
    const logger = require("../../utils/log");
    logger(`AntiQTV error: ${error?.message || error}`, "[ EVENT ]");
  }
};
