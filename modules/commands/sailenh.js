const axios = require('axios');
const http = require('http');
const https = require('https');
this.config = {
    name: "",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "DC-Nam",
    description: "gái ",
    commandCategory: "Tiện ích",
    usages: "",
    cooldowns: 0
};
global.ha = [];
// Tăng độ ổn định khi lấy stream: thêm keep-alive, timeout, headers và retry
this.stream_url = async function (url) {
    const agents = {
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true })
    };

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br'
    };

    const maxRetries = 3;
    let attempt = 0;
    while (true) {
        try {
            const res = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                timeout: 20000,
                maxRedirects: 5,
                headers,
                ...agents
            });
            return res.data;
        } catch (err) {
            attempt++;
            if (attempt > maxRetries) throw err;
            // Backoff tăng dần
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
},
this.onLoad = async function (o) {
        let status = false;
        let urls = require('./../../gojo/datajson/vdgai.json');
    if (!global.jgfds) global.jgfds = setInterval(_ => {
            if (status == true || global.ha.length > 50) return;
            status = true;
            Promise.all(
                [...Array(5)].map(_ =>
                    this.upload(urls[Math.floor(Math.random() * urls.length)])
                        .catch(() => null)
                )
            )
            .then(res => {
                const ok = res.filter(Boolean);
                if (ok.length) global.ha.push(...ok);
                status = false;
            })
            .catch(() => { status = false; });
    },1000 * 5);
this.upload = async function (url) {
            const form = {
                upload_1024: await this.stream_url(url),
            };

            return o.api.postFormData('https://upload.facebook.com/ajax/mercury/upload.php',
                form).then(res => Object.entries(JSON.parse(res.body.replace('for (;;);', '')).payload?.metadata?.[0] || {})[0]);
        };
    },
this.run = async function (o) {
        let send = msg => new Promise(r => o.api.sendMessage(msg, o.event.threadID, (err, res) => r(res || err), o.event.messageID));
        t = process.uptime(),
      h = Math.floor(t / (60 * 60)),
      p = Math.floor((t % (60 * 60)) / 60),
      s = Math.floor(t % 60);
      if (global.ha.length < 1) {
        let id = o.event.senderID;
        o.api.shareContact(`⚠️ Chưa Nhập Tên Lệnh\n⏰ Uptime: ${h}:${p}:${s}`, id, o.event.threadID);
      } else { 
        send({
            body: `⚠️ Chưa Nhập Tên Lệnh\n⏰ Uptime: ${h}:${p}:${s}`,
            attachment: global.ha.splice(0,1), // Sửa ở đây
        });
    }
}