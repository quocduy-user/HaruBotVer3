const fs = require('fs');
const path = require('path');
const axios = require("axios");
const { ECONOMY_CONFIG, checkBettingLimits, checkDailyLimits, updateDailyEarnings } = require('../../utils/economyConfig.js');

module.exports.config = {
  name: "taixiu",
  version: "1.7.0",
  hasPermssion: 0,
  credits: "DungUwU mod by Claude",
  description: "taixiu nhiều người có ảnh, lịch sử và nổ hũ",
  commandCategory: "Game",
  usages: "[create/leave/start/info]",
  cooldowns: 60
};

let dice_images = [
"https://i.imgur.com/cmdORaJ.jpg",
"https://i.imgur.com/WNFbw4O.jpg",
"https://i.imgur.com/Xo6xIX2.jpg", 
"https://i.imgur.com/NJJjlRK.jpg",
"https://i.imgur.com/QLixtBe.jpg",
"https://i.imgur.com/y8gyJYG.jpg"
];

module.exports.run = async function({ api, event, args, Users, Threads, Currencies }) {
  const { threadID, messageID, senderID } = event;

  if (!global.client.taixiu_ca) global.client.taixiu_ca = {};
  
  const moneyUser = (await Currencies.getData(senderID)).money;
  const sendC = (msg, callback) => api.sendMessage(msg, threadID, callback, messageID);
  const send = (msg) => sendC(msg, () => {});
  const threadSetting = (await Threads.getData(String(threadID))).data || {};
  const prefix = threadSetting.hasOwnProperty("PREFIX") ? threadSetting.PREFIX : global.config.PREFIX;

  if (!args[0]) {
    return sendC(`🎲 GAME LẮC TÀI XỈU 🎲\n────────────────\n${prefix}${this.config.name} create → Tạo bàn\n${prefix}${this.config.name} leave → Rời bàn\n${prefix}${this.config.name} xổ → Bắt đầu\n${prefix}${this.config.name} info → Thông tin bàn\n${prefix}${this.config.name} end → Kết thúc bàn`);
  }

  const moneyBet = args[1]?.match(/\d+/)
    ? args[1].toLowerCase().replace(/k/g, "000").replace(/m/g, "000000").replace(/b/g, "000000000")
    : null;

  switch (args[0]) {
    case "create": {
      if (threadID in global.client.taixiu_ca) {
        if (!global.client.taixiu_ca[threadID].play) {
          if (global.client.taixiu_ca[threadID].id === senderID) {
            if (global.client.taixiu_ca[threadID].create === "false") {
              return sendC(
                "Bàn cũ end chưa được 2p\nVui lòng chờ hết 2p hãy tạo bàn mới\n\nBạn có thể thả ❤️ tin nhắn này để dùng 10% số tiền để tạo bàn nhanh (Lưu ý bạn phải có số dư trên 1,000,000 VND)",
                (e, info) => {
                  global.client.handleReaction.push({
                    type: "create",
                    name: this.config.name,
                    author: senderID,
                    messageID: info.messageID,
                    moneyUser,
                  });
                }
              );
            }
          }
        }
        if (global.client.taixiu_ca[threadID].play) {
          return send("❎ Đang có 1 ván tài xỉu diễn ra ở nhóm này!");
        }
      }

      sendC("✅ Tạo thành công bàn tài xỉu!\n\n📌 Để tham gia cược, hãy ghi: tài/xỉu + số tiền cược\n\n🎲 Bàn sẽ tự động hủy nếu không được xổ trong 4 phút", () => {
        global.client.taixiu_ca[threadID] = {
          players: 0,
          data: {},
          play: true,
          status: "pending",
          author: senderID,
        };
      });

      setTimeout(async () => {
        if (!global.client.taixiu_ca[threadID]?.data) return;
        // Auto-cancel table after 4 minutes if not rolled; refund all bets exactly, do not charge host
        const refunds = [];
        for (const id in global.client.taixiu_ca[threadID].data) {
          const name = (await Users.getNameUser(id)) || "Player";
          const playerBet = global.client.taixiu_ca[threadID].data[id].bet;
          await Currencies.increaseMoney(id, playerBet);
          refunds.push(`👤 ${name}: +${playerBet.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND`);
        }
        if (refunds.length > 0) {
          api.sendMessage(`⏳ Bàn tài xỉu đã tự động hủy do quá thời gian.\n💸 Hoàn tiền:\n${refunds.join('\n')}`, threadID);
        }
        delete global.client.taixiu_ca[threadID];
      }, 240000);
      return;
    }

    case "leave": {
      if (!global.client.taixiu_ca[threadID]) 
        return send("❎ Nhóm của bạn không có ván tài xỉu nào đang diễn ra!");
      
      if (!global.client.taixiu_ca[threadID].data[senderID])
        return send("❎ Bạn chưa tham gia tài xỉu ở nhóm này!");
      
      global.client.taixiu_ca[threadID].players--;
      const refundAmount = global.client.taixiu_ca[threadID].data[senderID].bet;
      await Currencies.increaseMoney(senderID, refundAmount);
      delete global.client.taixiu_ca[threadID].data[senderID];
      
      send(`✅ Đã rời ván tài xỉu thành công!\n💸 Hoàn tiền: ${refundAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND`);
      return;
    }

    case "end": {
      if (global.client.taixiu_ca[threadID]?.author !== senderID)
        return send("❎ Bạn không phải chủ phòng!");

      delete global.client.taixiu_ca[threadID];
      global.client.taixiu_ca[threadID] = { id: senderID, create: "false" };
      
      send("🏁 Đã xóa bàn thành công!");
      
      setTimeout(() => {
        global.client.taixiu_ca[threadID] = { create: true };
      }, 180000);
      break;
    }

    case "info": {
      if (!global.client.taixiu_ca[threadID])
        return send("❎ Nhóm của bạn không có ván tài xỉu nào đang diễn ra!");
      
      if (global.client.taixiu_ca[threadID].players == 0)
        return send("❎ Hiện không có người đặt cược");

      const playerList = [];
      const authorName = await Users.getNameUser(global.client.taixiu_ca[threadID].author) || "Player";
      
      for (const id in global.client.taixiu_ca[threadID].data) {
        const name = await Users.getNameUser(id) || "Player";
        const player = global.client.taixiu_ca[threadID].data[id];
        playerList.push(`👤 ${name}: ${player.name} - ${player.bet.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND`);
      }

      send(`📊 [ THÔNG TIN BÀN TÀI XỈU ]\n👑 Chủ phòng: ${authorName}\n\n👥 Người tham gia:\n${playerList.join("\n")}`);
      return;
    }

    default: {
      return send(`❌ Lệnh không hợp lệ! Sử dụng: ${prefix}help ${this.config.name}`);
    }
  }
};

