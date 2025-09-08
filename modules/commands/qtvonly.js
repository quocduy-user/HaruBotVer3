module.exports.config = {
    name: "qtvonly",
    version: "3.0",
    hasPermssion: 1,
    credits: "D-Jukie fix Kadeer - Nâng cấp bởi HaruBot Team",
    description: "Quản lý chế độ QTV Only với nhiều tính năng nâng cao",
    commandCategory: "group",
    usages: "qtvonly [on/off/list/help/stats/auto/schedule]",
    cooldowns: 3,
    dependencies: {
        "fs-extra": "",
        "moment-timezone": ""
    }
};

module.exports.onLoad = function() {
    const { writeFileSync, existsSync, ensureDirSync } = require('fs-extra');
    const { resolve } = require("path");
    const cachePath = resolve(__dirname, 'cache');
    const dataPath = resolve(cachePath, 'qtvonly_data.json');
    const oldDataPath = resolve(__dirname, 'data', 'dataAdbox.json');
    
    try {
        // Ensure cache directory exists
        ensureDirSync(cachePath);
        
        if (!existsSync(dataPath)) {
            const defaultData = {
                adminbox: {},
                settings: {},
                logs: [],
                stats: {
                    totalToggled: 0,
                    lastUpdated: Date.now()
                }
            };
            
            // Migration from old dataAdbox.json if exists
            if (existsSync(oldDataPath)) {
                try {
                    const oldData = require(oldDataPath);
                    if (oldData.adminbox) {
                        defaultData.adminbox = oldData.adminbox;
                        defaultData.stats.totalToggled = Object.keys(oldData.adminbox).length;
                        console.log('[QTVONLY] Migrated data from dataAdbox.json');
                    }
                } catch (migrationError) {
                    console.error('[QTVONLY] Migration error:', migrationError.message);
                }
            }
            
            writeFileSync(dataPath, JSON.stringify(defaultData, null, 4));
        } else {
            const data = require(dataPath);
            let needUpdate = false;
            
            // Ensure all required properties exist
            if (!data.adminbox) { data.adminbox = {}; needUpdate = true; }
            if (!data.settings) { data.settings = {}; needUpdate = true; }
            if (!data.logs) { data.logs = []; needUpdate = true; }
            if (!data.stats) { 
                data.stats = { totalToggled: 0, lastUpdated: Date.now() }; 
                needUpdate = true; 
            }
            
            if (needUpdate) {
                writeFileSync(dataPath, JSON.stringify(data, null, 4));
            }
        }
        
        console.log('[QTVONLY] Module loaded successfully!');
    } catch (error) {
        console.error('[QTVONLY] Error during onLoad:', error.message);
    }
}
// Helper functions
const saveData = (pathData, database) => {
    try {
        const { writeFileSync } = require('fs-extra');
        writeFileSync(pathData, JSON.stringify(database, null, 4));
        return true;
    } catch (error) {
        console.error('[QTVONLY] Error saving data:', error.message);
        return false;
    }
};

const addLog = (database, action, threadID, senderID, isAdmin) => {
    const moment = require("moment-timezone");
    const logEntry = {
        action,
        threadID,
        senderID,
        isAdmin,
        timestamp: Date.now(),
        time: moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss")
    };
    
    if (!database.logs) database.logs = [];
    database.logs.unshift(logEntry); // Add to beginning
    
    // Keep only last 100 logs
    if (database.logs.length > 100) {
        database.logs = database.logs.slice(0, 100);
    }
};

