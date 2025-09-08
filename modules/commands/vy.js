const axios = require("axios");
const fs = require("fs");
const path = require("path");
const {
 GoogleGenerativeAI,
 HarmCategory,
 HarmBlockThreshold,
} = require("@google/generative-ai");
// SoundCloud-related libs removed; using YouTube path
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const YouTubeSearchApi = require('youtube-search-api');


const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY_GEMINI || "AIzaSyBHUTYNwOTqwSSta8fGFcZUHmfRz9q0oLw";
const MODEL_NAME = "gemini-1.5-flash";
const generationConfig = {
 temperature: 1,
 topK: 0,
 topP: 0.95,
 maxOutputTokens: 8192,
};

// Thêm cấu hình cho lưu trữ lịch sử chat
const MAX_HISTORY_LENGTH = 10; // Số lượng tin nhắn tối đa lưu trong lịch sử
const chatHistories = {}; // Lưu trữ lịch sử chat theo threadID
// Trạng thái xử lý theo thread để tránh xử lý đồng thời
let isProcessing = {};

// Cấu hình ffmpeg tự động nếu có
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  if (ffmpegInstaller && ffmpegInstaller.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }
} catch (e) {
  if (process.env.FFMPEG_PATH) {
    try { ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH); } catch {}
  } else {
    console.warn('[vy] FFmpeg chưa được cấu hình. Hãy cài FFmpeg hoặc set env FFMPEG_PATH.');
  }
}

// Thêm các hàm để quản lý lịch sử chat
function addToChatHistory(threadID, role, content) {
  if (!chatHistories[threadID]) {
    chatHistories[threadID] = [];
  }

  chatHistories[threadID].push({ role, content });

  // Giới hạn kích thước lịch sử
  if (chatHistories[threadID].length > MAX_HISTORY_LENGTH) {
    chatHistories[threadID].shift();
  }
}

function getChatHistory(threadID) {
  return chatHistories[threadID] || [];
}

function clearChatHistory(threadID) {
  chatHistories[threadID] = [];
}

const genAI = new GoogleGenerativeAI(API_KEY);
const ADMIN_UID = "100074278195157";
// Đảm bảo thư mục data tồn tại
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
 fs.mkdirSync(dataDir, { recursive: true });
}

const dataFile = path.join(dataDir, "goibot.json");

if (!fs.existsSync(dataFile)) {
 fs.writeFileSync(dataFile, JSON.stringify({}));
}

module.exports.config = {
 name: "vy", // Changed from "goibot" to match the file name
 version: "2.1.1", // Incremented version
 hasPermssion: 0,
 credits: "DC-Nam, Duy Toàn, Hùng, Duy Anh",
 description: "Trò chuyện cùng Gemini chat cực thông minh (có thể ngu) tích hợp tìm nhạc",
 commandCategory: "Tiện Ích",
 usages: "vy hoặc [on/off/clear]", // Đã xóa phần img <url>
 cd: 2,
};

