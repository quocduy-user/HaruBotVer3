module.exports.config = {
  name: "acp",
  version: "2.0.0",
  hasPermssion: 3,
  credits: "NTKhang • improved by Cascade",
  description: "Quản lý lời mời kết bạn: liệt kê/duyệt/xóa theo số thứ tự, khoảng, hoặc tất cả",
  commandCategory: "Admin",
  usages: "\n  {p}acp                → Liệt kê danh sách lời mời (trang 1)\n  {p}acp list [trang]   → Liệt kê theo trang\n  {p}acp accept <stt|range|all>  → Chấp nhận\n  {p}acp reject <stt|range|all>  → Từ chối\n  Ví dụ: {p}acp accept 1 4-7 10 | {p}acp reject all",
  cooldowns: 3
};


module.exports.handleReply = async ({ handleReply, event, api }) => {
  const { author, listRequest } = handleReply;
  if (author != event.senderID) return;
  const text = (event.body || '').trim();
  const args = text.replace(/ +/g, ' ').toLowerCase().split(' ');

  return processAction({ api, event, args, listRequest });
};


module.exports.run = async ({ event, api, args }) => {
  const moment = require('moment-timezone');

  // Nếu có tham số hành động → xử lý trực tiếp, không cần reply
  if (args && args.length) {
    // Lấy list trước để map stt
    const { listRequest, error } = await getFriendRequests(api);
    if (error) return api.sendMessage(`❎ Lỗi lấy danh sách: ${error}`, event.threadID, event.messageID);
    return processAction({ api, event, args: args.map($=>$.toLowerCase()), listRequest });
  }

  // Không có tham số → liệt kê trang 1 và hướng dẫn sử dụng
  const { listRequest, error } = await getFriendRequests(api);
  if (error) return api.sendMessage(`❎ Lỗi lấy danh sách: ${error}`, event.threadID, event.messageID);

  const pageSize = 10;
  const page = 1;
  const total = listRequest.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const slice = listRequest.slice((page - 1) * pageSize, page * pageSize);

  let i = (page - 1) * pageSize;
  let lines = slice.map(user => {
    i++;
    const time = user.time ? moment(user.time * 1000).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss') : 'unknown';
    const url = (user.node.url || '').replace('www.facebook', 'fb');
    return `${i}. ${user.node.name}\n   ID: ${user.node.id}\n   Link: ${url}\n   Time: ${time}`;
  });

  const guide = [
    `• Dùng lệnh:`,
    `  - acp list [trang]`,
    `  - acp accept <stt|range|all>`,
    `  - acp reject <stt|range|all>`,
    `Ví dụ: acp accept 1 3-5 | acp reject all`
  ].join('\n');

  const body = `YÊU CẦU KẾT BẠN (${total} yêu cầu)\nTrang ${page}/${totalPages}\n\n${lines.join('\n\n')}\n\n${guide}\n\nPhản ứng vào tin nhắn này:\n👍 = Chấp nhận tất cả\n👎 = Từ chối tất cả`;

  return api.sendMessage(body, event.threadID, (e, info) => {
    if (e) return;
    global.client.handleReply.push({
      name: module.exports.config.name,
      messageID: info.messageID,
      listRequest,
      author: event.senderID
    });
    // Đăng ký handleReaction để hỗ trợ accept all / reject all qua cảm xúc
    global.client.handleReaction.push({
      name: module.exports.config.name,
      messageID: info.messageID,
      listRequest,
      author: event.senderID
    });
  }, event.messageID);
};

// Cho phép tương tác bằng cảm xúc: 👍 = accept all, 👎 = reject all
module.exports.handleReaction = async function({ api, event, handleReaction }) {
  try {
    const { userID, reaction, threadID, messageID } = event;
    if (!handleReaction || userID != handleReaction.author) return;

    if (reaction === '👍') {
      await processAction({ api, event: { threadID, messageID }, args: ['accept','all'], listRequest: handleReaction.listRequest });
    } else if (reaction === '👎') {
      await processAction({ api, event: { threadID, messageID }, args: ['reject','all'], listRequest: handleReaction.listRequest });
    } else {
      return;
    }
  } catch (e) {
    // log nhẹ, không làm phiền người dùng
    console.error('[acp][handleReaction] error:', e);
  }
}

