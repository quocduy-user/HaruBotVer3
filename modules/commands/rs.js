this.config = {
	name: "rs",
	version: "1.0.0",
	hasPermssion: 3,
	credits: "DongDev",
	description: "Khởi Động Lại Bot.",
	commandCategory: "Admin",
	cooldowns: 0,
	images: [],
  };
  
  this.run = async ({event, api}) => {
   // Thả cảm xúc ✅ thay vì gửi tin nhắn
   api.setMessageReaction("✅", event.messageID, () => {
	 // Đợi một chút để người dùng thấy cảm xúc trước khi restart
	 setTimeout(() => process.exit(1), 2000);
   }, true);
  }