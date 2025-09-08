const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { resolve } = require("path");

// Hàm tiện ích
const formatUptime = () => {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
};

const getSystemStats = () => {
    const memUsage = process.memoryUsage();
    return {
        uptime: formatUptime(),
        memory: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        threads: global.data.allThreadID?.length || 0,
        users: global.data.allUserID?.length || 0
    };
};

const logAdminAction = (action, performer, target = null) => {
    const timestamp = new Date().toLocaleString('vi-VN');
    const logEntry = `[${timestamp}] ${performer} ${action}${target ? ` ${target}` : ''}`;
    
    const logPath = resolve(__dirname, 'data', 'adminLog.txt');
    const currentLog = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '';
    const newLog = logEntry + '\n' + currentLog;
    
    // Giữ chỉ 100 dòng log gần nhất
    const lines = newLog.split('\n').slice(0, 100);
    writeFileSync(logPath, lines.join('\n'));
};

module.exports.config = {
    name: "admin",
    version: "2.2.0",
    hasPermssion: 1,
    credits: "Mirai Team - Modified by Satoru - Upgraded by Cascade",
    description: "Hệ thống quản lý admin nâng cao với thống kê và giám sát",
    commandCategory: "Hệ thống",
    usages: "admin [list|add|addndh|remove|removendh|toggle <qtvonly|only|ibrieng>]",
    cooldowns: 2,
    dependencies: {
        "fs-extra": ""
    }
};

module.exports.languages = {
    "vi": {
        "listAdmin": `=== [ DANH SÁCH ADMIN & NGƯỜI HỖ TRỢ ] ===\n━━━━━━━━━━━━━━━━━━\n=== [ ADMIN BOT ] ===\n%1\n\n=== [ NGƯỜI HỖ TRỢ ] ===\n%2\n\nReply số thứ tự để xóa đối tượng tương ứng.`,
        "notHavePermssion": '[ ADMIN ] → Bạn không đủ quyền hạn để có thể sử dụng chức năng "%1"',
        "addedSuccess": '[ ADMIN ] → Đã thêm %1 người dùng trở thành %2:\n\n%3',
        "removedSuccess": '[ ADMIN ] → Đã gỡ vai trò %1 của %2 người dùng:\n\n%3',
        "removedByIndex": '[ ADMIN ] → Đã gỡ thành công %1:\n%2',
        "invalidIndex": '[ ADMIN ] → Số thứ tự không hợp lệ!'
    }
};

module.exports.onLoad = function() {
    const pathData = resolve(__dirname, 'data', 'dataAdbox.json');
    if (!existsSync(pathData)) {
        const obj = {
            adminOnly: {},
            adminbox: {},
            only: {},
            privateChat: {}
        };
        writeFileSync(pathData, JSON.stringify(obj, null, 4));
    }
};

module.exports.handleReply = async function({ api, event, handleReply, getText, Users }) {
    if (event.senderID != handleReply.author) return;
    const { threadID, messageID, body } = event;
    const { configPath } = global.client;
    const config = require(configPath);

    // Cho phép xóa nhiều bằng cách reply: "1 3 5"
    const tokens = String(body || '').trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return api.sendMessage(getText("invalidIndex"), threadID, messageID);

    const display = handleReply.display || []; // [{id, role}]
    const removed = [];
    const failed = [];

    for (const tok of tokens) {
        const idx = parseInt(tok, 10);
        if (isNaN(idx) || idx < 1 || idx > display.length) {
            failed.push(`#${tok}`);
            continue;
        }
        const item = display[idx - 1];
        const uid = item.id;
        const roleText = item.role;

        try {
            const name = global.data.userName.get(uid) || await Users.getNameUser(uid);
            if (roleText === 'ADMIN BOT') {
                const i1 = config.ADMINBOT.indexOf(uid);
                if (i1 !== -1) config.ADMINBOT.splice(i1, 1);
                const i2 = global.config.ADMINBOT.indexOf(uid);
                if (i2 !== -1) global.config.ADMINBOT.splice(i2, 1);
            } else {
                const i1 = config.NDH.indexOf(uid);
                if (i1 !== -1) config.NDH.splice(i1, 1);
                const i2 = global.config.NDH.indexOf(uid);
                if (i2 !== -1) global.config.NDH.splice(i2, 1);
            }
            removed.push(`${uid} - ${name} (${roleText})`);
        } catch (e) {
            failed.push(`${uid} (${roleText})`);
        }
    }

    writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');

    const lines = [];
    if (removed.length) lines.push(`✅ Đã gỡ: ${removed.length}\n• ` + removed.join('\n• '));
    if (failed.length) lines.push(`❎ Lỗi/không hợp lệ: ${failed.length}\n• ` + failed.join('\n• '));
    return api.sendMessage(lines.join('\n\n') || getText("invalidIndex"), threadID, messageID);
};

