module.exports.config = {
    name: "qtvonly",
    version: "2.0",
    hasPermssion: 1,
    credits: "D-Jukie fix Kadeer - Nâng cấp bởi Trae AI",
    description: "Bật/tắt chế độ chỉ quản trị viên nhóm mới có thể sử dụng bot",
    commandCategory: "group",
    usages: "qtvonly [on/off/list/help]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "moment-timezone": ""
    }
};

module.exports.onLoad = function() {
    const { writeFileSync, existsSync } = require('fs-extra');
    const { resolve } = require("path");
    const path = resolve(__dirname, 'cache', 'data.json');
    if (!existsSync(path)) {
        const obj = {
            adminbox: {}
        };
        writeFileSync(path, JSON.stringify(obj, null, 4));
    } else {
        const data = require(path);
        if (!data.hasOwnProperty('adminbox')) data.adminbox = {};
        writeFileSync(path, JSON.stringify(data, null, 4));
    }
}
module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const moment = require("moment-timezone");
    const time = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss");
    const { resolve } = require("path");
    const { writeFileSync, readFileSync } = require('fs-extra');
    const pathData = resolve(__dirname, 'cache', 'data.json');
    const database = require(pathData);
    const { adminbox } = database;
    
    // Kiểm tra xem người dùng có phải là admin bot không
    const isAdmin = global.config.ADMINBOT && global.config.ADMINBOT.includes(senderID);
    
    // Lấy thông tin nhóm
    let threadInfo;
    try {
        threadInfo = await api.getThreadInfo(threadID);
    } catch (error) {
        return api.sendMessage("❌ Không thể lấy thông tin nhóm!", threadID, messageID);
    }
    
    // Kiểm tra xem người dùng có phải là quản trị viên nhóm không
    const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
    
    // Hàm hiển thị trạng thái hiện tại của nhóm
    const showStatus = () => {
        const status = adminbox[threadID] ? "✅ Đang bật" : "❌ Đang tắt";
        return `📊 Trạng thái chế độ QTV Only: ${status}\n⏰ Cập nhật: ${time}`;
    };
    
    // Xử lý các lệnh
    const command = args[0];
    
    if (!command) {
        // Hiển thị trạng thái và menu trợ giúp
        return api.sendMessage(
            `${showStatus()}\n\n📝 Sử dụng:\n- qtvonly on: Bật chế độ QTV Only\n- qtvonly off: Tắt chế độ QTV Only\n- qtvonly list: Xem danh sách nhóm đang bật\n- qtvonly help: Xem hướng dẫn chi tiết`, 
            threadID, 
            messageID
        );
    }
    
    switch(command.toLowerCase()) {
        case "on":
        case "bật":
            if (!isAdmin && !isGroupAdmin) {
                return api.sendMessage("❌ Bạn không có quyền sử dụng lệnh này! Chỉ QTV nhóm và Admin bot mới có thể bật/tắt chế độ.", threadID, messageID);
            }
            
            adminbox[threadID] = true;
            api.sendMessage(
                `✅ Đã bật chế độ QTV Only\n⏰ Thời gian: ${time}\n👤 Người thực hiện: ${isAdmin ? "Admin Bot" : "Quản trị viên nhóm"}\n\n📢 Chỉ QTV nhóm và Admin bot mới có thể sử dụng bot trong nhóm này!`,
                threadID,
                messageID
            );
            break;
            
        case "off":
        case "tắt":
            if (!isAdmin && !isGroupAdmin) {
                return api.sendMessage("❌ Bạn không có quyền sử dụng lệnh này! Chỉ QTV nhóm và Admin bot mới có thể bật/tắt chế độ.", threadID, messageID);
            }
            
            adminbox[threadID] = false;
            api.sendMessage(
                `✅ Đã tắt chế độ QTV Only\n⏰ Thời gian: ${time}\n👤 Người thực hiện: ${isAdmin ? "Admin Bot" : "Quản trị viên nhóm"}\n\n📢 Tất cả thành viên có thể sử dụng bot trong nhóm này!`,
                threadID,
                messageID
            );
            break;
            
        case "list":
        case "danh_sách":
            // Chỉ admin bot mới có thể xem danh sách
            if (!isAdmin) {
                return api.sendMessage("❌ Chỉ Admin bot mới có thể xem danh sách nhóm đang bật chế độ QTV Only!", threadID, messageID);
            }
            
            // Lấy danh sách nhóm đang bật chế độ QTV Only
            const enabledGroups = Object.entries(adminbox)
                .filter(([id, enabled]) => enabled === true)
                .map(([id]) => id);
                
            if (enabledGroups.length === 0) {
                return api.sendMessage("📊 Hiện không có nhóm nào đang bật chế độ QTV Only!", threadID, messageID);
            }
            
            let msg = `📊 Danh sách ${enabledGroups.length} nhóm đang bật chế độ QTV Only:\n\n`;
            
            // Lấy thông tin tên nhóm
            for (let i = 0; i < enabledGroups.length; i++) {
                try {
                    const info = await api.getThreadInfo(enabledGroups[i]);
                    msg += `${i+1}. ${info.threadName || "Không xác định"} (ID: ${enabledGroups[i]})\n`;
                } catch (error) {
                    msg += `${i+1}. Không thể lấy thông tin (ID: ${enabledGroups[i]})\n`;
                }
                
                // Giới hạn số lượng nhóm hiển thị để tránh tin nhắn quá dài
                if (i >= 14) {
                    msg += `\n... và ${enabledGroups.length - 15} nhóm khác`;
                    break;
                }
            }
            
            api.sendMessage(msg, threadID, messageID);
            break;
            
        case "help":
        case "hướng_dẫn":
            api.sendMessage(
                `📌 Hướng dẫn sử dụng lệnh QTV Only:\n\n` +
                `1️⃣ qtvonly: Hiển thị trạng thái hiện tại\n` +
                `2️⃣ qtvonly on: Bật chế độ QTV Only\n` +
                `3️⃣ qtvonly off: Tắt chế độ QTV Only\n` +
                `4️⃣ qtvonly list: Xem danh sách nhóm đang bật (chỉ Admin)\n\n` +
                `📝 Chú thích:\n` +
                `- Khi bật chế độ QTV Only, chỉ QTV nhóm và Admin bot mới có thể sử dụng bot\n` +
                `- Chỉ QTV nhóm và Admin bot mới có thể bật/tắt chế độ này\n` +
                `- Chỉ Admin bot mới có thể xem danh sách nhóm đang bật chế độ`,
                threadID,
                messageID
            );
            break;
            
        default:
            api.sendMessage(`❌ Lệnh không hợp lệ! Sử dụng 'qtvonly help' để xem hướng dẫn.`, threadID, messageID);
    }
    
    // Lưu cài đặt vào file data.json
    writeFileSync(pathData, JSON.stringify(database, null, 4));
}