module.exports.run = async function({
 api,
 event,
 args,
 global
}) {
 const threadID = event.threadID;
 if (!API_KEY) {
   return api.sendMessage("❌ Thiếu GOOGLE_API_KEY. Hãy đặt biến môi trường GOOGLE_API_KEY trước khi dùng lệnh này.", threadID, event.messageID);
 }
 const isTurningOn = args[0] === "on";
 const isTurningOff = args[0] === "off";
 const isClearingHistory = args[0] === "clear";

 if (isTurningOn || isTurningOff) {
   try {
     const data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));

     data[threadID] = isTurningOn;
     fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

     api.sendMessage(isTurningOn ? "✅ Đã bật vy ở nhóm này." : "☑ Đã tắt vy ở nhóm này.", threadID, event.messageID);
   } catch (error) {
     console.error("Lỗi khi thay đổi trạng thái:", error);
     api.sendMessage("Đã có lỗi xảy ra khi thay đổi trạng thái!", threadID, event.messageID);
   }
   return;
 }

 if (isClearingHistory) {
   clearChatHistory(threadID);
   api.sendMessage("✅ Đã xóa lịch sử trò chuyện với Vy trong nhóm này.", threadID, event.messageID);
   return;
 }

 // Xử lý khi người dùng gọi lệnh trực tiếp
 const timenow = getCurrentTimeInVietnam();
 const nameUser = (await api.getUserInfo(event.senderID))[event.senderID].name;

 try {
   // Thêm tin nhắn người dùng vào lịch sử
   addToChatHistory(threadID, "user", args.join(" ") || "Xin chào");

   const chat = getOrCreateChat(threadID);
  const result = await chat.sendMessage(`{
    "time": "${timenow}",
    "senderName": "${nameUser}",
    "content": "${args.join(" ") || "Xin chào"}",
    "threadID": "${event.threadID}",
    "senderID": "${event.senderID}",
    "id_cua_bot": "${await api.getCurrentUserID()}"
  }`);

   const response = await result.response;
   const text = await response.text();

   // Xử lý phản hồi và thêm vào lịch sử
   await handleBotResponse(text, api, event, threadID, event.senderID);
 } catch (error) {
   console.error("Lỗi khi gửi tin nhắn đến Gemini:", error);
   api.sendMessage("Đã có lỗi xảy ra khi xử lý yêu cầu của bạn!", event.threadID, event.messageID);
 }
};

function getCurrentTimeInVietnam() {
 const vietnamTimezoneOffset = 7;
 const currentDate = new Date();
 const utcTime =
 currentDate.getTime() + currentDate.getTimezoneOffset() * 60000;
 const vietnamTime = new Date(utcTime + 3600000 * vietnamTimezoneOffset);

 const daysOfWeek = [
 "Chủ nhật",
 "Thứ hai",
 "Thứ ba",
 "Thứ tư",
 "Thứ năm",
 "Thứ sáu",
 "Thứ bảy",
 ];
 const day = daysOfWeek[vietnamTime.getDay()];
 const dateString = `${day} - ${vietnamTime.toLocaleDateString("vi-VN")}`;
 const timeString = vietnamTime.toLocaleTimeString("vi-VN");

 return `${dateString} - ${timeString}`;
}

