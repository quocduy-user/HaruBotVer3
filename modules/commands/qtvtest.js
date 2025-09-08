module.exports.config = {
    name: "qtvtest",
    version: "1.0",
    hasPermssion: 2,
    credits: "Debug Tool",
    description: "Test QTV Only functionality",
    commandCategory: "debug",
    usages: "qtvtest",
    cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, senderID } = event;
    const { resolve } = require("path");
    const fs = require('fs');
    
    try {
        // Load qtvonly data
        const qtvOnlyPath = resolve(__dirname, 'cache', 'qtvonly_data.json');
        const qtvOnlyData = fs.existsSync(qtvOnlyPath) ? require(qtvOnlyPath) : {};
        
        // Get thread info
        const threadInfo = await api.getThreadInfo(threadID);
        const isGroupAdmin = threadInfo.adminIDs && threadInfo.adminIDs.some(admin => admin.id == senderID);
        
        // Check configs
        const isNDH = global.config.NDH && global.config.NDH.includes(String(senderID));
        const isADMIN = global.config.ADMINBOT && global.config.ADMINBOT.includes(String(senderID));
        
        const threadIDStr = String(threadID);
        const senderIDStr = String(senderID);
        
        const debugInfo = {
            threadID: threadIDStr,
            senderID: senderIDStr,
            threadName: threadInfo.threadName || 'Unknown',
            
            // QTV Only Status
            qtvOnlyEnabled: qtvOnlyData.adminbox && qtvOnlyData.adminbox[threadIDStr] === true,
            qtvOnlyValue: qtvOnlyData.adminbox ? qtvOnlyData.adminbox[threadIDStr] : 'undefined',
            
            // User Permissions
            isNDH: isNDH,
            isADMIN: isADMIN,
            isGroupAdmin: isGroupAdmin,
            
            // Should Block Logic
            shouldBlock: (
                qtvOnlyData.adminbox && 
                qtvOnlyData.adminbox[threadIDStr] === true && 
                !isNDH && 
                !isADMIN && 
                !isGroupAdmin
            ),
            
            // File Info
            fileExists: fs.existsSync(qtvOnlyPath),
            filePath: qtvOnlyPath,
            adminboxKeys: qtvOnlyData.adminbox ? Object.keys(qtvOnlyData.adminbox).length : 0,
            
            // Config Info
            NDH_config: global.config.NDH || [],
            ADMINBOT_config: global.config.ADMINBOT || [],
            
            // Group Admins
            groupAdmins: threadInfo.adminIDs ? threadInfo.adminIDs.map(admin => admin.id) : []
        };
        
        let message = `🔍 **QTV Only Debug Test**\n\n`;
        message += `🏠 **Nhóm:** ${debugInfo.threadName}\n`;
        message += `🆔 **Thread ID:** \`${debugInfo.threadID}\`\n`;
        message += `👤 **User ID:** \`${debugInfo.senderID}\`\n\n`;
        
        message += `🔒 **QTV Only Status:**\n`;
        message += `├ Enabled: ${debugInfo.qtvOnlyEnabled ? '✅ Yes' : '❌ No'}\n`;
        message += `├ Raw Value: \`${debugInfo.qtvOnlyValue}\`\n`;
        message += `└ File Exists: ${debugInfo.fileExists ? '✅ Yes' : '❌ No'}\n\n`;
        
        message += `👑 **User Permissions:**\n`;
        message += `├ NDH: ${debugInfo.isNDH ? '✅ Yes' : '❌ No'}\n`;
        message += `├ Admin Bot: ${debugInfo.isADMIN ? '✅ Yes' : '❌ No'}\n`;
        message += `└ Group Admin: ${debugInfo.isGroupAdmin ? '✅ Yes' : '❌ No'}\n\n`;
        
        message += `⚖️ **Logic Check:**\n`;
        message += `└ Should Block: ${debugInfo.shouldBlock ? '✅ YES (Working)' : '❌ NO (Problem)'}\n\n`;
        
        message += `📊 **System Info:**\n`;
        message += `├ Adminbox Entries: ${debugInfo.adminboxKeys}\n`;
        message += `├ NDH Count: ${debugInfo.NDH_config.length}\n`;
        message += `├ Admin Count: ${debugInfo.ADMINBOT_config.length}\n`;
        message += `└ Group Admins: ${debugInfo.groupAdmins.length}\n\n`;
        
        if (debugInfo.qtvOnlyEnabled && debugInfo.shouldBlock) {
            message += `✅ **QTV Only hoạt động CHÍNH XÁC!**\n`;
            message += `User này sẽ bị chặn khi dùng lệnh.`;
        } else if (debugInfo.qtvOnlyEnabled && !debugInfo.shouldBlock) {
            message += `⚠️ **QTV Only KHÔNG hoạt động!**\n`;
            message += `Lý do: User có quyền admin hoặc QTV.`;
        } else {
            message += `ℹ️ **QTV Only chưa được bật** cho nhóm này.`;
        }
        
        api.sendMessage(message, threadID);
        
        // Also log to console for debugging
        console.log('[QTVTEST] Full Debug Info:', JSON.stringify(debugInfo, null, 2));
        
    } catch (error) {
        console.error('[QTVTEST] Error:', error);
        api.sendMessage(`❌ **Lỗi test:** ${error.message}`, threadID);
    }
};
