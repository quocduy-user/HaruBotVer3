const fs = require("fs-extra");
const { join } = require("path");

module.exports.config = {
  name: "antiqtv",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "Cascade",
  description: "Bật/tắt chế độ chống thay đổi admin cho từng nhóm",
  commandCategory: "QTV",
  usages: "[on|off|toggle|status]",
  cooldowns: 3
};

const DATA_PATH = join(__dirname, "data", "antiqtv.json");

async function ensureFile() {
  if (!(await fs.pathExists(DATA_PATH))) {
    await fs.ensureDir(join(__dirname, "data"));
    await fs.writeJson(DATA_PATH, {}, { spaces: 2 });
  }
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const sub = (args[0] || "").toLowerCase();

  try {
    await ensureFile();
    let store = await fs.readJson(DATA_PATH).catch(() => ({}));
    const current = !!store[threadID];

    if (["on", "enable"].includes(sub)) {
      store[threadID] = true;
      await fs.writeJson(DATA_PATH, store, { spaces: 2 });
      return api.sendMessage("AntiQTV: ĐÃ BẬT cho nhóm này.", threadID, messageID);
    }

    if (["off", "disable"].includes(sub)) {
      store[threadID] = false;
      await fs.writeJson(DATA_PATH, store, { spaces: 2 });
      return api.sendMessage("AntiQTV: ĐÃ TẮT cho nhóm này.", threadID, messageID);
    }

    if (sub === "toggle" || sub === "switch") {
      store[threadID] = !current;
      await fs.writeJson(DATA_PATH, store, { spaces: 2 });
      return api.sendMessage(`AntiQTV: ${store[threadID] ? "BẬT" : "TẮT"} cho nhóm này.`, threadID, messageID);
    }

    // status or default
    return api.sendMessage(
      `AntiQTV trạng thái hiện tại: ${current ? "BẬT" : "TẮT"}.\nDùng: ${global.config.PREFIX}antiqtv on | off | toggle | status`,
      threadID,
      messageID
    );
  } catch (e) {
    const logger = require("../../utils/log");
    logger(`antiqtv command error: ${e?.message || e}`, "[ CMD ]");
    return api.sendMessage("AntiQTV: Đã xảy ra lỗi, thử lại sau.", threadID, messageID);
  }
};