module.exports.run = async function({ api, event, args, Users, permssion, getText }) {
    const { threadID, messageID, mentions, senderID } = event;
    const { configPath } = global.client;
    const config = require(configPath);
    const mention = Object.keys(mentions);
    
    if (!args[0] || args[0] === "help") {
        return api.sendMessage(
            `🔧 ADMIN PANEL (Gọn nhẹ)\n\n` +
            `📋 QUẢN LÝ QUYỀN:\n` +
            `• admin list [page]\n` +
            `• admin add <@tag|reply|uid>\n` +
            `• admin addndh <@tag|reply|uid>\n` +
            `• admin remove <@tag|reply|uid>\n` +
            `• admin removendh <@tag|reply|uid>\n\n` +
            `⚙️ CẤU HÌNH NHÓM:\n` +
            `• admin toggle <qtvonly|only|ibrieng>`,
            threadID, messageID
        );
    }

    const getUids = async (type) => {
        let uids = [];
        if (event.type === "message_reply") {
            uids.push(event.messageReply.senderID);
        } else if (mention.length > 0) {
            uids = mention;
        } else if (args[1] && !isNaN(args[1])) {
            uids.push(args[1]);
        }
        return uids;
    };

    const addUsers = async (uids, type) => {
        const added = [];
        for (const uid of uids) {
            const name = global.data.userName.get(uid) || await Users.getNameUser(uid);
            if (type === "ADMIN" && !config.ADMINBOT.includes(uid)) {
                config.ADMINBOT.push(uid);
                global.config.ADMINBOT.push(uid);
                added.push(`${uid} - ${name}`);
            } else if (type === "NDH" && !config.NDH.includes(uid)) {
                config.NDH.push(uid);
                global.config.NDH.push(uid);
                added.push(`${uid} - ${name}`);
            }
        }
        return added;
    };

    const removeUsers = async (uids, type) => {
        const removed = [];
        for (const uid of uids) {
            const name = global.data.userName.get(uid) || await Users.getNameUser(uid);
            if (type === "ADMIN") {
                const index = config.ADMINBOT.indexOf(uid);
                if (index !== -1) {
                    config.ADMINBOT.splice(index, 1);
                    global.config.ADMINBOT.splice(global.config.ADMINBOT.indexOf(uid), 1);
                    removed.push(`${uid} - ${name}`);
                }
            } else if (type === "NDH") {
                const index = config.NDH.indexOf(uid);
                if (index !== -1) {
                    config.NDH.splice(index, 1);
                    global.config.NDH.splice(global.config.NDH.indexOf(uid), 1);
                    removed.push(`${uid} - ${name}`);
                }
            }
        }
        return removed;
    };

    switch (args[0]) {
        case "list": {
            if (permssion < 2) return api.sendMessage(getText("notHavePermssion", "list"), threadID, messageID);
            // Hỗ trợ phân trang: admin list [page]
            const pageSize = 10;
            const reqPage = Math.max(1, parseInt(args[1] || '1', 10) || 1);
            const all = [
                ...config.ADMINBOT.map(id => ({ id, role: 'ADMIN BOT' })),
                ...config.NDH.map(id => ({ id, role: 'NGƯỜI HỖ TRỢ' }))
            ];
            const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
            const page = Math.min(reqPage, totalPages);
            const slice = all.slice((page - 1) * pageSize, page * pageSize);

            let count = (page - 1) * pageSize + 1;
            const lines = [];
            for (const item of slice) {
                const name = global.data.userName.get(item.id) || await Users.getNameUser(item.id);
                lines.push(`${count++}. ${name}\n→ ID: ${item.id}\n→ Vai trò: ${item.role}`);
            }

            const header = `=== [ DANH SÁCH ADMIN & NDH ] ===\nTrang ${page}/${totalPages}`;

            return api.sendMessage(
                `${header}\n\n${lines.join('\n\n')}\n\nReply số thứ tự (có thể nhiều số, cách nhau khoảng trắng) để gỡ quyền.`,
                threadID,
                (error, info) => {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        display: slice // lưu mapping trang đang hiển thị
                    });
                },
                messageID
            );
        }

        case "add": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "add"), threadID, messageID);
            const uids = await getUids("ADMIN");
            const added = await addUsers(uids, "ADMIN");
            if (added.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                logAdminAction("thêm admin", await Users.getNameUser(senderID), added.join(", "));
                return api.sendMessage(getText("addedSuccess", added.length, "ADMIN BOT", added.join("\n")), threadID, messageID);
            }
            break;
        }

        

        

        

        case "addndh": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "addndh"), threadID, messageID);
            const uids = await getUids("NDH");
            const added = await addUsers(uids, "NDH");
            if (added.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                logAdminAction("thêm NDH", await Users.getNameUser(senderID), added.join(", "));
                return api.sendMessage(getText("addedSuccess", added.length, "NGƯỜI HỖ TRỢ", added.join("\n")), threadID, messageID);
            }
            break;
        }

        case "remove": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "remove"), threadID, messageID);
            const uids = await getUids("ADMIN");
            const removed = await removeUsers(uids, "ADMIN");
            if (removed.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                logAdminAction("gỡ admin", await Users.getNameUser(senderID), removed.join(", "));
                return api.sendMessage(getText("removedSuccess", removed.length, "ADMIN BOT", removed.join("\n")), threadID, messageID);
            }
            break;
        }

        case "removendh": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "removendh"), threadID, messageID);
            const uids = await getUids("NDH");
            const removed = await removeUsers(uids, "NDH");
            if (removed.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                logAdminAction("gỡ NDH", await Users.getNameUser(senderID), removed.join(", "));
                return api.sendMessage(getText("removedSuccess", removed.length, "NGƯỜI HỖ TRỢ", removed.join("\n")), threadID, messageID);
            }
            break;
        }

        case "toggle": {
            const pathData = resolve(__dirname, 'data', 'dataAdbox.json');
            const database = require(pathData);
            const sub = (args[1] || '').toLowerCase();
            if (!['qtvonly','only','ibrieng'].includes(sub)) {
                return api.sendMessage('⚠️ Dùng: admin toggle <qtvonly|only|ibrieng>', threadID, messageID);
            }
            if (sub === 'qtvonly' && permssion < 1) return api.sendMessage('[ ADMIN ] → Cần quyền QTV', threadID, messageID);
            if (sub === 'only' && permssion < 2) return api.sendMessage('[ ADMIN ] → Cần quyền ADMIN', threadID, messageID);
            if (sub === 'ibrieng' && permssion !== 3) return api.sendMessage('[ ADMIN ] → Cần quyền ADMIN', threadID, messageID);

            if (sub === 'qtvonly') {
                database.adminbox[threadID] = !database.adminbox[threadID];
                writeFileSync(pathData, JSON.stringify(database, null, 4));
                return api.sendMessage(`[ ADMIN ] → ${database.adminbox[threadID] ? 'Bật' : 'Tắt'} chế độ QTV Only thành công`, threadID, messageID);
            }
            if (sub === 'only') {
                database.only[threadID] = !database.only[threadID];
                writeFileSync(pathData, JSON.stringify(database, null, 4));
                return api.sendMessage(`[ ADMIN ] → ${database.only[threadID] ? 'Bật' : 'Tắt'} chế độ Admin Only thành công`, threadID, messageID);
            }
            if (sub === 'ibrieng') {
                database.privateChat[threadID] = !database.privateChat[threadID];
                writeFileSync(pathData, JSON.stringify(database, null, 4));
                return api.sendMessage(`[ ADMIN ] → ${database.privateChat[threadID] ? 'Bật' : 'Tắt'} chế độ chat riêng thành công`, threadID, messageID);
            }
            break;
        }

        default: {
            return api.sendMessage("[ ADMIN ] → Lệnh không hợp lệ! Gõ 'admin' để xem hướng dẫn", threadID, messageID);
        }
    }
};