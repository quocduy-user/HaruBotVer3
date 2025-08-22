this.config = {
  name: "check",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "DungUwU && Nghĩa - Mod by Trae AI",
  description: "Kiểm tra tương tác nhóm theo ngày/tuần/tổng",
  commandCategory: "Box",
  usages: "[all/week/day]",
  cooldowns: 5,
  dependencies: {
    "fs": "",
    "moment-timezone": ""
  }
};

const path = __dirname + '/kiemtra/';
const moment = require('moment-timezone');

// Khởi tạo thư mục lưu trữ dữ liệu
this.onLoad = () => {
  const fs = require('fs');
  if (!fs.existsSync(path) || !fs.statSync(path).isDirectory()) {
    fs.mkdirSync(path, { recursive: true });
  }
  
  // Cập nhật thời gian mỗi phút
  setInterval(() => {
    const today = moment.tz("Asia/Ho_Chi_Minh").day();
    const checkttData = fs.readdirSync(path);
    
    checkttData.forEach(file => {
      try { 
        var fileData = JSON.parse(fs.readFileSync(path + file)) 
      } catch { 
        return fs.unlinkSync(path + file) 
      };
      
      if (fileData.time != today) {
        setTimeout(() => {
          fileData = JSON.parse(fs.readFileSync(path + file));
          if (fileData.time != today) {
            fileData.time = today;
            fs.writeFileSync(path + file, JSON.stringify(fileData, null, 4));
          }
        }, 60 * 1000);
      }
    });
  }, 60 * 1000);
}

// Xử lý sự kiện tin nhắn để đếm tương tác
this.handleEvent = async function({ api, event, Threads }) {
  try {
    if (!event.isGroup) return;
    if (global.client.sending_top == true) return;
    
    const fs = require('fs'); // Directly require fs instead of using global.nodemodule
    const { threadID, senderID } = event;
    const today = moment.tz("Asia/Ho_Chi_Minh").day();
    const dayKeyNow = moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
    const weekNow = moment.tz("Asia/Ho_Chi_Minh").isoWeek();
    const weekYearNow = moment.tz("Asia/Ho_Chi_Minh").isoWeekYear();
    
    // Tạo file dữ liệu mới nếu chưa tồn tại
    if (!fs.existsSync(path + threadID + '.json')) {
      var newObj = {
        total: [],
        week: [],
        day: [],
        time: today,
        dayKey: dayKeyNow,
        weekNumber: weekNow,
        weekYear: weekYearNow,
        last: {
          time: today,
          day: [],
          week: [],
        },
        lastInteraction: {}
      };
      fs.writeFileSync(path + threadID + '.json', JSON.stringify(newObj, null, 4));
    } else {
      var newObj = JSON.parse(fs.readFileSync(path + threadID + '.json'));
    }
    
    // Đảm bảo các trường cần thiết tồn tại
    newObj.total = Array.isArray(newObj.total) ? newObj.total : [];
    newObj.week = Array.isArray(newObj.week) ? newObj.week : [];
    newObj.day = Array.isArray(newObj.day) ? newObj.day : [];
    if (!newObj.last) newObj.last = { time: today, day: [], week: [] };
    if (!newObj.dayKey) newObj.dayKey = dayKeyNow;
    if (typeof newObj.weekNumber !== 'number') newObj.weekNumber = weekNow;
    if (typeof newObj.weekYear !== 'number') newObj.weekYear = weekYearNow;

    // Reset NGÀY khi đổi ngày
    if (newObj.dayKey !== dayKeyNow) {
      newObj.day.forEach(u => u.count = 0);
      newObj.last.day = JSON.parse(JSON.stringify(newObj.day));
      newObj.dayKey = dayKeyNow;
    }

    // Reset TUẦN khi đổi tuần (ISO week + year)
    if (newObj.weekNumber !== weekNow || newObj.weekYear !== weekYearNow) {
      newObj.week.forEach(u => u.count = 0);
      newObj.last.week = JSON.parse(JSON.stringify(newObj.week));
      newObj.weekNumber = weekNow;
      newObj.weekYear = weekYearNow;
    }

    // Cập nhật danh sách thành viên
    const UserIDs = event.participantIDs || [];
    if (UserIDs.length != 0) {
      for (let user of UserIDs) {
        if (!newObj.last) {
          newObj.last = {
            time: today,
            day: [],
            week: [],
          };
        }
        
        // Khởi tạo dữ liệu cho thành viên mới
        ['week', 'day'].forEach(timeType => {
          if (!newObj.last[timeType].find(item => item.id == user)) {
            newObj.last[timeType].push({
              id: user,
              count: 0
            });
          }
        });
        
        ['total', 'week', 'day'].forEach(timeType => {
          if (!newObj[timeType].find(item => item.id == user)) {
            newObj[timeType].push({
              id: user,
              count: 0
            });
          }
        });
      }
    }
    
    fs.writeFileSync(path + threadID + '.json', JSON.stringify(newObj, null, 4));  
    const threadData = JSON.parse(fs.readFileSync(path + threadID + '.json'));
    
    // Xử lý khi ngày thay đổi
    if (threadData.time != today) {
      global.client.sending_top = true;
      setTimeout(() => global.client.sending_top = false, 5 * 60 * 1000);
    }
    
    // Cập nhật số tin nhắn
    ['total', 'week', 'day'].forEach(timeType => {
      const index = threadData[timeType].findIndex(e => e.id == senderID);
      if (index == -1) {
        threadData[timeType].push({
          id: senderID,
          count: 1
        });
      } else {
        threadData[timeType][index].count++;
      }
    });
    
    // Lọc thành viên đã rời nhóm
    let p = event.participantIDs;
    if (!!p && p.length > 0) {
      p = p.map($ => $ + '');
      ['day', 'week', 'total'].forEach(t => 
        threadData[t] = threadData[t].filter($ => p.includes($.id + ''))
      );
    }
  
    // Cập nhật thời gian tương tác gần đây
    threadData.lastInteraction = threadData.lastInteraction || {};
    threadData.lastInteraction[senderID] = Date.now();
    
    fs.writeFileSync(path + threadID + '.json', JSON.stringify(threadData, null, 4));
  } catch(e) {
    console.error("Lỗi trong handleEvent:", e);
  }
}

