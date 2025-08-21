/*
@credit ⚡️D-Jukie
@vui lòng không chỉnh sửa credit
*/
module.exports.config = {
    name: "work",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "⚡D-Jukie & Modified by Copilot", 
    description: "Làm việc để có tiền, có làm thì mới có ăn, thăng tiến để nhận thưởng",
    commandCategory: "Money",
    cooldowns: 5,
    envConfig: {
        cooldownTime: 21600000,
        workingTime: 300000, // 5 phút làm việc
        maxLevel: 10, // Level tối đa
        rewardPerLevel: 50000 // Thưởng mỗi lần lên level
    }
};
module.exports.languages = {
    "vi": {
        "cooldown": "Bạn đã làm việc rồi, quay lại sau: %1 phút %2 giây."      
    },
    "en": {
        "cooldown": "⚡️You're done, come back later: %1 minute(s) %2 second(s)."
    }
}
module.exports.handleReply = async ({ event, api, handleReply, Currencies, getText }) => {
    const { threadID, messageID, senderID } = event;
  if (senderID !== handleReply.author) return api.sendMessage("Chỗ người khác đang mần ăn, cút đi chỗ khác chơi 🙂", threadID, messageID);
    let data = (await Currencies.getData(senderID)).data || {};
//random coins nhận được khi làm việc ít nhất 200
var coinscn = Math.floor(Math.random() * 100000); //random coins khi làm ở khu công nghiệp
var coinsdv = Math.floor(Math.random() * 100000); //random coins khi làm ở khu dịch vụ
var coinsmd = Math.floor(Math.random() * 100000); //random coins khi làm ở mỏ dầu
var coinsq = Math.floor(Math.random() * 100000); //random coins khi khai thác quặng
var coinsdd = Math.floor(Math.random() * 100000); //random coins khi đào đá
var coinsdd1 = Math.floor(Math.random() * 100000); //random coins khi đào đá
var coinsex1 = Math.floor(Math.random() * 100000);
var coinsex12 = Math.floor(Math.random() * 100000);
var coinsex13 = Math.floor(Math.random() * 100000);
//random công việc cần làm
var rdcn = ['tuyển dụng nhân viên', 'quản trị khách sạn', 'tại nhà máy điện', 'đầu bếp trong nhà hàng', 'công nhân']; //random công việc khi làm ở khu công nghiệp
var work1 = rdcn[Math.floor(Math.random() * rdcn.length)];   

var rddv = ['sửa ống nước', 'sửa điều hòa cho hàng xóm', 'bán hàng đa cấp', 'phát tờ rơi', 'shipper', 'sửa máy vi tính', 'hướng dẫn viên du lịch', 'cho con bú']; //random công việc khi làm ở khu dịch vụ
var work2 = rddv[Math.floor(Math.random() * rddv.length)]; 

var rdmd = ['kiếm được 13 thùng dầu', 'kiếm được 8 thùng', 'kiếm được 9 thùng dầu', 'kiếm được 8 thùng dầu', 'ăn cướp dầu ', 'lấy nước đổ vô dầu rồi bán']; //random công việc khi làm ở mỏ dầu
var work3 = rdmd[Math.floor(Math.random() * rdmd.length)]; 

var rdq = ['quặng sắt', 'quặng vàng', 'quặng than', 'quặng chì', 'quặng đồng ', 'quặng dầu']; //random công việc khi khai thác quặng
var work4 = rdq[Math.floor(Math.random() * rdq.length)]; 

var rddd = ['kim cương', 'vàng', 'than', 'ngọc lục bảo', 'sắt ', 'đá bình thường', 'lưu ly', 'đá xanh']; //random công việc khi đào đá
var work5 = rddd[Math.floor(Math.random() * rddd.length)]; 

var rddd1 = ['khách vip', 'khách quen', 'người lạ', 'thằng ngu tầm 23 tuổi', 'anh lạ mặt chim to', 'khách quen', 'đại gia 100 tuổi', 'thằng nhóc 10 tuổi', 'sugar daddy', 'thằng si đa']; //random công việc khi đào đá
var work6 = rddd1[Math.floor(Math.random() * rddd1.length)];

var rdex1 = ['làm ô sin cho admin' ,'chùi bồn cầu ', 'bắt cướp', 'làm đĩ', 'chat sex với admin', 'thủ dâm', 'sủa gâu gâu']; //random công việc khi thử thách 
var work7 = rdex1[Math.floor(Math.random() * rdex1.length)];

  var rdex12 = ['thu tiền bảo kê', 'dành lãnh địa bàn', 'bán ma túy', 'buôn bán mại dâm', 'buôn lậu', 'cướp ngân hàng', 'bán vũ khí']; //random công việc khi thử thách 
var work8 = rdex12[Math.floor(Math.random() * rdex12.length)];
  
// Thêm công việc mới
var rdex13 = ['Cá Thu', 'Cá Sấu', 'Cá Mập', 'Cá Heo', 'Cá Voi Sát Thủ', 'Mực Ma', 'Tôm Hùm Alaska', 'Cá Voi Xanh', 'Rùa Leviathanochelys aenigmatica', 'Sứa Stygiomedusa gigantea', 'Cua Hoàng Đế', 'Cá Hồi Đại Dương', 'Cá Bò Picasso', 'Cá Bướm Mỏ Nhọn', 'Cá Hồng Y', 'Cá Hề', 'Tôm Tít', 'Cá Chim Hoàng Đế', 'Hải Sâm', 'Cá Mao Tiên', 'Cá Bắp Nẻ Xanh', 'Cá Nóc', 'Cá Đuối', 'Cá Bò Hòm', 'Bạch Tuộc Dumbo', 'Cá Mặt Trăng', 'Cá Mập Megalodon', 'Cá Nhà Táng', 'Cá Voi Lưng Gù', 'Cá Ngựa', 'Cá Ngừ', 'Cá Cam', 'Cá Đuôi Gai Vàng', 'Cá Mập Đầu Búa', 'Cá Mập Pliotrema Kajae', 'Mực Colossal', 'Người Cá', 'Cá Bubble Eye', 'Cá Mập Greenland', 'Cá Oarfish', 'Cua Nhện'];

// Công việc mới - Khu game
var rdGame = ['stream game', 'review game', 'test game', 'thiết kế game', 'lập trình game', 'quản lý cyber game'];
var workGame = rdGame[Math.floor(Math.random() * rdGame.length)];

// Công việc mới - Khu giải trí
var rdEnt = ['ca sĩ', 'diễn viên', 'người mẫu', 'vũ công', 'nghệ sĩ', 'biên đạo', 'đạo diễn'];
var workEnt = rdEnt[Math.floor(Math.random() * rdEnt.length)];

// Công việc mới - Khu công nghệ
var rdTech = ['lập trình viên', 'kỹ sư phần mềm', 'chuyên gia AI', 'quản trị mạng', 'phân tích dữ liệu', 'thiết kế UI/UX'];
var workTech = rdTech[Math.floor(Math.random() * rdTech.length)]; //random công việc khi thử thách 
var work9 = rdex13[Math.floor(Math.random() * rdex13.length)];

var rdex0 = ['Đại Tây Dương', 'Thái Bình Dương', 'Tam Giác Quỷ', 'Bắc Băng Dương', 'Ấn Độ Dương', 'Nam Đại Dương', 'Vùng caribe', 'Châu Đại Đương', 'vùng Australia', 'Philippines', 'San Hô', 'Đông', 'Nam Cực', 'Địa Trung Hải', 'Bering', 'Tây Ban Nha', 'Vịnh Mexico', 'Vịnh Monterey']; //random công việc khi thử thách 
var lo = rdex0[Math.floor(Math.random() * rdex0.length)];

var msg = "";
    switch(handleReply.type) {
        case "choosee": {
            // Lấy level hiện tại
            let level = data.workLevel || 1;
            let exp = data.workExp || 0;
            let expNeeded = level * 100;
            
            // Tăng exp ngẫu nhiên (10-20)
            let expGain = Math.floor(Math.random() * 11) + 10;
            exp += expGain;
            
            // Kiểm tra lên level
            let maxLevel = 10; // Đặt giá trị mặc định
            let rewardPerLevel = 50000; // Đặt giá trị mặc định
            if (exp >= expNeeded && level < maxLevel) {
                level++;
                exp = 0;
                // Thưởng tiền khi lên level
                await Currencies.increaseMoney(event.senderID, rewardPerLevel);
                api.sendMessage(`🎉 Chúc mừng bạn đã thăng cấp công việc! Level hiện tại: ${level}\n💰 Nhận thưởng: ${rewardPerLevel}$`, threadID);
            }
            
            // Lưu level và exp
            data.workLevel = level;
            data.workExp = exp;
            await Currencies.setData(event.senderID, { data });
            
            let bonusMultiplier = 1 + (level * 0.1); // Tăng 10% tiền thưởng mỗi level
            
            switch(event.body) {
                case "1": msg = `Bạn đang làm việc ${work1} ở khu công nghiệp và kiếm được ${Math.floor(coinscn * bonusMultiplier)}$ 💼\nKinh nghiệm +${expGain} (${exp}/${expNeeded})` ;await Currencies.increaseMoney(event.senderID, parseInt(coinscn * bonusMultiplier)); break;             
                case "2": msg = `Bạn đang làm việc ${work2} ở khu dịch vụ và kiếm được ${Math.floor(coinsdv * bonusMultiplier)}$ 🛠️\nKinh nghiệm +${expGain} (${exp}/${expNeeded})`; await Currencies.increaseMoney(event.senderID, parseInt(coinsdv * bonusMultiplier)); break;
                case "3": msg = `Bạn ${work3} tại khu mỏ dầu và bán được ${Math.floor(coinsmd * bonusMultiplier)}$ 🛢️\nKinh nghiệm +${expGain} (${exp}/${expNeeded})`; await Currencies.increaseMoney(event.senderID, parseInt(coinsmd * bonusMultiplier)); break;
                case "4": msg = `Bạn đang khai thác ${work4} và kiếm được ${Math.floor(coinsq * bonusMultiplier)}$ ⛏️\nKinh nghiệm +${expGain} (${exp}/${expNeeded})`; await Currencies.increaseMoney(event.senderID, parseInt(coinsq * bonusMultiplier)); break;
                case "5": msg = `Bạn đào được ${work5} và kiếm được ${Math.floor(coinsdd * bonusMultiplier)}$ 💎\nKinh nghiệm +${expGain} (${exp}/${expNeeded})` ; await Currencies.increaseMoney(event.senderID, parseInt(coinsdd * bonusMultiplier)); break;
                case "6": msg = `Bạn được ${work6} cho ${Math.floor(coinsdd1 * bonusMultiplier)}$ nếu chịt 1 đêm, thế là bạn đồng ý chịt ngay 🤤\nKinh nghiệm +${expGain} (${exp}/${expNeeded})`; await Currencies.increaseMoney(event.senderID, parseInt(coinsdd1 * bonusMultiplier)); break;
                case "7": msg = `Bạn vừa nhận thử thách 24h ${work7} và nhận được ${Math.floor(coinsex1 * bonusMultiplier)}$ 🎯\nKinh nghiệm +${expGain} (${exp}/${expNeeded})`; await Currencies.increaseMoney(event.senderID, parseInt(coinsex1 * bonusMultiplier)); break;
                case "8": msg = `Bạn vừa ${work8} ở khu cao lầu và kiếm về ${Math.floor(coinsex12 * bonusMultiplier)}$ 🏰\nKinh nghiệm +${expGain} (${exp}/${expNeeded})`; await Currencies.increaseMoney(event.senderID, parseInt(coinsex12 * bonusMultiplier)); break;
                case "9": msg = `🎣 Bạn vừa câu dính ${work9} ở Biển ${lo} và bán được ${Math.floor(coinsex13 * bonusMultiplier)}$\nKinh nghiệm +${expGain} (${exp}/${expNeeded})`; await Currencies.increaseMoney(event.senderID, parseInt(coinsex13 * bonusMultiplier)); break;
                case "10": msg = `👾 Bạn làm ${workGame} trong ngành game và kiếm được ${Math.floor(100000 * bonusMultiplier)}$\nKinh nghiệm +${expGain} (${exp}/${expNeeded})`; await Currencies.increaseMoney(event.senderID, parseInt(100000 * bonusMultiplier)); break;
                case "11": msg = `🎬 Bạn làm ${workEnt} trong ngành giải trí và kiếm được ${Math.floor(120000 * bonusMultiplier)}$\nKinh nghiệm +${expGain} (${exp}/${expNeeded})`; await Currencies.increaseMoney(event.senderID, parseInt(120000 * bonusMultiplier)); break;
                case "12": msg = `💻 Bạn làm ${workTech} trong ngành công nghệ và kiếm được ${Math.floor(150000 * bonusMultiplier)}$\nKinh nghiệm +${expGain} (${exp}/${expNeeded})`; await Currencies.increaseMoney(event.senderID, parseInt(150000 * bonusMultiplier)); break;
                default: break;
            };
            const choose = parseInt(event.body);
            if (isNaN(event.body)) return api.sendMessage("Vui lòng nhập 1 con số", event.threadID, event.messageID);
            if (choose > 12 || choose < 1) return api.sendMessage("Lựa chọn không nằm trong danh sách.", event.threadID, event.messageID); //thay số case vào số thực tế
            api.unsendMessage(handleReply.messageID);
            if (msg == "Chưa update...") {
                msg = "Update soon...";
            };
            return api.sendMessage(`${msg}`, threadID, async () => {
            
            
        });

    };
}
}
module.exports.run = async ({  event, api, handleReply, Currencies, getText }) => {
    const { threadID, messageID, senderID } = event;
    const cooldown = global.configModule[this.config.name].cooldownTime;
    let data = (await Currencies.getData(senderID)).data || {};
    //cooldownTime cho mỗi lần nhận 
    if (typeof data !== "undefined" && cooldown - (Date.now() - data.work2Time) > 0) {

        var time = cooldown - (Date.now() - data.work2Time),
            minutes = Math.floor(time / 60000),
            seconds = ((time % 60000) / 1000).toFixed(0); 
        return api.sendMessage(getText("cooldown", minutes, (seconds < 10 ? "0" + seconds : seconds)), event.threadID, event.messageID);
    }
    else {    
    let level = data.workLevel || 1;
    let exp = data.workExp || 0;
    let expNeeded = level * 100;
    let rewardPerLevel = 50000; // Đặt giá trị mặc định
    
    return api.sendMessage("===[ KIẾM TIỀN MỖI NGÀY ]===" +
                "\n──────────────────" +
                `\n💼 Level: ${level} (${exp}/${expNeeded} exp)` +
                "\n💰 Thưởng mỗi level: " + rewardPerLevel + "$" +
                "\n──────────────────" +
                "\n1. Khu công nghiệp 🏭" +
                "\n2. Khu dịch vụ 💡" +
                "\n3. Khu mỏ dầu 💎" +
                "\n4. Khai thác quặng ⛏️" +
                "\n5. Đào đá 🔨" +
                "\n6. Làm đĩ =))" +
                "\n7. Thử thách ⛩️" +
                "\n8. Khu cao lầu 🏰" +
                "\n9. Câu cá 🎣" +
                "\n10. Khu Game 👾" +
                "\n11. Khu Giải Trí 🎬" +
                "\n12. Khu Công Nghệ 💻" +
                "\n──────────────────" +
                "\n→ Hãy reply tin nhắn và chọn theo số thứ tự." +
                "\n→ Càng làm việc càng tăng level, thu nhập tăng 10% mỗi level!" //thêm hiển thị case tại đây ||  \n[number]. [Ngành nghề]" +
            , event.threadID, (error, info) => {
        global.client.handleReply.push({
            type: "choosee",
            name: this.config.name,
            author: event.senderID,
            messageID: info.messageID
          });
                          data.work2Time = Date.now();
             Currencies.setData(senderID, { data });
        })
    }
}