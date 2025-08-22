module.exports.config = {
	name: "rule",
	version: "1.0.1",
	hasPermssion: 1,
	credits: "CatalizCS (alias by Cascade)",
	description: "Alias của lệnh 'luật' để quản lý nội quy nhóm",
	commandCategory: "QTV",
	usages: "[add/remove/all] [content/ID]",
	cooldowns: 5,
	dependencies: {
        "fs-extra": "",
        "path": ""
    }
};

// Tái sử dụng logic từ lệnh gốc "luật"
try {
  module.exports.onLoad = require("./luật.js").onLoad;
  module.exports.run = require("./luật.js").run;
} catch (e) {
  // Fallback phòng trường hợp môi trường không hỗ trợ tên file unicode
  const { existsSync, writeFileSync, readFileSync } = require("fs-extra");
  const { join } = require("path");

  module.exports.onLoad = () => {
    const pathData = join(__dirname, "cache", "rules.json");
    if (!existsSync(pathData)) return writeFileSync(pathData, "[]", "utf-8");
  };

  module.exports.run = ({ event, api, args, permssion }) => {
    const { threadID, messageID } = event;
    const pathData = join(__dirname, "cache", "rules.json");
    const content = (args.slice(1, args.length)).join(" ");
    let dataJson = [];
    try { dataJson = JSON.parse(readFileSync(pathData, "utf-8")); } catch (_) { dataJson = []; }
    let thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, listRule: [] };

    switch (args[0]) {
      case "add": {
        if (permssion == 0) return api.sendMessage("Bạn không đủ quyền hạn để có thể sử dụng thêm luật!", threadID, messageID);
        if (content.length == 0) return api.sendMessage("Phần nhập thông tin không được để trống", threadID, messageID);
        if (content.indexOf("\n") != -1) {
          const contentSplit = content.split("\n");
          for (const item of contentSplit) thisThread.listRule.push(item);
        } else {
          thisThread.listRule.push(content);
        }
        break;
      }
      case "help":
      case "all": {
        let msg = "", index = 0;
        for (const item of thisThread.listRule) msg += `${++index}. ${item}\n`;
        if (msg.length == 0) return api.sendMessage("Nhóm của bạn hiện tại chưa có danh sách luật để hiển thị!", threadID, messageID);
        return api.sendMessage(`=== HƯỚNG DẪN SỬ DỤNG ===\n━━━━━━━━━━━━━━━━━━\n${global.config.PREFIX}rule add < nội dung > → Thêm luật vào nhóm\n${global.config.PREFIX}rule remove chọn theo số thứ tự hoặc all để xóa`, threadID, messageID);
      }
      case "rm":
      case "remove":
      case "delete": {
        if (!isNaN(content) && content > 0) {
          if (permssion == 0) return api.sendMessage("Bạn không đủ quyền hạn để có thể sử dụng xóa luật!", threadID, messageID);
          if (thisThread.listRule.length == 0) return api.sendMessage("Nhóm của bạn chưa có danh sách luật để có thể xóa!", threadID, messageID);
          thisThread.listRule.splice(content - 1, 1);
          return api.sendMessage(`Đã xóa thành công luật có số thứ tự thứ ${content}`, threadID, messageID);
        } else if (content == "all") {
          if (permssion == 0) return api.sendMessage("Bạn không đủ quyền hạn để có thể sử dụng xóa luật!", threadID, messageID);
          if (thisThread.listRule.length == 0) return api.sendMessage("Nhóm của bạn chưa có danh sách luật để có thể xóa!", threadID, messageID);
          thisThread.listRule = [];
          return api.sendMessage(`Đã xóa thành công toàn bộ luật của nhóm!`, threadID, messageID);
        }
        break;
      }
      default: {
        if (thisThread.listRule.length != 0) {
          let msg = "", index = 0;
          for (const item of thisThread.listRule) msg += `${++index}. ${item}\n`;
          return api.sendMessage(`==== Luật của nhóm ====\n━━━━━━━━━━━━━━━━━━\n${msg}\n━━━━━━━━━━━━━━━━━━\n→ Việc tuân thủ luật của nhóm sẽ đóng góp tích cực đến cộng đồng của bạn!`, threadID, messageID);
        } else {
          return api.sendMessage(`Nhóm chưa có luật. Dùng: ${global.config.PREFIX}rule add <nội dung> để thêm.`, threadID, messageID);
        }
      }
    }

    if (!dataJson.some(item => item.threadID == threadID)) dataJson.push(thisThread);
    return require("fs-extra").writeFileSync(pathData, JSON.stringify(dataJson, null, 4), "utf-8");
  };
}
