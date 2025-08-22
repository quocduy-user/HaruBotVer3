module.exports.config = {
    name: "rule",
    eventType: ["log:subscribe"],
    version: "",
    credits: "Mr.Ben", //Trần Thanh Dương mod từ join của Mr.Ben
    description: "",
};
module.exports.run = async function ({ api, event }) {
  const fs = global.nodemodule?.["fs-extra"] || require("fs-extra");
  const { join } = global.nodemodule?.["path"] || require("path");
  const { threadID } = event;

  try {
    // Lấy cấu hình thread
    const thread = global.data?.threadData?.get(threadID) || {};
    if (typeof thread["rule"] !== "undefined" && thread["rule"] === false) return;

    // Đường dẫn rules.json (đặt trong modules/commands/cache/)
    const pathData = join(__dirname, "..", "commands", "cache", "rules.json");
    if (!fs.existsSync(pathData)) {
      await fs.ensureDir(join(__dirname, "..", "commands", "cache"));
      await fs.writeFile(pathData, "[]", "utf-8");
    }

    // Chỉ gửi luật khi sự kiện là bot hoặc thành viên được thêm (mặc định: luôn gửi khi có subscribe)
    const botID = api.getCurrentUserID();
    const added = event.logMessageData?.addedParticipants || [];
    const botWasAdded = added.some(p => String(p.userFbId) === String(botID));
    // Nếu muốn chỉ gửi khi bot được thêm, bật điều kiện dưới đây
    // if (!botWasAdded) return;

    const raw = await fs.readFile(pathData, "utf-8");
    let dataJson = [];
    try { dataJson = JSON.parse(raw); } catch (_) { dataJson = []; }
    const thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, listRule: [] };

    if (Array.isArray(thisThread.listRule) && thisThread.listRule.length > 0) {
      let msg = "", index = 0;
      for (const item of thisThread.listRule) msg += `${++index}. ${item}\n`;
      const body = `===== [ LUẬT BOX ] =====\n${msg}`;
      return api.sendMessage({ body }, threadID);
    }
  } catch (e) {
    const logger = require("../../utils/log");
    logger(`Lỗi autorule: ${e?.message || e}`, "[ EVENT ]");
  }
};