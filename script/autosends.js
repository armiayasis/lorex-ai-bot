const reactionEmojis = [
  "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊",
  "😋", "😎", "😍", "😘", "😗", "😙", "😚", "☺", "🙂", "🤗",
  "😇", "🤠", "🤡", "🤓", "🤔", "😐", "😑", "💀", "👻", "😻",
  "😺", "😻", "😼", "🍇", "🍓", "🌿", "📁"
];

module.exports.config = {
  name: "autosend",
  version: "1.4.0",
  hasPermission: 0,
  usePrefix: false,
  description: "Auto-send DeepSeek AI rules and info when 'Ai' is added",
  credits: "You",
  cooldowns: 0
};

module.exports.handleEvent = async function ({ api, event }) {
  const { logMessageType, addedParticipants, threadID, author, messageID } = event;

  // Auto reaction (optional)
  if (messageID && author) {
    const botID = api.getCurrentUserID?.() || "your_bot_id_here";
    if (author !== botID) {
      const emoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
      api.setMessageReaction(emoji, messageID, () => {}, true);
    }
  }

  // Trigger only on new members added
  if (logMessageType !== "log:subscribe" || !Array.isArray(addedParticipants)) return;

  for (const participant of addedParticipants) {
    const name = participant.fullName?.toLowerCase() || "";

    // Trigger only if name includes "ai"
    if (name.includes("ai")) {
      const message = `
📌 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 𝗗𝗘𝗘𝗣𝗦𝗘𝗘𝗞 𝗔𝗜 📌

📜 𝗚𝗥𝗢𝗨𝗣 𝗥𝗨𝗟𝗘𝗦:
1️⃣ No spamming or flooding the bot.
2️⃣ Respect others. No toxic or offensive behavior.
3️⃣ Do not abuse the AI with NSFW or harmful content.
4️⃣ Follow group admins and moderators.
5️⃣ Use the bot responsibly.

💬 𝗛𝗢𝗪 𝗧𝗢 𝗨𝗦𝗘 𝗗𝗘𝗘𝗣𝗦𝗘𝗘𝗞:

Ask any question like this:
🔹 deepseek what is an atom?
🔹 deepseek how to bake a cake?
🔹 deepseek translate "hello" to Japanese

🧠 DeepSeek AI will instantly reply with smart answers!

📂 𝗗𝗘𝗘𝗣𝗦𝗘𝗘𝗞 𝗗𝗔𝗧𝗔:

We do NOT collect personal data.
Your questions are not saved or tracked.
We care about your privacy and anonymity.

💱 𝗗𝗘𝗘𝗣𝗦𝗘𝗘𝗞 𝗖𝗢𝗡𝗩𝗘𝗥𝗦𝗜𝗢𝗡:

You can also do unit or currency conversions:
🔸 deepseek convert 10 USD to PHP  
🔸 deepseek convert 5kg to pounds  
🔸 deepseek convert 37°C to Fahrenheit

🔒 𝗣𝗥𝗜𝗩𝗔𝗖𝗬 𝗣𝗢𝗟𝗜𝗖𝗬:

Your data is never stored, shared, or sold.
The bot only processes your message and responds — that’s it.

📄 𝗧𝗘𝗥𝗠𝗦 𝗢𝗙 𝗦𝗘𝗥𝗩𝗜𝗖𝗘:

- You agree to use the bot legally and respectfully.
- Do not attempt to exploit, spam, or harass the bot or users.
- The admin may remove access if rules are violated.

📢 𝗦𝗛𝗔𝗥𝗘 𝗗𝗘𝗘𝗣𝗦𝗘𝗘𝗞 𝗔𝗜:

👥 Invite your friends to try DeepSeek AI!  
🔗 Facebook: https://www.facebook.com/profile.php?id=61581829409714  
🌐 Official Website: https://deepseek.com

👋 Welcome, ${participant.fullName || "new user"}! Enjoy DeepSeek AI responsibly.
      `.trim();

      return api.sendMessage(message, threadID);
    }
  }
};
