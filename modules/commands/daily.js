module.exports.config = {
	name: "daily",
	version: "1.0.2",
	hasPermssion: 0,
	credits: "Mirai Team",
	description: "Nhận tiền thưởng hàng ngày!",
	commandCategory: "Money",
    cooldowns: 5,
    envConfig: {
        cooldownTime: 43200000,
        rewardCoin: 100000
    }
};

module.exports.languages = {
    "vi": {
        "cooldown": "Bạn đang trong thời gian chờ\nVui lòng thử lại sau: %1 giờ %2 phút %3 giây!",
        "rewarded": "🎁 Bạn đã nhận %1, để có thể tiếp tục nhận, vui lòng quay lại sau 12 tiếng"
    },
    "en": {
        "cooldown": "You received today's rewards, please come back after: %1 hours %2 minutes %3 seconds.",
        "rewarded": "🎁 You received %1, to continue to receive, please try again after 12 hours"
    }
}

module.exports.run = async ({ event, api, Currencies, getText }) => {
    const { formatVND } = require('../../utils/currency');
    const { calculateBalancedReward, checkDailyLimits, updateDailyEarnings } = require('../../utils/economyConfig.js');
    const { daily } = global.configModule,
        cooldownTime = daily.cooldownTime;
    
    // Sử dụng calculateBalancedReward thay vì random không kiểm soát
    const userData = await Currencies.getData(event.senderID);
    const userLevel = userData.data?.workLevel || 1;
    const dailyReward = calculateBalancedReward('daily', userLevel, 1);
    var { senderID, threadID } = event;

    let data = (await Currencies.getData(senderID)).data || {};
    if (typeof data !== "undefined" && cooldownTime - (Date.now() - (data.dailyCoolDown || 0)) > 0) {
        var time = cooldownTime - (Date.now() - data.dailyCoolDown),
            seconds = Math.floor( (time/1000) % 60 ),
            minutes = Math.floor( (time/1000/60) % 60 ),
            hours = Math.floor( (time/(1000*60*60)) % 24 );

		return api.sendMessage(getText("cooldown", hours, minutes, (seconds < 10 ? "0" : "") + seconds), threadID);
    }

    else {
        // Kiểm tra giới hạn thu nhập hàng ngày
        let finalReward = dailyReward;
        if (!checkDailyLimits(userData, dailyReward, 'daily')) {
            const maxEarn = ECONOMY_CONFIG.DAILY_LIMITS.MAX_DAILY_EARNINGS - (userData.data?.dailyEarnings?.daily || 0);
            if (maxEarn > 0) {
                finalReward = maxEarn;
                api.sendMessage(`Bạn đã gần đạt giới hạn thu nhập từ daily hôm nay. Phần thưởng được điều chỉnh thành ${finalReward.toLocaleString('vi-VN')}đ.`, threadID);
            } else {
                return api.sendMessage(`Bạn đã đạt giới hạn thu nhập từ daily hôm nay. Hãy thử lại vào ngày mai.`, threadID);
            }
        }
        
        return api.sendMessage(getText("rewarded", formatVND(finalReward, 'MEDIUM')), threadID, async () => {
            await Currencies.increaseMoney(senderID, finalReward);
            updateDailyEarnings(userData, 'daily', finalReward);
            data.dailyCoolDown = Date.now();
            await Currencies.setData(senderID, { data: userData.data });
            return;
        });
    }
}