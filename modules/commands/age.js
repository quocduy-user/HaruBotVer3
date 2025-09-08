// Loli is the best!!
module.exports.config = {
    name: "age",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Khoa • tpk • improved by Cascade",
    description: "Tính tuổi chi tiết (năm/tháng/ngày), ngày sinh, cung hoàng đạo, sinh nhật kế tiếp",
    commandCategory: "Tiện ích",
    usages: "age <dd/mm/yyyy> (hỗ trợ dd-mm-yyyy, có thể reply văn bản chứa ngày)",
    cooldowns: 0
};

module.exports.run = async function ({ event, args, api }) {
  const moment = require("moment-timezone");
  moment.locale('vi');
  const inputText = (event.type == "message_reply") ? (event.messageReply.body || '') : args.join(" ");
  if (!inputText.trim()) 
    return api.sendMessage(`Cách dùng: age <dd/mm/yyyy> (hỗ trợ dd-mm-yyyy).\nVí dụ: age 07/09/2000`, event.threadID, event.messageID);

  async function streamURL(url, mime='jpg') {
    const dest = `${__dirname}/cache/${Date.now()}.${mime}`,
    downloader = require('image-downloader'),
    fse = require('fs-extra');
    await downloader.image({
        url, dest
    });
    setTimeout(j=>fse.unlinkSync(j), 60*1000, dest);
    return fse.createReadStream(dest);
};
  // Tìm ngày theo pattern dd/mm/yyyy hoặc dd-mm-yyyy trong inputText
  const match = inputText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!match) return api.sendMessage(`Vui lòng nhập đúng định dạng: dd/mm/yyyy hoặc dd-mm-yyyy`, event.threadID, event.messageID);
  const dd = match[1].padStart(2,'0');
  const MM = match[2].padStart(2,'0');
  const yyyy = match[3];

  const birth = moment.tz(`${dd}/${MM}/${yyyy}`, 'DD/MM/YYYY', true, 'Asia/Ho_Chi_Minh');
  if (!birth.isValid()) return api.sendMessage(`Ngày sinh không hợp lệ!`, event.threadID, event.messageID);
  if (birth.isAfter(moment())) return api.sendMessage(`Ngày sinh không thể ở tương lai!`, event.threadID, event.messageID);
  if (parseInt(yyyy) < 1900) return api.sendMessage(`Năm sinh quá xa (trước 1900), vui lòng nhập lại.`, event.threadID, event.messageID);

  const now = moment.tz('Asia/Ho_Chi_Minh');
  const years = now.diff(birth, 'years');
  const afterYears = birth.clone().add(years, 'years');
  const months = now.diff(afterYears, 'months');
  const afterMonths = afterYears.clone().add(months, 'months');
  const days = now.diff(afterMonths, 'days');

  const totalDays = now.startOf('day').diff(birth.startOf('day'), 'days');
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = now.diff(birth, 'hours');
  const totalMinutes = now.diff(birth, 'minutes');
  const totalSeconds = now.diff(birth, 'seconds');

  const dayOfWeek = birth.clone().locale('vi').format('dddd');

  // Cung hoàng đạo (Western)
  function zodiac(d, m) {
    const md = parseInt(m)*100 + parseInt(d);
    if (md >= 321 && md <= 419) return 'Bạch Dương (Aries)';
    if (md >= 420 && md <= 520) return 'Kim Ngưu (Taurus)';
    if (md >= 521 && md <= 621) return 'Song Tử (Gemini)';
    if (md >= 622 && md <= 722) return 'Cự Giải (Cancer)';
    if (md >= 723 && md <= 822) return 'Sư Tử (Leo)';
    if (md >= 823 && md <= 922) return 'Xử Nữ (Virgo)';
    if (md >= 923 && md <= 1023) return 'Thiên Bình (Libra)';
    if (md >= 1024 && md <= 1122) return 'Bọ Cạp (Scorpio)';
    if (md >= 1123 && md <= 1221) return 'Nhân Mã (Sagittarius)';
    if (md >= 1222 || md <= 119) return 'Ma Kết (Capricorn)';
    if (md >= 120 && md <= 218) return 'Bảo Bình (Aquarius)';
    return 'Song Ngư (Pisces)';
  }
  const zodiacName = zodiac(dd, MM);

  // Sinh nhật kế tiếp
  let nextBirthday = birth.clone().year(now.year());
  if (nextBirthday.isBefore(now, 'day')) nextBirthday = nextBirthday.add(1, 'year');
  const daysToNext = nextBirthday.startOf('day').diff(now.startOf('day'), 'days');

  const body = [
    `┏━━━━━━━━━━━━━━━━━━━━━━┓`,
    `┃  📅 MÁY TÍNH TUỔI TÁC                  ┃`,
    `┗━━━━━━━━━━━━━━━━━━━━━━┛`,
    ``,
    `🧾 Thông tin sinh:`,
    `• Ngày sinh: ${dd}/${MM}/${yyyy} (${dayOfWeek})`,
    `• Cung hoàng đạo: ${zodiacName}`,
    ``,
    `🎯 Tuổi hiện tại:`,
    `• ${years} năm ${months} tháng ${days} ngày`,
    ``,
    `⏱️ Tổng thời gian đã qua:`,
    `• ${totalWeeks} tuần (${totalDays} ngày)`,
    `• ${totalHours} giờ | ${totalMinutes} phút | ${totalSeconds} giây`,
    ``,
    `🎂 Sinh nhật kế tiếp:`,
    `• Ngày: ${nextBirthday.format('DD/MM/YYYY')}`,
    `• Còn lại: ${daysToNext} ngày`
  ].join('\n');

  return api.sendMessage({
    body,
    attachment: await streamURL(`https://graph.facebook.com/${event.senderID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)
  }, event.threadID, event.messageID);
}