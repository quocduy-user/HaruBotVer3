const fs = require("fs-extra");
const { join } = require("path");

module.exports.config = {
  name: "antiout",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "Cascade",
  description: "Bật/tắt chế độ tự động thêm lại thành viên khi tự rời nhóm",
  commandCategory: "QTV",
  usages: "[on|off|toggle|status]",
  cooldowns: 3
};

const DATA_PATH = join(__dirname, "data", "antiout.json");

async function ensureFile() {
  if (!(await fs.pathExists(DATA_PATH))) {
    await fs.ensureDir(join(__dirname, "data"));
    await fs.writeJson(DATA_PATH, { antiout: {} }, { spaces: 2 });
  }
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const sub = (args[0] || "").toLowerCase();

  try {
    await ensureFile();
    let store = await fs.readJson(DATA_PATH).catch(() => ({ antiout: {} }));
    // Chuẩn hoá cấu trúc: ưu tiên store.antiout
    if (!store.antiout || typeof store.antiout !== "object") {
      // Hỗ trợ cấu trúc cũ { [threadID]: true }
      const migrated = { antiout: {} };
      for (const [k, v] of Object.entries(store)) {
        if (k !== "antiout") migrated.antiout[k] = v === true;
      }
      store = migrated;
    }

    const current = !!store.antiout[threadID];

    if (["on", "enable"].includes(sub)) {
      store.antiout[threadID] = true;
      await fs.writeJson(DATA_PATH, store, { spaces: 2 });
      return api.sendMessage("AntiOut: ĐÃ BẬT cho nhóm này.", threadID, messageID);
    }

    if (["off", "disable"].includes(sub)) {
      store.antiout[threadID] = false;
      await fs.writeJson(DATA_PATH, store, { spaces: 2 });
      return api.sendMessage("AntiOut: ĐÃ TẮT cho nhóm này.", threadID, messageID);
    }

    if (sub === "toggle" || sub === "switch") {
      store.antiout[threadID] = !current;
      await fs.writeJson(DATA_PATH, store, { spaces: 2 });
      return api.sendMessage(`AntiOut: ${store.antiout[threadID] ? "BẬT" : "TẮT"} cho nhóm này.`, threadID, messageID);
    }

    // status or default
    return api.sendMessage(
      `AntiOut trạng thái hiện tại: ${current ? "BẬT" : "TẮT"}.\nDùng: ${global.config.PREFIX}antiout on | off | toggle | status`,
      threadID,
      messageID
    );
  } catch (e) {
    const logger = require("../../utils/log");
    logger(`antiout command error: ${e?.message || e}`, "[ CMD ]");
    return api.sendMessage("AntiOut: Đã xảy ra lỗi, thử lại sau.", threadID, messageID);
  }
};
