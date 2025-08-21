const fs = require('fs');

module.exports.config = {
    name: 'dovui',
    version: '10.03',
    hasPermssion: 0,
    credits: 'DC-Nam & Modified by Copilot',
    description: 'Trò chơi đố vui có thưởng',
    commandCategory: 'Game',
    usages: '[start/stop]',
    cooldowns: 15,
    dependencies: {
        'axios': ''
    }
};

const config = {
    reward: {
        max: 2000,
        min: 1000
    },
    timeLimit: 30000 // 30 seconds
};

const formatMoney = n => ((+n).toLocaleString()).replace(/,/g, '.');

module.exports.run = async function({ api, event, args }) {
    const command = args[0]?.toLowerCase();
    if (command === 'stop') {
        const gameData = global.gameData || {};
        if (gameData[event.threadID]) {
            clearTimeout(gameData[event.threadID].timer);
            delete gameData[event.threadID];
            return api.sendMessage('> Đã dừng trò chơi!', event.threadID);
        }
        return api.sendMessage('> Không có trò chơi nào đang diễn ra!', event.threadID);
    }
    runRiddle({ api, event, autoNext: false, author: event.senderID });
};

module.exports.handleReaction = function({ handleReaction: $, api, event }) {
    if (event.userID != $.author) return;
    runRiddle({
        api, event, autoNext: event.reaction == '😆' ? ( $.autoNext ? false: true): false, author: $.author
    });
};

module.exports.handleReply = async function({ handleReply: $, api, event, Currencies }) {
    const gameData = global.gameData || {};
    const threadGame = gameData[event.threadID];
    if (!threadGame) return;

    const index = $.data.option[(+event.args[0])-1];
    if (event.senderID != $.author || isNaN(event.args[0]) || !index) return;

    clearTimeout(threadGame.timer);
    delete gameData[event.threadID];
    
    api.unsendMessage($.messageID);
    const isCorrect = index == $.data.correct;
    const reward = randomNumber(config.reward);
    
    try {
        if (isCorrect) {
            await Currencies.increaseMoney(event.senderID, reward);
        }
        
        const message = isCorrect ? 
            `🎉 Chính xác!\n> Đáp án: ${$.data.correct}\n> +${formatMoney(reward)}$` :
            `❌ Sai rồi!\n> Đáp án đúng: ${$.data.correct}`;
            
        api.sendMessage(message + '\n\n> Reaction để chơi tiếp!\n> Reaction 😆 để ' + ($.autoNext ? 'tắt' : 'bật') + ' tự động!', event.threadID, (err, msg) => {
            if (err) return console.error(err);
            global.client.handleReaction.push({
                name: 'dovui',
                messageID: msg.messageID,
                autoNext: $.autoNext,
                author: $.author
            });
            if ($.autoNext) runRiddle({ api, event, autoNext: true, author: event.senderID });
        });
    } catch (err) {
        console.error(err);
        api.sendMessage('→ Đã xảy ra lỗi!', event.threadID);
    }
};

function runRiddle({ api, event, autoNext, author }) {
    fs.readFile('modules/commands/data/dovui.json', 'utf8', (err, data) => {
        if (err) {
            console.error(`Lỗi đọc file: ${err}`);
            return api.sendMessage('> Đã xảy ra lỗi!', event.threadID);
        }

        const databases = JSON.parse(data);
        const randomIndex = Math.floor(Math.random() * databases.length);
        const { question, option, correct } = databases[randomIndex];
        
        // Kiểm tra game đang chạy
        const gameData = global.gameData || {};
        if (gameData[event.threadID]) {
            return api.sendMessage('> Đang có một câu đố chưa được trả lời!', event.threadID);
        }

        // Setup game timer
        gameData[event.threadID] = {
            timer: setTimeout(() => {
                api.sendMessage(`⌛ Hết giờ!\n> Đáp án đúng: ${correct}`, event.threadID);
                delete gameData[event.threadID];
            }, config.timeLimit)
        };
        global.gameData = gameData;

        // Gửi câu hỏi
        const message = `❓ ĐỐ VUI CÓ THƯỞNG ❓\n\n> ${question}\n\n${option.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}\n\n⏰ Thời gian: 30 giây\n💰 Thưởng: ${formatMoney(config.reward.max)}$`;
        
        api.sendMessage(message, event.threadID, (err, msg) => {
            if (err) return console.error(err);
            global.client.handleReply.push({
                name: 'dovui',
                messageID: msg.messageID,
                author,
                autoNext,
                data: databases[randomIndex]
            });
        });
    });
};

function randomNumber({ min = 0x0, max = 0x0 }) {
    return Math.floor(Math.random()*(max-min+0x1))+min;
};