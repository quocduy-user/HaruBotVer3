module.exports.config = {
    name: "console",
    version: "1.2.0",
    hasPermssion: 3,
    credits: "Niiozic - Updated by Trae",//Quất đz làm chống lag
    description: "Làm cho console đẹp hơn + mod chống spam lag console nâng cao",
    commandCategory: "Admin",
    usages: "console",
    cooldowns: 30
  };
  
  var isConsoleDisabled = false,
    num = 0,
    max = 20,
    timeStamp = 0,
    lastWarningTime = 0,
    warningThreshold = 15;
  
  function disableConsole(cooldowns) {
    const l = require("chalk");
    console.log(l.bgRed.white(`Kích hoạt chế độ chống lag console trong ${cooldowns}s`));
    isConsoleDisabled = true;
    setTimeout(function () {
      isConsoleDisabled = false;
      console.log(l.bgGreen.white("Tắt chế độ chống lag - Console hoạt động bình thường"));
    }, cooldowns * 1000);
  }
  
  module.exports.handleEvent = async function ({
    api,
    args,
    Users,
    event
  }) {
    let {
      messageID,
      threadID,
      senderID,
      mentions
    } = event;
    try {
      const dateNow = Date.now();
      
      // Kiểm tra nếu console đang bị vô hiệu hóa
      if (isConsoleDisabled) {
        return;
      }
  
      const l = require("chalk");
      const moment = require("moment-timezone"); // Sửa lỗi ở đây, đổi m thành moment
      var n = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");
      const o = global.data.threadData.get(event.threadID) || {};
      if (typeof o.console !== "undefined" && o.console == true) {
        return;
      }
      ;
      if (event.senderID == global.data.botID) {
        return;
      }
      ;
      num++
      const threadInfo = await api.getThreadInfo(event.threadID)
      var p = threadInfo.threadName || "Nonmae";
      var q = await Users.getNameUser(event.senderID);
      var r = event.body || "Ảnh, video hoặc kí tự đặc biệt";
      console.log(`${l.hex("#FF66FF")("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓")}
${l.hex("#33FFFF")(`┣➤ Tên box: ${p}`)}
${l.hex("#66CCFF")(`┣➤ ID box: ${event.threadID}`)}
${l.hex("#33CCFF")(`┣➤ Tên: ${q}`)} 
${l.hex("#97FFFF")(`┣➤ Uid: ${event.senderID}`)}
${l.hex("#FFFAFA")(`┣➤ Nội dung: ${r}`)}
${l.hex("#FF33FF")(`┣➤ Thời gian: ${n}`)}
${l.hex("#FF66FF")("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛")}`);

      // Cập nhật timestamp
      timeStamp = dateNow;
      
      // Kiểm tra tần suất tin nhắn
      const timeDiff = Date.now() - timeStamp;
      
      // Reset bộ đếm nếu đã qua 5 giây
      if (timeDiff > 5000) {
        num = 0;
      }
      
      // Cảnh báo khi đạt ngưỡng - đã ẩn thông báo
      if (num >= warningThreshold && Date.now() - lastWarningTime > 10000) {
        // const l = require("chalk");
        // console.log(l.yellow(`Cảnh báo: Đang có ${num}/${max} tin nhắn được xử lý trong thời gian ngắn!`));
        lastWarningTime = Date.now();
      }
      
      // Kích hoạt chế độ chống lag khi vượt ngưỡng
      if (num >= max && timeDiff < 1000) {
        num = 0;
        disableConsole(this.config.cooldowns);
      }
  
    } catch (e) {
      console.log(e);
    }
  };
  
  module.exports.run = async function ({
    api: a,
    args: b,
    Users: c,
    event: d,
    Threads: e,
    utils: f,
    client: g
  }) {};