module.exports.handleEvent = async function ({ api, event, args, Currencies, Users }) {
  const { threadID, messageID, body, senderID } = event;
  if (!global.client.taixiu_ca?.[threadID]?.play) return;

  const moneyUser = (await Currencies.getData(senderID)).money;
  const sendC = (msg, callback) => api.sendMessage(msg, threadID, callback, messageID);
  const send = (msg) => sendC(msg, () => {});

  if (!body || typeof body !== 'string') return;

  const [command, betAmount] = body.toLowerCase().split(" ");
  if (!["tài", "tai", "xỉu", "xiu", "xổ", "xo"].includes(command)) return;

  let moneyBet = betAmount;
  if (betAmount?.toLowerCase() === "all") {
    moneyBet = moneyUser;
  } else {
    if (betAmount) {
      moneyBet = betAmount.toLowerCase()
        .replace(/k/g, "000")
        .replace(/m/g, "000000")
        .replace(/b/g, "000000000");
      moneyBet = parseInt(moneyBet);
      if (isNaN(moneyBet)) moneyBet = 0;
    }
  }

  switch (command) {
    case "tài":
    case "tai":
    case "xỉu": 
    case "xiu": {
      if (!global.client.taixiu_ca[threadID])
        return send("❎ Nhóm của bạn không có ván tài xỉu nào đang diễn ra!");
      
      if (!moneyBet)
        return send("❎ Vui lòng nhập số tiền cược!");
        
      if (moneyBet <= 0)
        return send("❎ Số tiền cược phải lớn hơn 0!");
        
      const bettingValidation = checkBettingLimits(moneyBet, moneyUser);
      if (!bettingValidation.isValid) {
        return send(`❎ ${bettingValidation.message}`);
      }

      if (global.client.taixiu_ca[threadID].status === "pending") {
        const betChoice = command;
        const formattedBet = moneyBet.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        if (!global.client.taixiu_ca[threadID].data[senderID]) {
          global.client.taixiu_ca[threadID].players++;
        } else {
          return sendC(
            `Bạn đã đặt cược ${global.client.taixiu_ca[threadID].data[senderID].name}\nBạn chắc chắn muốn thay đổi thành ${betChoice} với số tiền ${formattedBet} VND?\nThả ❤ để xác nhận`,
            (e, info) => {
              global.client.handleReaction.push({
                type: "confirm",
                name: this.config.name,
                author: senderID,
                messageID: info.messageID,
                betChoice,
                moneyBet,
              });
            }
          );
        }

        return sendC(
          `✅ Đặt cược thành công ${formattedBet} VND vào ${betChoice} 🎰`,
          async () => {
            await Currencies.decreaseMoney(senderID, moneyBet);
            global.client.taixiu_ca[threadID].data[senderID] = {
              name: betChoice,
              bet: moneyBet
            };
          }
        );
      }
      return;
    }

    case "xổ":
    case "xo": {
      if (!global.client.taixiu_ca[threadID])
        return send("❎ Nhóm của bạn không có ván tài xỉu nào đang diễn ra!");
        
      if (global.client.taixiu_ca[threadID].author != senderID)
        return send("❎ Bạn không phải chủ phòng!");
        
      if (global.client.taixiu_ca[threadID].players == 0)
        return send("❎ Chưa có người đặt cược!");

      send("⏳ Đang lắc xúc xắc...");

      // Roll dice
      const rolls = [
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6)
      ];
      const totalDice = rolls.reduce((a, b) => a + b, 0);
      
      // Get dice images
      const diceImages = await Promise.all(
        rolls.map(roll => 
          axios.get(dice_images[roll - 1], { responseType: "stream" })
            .then(response => response.data)
        )
      );

      let msg = "🎉 KẾT QUẢ TÀI XỈU 🎉";
      const gameResult = totalDice > 10 ? 'tài' : 'xỉu';
      const tai = [], xiu = [], winners = [];
      
      // Ensure game directory exists and load/initialize jackpot data
      const gameDir = path.join(__dirname, 'game');
      if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true });
      const jackpotPath = path.join(gameDir, 'taixiu_jackpot.json');
      const historyPath = path.join(gameDir, 'taixiu_history.json');
      
      let jackpotInfo = { amount: 10000, lastWin: null };
      if (fs.existsSync(jackpotPath)) {
        jackpotInfo = JSON.parse(fs.readFileSync(jackpotPath, 'utf8'));
      }
      
      let history = [];
      if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      }

      const contributionInfo = [];
      const jackpotMessages = [];

      // Process bets and update balances
      for (const id in global.client.taixiu_ca[threadID].data) {
        const name = await Users.getNameUser(id);
        const player = global.client.taixiu_ca[threadID].data[id];const result = player.name;
        const bet = player.bet;
        const resultList = result === 'tài' ? tai : xiu;

        if (result === gameResult) {
          // Người thắng
          let winAmount = Math.floor(bet * 1.97);
          const userData = await Currencies.getData(id);

          // Kiểm tra giới hạn thắng cược hàng ngày
          if (!checkDailyLimits(userData, winAmount)) {
              const maxWin = ECONOMY_CONFIG.DAILY_LIMITS.MAX_GAME_EARNINGS - (userData.data?.dailyEarnings?.games || 0);
              if (maxWin > 0) {
                  winAmount = maxWin;
                  api.sendMessage(`Bạn đã đạt giới hạn thắng cược từ trò chơi hôm nay. Phần thưởng của bạn được điều chỉnh thành ${winAmount.toLocaleString('vi-VN')}đ.`, threadID);
              } else {
                  api.sendMessage(`Bạn đã đạt giới hạn thắng cược từ trò chơi hôm nay. Bạn không nhận được thêm tiền.`, threadID);
                  winAmount = 0;
              }
          }

          if (winAmount > 0) {
              await Currencies.increaseMoney(id, winAmount);
              updateDailyEarnings(userData, 'games', winAmount);
              await Currencies.setData(id, { data: userData.data });
          }
          resultList.push(`👤 ${name}: +${winAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND`);
          winners.push({ id, bet });

          // Đóng góp vào hũ khi thắng (3%)
          const contribution = Math.floor(bet * 0.03);
          jackpotInfo.amount += contribution;
          contributionInfo.push(`👤 ${name}: ${contribution.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND`);
        } else {
          // Người thua
          resultList.push(`👤 ${name}: -${bet.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND`);
          jackpotInfo.amount += bet;
          contributionInfo.push(`👤 ${name}: ${bet.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND`);
        }
      }

      // Kiểm tra nổ hũ (0.5%)
      if (Math.random() < 0.005 && winners.length > 0) {
        const totalBet = winners.reduce((sum, w) => sum + w.bet, 0);
        for (const winner of winners) {
          const proportion = winner.bet / totalBet;
          const jackpotWin = Math.floor(jackpotInfo.amount * proportion);
          await Currencies.increaseMoney(winner.id, jackpotWin);
          const winnerName = await Users.getNameUser(winner.id);
          jackpotMessages.push(`🏆 ${winnerName}: +${jackpotWin.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND`);
        }
        msg += `\n\n🎉🎉🎉 JACKPOT NỔ! 🎉🎉🎉\n${jackpotMessages.join('\n')}`;
        jackpotInfo.lastWin = { 
          winners: jackpotMessages, 
          amount: jackpotInfo.amount, 
          time: new Date().toISOString() 
        };
        jackpotInfo.amount = 10000;
      }

      // Cập nhật lịch sử
      history.push(gameResult);
      if (history.length > 100) history.shift();

      // Lưu thông tin jackpot và lịch sử
      fs.writeFileSync(jackpotPath, JSON.stringify(jackpotInfo, null, 2));
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

      const lastResults = history.slice(-9).map(result => result === 'tài' ? '⚫' : '⚪').join(' ');

      msg += `\n\n🎲 Kết quả: ${gameResult.toUpperCase()} (${totalDice})\n`;
      msg += `📊 Phiên gần đây:\n${lastResults}\n\n`;
      msg += `💰 [ NHỮNG NGƯỜI ĐẶT TÀI ]\n${tai.join("\n")}\n`;
      msg += `──────────────\n`;
      msg += `💰 [ NHỮNG NGƯỜI ĐẶT XỈU ]\n${xiu.join("\n")}\n`;
      msg += `\n🏆 Tiền trong hũ hiện tại: ${jackpotInfo.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND`;
      msg += `\n💰 Đóng góp vào hũ:\n${contributionInfo.join('\n')}`;

      if (jackpotInfo.lastWin) {
        msg += `\n🎉 Lần nổ hũ gần nhất:\n${jackpotInfo.lastWin.winners.join('\n')}\nVào lúc: ${new Date(jackpotInfo.lastWin.time).toLocaleString()}`;
      }

      sendC(
        {
          body: msg,
          attachment: diceImages
        },
        () => {
          delete global.client.taixiu_ca[threadID];
          global.client.taixiu_ca[threadID] = {
            id: senderID,
            create: "false"
          };
          setTimeout(() => {
            global.client.taixiu_ca[threadID] = {
              create: true
            };
          }, 180000);
        }
      );
      return;
    }
  }
}