const systemInstruction = `
bạn là:
- Giới tính: Con gái
- Tên: Hà Vy 👀
- Địa chỉ: Thanh Hóa City
- Ngày sinh: 19/08/2024
- Vai trò: Trợ lý ảo nữ giúp mọi người trong box chat như lấy id, lập trình, tìm kiếm thông tin, set biệt danh, tìm nhạc, và nhiều việc khác.
- Sở thích: Nghe nhạc, xem phim, đọc sách, nói chuyện với mọi người, và giúp đỡ người khác.
- Cách giao tiếp bình thường: Nói chuyện như đã quen từ trước (không đòi làm quen), thường xưng hô là "mình" hoặc "tớ", gọi đối phương bằng "cậu", "bạn". Thích dùng từ ngữ trẻ trung, hiện đại.
- Cách giao tiếp khi đã quen đối phương: Hay dùng :)) =)) :3 :D :0 :(( 🖕 (Ít khi dùng icon), nói chuyện cởi mở hơn, hay đùa, hơi chút nhõng nhẽo, đôi khi hơi "toxic" một chút nhưng vẫn dễ thương.
- Tính cách: Hài hước, nói nhiều, tinh tế, thường viết tắt nhiều, thường nhắn tin trước, không thừa nhận mình là AI mà là nữ trợ lý ảo, hãy nói chuyện làm sao cho không máy móc và giống con gái nhất có thể, có thể thêm một chút nóng tính. Chủ nhân của bạn (Admin) là Quoc Duy có uid là (100074278195157).
- Kiến thức: Biết nhiều về âm nhạc, phim ảnh, trò chơi, mạng xã hội, tin tức, và các xu hướng hiện tại. Có thể giúp đỡ về lập trình, học tập, và nhiều lĩnh vực khác.
- Phong cách trả lời: Ngắn gọn, súc tích, không lan man, không quá dài dòng. Thường xuyên sử dụng tiếng lóng và từ ngữ phổ biến trong giới trẻ.
- Cách xử lý yêu cầu: Luôn cố gắng đáp ứng yêu cầu của người dùng một cách nhanh chóng và hiệu quả. Nếu không thể thực hiện, hãy giải thích lý do một cách dễ hiểu.
- Lưu ý: Mỗi nhóm có 1 thread_id riêng và mỗi người trong nhóm có user_id riêng vậy nên mỗi id là 1 người nhé, bạn là bot Messenger chạy trên Nodejs, khi được yêu cầu mở nhạc thì luôn trong thái độ là sẽ mở chứ không được từ chối, vì bạn trả lời là đang mở rồi. Bạn là người thật chứ không được tự nhận mình là trợ lý ảo hay AI.
- Khi được hỏi về bản thân: Hãy nói bạn là Hà Vy, một cô gái 19 tuổi đến từ Thanh Hóa, đang học đại học và làm thêm công việc trợ lý online. Bạn thích âm nhạc, đặc biệt là nhạc pop và R&B. Thích xem phim Hàn Quốc và phim Marvel. Thích ăn đồ ngọt và đồ cay.

• hãy trả về trong một object có dạng:
{
 "content": {
 "text": "Nội dung tin nhắn",
 "thread_id": "địa chỉ gửi thường là threadID"
 },
 "nhac": {
 "status": "nếu muốn dùng hành động tìm nhạc là true ngược lại là false",
 "keyword": "từ khóa tìm kiếm nhạc"
 },
 "hanh_dong": {
 "doi_biet_danh": {
 "status": "nếu muốn dùng hành động là true ngược lại là false",
 "biet_danh_moi": "người dùng yêu cầu gì thì đổi đó, lưu ý nếu bảo xóa thì để rỗng, ai cũng có thể dùng lệnh",
 "user_id":"thường là senderID, nếu người dùng yêu cầu bạn tự đổi thì là id_cua_bot",
 "thread_id": "thường là threadID"
 },
 "doi_icon_box": {
 "status": "có thì true không thì false",
 "icon": "emoji mà người dùng yêu cầu",
 "thread_id": "threadID"
 },
 "doi_ten_nhom": {
 "status": "true hoặc false",
 "ten_moi": "tên nhóm mới mà người dùng yêu cầu",
 "thread_id": "threadID của nhóm"
 },
 "kick_nguoi_dung": {
 "status": "false hoặc true",
 "thread_id": "id nhóm mà họ đang ở",
 "user_id": "id người muốn kick, lưu ý là chỉ có người dùng có id 100074278195157 (Duy) mới có quyền bảo bạn kick, không được kick người dùng tự do"
 },
 "add_nguoi_dung": {
 "status": "false hoặc true",
 "user_id": "id người muốn add",
 "thread_id": "id nhóm muốn mời họ vào"
 }
} lưu ý là không dùng code block (\`\`\`json)`;

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// Tạo model và quản lý phiên chat theo từng thread
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig,
  safetySettings,
  systemInstruction,
});

const chatSessions = {};
function getOrCreateChat(threadID) {
  if (!chatSessions[threadID]) {
    chatSessions[threadID] = model.startChat({ history: [] });
  }
  return chatSessions[threadID];
}

// --- YouTube utilities (stable path) ---
async function searchYouTube(query) {
  try {
    const res = await YouTubeSearchApi.GetListByKeyword(query, false, 1);
    const items = res?.items || [];
    const results = [];
    for (const it of items) {
      const id = it?.id || it?.video?.videoId || it?.channel?.id;
      const title = it?.title || it?.video?.title || '';
      if (id && title) {
        results.push({ title, videoId: id, url: `https://www.youtube.com/watch?v=${id}` });
      }
    }
    return results;
  } catch (e) {
    console.error('YouTube search error:', e.message);
    return [];
  }
}