// Helpers
async function getFriendRequests(api) {
  try {
    const form = {
      av: api.getCurrentUserID(),
      fb_api_req_friendly_name: 'FriendingCometFriendRequestsRootQueryRelayPreloader',
      fb_api_caller_class: 'RelayModern',
      doc_id: '4499164963466303',
      variables: JSON.stringify({ input: { scale: 3 } })
    };
    const res = await api.httpPost('https://www.facebook.com/api/graphql/', form);
    const json = JSON.parse(res);
    const listRequest = json?.data?.viewer?.friending_possibilities?.edges || [];
    return { listRequest };
  } catch (e) {
    return { error: String(e && e.message || e) };
  }
}

function parseTargets(inputArgs, listLen) {
  // Hỗ trợ: all | 1 2 3 | 1-5 | kết hợp
  if (!inputArgs || inputArgs.length === 0) return [];
  if (inputArgs.length === 1 && inputArgs[0] === 'all') {
    return Array.from({ length: listLen }, (_, idx) => idx + 1);
  }
  const set = new Set();
  for (const token of inputArgs) {
    if (/^\d+-\d+$/.test(token)) {
      const [a, b] = token.split('-').map(n => parseInt(n, 10));
      const start = Math.min(a, b), end = Math.max(a, b);
      for (let k = start; k <= end; k++) set.add(k);
    } else {
      const n = parseInt(token, 10);
      if (!isNaN(n)) set.add(n);
    }
  }
  return Array.from(set).filter(n => n >= 1 && n <= listLen);
}

async function processAction({ api, event, args, listRequest }) {
  // args: [action, ...targets]
  const action = args[0];
  if (!['accept', 'add', 'reject', 'del', 'list'].includes(action)) {
    return api.sendMessage('⚠️ Cú pháp: acp [list|accept|reject] ...', event.threadID, event.messageID);
  }

  if (action === 'list') {
    const pageSize = 10;
    const total = listRequest.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const reqPage = Math.max(1, Math.min(totalPages, parseInt(args[1] || '1', 10) || 1));
    const start = (reqPage - 1) * pageSize;
    const slice = listRequest.slice(start, start + pageSize);

    const moment = require('moment-timezone');
    let i = start;
    const lines = slice.map(user => {
      i++;
      const time = user.time ? moment(user.time * 1000).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss') : 'unknown';
      const url = (user.node.url || '').replace('www.facebook', 'fb');
      return `${i}. ${user.node.name}\n   ID: ${user.node.id}\n   Link: ${url}\n   Time: ${time}`;
    });
    return api.sendMessage(`Trang ${reqPage}/${totalPages}\n\n${lines.join('\n\n')}`, event.threadID, event.messageID);
  }

  const targets = parseTargets(args.slice(1), listRequest.length);
  if (targets.length === 0) {
    return api.sendMessage('⚠️ Vui lòng chỉ định mục tiêu: all | 1 2 3 | 1-5', event.threadID, event.messageID);
  }

  const form = {
    av: api.getCurrentUserID(),
    fb_api_caller_class: 'RelayModern',
    variables: {
      input: {
        source: 'friends_tab',
        actor_id: api.getCurrentUserID(),
        client_mutation_id: Math.round(Math.random() * 19).toString()
      },
      scale: 3,
      refresh_num: 0
    }
  };

  const acceptMode = (action === 'accept' || action === 'add');
  if (acceptMode) {
    form.fb_api_req_friendly_name = 'FriendingCometFriendRequestConfirmMutation';
    form.doc_id = '3147613905362928';
  } else {
    form.fb_api_req_friendly_name = 'FriendingCometFriendRequestDeleteMutation';
    form.doc_id = '4108254489275063';
  }

  const success = [];
  const failed = [];

  const queue = [];
  for (const stt of targets) {
    const u = listRequest[stt - 1];
    if (!u) { failed.push(`STT ${stt}`); continue; }
    const payload = { ...form };
    payload.variables = JSON.parse(JSON.stringify(form.variables));
    payload.variables.input.friend_requester_id = u.node.id;
    payload.variables = JSON.stringify(payload.variables);
    queue.push({ name: u.node.name, payload });
  }

  for (const item of queue) {
    try {
      const res = await api.httpPost('https://www.facebook.com/api/graphql/', item.payload);
      const json = JSON.parse(res);
      if (json?.errors) failed.push(item.name); else success.push(item.name);
    } catch {
      failed.push(item.name);
    }
  }

  return api.sendMessage(
    `✅ ${acceptMode ? 'Đã chấp nhận' : 'Đã xóa'}: ${success.length} người` +
    (success.length ? `\n• ${success.join(', ')}` : '') +
    (failed.length ? `\n❎ Thất bại: ${failed.length}\n• ${failed.join(', ')}` : ''),
    event.threadID,
    event.messageID
  );
}
