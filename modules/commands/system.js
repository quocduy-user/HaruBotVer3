const si = require('systeminformation');

module.exports.config = {
    name: "system",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "QuocDuy",
    description: "Xem thông tin hệ thống",
    commandCategory: "system",
    usages: "[cpu/ram/disk/os/all]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const type = args[0]?.toLowerCase();

    try {
        switch (type) {
            case "cpu": {
                const cpu = await si.cpu();
                const cpuTemp = await si.cpuTemperature();
                return api.sendMessage(
                    `🖥 Thông tin CPU:\n` +
                    `- Nhà sản xuất: ${cpu.manufacturer}\n` +
                    `- Thương hiệu: ${cpu.brand}\n` +
                    `- Tốc độ: ${cpu.speed}GHz\n` +
                    `- Số lõi: ${cpu.cores}\n` +
                    `- Số lõi vật lý: ${cpu.physicalCores}\n` +
                    `- Nhiệt độ: ${cpuTemp.main}°C`,
                    threadID, messageID
                );
            }
            
            case "ram": {
                const mem = await si.mem();
                return api.sendMessage(
                    `💾 Thông tin RAM:\n` +
                    `- Tổng dung lượng: ${(mem.total / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
                    `- Đã sử dụng: ${(mem.used / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
                    `- Còn trống: ${(mem.available / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
                    `- Tỷ lệ sử dụng: ${((mem.used / mem.total) * 100).toFixed(2)}%`,
                    threadID, messageID
                );
            }
            
            case "disk": {
                const disk = await si.fsSize();
                let diskInfo = "💿 Thông tin ổ đĩa:\n";
                
                for (const drive of disk) {
                    diskInfo += `\n${drive.mount}:\n` +
                        `- Dung lượng: ${(drive.size / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
                        `- Đã dùng: ${(drive.used / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
                        `- Còn trống: ${(drive.available / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
                        `- Tỷ lệ sử dụng: ${((drive.used / drive.size) * 100).toFixed(2)}%\n`;
                }
                
                return api.sendMessage(diskInfo, threadID, messageID);
            }
            
            case "os": {
                const os = await si.osInfo();
                return api.sendMessage(
                    `🖥 Thông tin hệ điều hành:\n` +
                    `- Nền tảng: ${os.platform}\n` +
                    `- Phiên bản: ${os.distro}\n` +
                    `- Phiên bản phát hành: ${os.release}\n` +
                    `- Kernel: ${os.kernel}\n` +
                    `- Kiến trúc: ${os.arch}\n` +
                    `- Tên máy chủ: ${os.hostname}`,
                    threadID, messageID
                );
            }
            
            case "all": {
                const cpu = await si.cpu();
                const mem = await si.mem();
                const os = await si.osInfo();
                const disk = await si.fsSize();
                
                let systemInfo = "📊 Thông tin hệ thống:\n\n";
                
                // CPU
                systemInfo += `🖥 CPU:\n` +
                    `- Thương hiệu: ${cpu.brand}\n` +
                    `- Số lõi: ${cpu.cores}\n` +
                    `- Tốc độ: ${cpu.speed}GHz\n\n`;
                
                // RAM
                systemInfo += `💾 RAM:\n` +
                    `- Tổng dung lượng: ${(mem.total / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
                    `- Đã sử dụng: ${(mem.used / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
                    `- Tỷ lệ sử dụng: ${((mem.used / mem.total) * 100).toFixed(2)}%\n\n`;
                
                // OS
                systemInfo += `💻 Hệ điều hành:\n` +
                    `- Nền tảng: ${os.platform}\n` +
                    `- Phiên bản: ${os.distro}\n` +
                    `- Phiên bản phát hành: ${os.release}\n\n`;
                
                // Disk
                systemInfo += `💿 Ổ đĩa chính:\n` +
                    `- Dung lượng: ${(disk[0].size / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
                    `- Đã sử dụng: ${(disk[0].used / (1024 * 1024 * 1024)).toFixed(2)}GB\n` +
                    `- Tỷ lệ sử dụng: ${((disk[0].used / disk[0].size) * 100).toFixed(2)}%`;
                
                return api.sendMessage(systemInfo, threadID, messageID);
            }
            
            default: {
                return api.sendMessage(
                    `Sử dụng: system [cpu/ram/disk/os/all]\n` +
                    `- cpu: Xem thông tin CPU\n` +
                    `- ram: Xem thông tin RAM\n` +
                    `- disk: Xem thông tin ổ đĩa\n` +
                    `- os: Xem thông tin hệ điều hành\n` +
                    `- all: Xem tất cả thông tin`,
                    threadID, messageID
                );
            }
        }
    } catch (error) {
        console.error(error);
        return api.sendMessage(
            "Đã có lỗi xảy ra khi lấy thông tin hệ thống!",
            threadID, messageID
        );
    }
};
