module.exports.config = {
    name: "adduser",
    version: "2.0.0",
    hasPermssion: 1,
    credits: "D-Jukie • improved by Cascade",
    description: "Thêm nhiều người dùng vào nhóm bằng UID hoặc link; hỗ trợ reply và nhiều định dạng",
    commandCategory: "QTV",
    usages: "adduser <uid|link> [uid|link|...] (hoặc reply tin nhắn chứa link/uid)",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const info = await api.getThreadInfo(threadID);
  const participantIDs = info.participantIDs || [];
  const approvalMode = !!info.approvalMode;
  const isBotAdmin = (info.adminIDs || []).some(item => item.id == api.getCurrentUserID());

  // Thu thập đầu vào: từ args hoặc từ reply body
  let rawText = (args && args.length ? args.join(' ') : '').trim();
  if (!rawText && event.messageReply && event.messageReply.body) {
    rawText = String(event.messageReply.body || '').trim();
  }
  if (!rawText) {
    return api.sendMessage('⚠️ Vui lòng nhập UID/link hoặc reply tin có UID/link để thêm vào nhóm.', threadID, messageID);
  }

  // Tách nhiều mục theo khoảng trắng, xuống dòng, phẩy
  const tokens = rawText.split(/[\s,\n]+/).filter(Boolean);
  if (tokens.length === 0) {
    return api.sendMessage('⚠️ Không tìm thấy UID/link hợp lệ.', threadID, messageID);
  }

  // Hàm chuyển link -> UID nếu cần
  async function resolveToUid(token) {
    try {
      // Nếu là số thuần → coi như UID
      if (/^\d{6,}$/.test(token)) return token;
      // Nếu là link Facebook → dùng api.getUID
      if (token.includes('.com/')) {
        const uid = await api.getUID(token);
        return uid;
      }
      // Nếu là dạng @mention (từ reply) dạng 1000... đã bắt ở trên, còn lại bỏ qua
      return null;
    } catch {
      return null;
    }
  }

  // Giải quyết tất cả token thành UID
  const uids = [];
  for (const tk of tokens) {
    const uid = await resolveToUid(tk);
    if (uid) uids.push(uid);
  }

  // Loại bỏ trùng
  const uniqUids = Array.from(new Set(uids));
  if (uniqUids.length === 0) {
    return api.sendMessage('⚠️ Không thể trích xuất UID hợp lệ từ đầu vào.', threadID, messageID);
  }

  // Thêm lần lượt, thống kê kết quả
  const results = [];
  for (const uid of uniqUids) {
    if (participantIDs.includes(uid)) {
      results.push({ uid, status: 'exists' });
      continue;
    }
    await new Promise(resolve => {
      api.addUserToGroup(uid, threadID, (err) => {
        if (err) {
          results.push({ uid, status: 'error' });
        } else if (approvalMode && !isBotAdmin) {
          results.push({ uid, status: 'pending' });
        } else {
          results.push({ uid, status: 'added' });
        }
        return resolve();
      });
    });
    // Thêm delay nhỏ tránh rate-limit
    await new Promise(r => setTimeout(r, 500));
  }

  // Tổng hợp kết quả
  const added = results.filter(r => r.status === 'added').map(r => r.uid);
  const pending = results.filter(r => r.status === 'pending').map(r => r.uid);
  const exists = results.filter(r => r.status === 'exists').map(r => r.uid);
  const failed = results.filter(r => r.status === 'error').map(r => r.uid);

  let msg = 'KẾT QUẢ THÊM THÀNH VIÊN\n';
  if (added.length) msg += `✅ Đã thêm: ${added.length}\n• ${added.join(', ')}\n`;
  if (pending.length) msg += `🕓 Đang chờ phê duyệt: ${pending.length}\n• ${pending.join(', ')}\n`;
  if (exists.length) msg += `ℹ️ Đã có trong nhóm: ${exists.length}\n• ${exists.join(', ')}\n`;
  if (failed.length) msg += `❎ Thất bại: ${failed.length}\n• ${failed.join(', ')}\n`;
  if (!added.length && !pending.length && !exists.length && !failed.length) msg += 'Không có thay đổi.';

  return api.sendMessage(msg, threadID, messageID);
}