const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const crypto = require('crypto');

module.exports.config = {
    name: "thuebot",
    version: "2.1.0",
    hasPermission: 2,
    credits: "HaruBot Team - Optimized by AI",
    description: "Hệ thống quản lý thuê bot tối ưu với tính năng cốt lõi",
    commandCategory: "Admin",
    usages: "[key/check/list/clean/quick/stats/expired]",
    cooldowns: 3,
    dependencies: {
        "crypto": "",
        "fs-extra": "",
        "path": "",
        "moment-timezone": ""
    }
};

// Enhanced path management with proper directory structure
const dataDir = path.join(__dirname, 'data');
const keysDataPath = path.join(dataDir, 'keysData.json');
const thuebotDataPath = path.join(dataDir, 'thuebot.json');
const backupDir = path.join(dataDir, 'backups');
const logsPath = path.join(dataDir, 'thuebot_logs.json');
const statsPath = path.join(dataDir, 'thuebot_stats.json');

// Ensure directories exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

// Enhanced date formatting functions
const formatDate = {
    toDisplay: (dateStr) => {
        if (!dateStr) return 'N/A';
        return moment(dateStr, 'DD/MM/YYYY').format('DD/MM/YYYY');
    },
    toTimestamp: (dateStr) => {
        if (!dateStr) return 0;
        return moment(dateStr, 'DD/MM/YYYY').valueOf();
    },
    addDays: (dateStr, days) => {
        return moment(dateStr, 'DD/MM/YYYY').add(days, 'days').format('DD/MM/YYYY');
    },
    getDaysLeft: (endDate) => {
        const end = moment(endDate, 'DD/MM/YYYY');
        const now = moment();
        return Math.max(0, end.diff(now, 'days'));
    },
    isExpired: (endDate) => {
        return moment().isAfter(moment(endDate, 'DD/MM/YYYY'));
    }
};

// Load data with error handling
let keysData = [];
let data = [];
let logs = [];
let stats = {
    totalKeys: 0,
    totalActivated: 0,
    totalRevenue: 0,
    lastUpdated: Date.now()
};

try {
    keysData = fs.existsSync(keysDataPath) ? JSON.parse(fs.readFileSync(keysDataPath, 'utf8')) : [];
    data = fs.existsSync(thuebotDataPath) ? JSON.parse(fs.readFileSync(thuebotDataPath, 'utf8')) : [];
    logs = fs.existsSync(logsPath) ? JSON.parse(fs.readFileSync(logsPath, 'utf8')) : [];
    stats = fs.existsSync(statsPath) ? JSON.parse(fs.readFileSync(statsPath, 'utf8')) : stats;
} catch (error) {
    console.error('[THUEBOT] Error loading data:', error.message);
}

// Enhanced save functions with backup and error handling
function saveData(filePath, data, backupName) {
    try {
        // Create backup
        if (fs.existsSync(filePath)) {
            const backupPath = path.join(backupDir, `${backupName}_${Date.now()}.json`);
            fs.copyFileSync(filePath, backupPath);
            
            // Keep only last 5 backups
            const backupFiles = fs.readdirSync(backupDir)
                .filter(f => f.startsWith(backupName))
                .sort((a, b) => b.localeCompare(a));
            
            if (backupFiles.length > 5) {
                backupFiles.slice(5).forEach(f => {
                    fs.unlinkSync(path.join(backupDir, f));
                });
            }
        }
        
        // Save data
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        return true;
    } catch (error) {
        console.error(`[THUEBOT] Error saving ${backupName}:`, error.message);
        return false;
    }
}

function saveKeysData() {
    return saveData(keysDataPath, keysData, 'keysData');
}

function saveThuebotData() {
    return saveData(thuebotDataPath, data, 'thuebot');
}

function saveLogs() {
    return saveData(logsPath, logs, 'logs');
}

function saveStats() {
    stats.lastUpdated = Date.now();
    return saveData(statsPath, stats, 'stats');
}

// Simplified key creation - single type only
function createNewKey(durationInDays) {
    try {
        // Generate secure random key
        const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
        const timestamp = Date.now().toString(36).toUpperCase();
        const newKey = `haru_${randomPart}_${timestamp.slice(-4)}`;
        
        // Simplified key object
        const keyData = {
            key: newKey,
            used: false,
            duration: durationInDays,
            createdAt: moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss'),
            createdBy: null, // Will be set when called
            usedAt: null,
            usedBy: null,
            threadId: null,
            value: durationInDays * 1000 // Simple 1000 VND per day
        };
        
        keysData.push(keyData);
        
        // Update stats
        stats.totalKeys++;
        
        return keyData;
    } catch (error) {
        console.error('[THUEBOT] Error creating key:', error.message);
        return null;
    }
}

