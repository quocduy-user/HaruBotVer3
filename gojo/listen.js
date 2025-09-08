module.exports = function ({ api, models }) {
  const Users = require("./controllers/users")({ models, api }),
    Threads = require("./controllers/threads")({ models, api }),
    Currencies = require("./controllers/currencies")({ models });
  const logger = require("../utils/log.js");
  const util = require('util');
  const fs = require("fs-extra");
  const path = require("path");
  const moment = require("moment-timezone");
  const axios = require("axios");
  const cron = require("node-cron");
  const { isThreadRented } = require("../utils/thuebotCache");
  var day = moment.tz("Asia/Ho_Chi_Minh").day();
  const checkttDataPath = __dirname + "/../modules/commands/_checktt/";
  // Cron job gửi top tương tác NGÀY vào 00:00 Asia/Ho_Chi_Minh
  cron.schedule('0 0 * * *', async () => {
    try {
      const day_now = moment.tz('Asia/Ho_Chi_Minh').day();
      const checkttData = fs.readdirSync(checkttDataPath);
      logger("--> CHECKTT: Ngày Mới");
      for (const checkttFile of checkttData) {
        const checktt = JSON.parse(fs.readFileSync(checkttDataPath + checkttFile));
        if (!checktt.last) checktt.last = { time: day_now, day: [], week: [] };
        let storage = [], count = 1;
        for (const item of checktt.day) {
          const userName = (await Users.getNameUser(item.id)) || 'Facebook User';
          storage.push({ ...item, name: userName });
        }
        storage.sort((a, b) => a.count === b.count ? a.name.localeCompare(b.name) : b.count - a.count);
        let checkttBody = " [ Top 10 Tương Tác Ngày ]\n─────────────────\n";
        checkttBody += storage.slice(0, 10).map(item => `${count++}.${item.name} - ${item.count} tin nhắn.`).join('\n');
        api.sendMessage(
          `${checkttBody}\n─────────────────\n⚡ Các bạn khác cố gắng tương tác nếu muốn lên top nha :3`,
          checkttFile.replace('.json', ''),
          (err) => (err ? logger(err) : '')
        );
        checktt.last.day = JSON.parse(JSON.stringify(checktt.day));
        checktt.day.forEach(e => { e.count = 0; });
        checktt.time = day_now;
        fs.writeFileSync(checkttDataPath + checkttFile, JSON.stringify(checktt, null, 4));
      }
      global.client.sending_top = true;
    } catch (e) {}
  }, { timezone: 'Asia/Ho_Chi_Minh' });

  // Cron job gửi top tương tác TUẦN vào 00:00 thứ Hai (day=1) Asia/Ho_Chi_Minh
  cron.schedule('0 0 * * 1', async () => {
    try {
      const day_now = moment.tz('Asia/Ho_Chi_Minh').day();
      const checkttData = fs.readdirSync(checkttDataPath);
      logger("--> CHECKTT: Tuần Mới");
      for (const checkttFile of checkttData) {
        const checktt = JSON.parse(fs.readFileSync(checkttDataPath + checkttFile));
        if (!checktt.last) checktt.last = { time: day_now, day: [], week: [] };
        let storage = [], count = 1;
        for (const item of checktt.week) {
          const userName = (await Users.getNameUser(item.id)) || 'Facebook User';
          storage.push({ ...item, name: userName });
        }
        storage.sort((a, b) => a.count === b.count ? a.name.localeCompare(b.name) : b.count - a.count);
        let checkttBody = "[ Top 10 Tương Tác Tuần ]\n─────────────────\n";
        checkttBody += storage.slice(0, 10).map(item => `${count++}.${item.name} - ${item.count} tin nhắn.`).join('\n');
        api.sendMessage(
          `${checkttBody}\n─────────────────\n⚡ Các bạn khác cố gắng tương tác nếu muốn lên top nha :>`,
          checkttFile.replace('.json', ''),
          (err) => (err ? logger(err) : '')
        );
        checktt.last.week = JSON.parse(JSON.stringify(checktt.week));
        checktt.week.forEach(e => { e.count = 0; });
        fs.writeFileSync(checkttDataPath + checkttFile, JSON.stringify(checktt, null, 4));
      }
    } catch (e) {}
  }, { timezone: 'Asia/Ho_Chi_Minh' });

  //////////////////////////////////////////////////////////////////////
  //========= Push all variable from database to environment =========//
  //////////////////////////////////////////////////////////////////////

  (async function () {
    try {
      logger(global.getText("listen", "startLoadEnvironment"), "[ DATABASE ]");
      let threads = await Threads.getAll(),
        users = await Users.getAll(["userID", "name", "data"]),
        currencies = await Currencies.getAll(["userID"]);
      for (const data of threads) {
        const idThread = String(data.threadID);
        global.data.allThreadID.push(idThread),
          global.data.threadData.set(idThread, data["data"] || {}),
          global.data.threadInfo.set(idThread, data.threadInfo || {});
        if (data["data"] && data["data"]["banned"] == !![])
          global.data.threadBanned.set(idThread, {
            reason: data["data"]["reason"] || "",
            dateAdded: data["data"]["dateAdded"] || "",
          });
        if (
          data["data"] &&
          data["data"]["commandBanned"] &&
          data["data"]["commandBanned"]["length"] != 0
        )
          global["data"]["commandBanned"]["set"](
            idThread,
            data["data"]["commandBanned"]
          );
        if (data["data"] && data["data"]["NSFW"])
          global["data"]["threadAllowNSFW"]["push"](idThread);
      }
      logger.loader(global.getText("listen", "loadedEnvironmentThread"));
      for (const dataU of users) {
        const idUsers = String(dataU["userID"]);
        global.data["allUserID"]["push"](idUsers);
        if (dataU.name && dataU.name["length"] != 0)
          global.data.userName["set"](idUsers, dataU.name);
        if (dataU.data && dataU.data.banned == 1)
          global.data["userBanned"]["set"](idUsers, {
            reason: dataU["data"]["reason"] || "",
            dateAdded: dataU["data"]["dateAdded"] || "",
          });
        if (
          dataU["data"] &&
          dataU.data["commandBanned"] &&
          dataU["data"]["commandBanned"]["length"] != 0
        )
          global["data"]["commandBanned"]["set"](
            idUsers,
            dataU["data"]["commandBanned"]
          );
      }
      for (const dataC of currencies)
        global.data.allCurrenciesID.push(String(dataC["userID"]));
      logger.loader(global.getText("listen", "loadedEnvironmentUser")),
        logger(
          global.getText("listen", "successLoadEnvironment"),
          "[ DATABASE ]"
        );
    } catch (error) {
      return logger.loader(
        global.getText("listen", "failLoadEnvironment", error),
        "error"
      );
    }
  })();
  logger(
    `${api.getCurrentUserID()} - [ ${global.config.PREFIX} ] • ${
      !global.config.BOTNAME
        ? "This bot was made by CatalizCS and SpermLord"
        : global.config.BOTNAME
    }`,
    "[ BOT INFO ]"
  );

  ///////////////////////////////////////////////
  //========= Require all handle need =========//
  //////////////////////////////////////////////

  const handleCommand = require("./handle/handleCommand")({
    api,
    models,
    Users,
    Threads,
    Currencies,
  });
  const handleCommandEvent = require("./handle/handleCommandEvent")({
    api,
    models,
    Users,
    Threads,
    Currencies,
  });
  const handleReply = require("./handle/handleReply")({
    api,
    models,
    Users,
    Threads,
    Currencies,
  });
  const handleReaction = require("./handle/handleReaction")({
    api,
    models,
    Users,
    Threads,
    Currencies,
  });
  const handleEvent = require("./handle/handleEvent")({
    api,
    models,
    Users,
    Threads,
    Currencies,
  });
  const handleCreateDatabase = require("./handle/handleCreateDatabase")({
    api,
    Threads,
    Users,
    Currencies,
    models,
  });
   const handleRefresh = require("./handle/handleRefresh")({
    api,
    models,
    Users,
    Threads,
    Currencies,
  });
  logger.loader(`====== ${Date.now() - global.client.timeStart}ms ======`);

  //////////////////////////////////////////////////
  //========= Send event to handle need =========//
  /////////////////////////////////////////////////

return async (event) => {
    const {
      threadID,
      author,
      image,
      type,
      logMessageType,
      logMessageBody,
      logMessageData,
    } = event;
    const threadData = (await Threads.getData(threadID)).data || {};




    let form_mm_dd_yyyy = (input = "", split = input.split("/")) =>
      `${split[1]}/${split[0]}/${split[2]}`;
    let prefix =
      (global.data.threadData.get(event.threadID) || {}).PREFIX ||
      global.config.PREFIX;
    let send = (msg, callback) =>
      api.sendMessage(msg, event.threadID, callback, event.messageID);
    if (
      (event.body || "").startsWith(prefix) &&
      event.senderID != api.getCurrentUserID() &&
      !global.config.ADMINBOT.includes(event.senderID)
    ) {
      const rented = isThreadRented(event.threadID);
      if (!rented)
        return api.sendMessage(threadID, async () => {
          await api.shareContact("⛔ Nhóm của bạn chưa thuê bot, Vui lòng thuê bot để tiếp tục sử dụng.\n\nLiên hệ Admin: Quoc Duy", 100074278195157, threadID);
        });
      if (
        new Date(form_mm_dd_yyyy(rented.time_end)).getTime() <=
        Date.now() + 25200000
      )
        return api.sendMessage(threadID, async () => {
          await api.shareContact("⚠️ Nhóm của bạn đã hết hạn thuê bot, Vui lòng thanh toán để tiếp tục gia hạn.\n\nLiên hệ Admin: Quoc Duy", 100074278195157, threadID);
        });
    }


//////////
    switch (event.type) {
      case "message":
      case "message_reply":
      case "message_unsend":
        handleCreateDatabase({ event });
        handleCommand({ event });
        handleReply({ event });
        handleCommandEvent({ event });
        handleEvent({ event }); // Add this line to call handleEvent
        break;
      case "event":
        handleEvent({ event });
        handleRefresh({ event });
    if (global.config.notiGroup) {
    const ignoredEvents = [
      "log:subscribe",
      "log:unsubscribe",
      "log:thread-poll"
    ];
    if (!ignoredEvents.includes(event.logMessageType)) {
      var msg = '[ CẬP NHẬT NHÓM ]\n📝 '
      msg += event.logMessageBody
      if (event.author == api.getCurrentUserID()) {
        msg = msg.replace('Bạn', global.config.BOTNAME)
      }
      api.sendMessage({
        body: `${msg}`
      }, event.threadID, (error, info) => {
        if (!error && global.config.notiUnsend > 0) {
          setTimeout(() => {
            api.unsendMessage(info.messageID);
          }, global.config.notiUnsend * 1000);
        }
      });
    }
  }
  break;
      case "message_reaction":
        var { iconUnsend } = global.config
      if(iconUnsend.status && event.senderID == api.getCurrentUserID() && event.reaction == iconUnsend.icon) {
        api.unsendMessage(event.messageID)
      }
        handleReaction({ event });
        break;
      default:
        break;
    }
  };
};

//THIZ BOT WAS MADE BY ME(CATALIZCS) AND MY BROTHER SPERMLORD - DO NOT STEAL MY CODE (つ ͡ ° ͜ʖ ͡° )つ ✄ ╰⋃╯