module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    const moment = require("moment-timezone");
    const time = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss");
    const { resolve } = require("path");
    const { writeFileSync, readFileSync } = require('fs-extra');
    const pathData = resolve(__dirname, 'cache', 'qtvonly_data.json');
    
    let database;
    try {
        database = require(pathData);
    } catch (error) {
        return api.sendMessage("❌ Lỗi khi đọc dữ liệu! Vui lòng thử lại.", threadID, messageID);
    }
    
    const { adminbox, settings, stats } = database;
    
    // Ensure stats object exists
    if (!database.stats) {
        database.stats = { totalToggled: 0, lastUpdated: Date.now() };
    }
    
    // Kiểm tra xem người dùng có phải là admin bot không
    const isAdmin = global.config.ADMINBOT && global.config.ADMINBOT.includes(senderID);
    const isNDH = global.config.NDH && global.config.NDH.includes(senderID);
    const isSuperAdmin = isAdmin || isNDH;
    
    // Lấy thông tin nhóm
    let threadInfo;
    try {
        threadInfo = await api.getThreadInfo(threadID);
    } catch (error) {
        console.error('[QTVONLY] Error getting thread info:', error.message);
        return api.sendMessage("❌ Không thể lấy thông tin nhóm! Vui lòng thử lại sau.", threadID, messageID);
    }
    
    // Kiểm tra xem người dùng có phải là quản trị viên nhóm không
    const isGroupAdmin = threadInfo.adminIDs && threadInfo.adminIDs.some(item => item.id == senderID);
    const canManage = isSuperAdmin || isGroupAdmin;
    
    // Hàm hiển thị trạng thái chi tiết
    const showStatus = async () => {
        const isEnabled = adminbox[threadID] === true;
        const status = isEnabled ? "🟢 Đang bật" : "🔴 Đang tắt";
        const threadName = threadInfo.threadName || "Không xác định";
        const memberCount = threadInfo.participantIDs ? threadInfo.participantIDs.length : 0;
        const adminCount = threadInfo.adminIDs ? threadInfo.adminIDs.length : 0;
        
        let statusMsg = `📊 **Trạng thái QTV Only**\n`;
        statusMsg += `├ Nhóm: ${threadName}\n`;
        statusMsg += `├ Trạng thái: ${status}\n`;
        statusMsg += `├ Thành viên: ${memberCount}\n`;
        statusMsg += `├ QTV: ${adminCount}\n`;
        statusMsg += `└ Cập nhật: ${time}`;
        
        if (isEnabled && database.logs && database.logs.length > 0) {
            const lastLog = database.logs.find(log => log.threadID === threadID);
            if (lastLog) {
                const userName = await Users.getNameUser(lastLog.senderID) || 'Unknown';
                statusMsg += `\n\n📝 Lần cuối thay đổi: ${lastLog.time}\n👤 Bởi: ${userName}`;
            }
        }
        
        return statusMsg;
    };
    
    // Xử lý các lệnh
    const command = args[0];
    
    if (!command) {
        // Hiển thị trạng thái và menu trợ giúp
        const statusMsg = await showStatus();
        const menuMsg = `\n\n📝 **Menu lệnh:**\n` +
            `├ \`on\`: Bật chế độ QTV Only\n` +
            `├ \`off\`: Tắt chế độ QTV Only\n` +
            `├ \`list\`: Xem danh sách nhóm đang bật\n` +
            `├ \`stats\`: Xem thống kê sử dụng\n` +
            `├ \`logs\`: Xem lịch sử thay đổi\n` +
            `└ \`help\`: Hướng dẫn chi tiết`;
        
        return api.sendMessage(statusMsg + menuMsg, threadID, messageID);
    }
    
    switch(command.toLowerCase()) {
        case "on":
        case "bật":
        case "enable":
            if (!canManage) {
                return api.sendMessage("❌ **Không có quyền!**\n\nChỉ QTV nhóm và Admin bot mới có thể bật/tắt chế độ QTV Only.", threadID, messageID);
            }
            
            if (adminbox[threadID] === true) {
                return api.sendMessage("⚠️ **Chế độ QTV Only đã được bật rồi!**\n\nSử dụng \`qtvonly off\` để tắt.", threadID, messageID);
            }
            
            adminbox[threadID] = true;
            database.stats.totalToggled++;
            database.stats.lastUpdated = Date.now();
            
            // Add log entry
            addLog(database, 'ENABLE', threadID, senderID, isSuperAdmin);
            
            const userName = await Users.getNameUser(senderID) || 'Unknown';
            const roleText = isSuperAdmin ? "Admin Bot" : "Quản trị viên nhóm";
            
            const enableMsg = `✅ **Đã bật chế độ QTV Only**\n\n` +
                `📅 Thời gian: ${time}\n` +
                `👤 Người thực hiện: ${userName} (${roleText})\n` +
                `🏷️ Nhóm: ${threadInfo.threadName || 'Không xác định'}\n\n` +
                `🔒 **Từ giờ chỉ QTV nhóm và Admin bot mới có thể sử dụng bot!**`;
            
            api.sendMessage(enableMsg, threadID, messageID);
            break;
            
        case "off":
        case "tắt":
        case "disable":
            if (!canManage) {
                return api.sendMessage("❌ **Không có quyền!**\n\nChỉ QTV nhóm và Admin bot mới có thể bật/tắt chế độ QTV Only.", threadID, messageID);
            }
            
            if (adminbox[threadID] !== true) {
                return api.sendMessage("⚠️ **Chế độ QTV Only đã được tắt rồi!**\n\nSử dụng \`qtvonly on\` để bật.", threadID, messageID);
            }
            
            adminbox[threadID] = false;
            database.stats.totalToggled++;
            database.stats.lastUpdated = Date.now();
            
            // Add log entry
            addLog(database, 'DISABLE', threadID, senderID, isSuperAdmin);
            
            const userName2 = await Users.getNameUser(senderID) || 'Unknown';
            const roleText2 = isSuperAdmin ? "Admin Bot" : "Quản trị viên nhóm";
            
            const disableMsg = `✅ **Đã tắt chế độ QTV Only**\n\n` +
                `📅 Thời gian: ${time}\n` +
                `👤 Người thực hiện: ${userName2} (${roleText2})\n` +
                `🏷️ Nhóm: ${threadInfo.threadName || 'Không xác định'}\n\n` +
                `🔓 **Tất cả thành viên có thể sử dụng bot trong nhóm này!**`;
            
            api.sendMessage(disableMsg, threadID, messageID);
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
            
        case "stats":
        case "thống_kê":
        case "tk":
            if (!isSuperAdmin) {
                return api.sendMessage("❌ **Không có quyền!**\n\nChỉ Admin bot mới có thể xem thống kê.", threadID, messageID);
            }
            
            const totalEnabled = Object.values(adminbox).filter(v => v === true).length;
            const totalDisabled = Object.values(adminbox).filter(v => v === false).length;
            const totalGroups = totalEnabled + totalDisabled;
            const enabledPercentage = totalGroups > 0 ? ((totalEnabled / totalGroups) * 100).toFixed(1) : 0;
            
            const statsMsg = `📊 **Thống kê QTV Only**\n\n` +
                `🟢 Nhóm đang bật: **${totalEnabled}**\n` +
                `🔴 Nhóm đang tắt: **${totalDisabled}**\n` +
                `📊 Tổng số nhóm: **${totalGroups}**\n` +
                `📈 Tỉ lệ bật: **${enabledPercentage}%**\n\n` +
                `🔄 Tổng lần thay đổi: **${database.stats.totalToggled || 0}**\n` +
                `⏰ Cập nhật cuối: ${moment(database.stats.lastUpdated).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss")}`;
            
            api.sendMessage(statsMsg, threadID, messageID);
            break;
            
        case "logs":
        case "lịch_sử":
        case "ls":
            if (!isSuperAdmin) {
                return api.sendMessage("❌ **Không có quyền!**\n\nChỉ Admin bot mới có thể xem lịch sử.", threadID, messageID);
            }
            
            const logs = database.logs || [];
            if (logs.length === 0) {
                return api.sendMessage("📜 **Lịch sử trống!**\n\nChưa có hoạt động nào được ghi lại.", threadID, messageID);
            }
            
            let logsMsg = `📜 **Lịch sử QTV Only** (${Math.min(logs.length, 10)} gần nhất)\n\n`;
            
            for (let i = 0; i < Math.min(logs.length, 10); i++) {
                const log = logs[i];
                const userName = await Users.getNameUser(log.senderID) || 'Unknown';
                const actionText = log.action === 'ENABLE' ? '🟢 Bật' : '🔴 Tắt';
                const roleText = log.isAdmin ? 'Admin' : 'QTV';
                
                logsMsg += `${i+1}. ${actionText} - ${log.time}\n`;
                logsMsg += `   ├ Người dùng: ${userName} (${roleText})\n`;
                logsMsg += `   └ Nhóm ID: \`${log.threadID}\`\n\n`;
            }
            
            if (logs.length > 10) {
                logsMsg += `⚠️ *Và ${logs.length - 10} hoạt động khác...*`;
            }
            
            api.sendMessage(logsMsg, threadID, messageID);
            break;
            
        case "help":
        case "hướng_dẫn":
        case "h":
            const helpMsg = `📋 **Hướng dẫn QTV Only v3.0**\n\n` +
                `📝 **Lệnh cơ bản:**\n` +
                `├ \`qtvonly\`: Hiển thị trạng thái\n` +
                `├ \`qtvonly on\`: Bật chế độ\n` +
                `├ \`qtvonly off\`: Tắt chế độ\n` +
                `└ \`qtvonly help\`: Hiển thị menu này\n\n` +
                `🔍 **Lệnh quản lý (Admin):**\n` +
                `├ \`qtvonly list\`: Danh sách nhóm\n` +
                `├ \`qtvonly stats\`: Thống kê sử dụng\n` +
                `└ \`qtvonly logs\`: Lịch sử thay đổi\n\n` +
                `⚙️ **Quyền hạn:**\n` +
                `├ QTV nhóm: Bật/tắt cho nhóm của mình\n` +
                `├ Admin bot: Tất cả quyền + quản lý toàn cục\n` +
                `└ Thành viên: Chỉ xem trạng thái\n\n` +
                `📝 **Lưu ý:**\n` +
                `- Khi bật: Chỉ QTV và Admin mới dùng được bot\n` +
                `- Dữ liệu được lưu tự động và có backup`;
            
            api.sendMessage(helpMsg, threadID, messageID);
            break;
            
        default:
            api.sendMessage(`❌ **Lệnh không hợp lệ!**\n\nSử dụng \`qtvonly help\` để xem tất cả lệnh có sẵn.`, threadID, messageID);
    }
    
    // Lưu cài đặt vào file data.json với error handling
    if (!saveData(pathData, database)) {
        console.error('[QTVONLY] Failed to save data after command execution');
        api.sendMessage("⚠️ Có lỗi khi lưu dữ liệu. Vui lòng thử lại!", threadID, messageID);
    }
}

// Export helper functions for potential use in other modules
module.exports.helpers = {
    saveData,
    addLog
};