// Enhanced logging system
function addLog(action, details = {}) {
    const logEntry = {
        id: crypto.randomUUID(),
        action,
        details,
        timestamp: Date.now(),
        time: moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')
    };
    
    logs.unshift(logEntry);
    
    // Keep only last 1000 logs
    if (logs.length > 1000) {
        logs = logs.slice(0, 1000);
    }
    
    saveLogs();
}
module.exports.run = async function(o) {
    const send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);
    const prefix = (global.data.threadData.get(o.event.threadID) || {}).PREFIX || global.config.PREFIX;
    const info = data.find($=>$.t_id==o.event.threadID);
    const isAdmin = global.config.ADMINBOT && global.config.ADMINBOT.includes(o.event.senderID);
    const isNDH = global.config.NDH && global.config.NDH.includes(o.event.senderID);
    const isSuperAdmin = isAdmin || isNDH;
    
    // Command validation
    if (!o.args[0]) {
        return send(
            `🏮 **Hệ thống Thuê Bot v2.1**\n\n` +
            `📦 **Quản lý Key:**\n` +
            `├ \`${prefix}thuebot key [ngày]\`: Tạo key mới\n` +
            `├ \`${prefix}thuebot check\`: Xem danh sách key\n` +
            `├ \`${prefix}thuebot clean [unused/old/all]\`: Lọc key không dùng\n` +
            `└ \`${prefix}thuebot quick [số_lượng] [ngày]\`: Tạo key nhanh\n\n` +
            `🏠 **Quản lý Thuê:**\n` +
            `├ \`${prefix}thuebot list\`: Danh sách thuê bot\n` +
            `├ \`${prefix}thuebot info\`: Thông tin nhóm hiện tại\n` +
            `├ \`${prefix}thuebot extend [ngày]\`: Gia hạn nhóm\n` +
            `└ \`${prefix}thuebot del\`: Xóa data nhóm\n\n` +
            `🔧 **Tiện ích:**\n` +
            `├ \`${prefix}thuebot stats\`: Thống kê cơ bản\n` +
            `├ \`${prefix}thuebot expired\`: Danh sách hết hạn\n` +
            `└ \`${prefix}thuebot loc\`: Lọc nhóm đã rời\n\n` +
            `💡 **Kích hoạt:** Gửi key \`haru_xxx\` vào nhóm để kích hoạt`
        );
    }
    
    switch (o.args[0].toLowerCase()) {
        case 'clear': {
            keysData = [];
            saveKeysData();
            send(`✅ Đã xóa toàn bộ dữ liệu key.`);
            break;
        }
        case 'key': {
            const durationInDays = parseInt(o.args[1]);
            if (isNaN(durationInDays) || durationInDays <= 0) {
                return send(`❌ **Số ngày không hợp lệ!**\n\nVui lòng nhập một số nguyên dương (1-365 ngày).`);
            }
            if (durationInDays > 365) {
                return send(`❌ **Số ngày quá lớn!**\n\nTối đa 365 ngày mỗi key.`);
            }
            
            const newKeyData = createNewKey(durationInDays);
            if (!newKeyData) {
                return send("❌ **Lỗi tạo key!** Vui lòng thử lại sau.");
            }
            
            newKeyData.createdBy = o.event.senderID; // Set creator
            saveKeysData();
            
            const keyMsg = `✅ **Tạo key thành công!**\n\n` +
                `🔑 **Key:** \`${newKeyData.key}\`\n` +
                `⏳ **Thời hạn:** ${durationInDays} ngày\n` +
                `📅 **Tạo lúc:** ${newKeyData.createdAt}\n` +
                `💰 **Giá trị:** ${newKeyData.value.toLocaleString('vi-VN')} VNĐ\n\n` +
                `💡 **Gửi key vào nhóm để kích hoạt!**`;
            
            send(keyMsg);
            break;
        }
        
        case 'quick':
        case 'nhanh': {
            if (!isSuperAdmin) {
                return send("❌ **Không có quyền!** Chỉ Admin bot mới có thể tạo key nhanh.");
            }
            
            const quantity = parseInt(o.args[1]) || 5;
            const days = parseInt(o.args[2]) || 30;
            
            if (quantity <= 0 || quantity > 20) {
                return send(`❌ **Số lượng không hợp lệ!**\n\nVui lòng nhập từ 1-20 key.`);
            }
            if (days <= 0 || days > 365) {
                return send(`❌ **Số ngày không hợp lệ!**\n\nVui lòng nhập từ 1-365 ngày.`);
            }
            
            const createdKeys = [];
            let successCount = 0;
            
            for (let i = 0; i < quantity; i++) {
                const keyData = createNewKey(days);
                if (keyData) {
                    keyData.createdBy = o.event.senderID;
                    createdKeys.push(keyData.key);
                    successCount++;
                }
            }
            
            if (successCount === 0) {
                return send("❌ **Lỗi tạo key!** Không thể tạo key nào.");
            }
            
            saveKeysData();
            
            let quickMsg = `⚡ **Tạo Key nhanh hoàn tất!**\n\n` +
                `📦 **Đã tạo ${successCount} key ${days} ngày:**\n`;
            
            createdKeys.slice(0, 10).forEach((key, index) => {
                quickMsg += `├ \`${key}\` ✅\n`;
            });
            
            if (createdKeys.length > 10) {
                quickMsg += `└ ... và ${createdKeys.length - 10} key khác\n`;
            } else if (createdKeys.length > 0) {
                quickMsg = quickMsg.replace(/├ (`[^`]+` ✅)$/, '└ $1');
            }
            
            quickMsg += `\n💾 **Đã lưu vào hệ thống!**\n` +
                `💰 **Tổng giá trị:** ${(successCount * days * 1000).toLocaleString('vi-VN')} VNĐ`;
            
            send(quickMsg);
            
            // Add log
            addLog('QUICK_KEYS_CREATED', {
                quantity: successCount,
                days: days,
                createdBy: o.event.senderID
            });
            break;
        }
        case 'info': {
			let threadInfo = await o.api.getThreadInfo(info.t_id);
			 send({ body: `[ Thông Tin Thuê Bot ]\n\n👤 Tên người thuê: ${global.data.userName.get(info.id)}\n🌐 link Facebook: https://www.facebook.com/profile.php?id=${info.id}\n🏘️ Nhóm: ${(global.data.threadInfo.get(info.t_id) || {}).threadName}\n⚡ ID Nhóm: ${info.t_id}\n📆 Ngày Thuê: ${info.time_start}\n⏳ Hết Hạn: ${info.time_end}\n📌 Còn ${(()=> {
			let time_diff = new Date(form_mm_dd_yyyy(info.time_end)).getTime()-(Date.now()+25200000);
			let days = (time_diff/(1000*60*60*24))<<0;
			let hour = (time_diff/(1000*60*60)%24)<<0;
			return `${days} ngày ${hour} giờ là hết hạn.`;
		})()}`, attachment: [await streamURL(`
https://graph.facebook.com/${info.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`), await streamURL(threadInfo.imageSrc)]
	});};
			break;
       case 'del': {
			let t_id = o.event.threadID
			let id = o.event.senderID
			var findData = data.find(item=>item.t_id==t_id)
			if(!findData) return o.api.sendMessage("Box này hiện chưa thuê bot",t_id)
			data = data.filter(item=>item.t_id!==t_id)
			send(`✅ Đã xóa data box thành công`)
			await save()
			};
			break;
        case 'check': {
 
            let message = '[ KEY LIST ]\n';
            keysData.forEach((key, index) => {
                message += `${index + 1}. Key: ${key.key}\n - Trạng thái: ${key.used ? 'Đã sử dụng' : 'Chưa sử dụng'}\n - Thời hạn: ${key.duration} ngày\n`;
            });
            send(message.trim());
            break;
        } 
        case 'loc': {
            const originalLength = data.length;
            
            // Lấy danh sách tất cả các nhóm mà bot đang tham gia
            const threadList = await o.api.getThreadList(100, null, ['INBOX']);
            const activeThreadIDs = new Set(threadList.map(thread => thread.threadID));

            // Lọc data, chỉ giữ lại những nhóm mà bot vẫn còn tham gia
            data = data.filter(rental => activeThreadIDs.has(rental.t_id));
            
            saveThuebotData();

            const removedCount = originalLength - data.length;
            send(`✅ Đã lọc và xóa ${removedCount} nhóm mà bot đã rời khỏi danh sách thuê bot.`);
            break;
        }
        
        case 'clean':
        case 'dọn_dẹp': {
            if (!isSuperAdmin) {
                return send("❌ **Không có quyền!** Chỉ Admin bot mới có thể dọn dẹp key.");
            }
            
            const cleanType = o.args[1] || 'unused';
            const originalLength = keysData.length;
            let removedCount = 0;
            
            switch (cleanType.toLowerCase()) {
                case 'unused':
                case 'chưa_dùng': {
                    keysData = keysData.filter(key => key.used);
                    removedCount = originalLength - keysData.length;
                    break;
                }
                
                case 'old':
                case 'cũ': {
                    const thirtyDaysAgo = moment().subtract(30, 'days');
                    keysData = keysData.filter(key => {
                        if (key.used) return true; // Giữ key đã dùng
                        const createdDate = moment(key.createdAt, 'DD/MM/YYYY HH:mm:ss');
                        return createdDate.isAfter(thirtyDaysAgo);
                    });
                    removedCount = originalLength - keysData.length;
                    break;
                }
                
                case 'all':
                case 'tất_cả': {
                    keysData = keysData.filter(key => key.used);
                    removedCount = originalLength - keysData.length;
                    break;
                }
                
                default:
                    return send(`❌ **Loại dọn dẹp không hợp lệ!**\n\n` +
                        `📋 **Các loại có sẵn:**\n` +
                        `├ \`${prefix}thuebot clean unused\`: Xóa key chưa dùng\n` +
                        `├ \`${prefix}thuebot clean old\`: Xóa key cũ hơn 30 ngày\n` +
                        `└ \`${prefix}thuebot clean all\`: Xóa tất cả key không dùng`);
            }
            
            if (removedCount === 0) {
                return send(`✅ **Không có key nào cần dọn dẹp!**\n\nHệ thống đã sạch sẽ.`);
            }
            
            // Save cleaned data
            if (saveKeysData()) {
                const savedSpace = (removedCount * 0.15).toFixed(1); // Estimate KB saved
                
                const cleanMsg = `🧹 **Dọn dẹp Key hoàn tất!**\n\n` +
                    `📊 **Kết quả:**\n` +
                    `├ Key đã xóa: **${removedCount}**\n` +
                    `├ Key giữ lại: **${keysData.length}**\n` +
                    `├ Dung lượng tiết kiệm: ~${savedSpace} KB\n` +
                    `└ Thời gian: ${moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}\n\n` +
                    `✅ **Hệ thống đã được tối ưu hóa!**`;
                
                send(cleanMsg);
                
                // Update stats
                stats.totalKeys = keysData.length;
                saveStats();
                
                // Add log
                addLog('KEYS_CLEANED', {
                    type: cleanType,
                    removed: removedCount,
                    remaining: keysData.length
                });
            } else {
                send("❌ **Lỗi khi lưu dữ liệu!** Vui lòng thử lại sau.");
            }
            break;
        }
        case 'list': {
			try{
				const itemsPerPage = 10;

				const totalPages = Math.ceil(data.length / itemsPerPage);

					const startIndex = (1 - 1) * itemsPerPage;
					const endIndex = startIndex + itemsPerPage;
					const pageData = data.slice(startIndex, endIndex);

					o.api.sendMessage(`[ Danh Sách Thuê Bot ${1}/${totalPages}]\n\n${pageData.map(($, i)=>`${i+1}. ${global.data.userName.get($.id)}\n📝 Tình trạng: ${new Date(form_mm_dd_yyyy($.time_end)).getTime() >= Date.now()+25200000?'Chưa Hết Hạn ✅': 'Đã Hết Hạn ❎'}\n🌾 Nhóm: ${(global.data.threadInfo.get($.t_id) || {}).threadName}\nTừ: ${$.time_start}\nĐến: ${$.time_end}`).join('\n─────────────────\n')}
========================================
➣ 𝐑𝐞𝐩𝐥𝐲: 𝐝𝐞𝐥 𝐬𝐨̂́ 𝐭𝐡𝐮̛́ 𝐭𝐮̛̣ 𝐝𝐞̂̉ 𝐱𝐨́𝐚 𝐤𝐡𝐨̉𝐢 𝐝𝐚𝐧𝐡 𝐬𝐚́𝐜𝐡.
➣ 𝐑𝐞𝐩𝐥𝐲: 𝐨𝐮𝐭 𝐬𝐨̂́ 𝐭𝐡𝐮̛́ 𝐭𝐮̛̣ 𝐝𝐞̂̉ 𝐭𝐡𝐨𝐚́𝐭 𝐧𝐡𝐨́𝐦.
➣ 𝐑𝐞𝐩𝐥𝐲: 𝐩𝐚𝐠𝐞 𝐬𝐨̂́ 𝐭𝐡𝐮̛́ 𝐭𝐮̛̣ 𝐝𝐞̂̉ 𝐱𝐞𝐦 𝐜𝐚́𝐜 𝐧𝐡𝐨́𝐦 𝐤𝐡𝐚́𝐜.
========================================`,o.event.threadID, (err, info)=>{
						global.client.handleReply.push({
							name: this.config.name,
							event: o.event,
							data,
							num: endIndex,
							messageID: info.messageID,
							author: o.event.senderID
						})
					});

			}catch(e){
				console.log(e)
			}
		};
			break;
        case 'stats':
        case 'thống_kê': {
            if (!isSuperAdmin) {
                return send("❌ **Không có quyền!** Chỉ Admin bot mới có thể xem thống kê.");
            }
            
            const totalKeys = keysData.length;
            const usedKeys = keysData.filter(k => k.used).length;
            const unusedKeys = totalKeys - usedKeys;
            const totalRentals = data.length;
            const activeRentals = data.filter(r => !formatDate.isExpired(r.time_end)).length;
            const expiredRentals = totalRentals - activeRentals;
            
            const statsMsg = `📊 **Thống kê ThuêBot**\n\n` +
                `🔑 **Keys:** ${totalKeys} tổng | ${usedKeys} đã dùng | ${unusedKeys} chưa dùng\n` +
                `🏠 **Nhóm:** ${totalRentals} tổng | ${activeRentals} hoạt động | ${expiredRentals} hết hạn\n` +
                `⏰ **Cập nhật:** ${moment().tz('Asia/Ho_Chi_Minh').format('DD/MM HH:mm')}`;
            
            send(statsMsg);
            break;
        }
        
        case 'expired':
        case 'hết_hạn': {
            if (!isSuperAdmin) {
                return send("❌ **Không có quyền!** Chỉ Admin bot mới có thể xem danh sách hết hạn.");
            }
            
            const expiredRentals = data.filter(r => formatDate.isExpired(r.time_end));
            
            if (expiredRentals.length === 0) {
                return send("✅ **Tuyệt vời!**\n\nKhông có nhóm nào hết hạn.");
            }
            
            let expiredMsg = `⚠️ **Danh sách hết hạn** (${expiredRentals.length})\n\n`;
            
            expiredRentals.slice(0, 15).forEach((rental, index) => {
                const userName = global.data.userName.get(rental.id) || 'Unknown';
                const threadName = (global.data.threadInfo.get(rental.t_id) || {}).threadName || 'Unknown';
                const expiredDays = Math.abs(formatDate.getDaysLeft(rental.time_end));
                
                expiredMsg += `${index + 1}. **${userName}**\n`;
                expiredMsg += `   ├ Nhóm: ${threadName}\n`;
                expiredMsg += `   ├ Hết hạn: ${formatDate.toDisplay(rental.time_end)}\n`;
                expiredMsg += `   └ Quá hạn: **${expiredDays} ngày**\n\n`;
            });
            
            if (expiredRentals.length > 15) {
                expiredMsg += `... và ${expiredRentals.length - 15} nhóm khác`;
            }
            
            expiredMsg += `\n💡 **Gợi ý:** Sử dụng \`${prefix}thuebot notify expired\` để gửi thông báo gia hạn.`;
            
            send(expiredMsg);
            break;
        }
        
        // REMOVED: notify and backup commands - too complex and rarely used
        // Auto backup is already implemented in save functions
        
        case 'extend':
        case 'giahan':
        case 'gia_hạn': {
            if (!isSuperAdmin) {
                return send("❌ **Không có quyền!** Chỉ Admin bot mới có thể gia hạn.");
            }
            
            const targetThreadId = o.args[1];
            const extensionDays = parseInt(o.args[2]);
            
            if (!targetThreadId) {
                return send(`📋 **Cách sử dụng gia hạn:**\n\n` +
                    `🔸 **Gia hạn nhóm hiện tại:**\n` +
                    `   \`${prefix}thuebot extend [số_ngày]\`\n\n` +
                    `🔸 **Gia hạn nhóm khác:**\n` +
                    `   \`${prefix}thuebot extend [thread_id] [số_ngày]\`\n\n` +
                    `💡 **Ví dụ:**\n` +
                    `   \`${prefix}thuebot extend 30\` (gia hạn nhóm này 30 ngày)\n` +
                    `   \`${prefix}thuebot extend 123456789 15\` (gia hạn nhóm khác)`);
            }
            
            // Xử lý trường hợp chỉ có số ngày (gia hạn nhóm hiện tại)
            let threadId, days;
            if (isNaN(parseInt(targetThreadId))) {
                return send("❌ **Tham số không hợp lệ!**\n\nVui lòng nhập đúng format: `extend [thread_id] [số_ngày]`");
            }
            
            if (!extensionDays) {
                // Gia hạn nhóm hiện tại
                threadId = o.event.threadID;
                days = parseInt(targetThreadId);
            } else {
                // Gia hạn nhóm khác
                threadId = targetThreadId;
                days = extensionDays;
            }
            
            if (isNaN(days) || days <= 0 || days > 365) {
                return send("❌ **Số ngày không hợp lệ!**\n\nVui lòng nhập từ 1-365 ngày.");
            }
            
            // Tìm rental data
            const rentalIndex = data.findIndex(r => r.t_id === threadId);
            if (rentalIndex === -1) {
                return send(`❌ **Nhóm chưa thuê bot!**\n\nThread ID: \`${threadId}\`\n\nNhóm này chưa kích hoạt bot hoặc đã bị xóa khỏi hệ thống.`);
            }
            
            const rental = data[rentalIndex];
            const oldEndDate = rental.time_end;
            const isExpired = formatDate.isExpired(oldEndDate);
            
            // Tính ngày hết hạn mới
            let newEndDate;
            if (isExpired) {
                // Nếu đã hết hạn, gia hạn từ hôm nay
                newEndDate = moment().tz('Asia/Ho_Chi_Minh').add(days, 'days').format('DD/MM/YYYY');
            } else {
                // Nếu chưa hết hạn, gia hạn từ ngày hết hạn cũ
                newEndDate = moment(oldEndDate, 'DD/MM/YYYY').add(days, 'days').format('DD/MM/YYYY');
            }
            
            // Cập nhật dữ liệu
            rental.time_end = newEndDate;
            rental.extended_at = Date.now();
            rental.extended_by = o.event.senderID;
            rental.extension_days = days;
            
            if (saveThuebotData()) {
                try {
                    // Cập nhật biệt danh bot
                    const botName = global.config.BOTNAME || "HaruBot";
                    const threadPrefix = (global.data.threadData.get(threadId) || {}).PREFIX || global.config.PREFIX;
                    const nickname = `[ ${threadPrefix} ] • ${botName} | HSD: ${newEndDate}`;
                    
                    o.api.changeNickname(nickname, threadId, o.api.getCurrentUserID(), (err) => {
                        if (err) console.error('[THUEBOT] Error updating nickname:', err.message);
                    });
                    
                    // Thông báo cho nhóm được gia hạn
                    const userName = global.data.userName.get(rental.id) || 'Unknown';
                    const extenderName = await o.Users.getNameUser(o.event.senderID) || 'Admin';
                    const threadName = (global.data.threadInfo.get(threadId) || {}).threadName || 'Unknown';
                    
                    const notifyMessage = `🎉 **Thông báo gia hạn Bot**\n\n` +
                        `👤 **Người gia hạn:** ${extenderName}\n` +
                        `⏳ **Số ngày gia hạn:** ${days} ngày\n` +
                        `📅 **Hạn cũ:** ${formatDate.toDisplay(oldEndDate)} ${isExpired ? '(Đã hết hạn)' : ''}\n` +
                        `📅 **Hạn mới:** ${formatDate.toDisplay(newEndDate)}\n\n` +
                        `✨ **Cảm ơn bạn đã tiếp tục sử dụng dịch vụ!**`;
                    
                    if (threadId !== o.event.threadID) {
                        // Gửi thông báo đến nhóm được gia hạn (nếu khác nhóm hiện tại)
                        o.api.sendMessage(notifyMessage, threadId);
                    }
                    
                    // Thông báo cho admin
                    const successMessage = `✅ **Gia hạn thành công!**\n\n` +
                        `🏠 **Nhóm:** ${threadName}\n` +
                        `🆔 **Thread ID:** \`${threadId}\`\n` +
                        `👤 **Chủ nhóm:** ${userName}\n` +
                        `📅 **Hạn cũ:** ${formatDate.toDisplay(oldEndDate)} ${isExpired ? '(Đã hết hạn)' : ''}\n` +
                        `📅 **Hạn mới:** ${formatDate.toDisplay(newEndDate)}\n` +
                        `⏳ **Số ngày thêm:** ${days} ngày\n` +
                        `⏰ **Thời gian:** ${moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')}`;
                    
                    send(successMessage);
                    
                    // Update stats
                    stats.totalRevenue += days * 1000; // Giả định giá gia hạn
                    saveStats();
                    
                    // Add log
                    addLog('RENTAL_EXTENDED', {
                        thread: threadId,
                        oldEndDate: oldEndDate,
                        newEndDate: newEndDate,
                        days: days,
                        extendedBy: o.event.senderID,
                        wasExpired: isExpired
                    });
                    
                } catch (error) {
                    console.error('[THUEBOT] Error in extend notification:', error.message);
                    send(`✅ **Gia hạn thành công!**\n\nNhưng có lỗi khi gửi thông báo. Dữ liệu đã được cập nhật.`);
                }
            } else {
                send("❌ **Lỗi khi lưu dữ liệu!** Vui lòng thử lại sau.");
            }
            break;
        }
        
        default:
            send(`❌ **Lệnh không hợp lệ!**\n\nSử dụng \`${prefix}thuebot\` để xem tất cả lệnh có sẵn.`);
            break;
    }
};

