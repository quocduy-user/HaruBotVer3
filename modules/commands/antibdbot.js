const fs = require("fs-extra");
const { join } = require("path");

module.exports.config = {
  name: "antibdbot",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "Cascade",
  description: "Bật/tắt chống đổi biệt danh của Bot theo từng nhóm",
  commandCategory: "QTV",
  usages: "[on|off|toggle|status]",
  cooldowns: 3
};

const DATA_PATH = join(__dirname, "data", "antibdbot.json");

async function ensureFile() {
  if (!(await fs.pathExists(DATA_PATH))) {
    await fs.ensureDir(join(__dirname, "data"));
    await fs.writeJson(DATA_PATH, { antibdbot: {} }, { spaces: 2 });
  }
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const sub = (args[0] || "").toLowerCase();

  try {
    await ensureFile();
    let store = await fs.readJson(DATA_PATH).catch(() => ({ antibdbot: {} }));
    if (!store.antibdbot || typeof store.antibdbot !== "object") {
      const migrated = { antibdbot: {} };
      for (const [k, v] of Object.entries(store)) {
        if (k !== "antibdbot") migrated.antibdbot[k] = v === true;
      }
      store = migrated;
    }

    const current = !!store.antibdbot[threadID];

    if (["on", "enable"].includes(sub)) {
      store.antibdbot[threadID] = true;
      await fs.writeJson(DATA_PATH, store, { spaces: 2 });
      return api.sendMessage("AntiBDBot: ĐÃ BẬT cho nhóm này.", threadID, messageID);
    }

    if (["off", "disable"].includes(sub)) {
      store.antibdbot[threadID] = false;
      await fs.writeJson(DATA_PATH, store, { spaces: 2 });
      return api.sendMessage("AntiBDBot: ĐÃ TẮT cho nhóm này.", threadID, messageID);
    }

    if (sub === "toggle" || sub === "switch") {
      store.antibdbot[threadID] = !current;
      await fs.writeJson(DATA_PATH, store, { spaces: 2 });
      return api.sendMessage(`AntiBDBot: ${store.antibdbot[threadID] ? "BẬT" : "TẮT"} cho nhóm này.`, threadID, messageID);
    }

    return api.sendMessage(
      `AntiBDBot trạng thái hiện tại: ${current ? "BẬT" : "TẮT"}.\nDùng: ${global.config.PREFIX}antibdbot on | off | toggle | status`,
      threadID,
      messageID
    );
  } catch (e) {
    const logger = require("../../utils/log");
    logger(`antibdbot command error: ${e?.message || e}`, "[ CMD ]");
    return api.sendMessage("AntiBDBot: Đã xảy ra lỗi, thử lại sau.", threadID, messageID);
  }
};
