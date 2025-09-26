const axios = require('axios');

module.exports.config = {
  name: 'llamaa',
  version: '1.2.0',
  hasPermission: 0,
  usePrefix: true,
  aliases: ['llama', 'llama'],
  description: "Chat with LLaMA 90B AI model",
  usages: "llama90 <your message>",
  credits: 'MANUELSON + LLaMA 3 + Meta AI',
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;
  const messageID = event.messageID;
  const uid = event.senderID;
  const input = args.join(' ');

  if (!input) {
    return api.sendMessage(
      "❓ 𝗣𝗮𝗸𝗶𝗹𝗮𝗴𝗮𝘆 𝗮𝗻𝗴 𝗶𝘆𝗼𝗻𝗴 𝘁𝗮𝗻𝗼𝗻𝗴 𝗼 𝗺𝗲𝘀𝘀𝗮𝗵𝗲.\n\n📌 𝗚𝗮𝗺𝗶𝘁: llama90 <prompt>\n🧠 𝗛𝗮𝗹: llama90 Ano ang AI?",
      threadID,
      messageID
    );
  }

  // React 🚀 while processing
  api.setMessageReaction("🚀", messageID, () => {}, true);

  try {
    const waitMsg = await api.sendMessage("⏳ 𝗞𝘂𝗺𝗼𝗸𝗼𝗻𝗲𝗸𝘁𝗮 𝘀𝗮 𝗟𝗹𝗮𝗺𝗮𝟵𝟬𝗕... 🤖", threadID);

    const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Llama90b", {
      params: { ask: input, uid: uid }
    });

    const answer = res.data?.response || "⚠️ Walang sagot mula sa LLaMA.";

    const finalReply = 
      `🧠 𝗟𝗹𝗮𝗺𝗮𝟵𝟬𝗕 𝘀𝗮𝗴𝗼𝘁:\n━━━━━━━━━━━━━━━━━━━━━\n${answer}\n\n` +
      `🔧 CREATED BY MANUELSON | POWERED BY LLAMA 3 + META AI`;

    api.sendMessage(finalReply, threadID, waitMsg.messageID);

    // React ✅ on success
    api.setMessageReaction("✅", messageID, () => {}, true);

  } catch (error) {
    api.sendMessage(
      "❌ 𝗘𝗿𝗿𝗼𝗿 𝗸𝘂𝗺𝘂𝗵𝗮 𝗻𝗴 𝘀𝗮𝗴𝗼𝘁 𝗴𝗮𝗹𝗶𝗻𝗴 𝘀𝗮 LLaMA90B. Paki-try ulit.",
      threadID,
      messageID
    );

    // React ❌ on error
    api.setMessageReaction("❌", messageID, () => {}, true);
  }
};