// Hàm chính xử lý lệnh
this.run = async function({ api, event, args, Users, Threads, Currencies }) {
  await new Promise(resolve => setTimeout(resolve, 500));
  const fs = global.nodemodule['fs'];
  const { threadID, messageID, senderID, mentions } = event;
  let path_data = path + threadID + '.json';
  
  if (!fs.existsSync(path_data)) {
    return api.sendMessage("⚠️ Chưa có dữ liệu tương tác trong nhóm này", threadID);
  }
  
  const threadData = JSON.parse(fs.readFileSync(path_data));
  const query = args[0] ? args[0].toLowerCase() : '';

  // Xử lý các lệnh phụ
  if (query == 'box') {
    // Chuyển hướng đến lệnh box
    let body_ = event.args[0].replace(exports.config.name, '') + 'box info';
    let args_ = body_.split(' ');
    
    arguments[0].args = args_.slice(1);
    arguments[0].event.args = args_;
    arguments[0].event.body = body_;
    
    return require('./box.js').run(...Object.values(arguments));
  } 
  else if (query == 'loc') {
    // Lọc dữ liệu nhóm không còn tồn tại
    if (!global.config.NDH.includes(senderID)) {
      return api.sendMessage("⚠️ Bạn không đủ quyền hạn để sử dụng lệnh này", threadID, messageID);
    }

    try {
      const dataPath = __dirname + '/kiemtra/';
      const allThreads = await api.getThreadList(100, null, ['INBOX']);
      const allThreadIDs = new Set(allThreads.map(t => t.threadID));
      const files = fs.readdirSync(dataPath);
      
      let count = 0, removedCount = 0;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        count++;
        
        const threadID = file.replace('.json', '');
        const filePath = dataPath + file;
        
        if (!allThreadIDs.has(threadID)) {
          try {
            fs.unlinkSync(filePath);
            removedCount++;
            console.log(`[CHECK] Đã xóa file của nhóm: ${threadID}`);
          } catch (err) {
            console.error(`[CHECK] Lỗi khi xóa file ${file}:`, err);
          }
        }
      }

      let message = '✅ Đã lọc xong dữ liệu nhóm!\n\n';
      message += '📊 Thống kê:\n';
      message += `➣ Tổng số nhóm: ${count}\n`;
      message += `➣ Số nhóm đã xóa: ${removedCount}\n`;
      message += `➣ Số nhóm còn lại: ${count - removedCount}\n\n`;
      message += `💡 Đã xóa ${removedCount} nhóm không tồn tại khỏi dữ liệu`;

      return api.sendMessage(message, threadID);
    } catch (error) {
      console.error('[CHECK] Lỗi:', error);
      return api.sendMessage('❎ Đã xảy ra lỗi trong quá trình lọc dữ liệu', threadID);
    }
  } 
  else if (query === 'ndfb') {
    // Chuyển hướng đến lệnh kickndfb
    let body_ = event.args[0].replace(exports.config.name, '') + 'kickdnfb';
    let args_ = body_.split(' ');
    
    arguments[0].args = args_.slice(1);
    arguments[0].event.args = args_;
    arguments[0].event.body = body_;
    
    return require('./kickndfb.js').run(...Object.values(arguments));
  } 
  else if (query == 'locmem') {
    // Lọc thành viên ít tương tác
    let threadInfo = await api.getThreadInfo(threadID);
    
    if (!threadInfo.adminIDs.some(e => e.id == senderID)) {
      return api.sendMessage("❎ Bạn không có quyền sử dụng lệnh này", threadID);
    }
    
    if (!threadInfo.isGroup) {
      return api.sendMessage("❎ Chỉ có thể sử dụng trong nhóm", threadID);
    }
    
    if (!threadInfo.adminIDs.some(e => e.id == api.getCurrentUserID())) {
      return api.sendMessage("⚠️ Bot cần quyền quản trị viên để thực hiện lệnh này", threadID);
    }
    
    if (!args[1] || isNaN(args[1])) {
      return api.sendMessage("⚠️ Vui lòng nhập số tin nhắn tối thiểu", threadID);
    }
    
    let minCount = +args[1];
    let allUser = event.participantIDs;
    let id_rm = [];
    
    for (let user of allUser) {
      if (user == api.getCurrentUserID()) continue;
      
      if (!threadData.total.some(e => e.id == user) || 
          threadData.total.find(e => e.id == user).count <= minCount) {
        await new Promise(resolve => setTimeout(async () => {
          await api.removeUserFromGroup(user, threadID);
          id_rm.push(user);
          resolve(true);
        }, 1000));
      }
    }
    
    return api.sendMessage(
      `☑️ Đã xóa ${id_rm.length} thành viên có dưới ${minCount} tin nhắn\n\n${id_rm.map(($, i) => `${i + 1}. ${global.data.userName.get($)}`).join('\n')}`, 
      threadID
    );
  } 
  else if (query == 'call') {
    // Tag những người ít tương tác
    let threadInfo = await api.getThreadInfo(threadID);
    
    if (!threadInfo.adminIDs.some(e => e.id == senderID)) {
      return api.sendMessage("❎ Bạn không có quyền sử dụng lệnh này", threadID);
    }
    
    if (!threadInfo.isGroup) {
      return api.sendMessage("❎ Chỉ có thể sử dụng trong nhóm", threadID);
    }
    
    let inactiveUsers = threadData.total.filter(user => user.count < 5);
    
    if (inactiveUsers.length === 0) {
      return api.sendMessage("✅ Không có thành viên nào dưới 5 tin nhắn", threadID);
    }
    
    let mentionIds = [];
    
    for (let user of inactiveUsers) {
      let name = await Users.getNameUser(user.id);
      mentionIds.push({ id: user.id, tag: name });
    }
    
    let message = "📢 Những người sau cần tăng tương tác:\n\n";
    message += mentionIds.map(user => `@${user.tag}`).join('\n');
    message += "\n\n👉 Hãy tích cực tham gia trò chuyện để không bị xóa khỏi nhóm nhé!";
    
    return api.sendMessage({ body: message, mentions: mentionIds }, threadID);
  }
  else if (query == 'reset') {
    // Reset dữ liệu tương tác
    let threadInfo = await api.getThreadInfo(threadID);
    
    if (!threadInfo.adminIDs.some(e => e.id == senderID)) {
      return api.sendMessage("❎ Bạn không có quyền sử dụng lệnh này", threadID);
    }
    
    const dayKeyNow = moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
    const weekNow = moment.tz("Asia/Ho_Chi_Minh").isoWeek();
    const weekYearNow = moment.tz("Asia/Ho_Chi_Minh").isoWeekYear();

    var newObj = {
      total: [],
      week: [],
      day: [],
      time: moment.tz("Asia/Ho_Chi_Minh").day(),
      dayKey: dayKeyNow,
      weekNumber: weekNow,
      weekYear: weekYearNow,
      last: {
        time: moment.tz("Asia/Ho_Chi_Minh").day(),
        day: [],
        week: [],
      },
      lastInteraction: {}
    };
    
    fs.writeFileSync(path_data, JSON.stringify(newObj, null, 4));
    return api.sendMessage("✅ Đã reset dữ liệu tương tác của nhóm thành công!", threadID);
  }

  // Xử lý hiển thị thông tin tương tác
  var header = '', body = '', footer = '', msg = '', storage = [], data = [];
  
  // Xác định loại dữ liệu cần hiển thị
  if (query == 'all' || query == '-a') {
    header = 'THỐNG KÊ TƯƠNG TÁC TỔNG';
    data = threadData.total;
  } else if (query == 'week' || query == '-w') {
    header = 'THỐNG KÊ TƯƠNG TÁC TUẦN';
    data = threadData.week;
  } else if (query == 'day' || query == '-d') {
    header = 'THỐNG KÊ TƯƠNG TÁC NGÀY';
    data = threadData.day;
  } else { // Mặc định hiển thị tổng
    data = threadData.total;
  }
  
  // Lấy thông tin người dùng
  for (const item of data) {
    const userName = await Users.getNameUser(item.id) || 'Facebook User';
    storage.push({ ...item, name: userName });
  }
  
  // Sắp xếp theo số tin nhắn giảm dần
  storage.sort((a, b) => {
    if (a.count > b.count) return -1;
    else if (a.count < b.count) return 1;
    else return a.name.localeCompare(b.name);
  });
  
  // Tạo bảng xếp hạng
  var x = threadData.total.sort((a, b) => b.count - a.count);
  var o = x.map((item, index) => ({ rank: index + 1, id: item.id, count: item.count }));
  
  // Kiểm tra loại hiển thị
  let check = ['all', '-a', 'week', '-w', 'day', '-d'].some(e => e == query);
  
  if ((!check && Object.keys(mentions).length == 0) || 
      (!check && Object.keys(mentions).length == 1) || 
      (!check && event.type == 'message_reply')) {
    // Hiển thị thông tin của một người dùng cụ thể
    const UID = event.messageReply ? event.messageReply.senderID : 
                Object.keys(mentions)[0] ? Object.keys(mentions)[0] : senderID;
    
    const userRank = storage.findIndex(e => e.id == UID);
    if (userRank === -1) {
      return api.sendMessage("⚠️ Người dùng này chưa có dữ liệu tương tác", threadID);
    }
    
    const userTotal = threadData.total.find(e => e.id == UID)?.count || 0;
    const userTotalDay = threadData.day.find(e => e.id == UID)?.count || 0;
    const userRankDay = threadData.day.sort((a, b) => b.count - a.count).findIndex(e => e.id == UID) + 1;
    const nameUID = storage[userRank].name || 'Facebook User';
    
    let threadInfo = await api.getThreadInfo(event.threadID);
    const nameThread = threadInfo.threadName;
    
    // Xác định chức vụ
    let permission;
    if (global.config.ADMINBOT.includes(UID)) permission = `Admin Bot`;
    else if (global.config.NDH.includes(UID)) permission = `Người Hỗ Trợ`; 
    else if (threadInfo.adminIDs.some(i => i.id == UID)) permission = `Quản Trị Viên`; 
    else permission = `Thành Viên`;
    
    // Lấy thời gian tương tác gần đây
    let lastInteraction = threadData.lastInteraction && threadData.lastInteraction[UID] 
      ? moment(threadData.lastInteraction[UID]).format('HH:mm:ss DD/MM/YYYY')
      : 'Chưa có';
    
    // Lấy exp từ hệ thống rankup
    let exp = 0;
    try {
      const userData = await Currencies.getData(UID);
      exp = userData.exp;
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu người dùng:", error);
      exp = 0;
    }
    
    const level = LV(exp);
    const realm = getCultivationRealm(level);

    body = `👤 Tên: ${nameUID}\n` +
           `👥 Nhóm: ${nameThread}\n` +
           `🔰 Chức vụ: ${permission}\n` +
           `💬 Tin nhắn hôm nay: ${userTotalDay} (Hạng ${userRankDay})\n` +
           `📝 Tổng tin nhắn: ${userTotal} (Hạng ${userRank + 1})\n` +
           `⏱️ Tương tác gần đây: ${lastInteraction}\n` +
           `🔮 Cảnh giới: ${realm}\n\n` +
           `React "❤️" để xem xếp hạng đầy đủ`;
  } else {
    // Hiển thị bảng xếp hạng tất cả thành viên
    let userList = await Promise.all(storage.map(async item => {
      try {
        const userData = await Currencies.getData(item.id);
        const exp = userData.exp || 0;
        return { ...item, exp };
      } catch (error) {
        return { ...item, exp: 0 };
      }
    }));
    
    userList.sort((a, b) => b.count - a.count);

    body = userList.map((item, index) => {
      const level = LV(item.exp);
      const realm = getCultivationRealm(level);
      return `${index + 1}. ${item.name}: ${item.count} tin nhắn (${realm})`;
    }).join('\n\n');

    footer = `\n\nTổng tin nhắn: ${storage.reduce((a, b) => a + b.count, 0)}`;
  }

  msg = `${header}\n\n${body}${footer}`;
  
  // Thêm hướng dẫn nếu là lệnh xem tất cả
  const guide = (query == 'all' || query == '-a') ? 
    `\n\nHạng của bạn: ${(o.filter(id => id.id == senderID))[0]['rank']}\n\n` +
    `Hướng dẫn:\n` +
    `• Reply tin nhắn này + số thứ tự để xóa thành viên\n` +
    `• ${global.config.PREFIX}check [locmem/reset/ndfb/box/call]` : "";
  
    // Gửi tin nhắn và thiết lập handleReply và handleReaction
  return api.sendMessage(msg + guide, threadID, (error, info) => {
    if (error) return console.log(error);
    
    if (query == 'all' || query == '-a') {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        tag: 'locmen',
        thread: threadID,
        author: senderID,
        storage,
      });
    }
    
    global.client.handleReaction.push({
      name: this.config.name,
      messageID: info.messageID,
      sid: senderID,
    });
  }, event.messageID);
}

