const { join } = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const moment = require("moment-timezone");

module.exports.config = {
  name: "join",
  eventType: ['log:subscribe'],
  version: "2.0.0",
  credits: "Hiền (Nâng cấp bởi Trae AI)",
  description: "Thông báo khi bot được thêm vào nhóm mới"
};

module.exports.run = async function({ api, event, Threads }) {
  const { threadID } = event;
  const data = (await Threads.getData(threadID)).data || {};
  const checkban = data.banOut || [];

  if (checkban.includes(checkban[0])) return;

  // Lấy thời gian hiện tại theo múi giờ của Việt Nam
  const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

  // Chỉ xử lý khi bot được thêm vào nhóm
  if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
    try {
      // Lấy thông tin nhóm
      const threadInfo = await api.getThreadInfo(threadID);
      const threadName = threadInfo.threadName || "Nhóm chat";
      const participantCount = threadInfo.participantIDs.length;
      
      // Đổi biệt danh bot
      api.changeNickname(`>> ${global.config.PREFIX} << • ${global.config.BOTNAME || "HaruBot"}`, threadID, api.getCurrentUserID());

      // Tạo thông báo chào mừng đẹp mắt
      const welcomeMsg = `[ KẾT NỐI THÀNH CÔNG ]\n\n🤖 ${global.config.BOTNAME || "HaruBot"} đã sẵn sàng phục vụ nhóm ${threadName}!\n\n📝 Prefix: ${global.config.PREFIX}\n👥 Thành viên: ${participantCount}\n⏰ Thời gian: ${time}\n\n💡 Gõ ${global.config.PREFIX}menu để xem danh sách lệnh\n💌 Cảm ơn đã thêm bot vào nhóm!`;
      
      // Gửi thông báo kèm hình ảnh (nếu có)
      const botAvatarUrl = await api.getCurrentUserID().then(uid => `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
      
      try {
        const response = await axios.get(botAvatarUrl, { responseType: 'arraybuffer' });
        const imagePath = join(__dirname, 'cache', `bot_welcome_${threadID}.png`);
        await fs.ensureDir(join(__dirname, 'cache'));
        await fs.writeFile(imagePath, Buffer.from(response.data, 'binary'));
        
        api.sendMessage({
          body: welcomeMsg,
          attachment: fs.createReadStream(imagePath)
        }, threadID, () => fs.unlinkSync(imagePath));
      } catch (err) {
        // Nếu không lấy được ảnh, gửi tin nhắn văn bản
        api.sendMessage(welcomeMsg, threadID);
      }
    } catch (error) {
      console.error(`Đã xảy ra lỗi: ${error.message}`);
      api.sendMessage(`Kết nối thành công! Gõ ${global.config.PREFIX}menu để xem danh sách lệnh.`, threadID);
    }
  }
  // Đã loại bỏ phần thông báo khi có thành viên vào nhóm theo yêu cầu
};