exports.handleEvent = async function({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const adminIDs = global.config.ADMINBOT || [];
    
    // Enhanced key detection - support multiple prefixes
    if (event.body && (event.body.startsWith('haru_') || event.body.startsWith('HARU_'))) {
        const inputKey = event.body.trim();
        const keyIndex = keysData.findIndex(key => key.key.toLowerCase() === inputKey.toLowerCase());
        const isThreadActive = data.some(rental => rental.t_id === threadID);

        // Key not found
        if (keyIndex === -1) {
            return api.sendMessage(
                `❌ **Key không hợp lệ!**\n\n` +
                `Key \`${inputKey}\` không tồn tại trong hệ thống.\n` +
                `Vui lòng kiểm tra lại hoặc liên hệ admin.`, 
                threadID
            );
        }

        const keyData = keysData[keyIndex];

        // Key already used
        if (keyData.used) {
            const usedInfo = keyData.usedAt ? `\nĐã sử dụng: ${keyData.usedAt}` : '';
            return api.sendMessage(
                `❌ **Key đã được sử dụng!**\n\n` +
                `Key \`${inputKey}\` đã được kích hoạt trước đó.${usedInfo}\n` +
                `Mỗi key chỉ có thể sử dụng một lần.`, 
                threadID
            );
        }

        // Thread already active
        if (isThreadActive) {
            const currentRental = data.find(rental => rental.t_id === threadID);
            const daysLeft = formatDate.getDaysLeft(currentRental.time_end);
            const status = daysLeft > 0 ? `còn ${daysLeft} ngày` : 'đã hết hạn';
            
            return api.sendMessage(
                `⚠️ **Nhóm đã kích hoạt bot!**\n\n` +
                `Nhóm này đã có bot hoạt động (${status}).\n` +
                `Không thể sử dụng key khác để kích hoạt lại.\n\n` +
                `💡 Sử dụng lệnh \`info\` để xem thông tin thuê hiện tại.`, 
                threadID
            );
        }

        try {
            // Mark key as used
            keyData.used = true;
            keyData.usedAt = moment().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss");
            keyData.usedBy = senderID;
            keyData.threadId = threadID;

            const durationInDays = keyData.duration;
            const time_start = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
            const time_end = moment.tz("Asia/Ho_Chi_Minh").add(durationInDays, 'days').format("DD/MM/YYYY");
            
            // Add rental data - simplified
            const rentalData = {
                id: senderID,
                t_id: threadID,
                time_start: time_start,
                time_end: time_end,
                key_used: inputKey,
                activated_at: Date.now()
            };
            
            data.push(rentalData);

            // Save data with error handling
            const saveSuccess = saveThuebotData() && saveKeysData();
            if (!saveSuccess) {
                // Rollback on save failure
                keyData.used = false;
                keyData.usedAt = null;
                keyData.usedBy = null;
                keyData.threadId = null;
                data.pop();
                
                return api.sendMessage(
                    `❌ **Lỗi hệ thống!**\n\nKhông thể lưu dữ liệu kích hoạt. Vui lòng thử lại sau.`, 
                    threadID
                );
            }

            // Update bot nickname
            const botName = global.config.BOTNAME || "HaruBot";
            const prefix = global.config.PREFIX || ".";
            const nickname = `[ ${prefix} ] • ${botName} | HSD: ${time_end}`;
            
            api.changeNickname(nickname, threadID, api.getCurrentUserID(), (err) => {
                if (err) console.error('[THUEBOT] Error changing nickname:', err.message);
            });

            // Success message to user - simplified
            const successMsg = `🎉 **Bot đã được kích hoạt thành công!**\n\n` +
                `🔑 **Key:** \`${inputKey}\`\n` +
                `📅 **Kích hoạt:** ${time_start}\n` +
                `⏰ **Hết hạn:** ${time_end}\n` +
                `⏳ **Thời hạn:** ${durationInDays} ngày\n\n` +
                `✨ **Chúc bạn sử dụng vui vẻ!**`;

            api.sendMessage(successMsg, threadID);

            // Update stats
            stats.totalActivated++;
            stats.totalRevenue += (keyData.value || 0);
            saveStats();

            // Add log
            addLog('KEY_ACTIVATED', {
                key: inputKey,
                user: senderID,
                thread: threadID,
                duration: durationInDays,
                type: keyData.type
            });

            // Notify admins
            try {
                const userInfo = await new Promise((resolve) => {
                    api.getUserInfo(senderID, (err, ret) => {
                        if (err) resolve({ name: 'Unknown' });
                        else resolve(ret[senderID] || { name: 'Unknown' });
                    });
                });

                const threadInfo = await api.getThreadInfo(threadID);
                const userName = userInfo.name;
                const groupName = threadInfo.threadName || 'Unknown';

                const adminMessage = `🔔 **Key được kích hoạt**\n\n` +
                    `🔑 **Key:** \`${inputKey}\`\n` +
                    `👤 **User:** ${userName}\n` +
                    `🏠 **Nhóm:** ${groupName}\n` +
                    `📅 **Hạn:** ${time_start} → ${time_end}\n` +
                    `⏳ **Thời hạn:** ${durationInDays} ngày`;

                // Send to all admins
                for (const adminID of adminIDs) {
                    try {
                        await api.sendMessage(adminMessage, adminID);
                    } catch (error) {
                        console.error(`[THUEBOT] Error sending to admin ${adminID}:`, error.message);
                    }
                }
            } catch (error) {
                console.error('[THUEBOT] Error notifying admins:', error.message);
            }

        } catch (error) {
            console.error('[THUEBOT] Error in key activation:', error.message);
            api.sendMessage(
                `❌ **Lỗi khi kích hoạt key!**\n\nĐã xảy ra lỗi hệ thống. Vui lòng liên hệ admin.`, 
                threadID
            );
        }
    }
};

exports.handleReply = async function(o) {
    try {
        let _ = o.handleReply;
        let send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);
        if (o.event.senderID != _.event.senderID) return;
        const args = o.event.body.split(' ');
        const action = args[0].toLowerCase();
        if (isFinite(o.event.args[0])) {
            let info = data[o.event.args[0]-1];
            let threadInfo = await o.api.getThreadInfo(info.t_id);
            if (!info) return send(`STT không tồn tại!`);
            return send({
                body:`
[ Thông Tin Thuê Bot ]
👤 𝐓𝐞̂𝐧 𝐧𝐠𝐮̛𝐨̛̀𝐢 𝐭𝐡𝐮𝐞̂: ${global.data.userName.get(info.id)}
🌐 𝐅𝐁: https://www.facebook.com/profile.php?id=${info.id}
🏘️ 𝐍𝐡𝐨́𝐦: ${(global.data.threadInfo.get(info.t_id) || {}).threadName}
⚡ 𝐈𝐃 𝐍𝐡𝐨́𝐦: ${info.t_id}
📆 𝐍𝐠𝐚̀𝐲 𝐓𝐡𝐮𝐞̂: ${info.time_start}
⏳ 𝐇𝐞̂́𝐭 𝐇𝐚̣𝐧: ${info.time_end}
📌 𝐂𝐨̀𝐧 ${(()=> {
    let time_diff = new Date(form_mm_dd_yyyy(info.time_end)).getTime()-(Date.now()+25200000);
    let days = (time_diff/(1000*60*60*24))<<0;
    let hour = (time_diff/(1000*60*60)%24)<<0;
    return `${days} 𝐧𝐠𝐚̀𝐲 ${hour} 𝐠𝐢𝐨̛̀ 𝐥𝐚̀ 𝐡𝐞̂́𝐭 𝐡𝐚̣𝐧.`;
})()}`,
                attachment: [
                    await streamURL(`https://graph.facebook.com/${info.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`),
                    await streamURL(threadInfo.imageSrc)
                ]
            });
        } else if (action === 'del') {
            const indexes = args.slice(1).map(n => parseInt(n) - 1).sort((a, b) => b - a);
            const invalidIndexes = indexes.filter(index => isNaN(index) || index < 0 || index >= data.length);
            if (invalidIndexes.length > 0) {
                send(`Các STT không hợp lệ hoặc không tồn tại: ${invalidIndexes.join(', ')}.`);
                return;
            }
            indexes.forEach(index => {
                data.splice(index, 1);
            });
            saveThuebotData();
            send(`✅ Đã xóa các nhóm có STT: ${indexes.map(i => i + 1).join(', ')} thành công.`);
        } else if (action === 'giahan') {
    const index = parseInt(args[1]) - 1;
    const daysToAdd = parseInt(args[2]);
    if (isNaN(index) || index < 0 || index >= data.length) {
        send(`STT không tồn tại hoặc không hợp lệ.`);
        return;
    }
    if (isNaN(daysToAdd) || daysToAdd <= 0) {
        send(`Số ngày gia hạn không hợp lệ. Vui lòng nhập một số nguyên dương.`);
        return;
    }
    const currentEndDate = moment(data[index].time_end, "DD/MM/YYYY");
    const newEndDate = currentEndDate.add(daysToAdd, 'days').format("DD/MM/YYYY");
    data[index].time_end = newEndDate;
    saveThuebotData();
    const threadIDToUpdate = data[index].t_id;

    // Lấy prefix của nhóm được gia hạn
    const threadPrefix = (global.data.threadData.get(threadIDToUpdate) || {}).PREFIX || global.config.PREFIX;
    
    // Lấy thông tin người gia hạn từ Users của Mirai bot
    const extenderName = await o.Users.getNameUser(o.event.senderID);
    
    // Gửi thông báo đến nhóm được gia hạn
    o.api.sendMessage(
        `📢 Thông báo gia hạn Bot\n\n` +
        `👤 Người gia hạn: ${extenderName}\n` +
        `⏳ Số ngày gia hạn: ${daysToAdd} ngày\n` +
        `📆 Hạn mới: ${newEndDate}`, 
        threadIDToUpdate
    );

    // Cập nhật biệt danh bot với prefix của nhóm
    o.api.changeNickname(
        `[ ${threadPrefix} ] • ${(!global.config.BOTNAME) ? "Made by Bảo" : global.config.BOTNAME} | HSD: ${newEndDate}`, 
        threadIDToUpdate, 
        o.api.getCurrentUserID(), 
        (err) => {
            if (err) console.error("Lỗi khi thay đổi biệt danh:", err);
            send(`✅ Đã gia hạn nhóm có STT: ${index + 1} thêm ${daysToAdd} ngày, đến ngày ${newEndDate} thành công.`);
        }
    );
        } else if (o.event.args[0].toLowerCase() == 'out') {
            for (let i of o.event.args.slice(1)) await o.api.removeUserFromGroup(o.api.getCurrentUserID(), data[i-1].t_id);   
            send(`Đã out nhóm theo yêu cầu`);
        } else if(o.event.args[0].toLowerCase() == 'page') {
            try {
                console.log(o.event.args[1])
                const itemsPerPage = _.num;
                const totalPages = Math.ceil(data.length / itemsPerPage);
                const pageNumber = o.event.args[1];

                const startIndex = (pageNumber - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const pageData = data.slice(startIndex, endIndex);
                o.api.sendMessage(`[ Danh Sách Thuê Bot ${pageNumber}/${totalPages}]\n\n${pageData.map(($, i)=>{
                    const listItemNumber = startIndex + i + 1;
                    return `${listItemNumber}. ${global.data.userName.get($.id) || ""}\n📝 Tình trạng: ${new Date(form_mm_dd_yyyy($.time_end)).getTime() >= Date.now()+25200000?'Chưa Hết Hạn ✅': 'Đã Hết Hạn ❎'}\n🌾 Nhóm: ${(global.data.threadInfo.get($.t_id) || {}).threadName || ""}\nTừ: ${$.time_start}\nĐến: ${$.time_end}`
                }).join('\n\n')}\n\n→ Reply (phản hồi) theo stt để xem chi tiết\n→ Reply del + stt để xóa khỏi danh sách\n→ Reply out + stt để thoát nhóm (cách nhau để chọn nhiều số)\n→ Reply giahan + stt để gia hạn\nVí dụ: 12/12/2023 => 1/1/2024\n→ Reply page + stt để xem các nhóm khác\nVí dụ: page 2`, o.event.threadID, (err, info)=>{
                    if(err) return console.log(err)
                    global.client.handleReply.push({
                        name: this.config.name,
                        event: o.event,
                        data,
                        num: endIndex,
                        messageID: info.messageID,
                        author: o.event.senderID
                    })
                });
            } catch(e) {
                console.log(e)
            }
        }
        saveThuebotData();
    } catch(e) {
        console.log(e)
    }
};
// Enhanced streamURL function with better error handling
async function streamURL(url, mime = 'jpg') {
    try {
        const dest = path.join(dataDir, `temp_${Date.now()}.${mime}`);
        const downloader = require('image-downloader');
        const fse = require('fs-extra');
        
        await downloader.image({ url, dest });
        
        // Auto cleanup after 2 minutes
        setTimeout(() => {
            try {
                if (fse.existsSync(dest)) {
                    fse.unlinkSync(dest);
                }
            } catch (error) {
                console.error('[THUEBOT] Cleanup error:', error.message);
            }
        }, 120 * 1000);
        
        return fse.createReadStream(dest);
    } catch (error) {
        console.error('[THUEBOT] StreamURL error:', error.message);
        return null;
    }
}

// Add missing require for crypto.randomUUID fallback
if (!crypto.randomUUID) {
    crypto.randomUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
}