const axios = require('axios');

module.exports.config = {
  name: 'pastebin',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['paste', 'pb'],
  description: 'Create a Pastebin with given content and optional title',
  usages: 'pastebin <title> | <content>',
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;
  const messageID = event.messageID;

  // Split input by '|', first part is title, rest is content
  const input = args.join(" ");
  if (!input.includes('|')) {
    return api.sendMessage("⚠️ Usage:\npastebin <title> | <content>", threadID, messageID);
  }

  const [titleRaw, ...contentParts] = input.split('|');
  const title = titleRaw.trim();
  const content = contentParts.join('|').trim();

  if (!title || !content) {
    return api.sendMessage("⚠️ Please provide both a title and content.\nExample:\npastebin MyTitle | This is the content.", threadID, messageID);
  }

  try {
    const res = await axios.get('https://arychauhann.onrender.com/api/pastebin', {
      params: { title, content }
    });

    if (res.data.status !== 0) throw new Error('Failed to create paste');

    const originalLink = res.data.original;
    const rawLink = res.data.raw;

    return api.sendMessage(
      `✅ Pastebin created!\n\n🔗 Link: ${originalLink}\n📄 Raw: ${rawLink}`, 
      threadID, messageID
    );

  } catch (err) {
    console.error(err);
    return api.sendMessage("⚠️ Failed to create pastebin. Try again later.", threadID, messageID);
  }
};
