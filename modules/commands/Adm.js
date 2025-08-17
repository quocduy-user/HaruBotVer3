const { exec } = require("child_process");
const fs = require('fs-extra');
const path = require('path');
const messageCountFolderPath = path.join(__dirname, '../../modules/commands/_checktt');
var request = require("request");const { readdirSync, readFileSync, writeFileSync, existsSync, copySync, createWriteStream, createReadStream } = require("fs-extra");
module.exports.config = {
    name: "adm",
    version: "1.0.0",
    hasPermssion: 3,
    credits: "NGH",
    description: "Tùy chỉnh các chế độ cho các ADMIN",
    commandCategory: "Admin",
    usages: "< add/remove | Super Admin & Admin > | < list/only/ibrieng >",
    cooldowns: 2,
    dependencies: {
        "fs-extra": "",
        "fast-speedtest-api": ""
    }
};
module.exports.run = async function({ api, event, args, Threads, Users, Currencies, models }) { 
    const permission = global.config.NDH;
    let dataThread = (await Threads.getData(event.threadID)).threadInfo;
    switch (args[0]) {
        case "help": {
    const helpMessage = `🤖 Chức năng:\n` +
    `🐚 • shell <lệnh>: Thực thi lệnh và trả về kết quả.\n` +
    `🔄 • rsqtv: Làm mới quản trị viên trong box.\n` +
    `📛 • rnamebot <name>: Đổi tên bot tất cả nhóm.\n` +
    `🗑️ • reset: Xóa dữ liệu của box không hoạt động.\n` +
    `🔧 • setqtv:\n` +
    `    ➕ • add me: để add quản trị viên cho bản thân.\n` +
    `    ➕ • add reply tn/tag: để set quản trị viên.\n` +
    `    ➖ • remove reply tn/tag: để xóa quản trị viên.\n` +
    `🚪 • out: dùng để out box.\n` +
    `🔄 • rs: dùng để khởi động lại bot.\n` +
    `🗑️ • delmsg: dùng để xóa tin nhắn trong acc bot.\n` +
    `📤 • delbox: dùng để rã box.\n` +
    `🆔 • idbox: xem id box\n` +
    `🖼️ • imagebox: Đổi avt box\n` +
    `😃 • emoji: Đổi emoji box\n` +
    `✏️ • renamebox: Đổi tên box\n` +
    `🚀 • fast: Dùng để kiểm tra tốc độ mạng.\n` +
    `🔄 • updateuser: Dùng để update dữ liệu thành viên\n` +
    `📦 • updatebox: Dùng để update dữ liệu box\n` +
    `🚷 • kickndfb: Dùng để kick người dùng FB`;
    return api.sendMessage(helpMessage, event.threadID);
}

   
        case "updateuser": {
            if (event.senderID != 61568252515454) {
                return api.sendMessage(`Tuổi con cặc`, event.threadID, event.messageID);
            }
            const { threadID } = event;
            const { setData, getData } = Users;
            var inbox = await api.getThreadList(100, null, ['INBOX']);
            let list = [...inbox].filter(group => group.isSubscribed && group.isGroup);
            for (var groupInfo of list) {
                var groupDetails = await Threads.getInfo(groupInfo.threadID) || await api.getThreadInfo(groupInfo.threadID);
                var { participantIDs } = groupDetails;
                for (var id of participantIDs) {
                    let data = await api.getUserInfo(id);
                    let userName = data[id].name;
                    await Users.setData(id, { name: userName, data: {} });
                    console.log(`Đã cập nhật dữ liệu của ID: ${id}`);
                }
            }
            console.log(`Update successful!`);
            return api.sendMessage(`Đã cập nhật thành công tất cả dữ liệu người dùng!`, threadID);
            break;
        }
        
        case "kickndfb": {
            var { userInfo, adminIDs } = await api.getThreadInfo(event.threadID);    
            var success = 0, fail = 0;
            var arr = [];
                for (const e of userInfo) {
                    if (e.gender == undefined) {
                        arr.push(e.id);
                    }
                };

                    adminIDs = adminIDs.map(e => e.id).some(e => e == api.getCurrentUserID());
                    if (arr.length == 0) {
                        return api.sendMessage("Trong nhóm bạn không tồn tại 'Người dùng Facebook'.", event.threadID);
                    }
                        else {
                                api.sendMessage("Nhóm bạn hiện có " + arr.length + " 'Người dùng Facebook'.", event.threadID, function () {
                    if (!adminIDs) {
                        api.sendMessage("Nhưng bot không phải là quản trị viên nên không thể lọc được.", event.threadID);
                    } else {
                        api.sendMessage("Bắt đầu lọc..", event.threadID, async function() {
                            for (const e of arr) {
                        try {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            await api.removeUserFromGroup(parseInt(e), event.threadID);   
                            success++;
                        }
                        catch {
                            fail++;
                        }
                    }
                  
                    api.sendMessage("Đã lọc thành công " + success + " người.", event.threadID, function() {
                        if (fail != 0) return api.sendMessage("Lọc thất bại " + fail + " người.", event.threadID);
                    }); 
                  })
            }
        })
    }
break;
        }
        case "updatebox": {
            const permission = ["61568252515454"];
            if (!permission.includes(event.senderID)) {
                return api.sendMessage("Quyền lồn biên giới?", event.threadID, event.messageID);
            }
            const { threadID } = event;
            const { setData, getData } = Threads;
            var inbox = await api.getThreadList(100, null, ['INBOX']);
            let list = [...inbox].filter(group => group.isSubscribed && group.isGroup);
            const lengthGroup = list.length;
            for (var groupInfo of list) {
                console.log(`Đã cập nhật dữ liệu của box ID: ${groupInfo.threadID}`)
                var threadInfo = await api.getThreadInfo(groupInfo.threadID);
                threadInfo.threadName;
                await Threads.setData(groupInfo.threadID, { threadInfo });
            }
            console.log(`Đã cập nhật dữ liệu của ${lengthGroup} box`);
            return api.sendMessage(`Đã cập nhật dữ liệu của ${lengthGroup} box`, threadID);
            break;
        }
        
        case "idbox": {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
            return api.sendMessage(`➣ Id box:${event.threadID}`, event.threadID, event.messageID);
        }
        case "out": {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
            const id = parseInt(args[0]) || event.threadID;
                return api.sendMessage('➣ Đã nhận lệnh out nhóm từ admin!', id, () => api.removeUserFromGroup(api.getCurrentUserID(), id));
        }
        case "fast":  {
            try {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
                const fast = global.nodemodule["fast-speedtest-api"];
                const speedTest = new fast({
                    token: "YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm",
                    verbose: false,
                    timeout: 10000,
                    https: true,
                    urlCount: 5,
                    bufferSize: 8,
                    unit: fast.UNITS.Mbps
                });
                const resault = await speedTest.getSpeed();
                api.setMessageReaction("✅", event.messageID, () => { }, true);
                return api.sendMessage(
                    "🚀 Speed: " + resault + " Mbps",
                    event.threadID, event.messageID
                );
            }
            catch {
                api.setMessageReaction("❎", event.messageID, () => { }, true);
                return api.sendMessage("⚠️ Không thể speedtest ngay lúc này, hãy thử lại sau!", event.threadID, event.messageID);
            }
        }
        case "delmsg": {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
            if (args[0] == "all") {
                return api.getThreadList(200, null, ["INBOX"], (err, list) => {
                    if (err) throw err;
                    list.forEach(item => (item.threadID != event.threadID) ? api.deleteThread(item.threadID) : "");
                    api.setMessageReaction("✅", event.messageID, () => { }, true);
                    api.sendMessage("➣ Đã xóa thành công tất cả tin nhắn trong acc bot !", event.threadID)
                })
               }
               else return api.getThreadList(200, null, ["INBOX"], (err, list) => {
                    if (err) throw err;
                    list.forEach(item => (item.isGroup == true && item.threadID != event.threadID) ? api.deleteThread(item.threadID) : "");
                    api.setMessageReaction("✅", event.messageID, () => { }, true);
                    api.sendMessage("➣ Đã xóa thành công tất cả tin nhắn nhóm trong acc bot !", event.threadID)
                })
               
        }
        case "delbox": {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
            const threadID = event.threadID;
            const botID = api.getCurrentUserID();
                try {
            const threadInfo = await api.getThreadInfo(threadID);
            const botIsAdmin = threadInfo.adminIDs.some(e => e.id == botID);
                api.setMessageReaction("❎", event.messageID, () => { }, true);
                if (!botIsAdmin) return api.sendMessage("Bot phải là quản trị viên thì mới rã box được!", threadID);
            const memberIDs = threadInfo.participantIDs.filter(id => {
                return id != botID && !threadInfo.adminIDs.some(admin => admin.id == id);
        });

                for (const userID of memberIDs) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    api.removeUserFromGroup(userID, threadID);
        }
                    api.setMessageReaction("✅", event.messageID, () => { }, true);
                    api.sendMessage("Vĩnh Biệt Box!!", threadID);
        } catch (error) {
                    api.sendMessage("Lỗi!!!!!", threadID);
    }

        }
        case "rs": {
            const permission = ["61568252515454"];
            if (!permission.includes(event.senderID)) {
                return api.sendMessage("Bạn đéo đủ tuổi", event.threadID, event.messageID);
            }
            api.setMessageReaction("✅", event.messageID, () => { }, true); // Thêm icon dấu tick
            api.sendMessage("➣ Tiến hành khởi động lại!", event.threadID, () => process.exit(1));
            break;
        }
        case "shell": {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
            await reportUnauthorizedUsage(api, event);
            const command = args.slice(1).join(" ");
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    return api.sendMessage(`Error: ${error.message}`, event.threadID, event.messageID);
                }
                if (stderr) {
                    return api.sendMessage(`Stderr: ${stderr}`, event.threadID, event.messageID);
                }
                return api.sendMessage(`${stdout}`, event.threadID, event.messageID);
            });
            break;
        }
        case "rsqtv": {
            if (!['61568252515454','100080418210790'].includes(event.senderID.toString())) {
    return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID);
}

            const { threadID } = event;
            const targetID = args[1] || threadID;
            var threadInfo = await api.getThreadInfo(targetID);
            let threadName = threadInfo.threadName;
            let qtv = threadInfo.adminIDs.length;
            await Threads.setData(targetID, { threadInfo });
            global.data.threadInfo.set(targetID, threadInfo);
            api.setMessageReaction("✅", event.messageID, () => { }, true);
            return api.sendMessage(`✅ Đã làm mới danh sách quản trị viên nhóm !\n➣ Box: ${threadName}\n➣ ID: ${targetID}\n➣ Cập nhật thành công ${qtv} quản trị viên nhóm!`, threadID);
        }
        case "renamebot": {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
            const custom = args.slice(1).join(" ");
            const allThreads = await Threads.getAll(["threadID"]);
            const idBot = api.getCurrentUserID();
            let threadError = [];
            let count = 0;

            const changeNickname = async (nickname, threadID) => {
                return new Promise((resolve) => {
                    api.changeNickname(nickname, threadID, idBot, (err) => {
                        if (err) {
                            threadError.push(threadID);
                        }
                        resolve();
                    });
                   });
                  };
      
                  if (custom.length != 0) {
                      for (const idThread of allThreads) {
                          await changeNickname(custom, idThread.threadID);
                          count += 1;
                          await new Promise(resolve => setTimeout(resolve, 500));
                      }
                      api.setMessageReaction("✅", event.messageID, () => {}, true);
                      api.sendMessage(`Đã đổi tên thành công cho ${count} nhóm`, event.threadID, event.messageID, () => {
                          if (threadError.length > 0) {
                              api.sendMessage(`[!] Không thể đổi tên tại ${threadError.length} nhóm`, event.threadID, event.messageID);
                          }
                      });
                  } else {
                      for (const idThread of allThreads) {
                          const threadSetting = global.client.threadData.get(idThread.threadID) || {};
                          const defaultNickname = `[ ${(threadSetting.PREFIX) ? threadSetting.PREFIX : global.config.PREFIX} ] • ${global.config.BOTNAME || "Made by CatalizCS and SpermLord"}`;
                          await changeNickname(defaultNickname, idThread.threadID);
                          count += 1;
                          await new Promise(resolve => setTimeout(resolve, 500));
                      }
                      api.setMessageReaction("✅", event.messageID, () => {}, true);
                      api.sendMessage(`Đã đổi tên thành công cho ${count} nhóm`, event.threadID, event.messageID, () => {
                          if (threadError.length > 0) {
                              api.sendMessage(`[!] Không thể đổi tên tại ${threadError.length} nhóm`, event.threadID, event.messageID);
                          }
                      });
                     }
                    }
        case "reset": {
                try {
                    if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
                         const threads = await api.getThreadList(100, null, ['INBOX']);
                         const threadsInfo = await Promise.all(threads.map((thread) => api.getThreadInfo(thread.threadID)));
                         const activeThreadIDs = threadsInfo.filter(thread => thread.isGroup && thread.participantIDs.includes(api.getCurrentUserID())).map(thread => thread.threadID.toString());
                 
                         let files = await fs.readdir(messageCountFolderPath);
                         files = files.filter(file => file.endsWith('.json'));
                 
                         for (const file of files) {
                             const fileThreadID = file.replace('.json', '');
                             if (!activeThreadIDs.includes(fileThreadID)) {
                                 await fs.remove(path.join(messageCountFolderPath, file));
                                 console.log(`Deleted data for thread ID: ${fileThreadID}`);
                             }
                         }
                 
                         api.setMessageReaction("✅", event.messageID, () => {}, true);
                         return api.sendMessage('➢ Đã xóa dữ liệu các box dư thừa.', event.threadID);
                     } catch (error) {
                         console.error('Error while resetting data:', error);
                         return api.sendMessage('❌ Đã có lỗi xảy ra khi xóa dữ liệu.', event.threadID);
                     }
                 }
        case "imagebox": {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
            if (event.type !== "message_reply") {
                api.setMessageReaction("❎", event.messageID, () => { }, true);
                return api.sendMessage("➣ Bạn phải phản hồi một ảnh nào đó", event.threadID, event.messageID);
    }
            const attachmentUrl = event.messageReply.attachments[0].url;
            const filePath = path.join(__dirname, '/cache/1.png');
            request(attachmentUrl)
            .pipe(fs.createWriteStream(filePath))
            .on('close', () => {
            api.changeGroupImage(fs.createReadStream(filePath), event.threadID, (err) => {
                if (err) {
                    return api.sendMessage("➣ Đã xảy ra lỗi khi thay đổi ảnh nhóm!", event.threadID, event.messageID);
                }
                api.setMessageReaction("✅", event.messageID, () => {}, true);
                fs.unlinkSync(filePath); 
            });
        });
    break;
}


        case "emoji": {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
            let emoji = args[1];
                if (!emoji && !event.messageReply) {
                    api.setMessageReaction("❎", event.messageID, () => { }, true);
                    return api.sendMessage("➢ Bạn phải nhập emoji\n➢ Hoặc reply tin nhắn chứa emoji!", event.threadID, event.messageID);
                }
                if (!emoji && event.messageReply) {
                    emoji = event.messageReply.body;
                }
                    api.changeThreadEmoji(emoji, event.threadID, (err) => {
                if (err) {
                        return api.sendMessage("➣ Đã xảy ra lỗi khi đổi emoji!", event.threadID, event.messageID);
                }
                    api.setMessageReaction("✅", event.messageID, () => {}, true);
                    });
                    break;
                }
                
        case "renamebox": {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
                let content = args.join(" ");
                let newName = content.slice(10).trim();
                    if (!newName && !event.messageReply) {
                        api.setMessageReaction("❎", event.messageID, () => { }, true);
                        return api.sendMessage("➣ Bạn phải nhập tên mới\n➣ Hoặc reply tin nhắn chứa tên mới!", event.threadID, event.messageID);
                    }
                    if (!newName && event.messageReply) {
                        newName = event.messageReply.body;
                    }
                        api.setTitle(newName, event.threadID, (err) => {
                    if (err) {
                            return api.sendMessage("➣ Đã xảy ra lỗi khi đổi tên box!", event.threadID, event.messageID);
                        }
                        api.setMessageReaction("✅", event.messageID, () => {}, true);
                        
                    });
                    break;
                }
                
        case "setqtv": {
            if (event.senderID != 61568252515454) return api.sendMessage(`[ 𝗠𝗢𝗗𝗘 ] → Cần quyền ADMIN để thực hiện lệnh`, event.threadID, event.messageID)
            let dataThread = (await Threads.getData(event.threadID)).threadInfo;
            if (!dataThread.adminIDs.some(item => item.id === api.getCurrentUserID()) && !dataThread.adminIDs.some(item => item.id === event.senderID)) {
                return api.sendMessage('Bạn không có quyền thực hiện thao tác này.', event.threadID, event.messageID);
            }
              
                    if (args[1] === 'add' || args[1] === 'remove') {
                let uid;
                    if (event.type === "message_reply") {
                        uid = event.messageReply.senderID;
                    } else if (args.join().includes('@')) {
                        uid = Object.keys(event.mentions)[0];
                    } else if (args[2] === 'me') {
                        uid = event.senderID;
                    } else {
                        return api.sendMessage('Vui lòng tag người dùng, reply tin nhắn của người dùng hoặc sử dụng "me" để thực hiện thao tác.', event.threadID, event.messageID);
                    }
            
                    api.sendMessage('➣ Thả cảm xúc "❤" tin nhắn này để xác nhận', event.threadID, (error, info) => {
                        if (error) return api.sendMessage('Đã có lỗi xảy ra, vui lòng thử lại sau.', event.threadID, event.messageID);
                        
                        global.client.handleReaction.push({
                            name: this.config.name,
                            type: args[1],
                            messageID: info.messageID,
                            author: event.senderID,
                            userID: uid
                        });
                        
                    });
                      module.exports.handleReaction = async function({ event, api, handleReaction, Currencies,Users}){
                       console.log(handleReaction)
                       if (event.userID != handleReaction.author) return;
                       if (event.reaction != "❤") return;
                       if(handleReaction.type == 'add'){
                         var name =  (await Users.getData(handleReaction.userID)).name
                               api.changeAdminStatus(event.threadID, handleReaction.userID, true, editAdminsCallback)
                               function editAdminsCallback(err) {
                                 if (err) return api.sendMessage("📌 Bot không đủ quyền hạn để thêm quản trị viên!", event.threadID, event.messageID);
                                 return api.sendMessage(`➣ Đã thêm ${name} làm quản trị viên nhóm`, event.threadID, event.messageID);
                               }
                       }
                       if(handleReaction.type == 'remove'){
                             var name =  (await Users.getData(handleReaction.userID)).name
                               api.changeAdminStatus(event.threadID, handleReaction.userID, false, editAdminsCallback)
                               function editAdminsCallback(err) {
                                 if (err) return api.sendMessage("📌 Bot không đủ quyền hạn để gỡ quản trị viên!", event.threadID, event.messageID);
                                 return api.sendMessage(`➣ Đã gỡ quản trị viên của ${name} thành công.`, event.threadID, event.messageID);
                               }
                               
                       }
                       
                       }
                  } else {
                      return api.sendMessage('Lệnh không hợp lệ!', event.threadID, event.messageID);
                  }
                  break;
              }
              
              
       
                 
              
              default:
                  return api.sendMessage("Lệnh không hợp lệ!", event.threadID, event.messageID);
          }
      };
      
      async function reportUnauthorizedUsage(api, event) {
          const adminIds = global.config.NDH;
          const userName = global.data.userName.get(event.senderID);
          const threadInfo = await api.getThreadInfo(event.threadID);
          const threadName = threadInfo.threadName;
          const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss (D/MM/YYYY) (dddd)");
      
          const reportMessage = `Box: ${threadName}\nUser: ${userName}\nĐã dùng lệnh: adm\nLink Facebook: https://www.facebook.com/profile.php?id=${event.senderID}\nTime: ${time}`;
      
          for (const adminId of adminIds) {
              api.sendMessage(reportMessage, adminId);
          }
      }
      
