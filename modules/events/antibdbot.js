module.exports.config = {
  name: "antibdbot",
  eventType: ["log:user-nickname"],
  version: "0.0.1",
  credits: "ProCoderCyrus",
  description: "Chống đổi biệt danh của Bot"
};

module.exports.run = async function({ api, event, Users, Threads }) {
  const { logMessageData, threadID, author } = event;
  const botID = String(api.getCurrentUserID());

  // Chỉ xử lý khi đích danh participant là bot và không phải do bot thực hiện
  if (String(logMessageData?.participant_id || "") !== botID) return;
  if (String(author) === botID) return;

  // Whitelist NDH/ADMINBOT
  const ndh = Array.isArray(global?.config?.NDH) ? global.config.NDH.map(String) : [];
  const adminbot = Array.isArray(global?.config?.ADMINBOT) ? global.config.ADMINBOT.map(String) : [];
  if ([...ndh, ...adminbot].includes(String(author))) return;

  // Kiểm tra cấu hình bật/tắt theo thread
  try {
    const fs = require("fs-extra");
    const { resolve } = require("path");
    const path = resolve(__dirname, '../commands', 'data', 'antibdbot.json');
    if (!(await fs.pathExists(path))) {
      // Chưa có file => coi như tắt
      return;
    }
    const store = await fs.readJson(path).catch(() => ({}));
    const enabled = store?.antibdbot?.[threadID] === true || store?.[threadID] === true;
    if (!enabled) return;
  } catch (_) { /* lỗi đọc cấu hình => an toàn bỏ qua */ return; }

  // Debounce để tránh vòng lặp (30s mỗi thread)
  const COOLDOWN_MS = 30 * 1000;
  if (!global.__antibdbotCooldown) global.__antibdbotCooldown = new Map();
  const last = global.__antibdbotCooldown.get(threadID) || 0;
  const now = Date.now();
  if (now - last < COOLDOWN_MS) return;

  try {
    // Lấy prefix từ thread settings, fallback global
    let threadSetting = {};
    try {
      const data = await Threads.getData(String(threadID));
      threadSetting = data?.data || {};
    } catch (_) { threadSetting = {}; }
    const prefix = threadSetting?.PREFIX || global?.config?.PREFIX || "!";
    const desiredNickname = `『 ${prefix} 』 ⪼ ${global?.config?.BOTNAME || "Bot"}`;

    // Lấy nickname hiện tại của bot trong nhóm
    let currentNick = global?.config?.BOTNAME || "Bot";
    try {
      const info = await api.getThreadInfo(threadID);
      currentNick = info?.nicknames?.[botID] || currentNick;
    } catch (_) {}

    // Nếu nickname đã đúng hoặc logMessageData.nickname đã bằng desired => bỏ qua
    if (currentNick === desiredNickname || String(logMessageData?.nickname || "") === desiredNickname) return;

    // Chỉ đổi khi có sự khác biệt
    await api.changeNickname(desiredNickname, threadID, botID);
    global.__antibdbotCooldown.set(threadID, now);

    // Thông báo ngắn gọn (không spam)
    return api.sendMessage("⚠️ Đã khôi phục biệt danh của Bot theo cấu hình.", threadID);
  } catch (error) {
    const logger = require("../../utils/log");
    logger(`AntiBDBot error: ${error?.message || error}`, "[ EVENT ]");
  }
}