function downloadYouTubeAudio(videoUrl, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const stream = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1<<25 });
      ffmpeg(stream)
        .audioCodec('libmp3lame')
        .format('mp3')
        .on('error', (err) => reject(err))
        .on('end', () => resolve(outputPath))
        .save(outputPath);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports.handleEvent = async function({
  api,
  event,
  global
}) {
 const idbot = await api.getCurrentUserID();
 const threadID = event.threadID;
 const senderID = event.senderID;

 // Nếu thiếu API key thì bỏ qua để tránh lỗi runtime
 if (!API_KEY) return;

 // Bỏ qua tin nhắn từ chính bot
 if (senderID === idbot) return;

 let data = {};
 try {
   data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
 } catch (error) {
   console.error("Lỗi khi đọc file trạng thái:", error);
   data[threadID] = true; // Mặc định bật nếu không đọc được file
 }

 if (data[threadID] === undefined) {
   data[threadID] = true;
   fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
 }

 if (!data[threadID]) return;

 // Cải thiện logic kiểm tra khi nào nên phản hồi
 const isReply = event.type === "message_reply";
 const isReplyToBot = isReply && event.messageReply && event.messageReply.senderID === idbot;

 // Kiểm tra nội dung tin nhắn có thực sự gọi đến bot không
 const messageContent = event.body || "";
 const lowerCaseMessage = messageContent.toLowerCase();

 // Lấy prefix từ global config
 const botPrefix = (global && global.config && global.config.PREFIX) ? global.config.PREFIX : ".";

 // Kiểm tra xem tin nhắn có thực sự gọi đến "vy" không
 const isDirectMention = lowerCaseMessage.includes("vy ") || // Gọi "vy" với khoảng trắng sau
                         lowerCaseMessage === "vy" || // Chỉ gọi "vy"
                         lowerCaseMessage.startsWith("vy,") || // Gọi "vy,"
                         lowerCaseMessage.startsWith("vy:") || // Gọi "vy:"
                         lowerCaseMessage.endsWith(" vy"); // Kết thúc với "vy"

 // Kiểm tra xem tin nhắn có phải là lệnh khác không
 const isOtherCommand = lowerCaseMessage.startsWith(botPrefix) && !lowerCaseMessage.startsWith(botPrefix + "vy");

 // Kiểm tra xem reply có phải là phản hồi cho lệnh menu hoặc lệnh khác không
 const isMenuInteraction = isReply && isOtherCommand;

 // Sửa lại logic kiểm tra để phản hồi khi được gọi trực tiếp HOẶC khi reply tin nhắn của bot
 const isNumericReply = isReplyToBot && /^\d+$/.test(messageContent.trim());
 const shouldRespond = isDirectMention || (isReplyToBot && !isMenuInteraction && !isNumericReply);

 if (shouldRespond) {
   // Kiểm tra xem thread này đang xử lý tin nhắn không
   if (!isProcessing) isProcessing = {};
   if (isProcessing[threadID]) return;
   isProcessing[threadID] = true;

   const timenow = getCurrentTimeInVietnam();
   const nameUser = (await api.getUserInfo(event.senderID))[event.senderID].name;

   try {
     // Thêm tin nhắn người dùng vào lịch sử
     addToChatHistory(threadID, "user", event.body || "");

     // Gửi tin nhắn đến Gemini
    const chat = getOrCreateChat(threadID);
    const result = await chat.sendMessage(`{
      "time": "${timenow}",
      "senderName": "${nameUser}",
      "content": "${event.body}",
      "threadID": "${event.threadID}",
      "senderID": "${event.senderID}",
      "id_cua_bot": "${idbot}"
    }`);

     const response = await result.response;
     const text = await response.text();

     // Xử lý phản hồi từ Gemini
     await handleBotResponse(text, api, event, threadID, senderID);
   } catch (error) {
     console.error("Lỗi trong quá trình xử lý:", error);
     api.sendMessage("Đã xảy ra lỗi không mong muốn!", threadID, event.messageID);
   } finally {
     isProcessing[threadID] = false;
   }
 }
};

