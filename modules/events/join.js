const { join } = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const moment = require("moment-timezone");

// Debounce map to rate-limit image sending per thread
const IMAGE_COOLDOWN_MS = 60 * 1000; // 60 seconds
const imageDebounceMap = new Map(); // key: threadID, value: lastSendTs

module.exports.config = {
  name: "join",
  eventType: ['log:subscribe'],
  version: "2.0.0",
  credits: "Hiền (Nâng cấp bởi Trae AI)",
  description: "Thông báo khi bot được thêm vào nhóm mới"
};

module.exports.run = async function({ api, event, Threads }) {
  const { threadID } = event;
  let data = {};
  try {
    const thr = await Threads.getData(threadID);
    data = thr?.data || {};
  } catch (_) {}
  const checkban = data.banOut || [];
  // Giữ nguyên hành vi hiện tại nhưng an toàn hơn
  if (Array.isArray(checkban) && checkban.length > 0 && checkban.includes(checkban[0])) return;

  // Lấy thời gian hiện tại theo múi giờ của Việt Nam
  const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

  // Chỉ xử lý khi bot được thêm vào nhóm
  const botID = api.getCurrentUserID();
  const added = event.logMessageData?.addedParticipants || [];
  if (added.some(i => String(i.userFbId) == String(botID))) {
    try {
      // Lấy thông tin nhóm
      const threadInfo = await api.getThreadInfo(threadID);
      const threadName = threadInfo?.threadName || "Nhóm chat";
      const participantCount = Array.isArray(threadInfo?.participantIDs) ? threadInfo.participantIDs.length : 0;
      
      // Đổi biệt danh bot
      try {
        const prefix = global?.config?.PREFIX || "/";
        const botName = global?.config?.BOTNAME || "HaruBot";
        api.changeNickname(`>> ${prefix} << • ${botName}`, threadID, botID);
      } catch (_) {}

      // Tạo thông báo chào mừng đẹp mắt
      const prefix = global?.config?.PREFIX || "/";
      const botName = global?.config?.BOTNAME || "HaruBot";
      const welcomeMsg = `[ KẾT NỐI THÀNH CÔNG ]\n\n🤖 ${botName} đã sẵn sàng phục vụ nhóm ${threadName}!\n\n📝 Prefix: ${prefix}\n👥 Thành viên: ${participantCount}\n⏰ Thời gian: ${time}\n\n💡 Gõ ${prefix}menu để xem danh sách lệnh\n💌 Cảm ơn đã thêm bot vào nhóm!`;
      
      // Gửi thông báo, rate-limit phần gửi ảnh để tránh spam
      const now = Date.now();
      const lastTs = imageDebounceMap.get(threadID) || 0;
      const withinCooldown = now - lastTs < IMAGE_COOLDOWN_MS;
      imageDebounceMap.set(threadID, now);

      if (withinCooldown) {
        // Trong thời gian cooldown: chỉ gửi text
        api.sendMessage(welcomeMsg, threadID);
      } else {
        const botAvatarUrl = `https://graph.facebook.com/${botID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        try {
          const response = await axios.get(botAvatarUrl, { responseType: 'arraybuffer' });
          const imagePath = join(__dirname, 'cache', `bot_welcome_${threadID}.png`);
          await fs.ensureDir(join(__dirname, 'cache'));
          await fs.writeFile(imagePath, Buffer.from(response.data, 'binary'));
          
          await new Promise(resolve => {
            api.sendMessage({
              body: welcomeMsg,
              attachment: fs.createReadStream(imagePath)
            }, threadID, () => {
              try { fs.unlinkSync(imagePath); } catch (_) {}
              resolve();
            });
          });
        } catch (err) {
          // Nếu không lấy được ảnh, gửi tin nhắn văn bản
          api.sendMessage(welcomeMsg, threadID);
        }
      }

      // Gửi báo cáo join tới admin (NDH/ADMINBOT)
      const adminIdsNDH = Array.isArray(global?.config?.NDH) ? global.config.NDH : [];
      const adminIdsAdmin = Array.isArray(global?.config?.ADMINBOT) ? global.config.ADMINBOT : [];
      const adminIds = [...adminIdsNDH, ...adminIdsAdmin].filter(Boolean);
      if (adminIds.length > 0) {
        const report = `|› Sự kiện: Bot được thêm vào nhóm mới\n|› Tên nhóm: ${threadName}\n|› TID: ${threadID}\n|› Thành viên: ${participantCount}\n|› Thời gian: ${time}`;
        await Promise.all(
          adminIds.map(id => new Promise(res => {
            api.sendMessage(report, id, () => res());
          }))
        );
      }
    } catch (error) {
      const prefix = global?.config?.PREFIX || "/";
      console.error(`Đã xảy ra lỗi: ${error?.message || error}`);
      api.sendMessage(`Kết nối thành công! Gõ ${prefix}menu để xem danh sách lệnh.`, threadID);
    }
  }
  // Đã loại bỏ phần thông báo khi có thành viên vào nhóm theo yêu cầu
};