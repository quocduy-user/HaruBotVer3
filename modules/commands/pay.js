module.exports.config = {
    name: "pay",
    version: "1.4.0",
    hasPermssion: 0,
    credits: "Mirai Team",
    description: "Chuyển tiền của bản thân cho ai đó",
    commandCategory: "Money",
    usages: "pay @tag [số tiền/1k/1m/1b] hoặc reply [số tiền/1k/1m/1b]",
    cooldowns: 5,
};

module.exports.run = async ({ event, api, Currencies, args, Users }) => {
    const { parseCurrencyInput, formatVND } = require('../../utils/currency');
    let { threadID, messageID, senderID } = event;

    function parseAmount(amount) {
        return parseCurrencyInput(amount);
    }

    async function transferMoney(sender, recipient, amount) {
        const { calculateTransactionFee } = require('../../utils/economyConfig');
        let senderBalance = (await Currencies.getData(sender)).money;
        
        if (amount <= 0) return api.sendMessage('Số tiền chuyển không hợp lệ', threadID, messageID);
        
        // Calculate transaction fee
        const fee = calculateTransactionFee(amount);
        const totalDeduction = amount + fee;
        
        if (totalDeduction > senderBalance) {
            return api.sendMessage(`Số dư không đủ! Cần: ${formatVND(totalDeduction, 'MEDIUM')} (bao gồm phí ${formatVND(fee, 'MEDIUM')})`, threadID, messageID);
        }

        await Currencies.increaseMoney(recipient, amount);
        await Currencies.decreaseMoney(sender, totalDeduction);

        let recipientName = (await Users.getData(recipient)).name;
        return api.sendMessage(`💸 Đã chuyển cho ${recipientName} ${formatVND(amount, 'MEDIUM')}\n💰 Phí giao dịch: ${formatVND(fee, 'MEDIUM')}`, threadID, messageID);
    }

    if (event.type == "message_reply") {
        let recipient = event.messageReply.senderID;
        let amount = parseAmount(args[0]);

        if (isNaN(amount)) return api.sendMessage('Vui lòng nhập số tiền hợp lệ', threadID, messageID);
        return transferMoney(senderID, recipient, amount);
    } else {
        const mention = Object.keys(event.mentions)[0];
        if (!mention) return api.sendMessage('Vui lòng tag người nhận hoặc reply tin nhắn của người nhận!', threadID, messageID);

        let nameLength = event.mentions[mention].split(" ").length;
        let amount = parseAmount(args[nameLength]);

        if (isNaN(amount)) return api.sendMessage('Vui lòng nhập số tiền hợp lệ', threadID, messageID);
        return transferMoney(senderID, mention, amount);
    }
}