// Xử lý phản hồi để xóa thành viên
this.handleReply = async function({ api, event, handleReply, Threads, Users }) {
  try {
    const { senderID } = event;
    if (senderID != handleReply.author) return;
    
    let dataThread = (await Threads.getData(event.threadID)).threadInfo;
    
    if (!dataThread.adminIDs.some(item => item.id == api.getCurrentUserID())) {
      return api.sendMessage('❎ Bot cần quyền quản trị viên!', event.threadID, event.messageID);
    }
    
    if (!dataThread.adminIDs.some(item => item.id == senderID)) {
      return api.sendMessage('❎ Bạn không đủ quyền hạn để lọc thành viên!', event.threadID, event.messageID);
    }
    
    const fs = require('fs');
    let split = event.body.split(" ");

    if (isNaN(split.join(''))) {
      return api.sendMessage(`⚠️ Dữ liệu không hợp lệ`, event.threadID);
    }

    let msg = [], count_err_rm = 0;
    
    for (let $ of split) {
      let id = handleReply?.storage[$ - 1]?.id;

      if (!!id) {
        try {
          await api.removeUserFromGroup(id, event.threadID);
          msg.push(`${$}. ${global.data.userName.get(id)}`);
        } catch (e) {
          ++count_err_rm;
          continue;
        }
      }
    }

    api.sendMessage(
      `✅ Đã xóa ${split.length - count_err_rm} người dùng thành công, thất bại ${count_err_rm}\n\n${msg.join('\n')}`, 
      handleReply.thread
    );
  } catch (e) {
    console.error("Lỗi trong handleReply:", e);
    api.sendMessage("❎ Đã xảy ra lỗi khi xử lý yêu cầu", event.threadID);
  }
}