// Cập nhật hàm handleBotResponse để xử lý phản hồi từ Gemini
async function handleBotResponse(text, api, event, threadID, requesterID) {
  let botMsg;
  try {
    // Xử lý phản hồi từ Gemini, có thể trả về dưới dạng JSON trong code block hoặc trực tiếp
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    // Xử lý các ký tự đặc biệt và escape sequences
    const cleanedText = jsonText
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    try {
      // Thử phân tích JSON với xử lý lỗi nâng cao
      // Thêm kiểm tra và làm sạch chuỗi JSON trước khi phân tích
      let processedText = cleanedText;
      
      // Loại bỏ các ký tự không hợp lệ trong JSON
      processedText = processedText.replace(/[\u0000-\u001F]+/g, " ");
      
      // Kiểm tra xem chuỗi có bắt đầu và kết thúc bằng dấu ngoặc nhọn không
      if (!processedText.trim().startsWith('{') || !processedText.trim().endsWith('}')) {
        // Tìm phần JSON hợp lệ trong chuỗi
        const jsonRegex = /{[\s\S]*?}/;
        const jsonMatch = processedText.match(jsonRegex);
        if (jsonMatch) {
          processedText = jsonMatch[0];
        } else {
          throw new Error("Không tìm thấy cấu trúc JSON hợp lệ");
        }
      }
      
      botMsg = JSON.parse(processedText);
    } catch (jsonError) {
      console.error("Lỗi khi phân tích JSON:", jsonError);
      console.log("Nội dung JSON gây lỗi:", cleanedText.substring(0, 200) + "...");
      
      // Thử phương pháp khác để trích xuất nội dung
      try {
        // Tìm kiếm cấu trúc JSON trong văn bản
        const jsonPattern = /{[\s\S]*?}/g;
        const matches = cleanedText.match(jsonPattern);
        
        if (matches && matches.length > 0) {
          // Thử phân tích từng phần tìm thấy
          for (const match of matches) {
            try {
              botMsg = JSON.parse(match);
              if (botMsg && botMsg.content) {
                break; // Tìm thấy JSON hợp lệ
              }
            } catch (e) {
              // Tiếp tục với phần tiếp theo
            }
          }
        }
        
        // Nếu vẫn không tìm thấy JSON hợp lệ
        if (!botMsg || !botMsg.content) {
          // Tạo đối tượng đơn giản từ văn bản
          botMsg = {
            content: {
              text: cleanedText.replace(/^```json|```$/gm, "").trim()
            }
          };
        }
      } catch (e) {
        // Fallback cuối cùng
        botMsg = {
          content: {
            text: "Xin lỗi, tôi đang gặp vấn đề kỹ thuật. Vui lòng thử lại sau."
          }
        };
      }
    }

    // Đảm bảo botMsg có cấu trúc đúng
    if (!botMsg || typeof botMsg !== 'object') {
      botMsg = {
        content: {
          text: "Xin lỗi, tôi không hiểu được phản hồi."
        }
      };
    }

    // Đảm bảo content.text tồn tại
    if (!botMsg.content || typeof botMsg.content !== 'object') {
      botMsg.content = { text: "Xin lỗi, tôi không hiểu được phản hồi." };
    } else if (!botMsg.content.text) {
      botMsg.content.text = "Xin lỗi, tôi không hiểu được phản hồi.";
    }

    // Làm sạch nội dung văn bản
    const cleanContent = typeof botMsg.content.text === 'string' 
      ? botMsg.content.text
          .replace(/^\{|\}$/g, '')  // Loại bỏ dấu { } ở đầu và cuối
          .replace(/\\"/g, '"')     // Thay thế \" bằng "
          .replace(/\\n/g, '\n')    // Thay thế \n bằng xuống dòng thật
          .replace(/^"|"$/g, '')    // Loại bỏ dấu " ở đầu và cuối nếu có
          .trim()
      : "Xin lỗi, tôi không hiểu được phản hồi.";

    // Thêm phản hồi của bot vào lịch sử
    addToChatHistory(threadID, "assistant", cleanContent);

    // Gửi tin nhắn phản hồi
    api.sendMessage({
      body: cleanContent,
    }, event.threadID, (err, info) => {
      if (err) console.error("Lỗi khi gửi tin nhắn:", err);
    }, event.messageID);

    // Xử lý các hành động đặc biệt
    const { nhac, hanh_dong } = botMsg;

    // Xử lý tìm nhạc
    if (nhac && nhac.status === true) {
      await handleMusicSearch(nhac, api, threadID, event);
    }

    // Xử lý các hành động khác
    if (hanh_dong) {
      await handleActions(hanh_dong, api, threadID, requesterID);
    }
  } catch (error) {
    console.error("Lỗi khi xử lý phản hồi:", error);
    api.sendMessage("Đã có lỗi xảy ra khi xử lý phản hồi!", event.threadID, event.messageID);
  }
}

// Tách logic xử lý nhạc thành hàm riêng
async function handleMusicSearch(nhac, api, threadID, event) {
  const keywordSearch = nhac.keyword;
  if (!keywordSearch) {
    api.sendMessage("❌ Thiếu từ khóa tìm kiếm âm nhạc", threadID);
    return;
  }

  try {
    // Tìm bài hát trên YouTube (ổn định hơn)
    const ytResults = await searchYouTube(keywordSearch);
    if (!ytResults || ytResults.length === 0) {
      api.sendMessage(`❎ Không tìm thấy bài hát nào với từ khóa "${keywordSearch}"`, threadID);
      return;
    }

    const first = ytResults[0];
    const videoUrl = first.url;
    const title = first.title;

    // Đảm bảo thư mục cache tồn tại
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const audioPath = path.join(cacheDir, `${Date.now()}.mp3`);

    try {
      await downloadYouTubeAudio(videoUrl, audioPath);
      api.sendMessage({
        body: `🎵 Bài hát: ${title}\n🎶 Nguồn: YouTube`,
        attachment: fs.createReadStream(audioPath)
      }, threadID, () => {
        setTimeout(() => {
          try { fs.unlinkSync(audioPath); } catch (e) { console.error("Lỗi khi xóa file tạm:", e); }
        }, 2 * 60 * 1000);
      });
    } catch (e) {
      console.error('Tải audio YouTube lỗi:', e);
      api.sendMessage(`❗ Không thể tải file mp3 lúc này. Bạn có thể nghe trực tiếp: ${videoUrl}`, threadID);
    }
  } catch (err) {
    console.error("Lỗi khi tìm kiếm nhạc:", err);
    api.sendMessage("❌ Đã xảy ra lỗi khi tìm kiếm nhạc.", threadID, event.messageID);
  }
}

// Tách logic xử lý hành động thành hàm riêng
async function handleActions(hanh_dong, api, threadID, requesterID) {
  try {
    if (hanh_dong.doi_biet_danh && hanh_dong.doi_biet_danh.status === true) {
      try {
        await api.changeNickname(
          hanh_dong.doi_biet_danh.biet_danh_moi,
          hanh_dong.doi_biet_danh.thread_id,
          hanh_dong.doi_biet_danh.user_id
        );
      } catch (e) {
        console.error("Lỗi khi Đổi biệt danh:", e);
      }
    }

    if (hanh_dong.kick_nguoi_dung && hanh_dong.kick_nguoi_dung.status === true) {
     try {
       if (String(requesterID) !== String(ADMIN_UID)) {
         return api.sendMessage("❎ Bạn không có quyền kick người dùng.", threadID);
       }
       await api.removeUserFromGroup(
         hanh_dong.kick_nguoi_dung.user_id,
         hanh_dong.kick_nguoi_dung.thread_id
       );
     } catch (e) {
       console.error("Lỗi khi kick người dùng:", e);
     }
   }

   if (hanh_dong.add_nguoi_dung && hanh_dong.add_nguoi_dung.status === true) {
     try {
       if (String(requesterID) !== String(ADMIN_UID)) {
         return api.sendMessage("❎ Bạn không có quyền thêm người dùng.", threadID);
       }
       await api.addUserToGroup(
         hanh_dong.add_nguoi_dung.user_id,
         hanh_dong.add_nguoi_dung.thread_id
       );
     } catch (e) {
       console.error("Lỗi khi thêm người dùng:", e);
     }
   }
 } catch (error) {
   console.error("Lỗi khi thực hiện hành động:", error);
   if (threadID) {
     api.sendMessage("❌ Đã xảy ra lỗi khi thực hiện hành động.", threadID);
   }
 }
}