module.exports.config = {
  name: 'ultrahelp',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Show all Ultra system commands and developer info',
  usages: 'ultrahelp',
  cooldowns: 0,
};

module.exports.run = async function({ api, event }) {
  const developer = "👨‍💻 Developer: MANUELSON";

  const message = `
🚀 𝗨𝗹𝘁𝗿𝗮 𝗦𝘆𝘀𝘁𝗲𝗺 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀

👤 𝗨𝘀𝗲𝗿 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀:
• ultra register – Register your account
• ultra login – Login to your profile
• ultra profile – View your profile stats
• ultra verify – Toggle verified status
• ultra notify – Check your notifications
• ultra dashboard – Overview of your activity
• ultrabalance – View your money and points

📝 𝗣𝗼𝘀𝘁𝘀 & 𝗜𝗻𝘁𝗲𝗿𝗮𝗰𝘁𝗶𝗼𝗻𝘀:
• ultra post [content] – Create a post
• ultra react [postID] – React to a post
• ultra comment [postID] [comment] – Add comment
• ultra feed – Show recent 10 posts

🧰 𝗔𝗱𝗺𝗶𝗻 & 𝗥𝗲𝗽𝗼𝗿𝘁𝘀:
• ultra admin [command] – Admin panel (admin only)
• ultra report [message] – Send issue to admin
• ultra feedback – Admin sees all reports

🎉 𝗘𝘃𝗲𝗻𝘁 𝗦𝘆𝘀𝘁𝗲𝗺:
• ultra join – Join event
• ultra events – Show event list

📦 𝗚𝗮𝗴𝘀𝘁𝗼𝗰𝗸 𝗧𝗿𝗮𝗰𝗸𝗲𝗿:
• gagstockitems on [groupID] – Start stock tracking
• gagstockitems off – Stop tracker
• gagstockitems status – View items, prices & earnings

📘 𝗢𝘁𝗵𝗲𝗿:
• ultracmd / ultrahelp – Show all commands

${developer}
`;

  return api.sendMessage(message.trim(), event.threadID, event.messageID);
};