// Xử lý phản ứng để xem bảng xếp hạng đầy đủ
this.handleReaction = async function({ event, api, handleReaction, Threads, Users, Currencies }) {
  try {
    if (event.userID != handleReaction.sid) return;
    if (event.reaction != "❤") return;

    const threadID = event.threadID;
    const fs = require('fs');
    let path_data = path + threadID + '.json';
    
    if (!fs.existsSync(path_data)) {
      return api.sendMessage("⚠️ Không tìm thấy dữ liệu cho nhóm này", threadID);
    }

    let threadData = JSON.parse(fs.readFileSync(path_data));
  
    // Lấy thông tin người dùng kèm cảnh giới tu tiên
    let userList = await Promise.all(threadData.total.map(async item => {
      try {
        const userData = await Currencies.getData(item.id);
        const name = await Users.getNameUser(item.id) || 'Facebook User';
        const exp = userData.exp || 0;
        return { ...item, name, exp };
      } catch (error) {
        console.error(`Lỗi khi xử lý người dùng ${item.id}:`, error);
        return { ...item, name: 'Không xác định', exp: 0 };
      }
    }));

    userList.sort((a, b) => b.count - a.count);

    // Tạo bảng xếp hạng đẹp mắt
    let msg = `XẾP HẠNG TƯƠNG TÁC\n\n`;
    
    msg += userList.map((item, index) => {
      const level = LV(item.exp);
      const realm = getCultivationRealm(level);
      return `${index + 1}. ${item.name}: ${item.count} tin nhắn (${realm})`;
    }).join('\n');

    msg += `\n\n\n\n`;
    msg += `💬 Tổng tin nhắn: ${userList.reduce((s, $) => s + $.count, 0)}\n`;
    msg += `🏆 Bạn đang đứng hạng: ${userList.findIndex($ => $.id == event.userID) + 1}\n`;
    msg += `\n\n`;
    msg += `📝 Hướng dẫn lọc thành viên:\n`;
    msg += `👉 Reply tin nhắn này + số thứ tự để xóa thành viên\n`;
    msg += `👉 ${global.config.PREFIX}check locmem + số để xóa thành viên ít hơn số tin nhắn đó\n`;
    msg += `👉 ${global.config.PREFIX}check reset → reset dữ liệu tương tác\n`;
    msg += `👉 ${global.config.PREFIX}check ndfb → kick người dùng Facebook bị khóa\n`;
    msg += `👉 ${global.config.PREFIX}check box → xem thông tin nhóm\n`;
    msg += `👉 ${global.config.PREFIX}check call → tag những người dưới 5 tin nhắn`;

    api.unsendMessage(handleReaction.messageID);

    // Thêm dòng này để kiểm tra nội dung tin nhắn trước khi gửi
    // console.log("Nội dung tin nhắn:", msg);


    return api.sendMessage(msg, threadID, (err, info) => {
      if (err) {
        console.error("Lỗi khi gửi tin nhắn:", err);
        return api.sendMessage("❎ Đã xảy ra lỗi khi gửi tin nhắn", threadID);
      }
      
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        tag: 'locmen',
        thread: threadID,
        author: event.userID,
        storage: userList,
      });
    });
  } catch (error) {
    console.error("Lỗi trong handleReaction:", error);
    api.sendMessage("❎ Đã xảy ra lỗi khi xử lý phản ứng", event.threadID);
  }
}

function getCultivationRealm(level) {
  const realms = [
    { name: "Luyện Khí", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Trúc Cơ", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Khai Quang", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Kim Đan", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Nguyên Anh", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Hóa Thần", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Phản Hư", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Luyện Hư", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Hợp Thể", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Đại Thừa", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Độ Kiếp", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Thiên Tiên", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Chân Tiên", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Kim Tiên", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Thánh Nhân", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Đại Thánh", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Tiên Đế", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Tiên Tôn", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Hỗn Độn", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
    { name: "Vô Cực", levels: 1, subRealms: ["Viên Mãn"] }
  ];

  let currentLevel = 0;
  for (let realm of realms) {
    if (level > currentLevel && level <= currentLevel + realm.levels) {
      const subRealmIndex = Math.floor((level - currentLevel - 1) / (realm.levels / realm.subRealms.length));
      return `${realm.name} ${realm.subRealms[subRealmIndex]}`;
    }
    currentLevel += realm.levels;
  }

  return "Phàm Nhân";
}

function LV(exp) {
  return Math.floor((Math.sqrt(1 + (4 * exp) / 3) + 1) / 2);
}