module.exports.handleReaction = async function({ api, event, handleReaction, Currencies, Users }) {
  const { threadID, userID, reaction } = event;
  if (reaction != "❤") return;
  if (userID != handleReaction.author) return;

  const { messageID } = handleReaction;

  // Support different reaction types: confirm bet change, quick create
  switch (handleReaction.type) {
    case 'confirm': {
      const { betChoice, moneyBet } = handleReaction;
      if (!global.client.taixiu_ca[threadID]?.play || global.client.taixiu_ca[threadID].status !== 'pending') {
        return api.sendMessage("❎ Bàn đã kết thúc hoặc không còn ở trạng thái chờ.", threadID, messageID);
      }

      // Ensure same user
      const balance = (await Currencies.getData(userID)).money;
      if (moneyBet > balance) {
        return api.sendMessage("❎ Số tiền đặt lớn hơn số dư!", threadID, messageID);
      }

      // Refund previous bet if any
      const prev = global.client.taixiu_ca[threadID].data[userID];
      if (prev?.bet) {
        await Currencies.increaseMoney(userID, prev.bet);
      }

      // Deduct new bet and save
      await Currencies.decreaseMoney(userID, moneyBet);
      global.client.taixiu_ca[threadID].data[userID] = {
        name: betChoice,
        bet: moneyBet
      };

      return api.sendMessage(
        `✅ Đã cập nhật cược!\nLựa chọn: ${betChoice}\nSố tiền: ${moneyBet.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND`,
        threadID,
        messageID
      );
    }
    case 'create': {
      // Quick create: allow bypass cooldown with 10% fee if balance >= 1,000,000
      const balance = (await Currencies.getData(userID)).money;
      if (balance < 1000000) {
        return api.sendMessage("❎ Bạn cần số dư tối thiểu 1,000,000 VND để tạo bàn nhanh.", threadID, messageID);
      }
      const fee = Math.floor(balance * 0.10);
      await Currencies.decreaseMoney(userID, fee);
      global.client.taixiu_ca[threadID] = {
        players: 0,
        data: {},
        play: true,
        status: 'pending',
        author: userID
      };
      return api.sendMessage(
        `✅ Đã tạo bàn tài xỉu nhanh!\n💸 Phí: ${fee.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} VND\n📌 Gõ: tài/xỉu + số tiền`,
        threadID,
        messageID
      );
    }
    default:
      return;
  }
};