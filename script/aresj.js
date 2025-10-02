const axios = require("axios");
const fs = require("fs");
const path = require("path");

const activeThreads = new Set();
const bannedFilePath = path.join(__dirname, "bannedUsers.json");

// Load banned users from file
let bannedUsers = [];
if (fs.existsSync(bannedFilePath)) {
  try {
    bannedUsers = JSON.parse(fs.readFileSync(bannedFilePath, "utf8"));
  } catch (e) {
    bannedUsers = [];
  }
}

function saveBannedUsers() {
  fs.writeFileSync(bannedFilePath, JSON.stringify(bannedUsers, null, 2));
}

module.exports.config = {
  name: "opera",
  version: "4.5",
  hasPermission: 0,
  usePrefix: false,
  aliases: ["op", "aria", "sp"],
  description: "Ask Aria, play music, or manage bans using reply. Admin-only for ban commands.",
  usages: "opera <question> | opera spotify <song> | opera ban/unban (reply) | opera banned list | opera unbanall",
  cooldowns: 0,
  credits: "GPT-5 + You"
};

module.exports.run = async function ({ api, event, args, Threads }) {
  const { threadID, messageID, senderID, messageReply } = event;
  const input = args.join(" ").trim().toLowerCase();

  // Check if user is banned
  if (bannedUsers.includes(senderID)) {
    return api.sendMessage("🚫 You are banned from using opera.", threadID, messageID);
  }

  // Function to check if user is an admin
  async function isAdmin(uid) {
    const threadInfo = await api.getThreadInfo(threadID);
    return threadInfo.adminIDs.some(admin => admin.id === uid);
  }

  // Function to fetch name by UID
  async function getUserName(uid) {
    try {
      const user = await api.getUserInfo(uid);
      return user[uid]?.name || "Unknown User";
    } catch {
      return "Unknown User";
    }
  }

  // === ADMIN CHECK COMMANDS BELOW ===
  const adminCommands = ["ban", "unban", "banned list", "unbanall"];
  if (adminCommands.includes(input)) {
    const isSenderAdmin = await isAdmin(senderID);
    if (!isSenderAdmin) {
      return api.sendMessage("❗ Only group admins can use this command.", threadID, messageID);
    }
  }

  // === BAN USER (REPLY)
  if (input === "ban") {
    if (!messageReply) {
      return api.sendMessage("❗ Please reply to the user you want to ban.", threadID, messageID);
    }

    const targetID = messageReply.senderID;
    if (bannedUsers.includes(targetID)) {
      return api.sendMessage("⚠️ That user is already banned.", threadID, messageID);
    }

    bannedUsers.push(targetID);
    saveBannedUsers();

    const name = await getUserName(targetID);
    return api.sendMessage(`✅ ${name} has been banned from using opera.`, threadID, messageID);
  }

  // === UNBAN USER (REPLY)
  if (input === "unban") {
    if (!messageReply) {
      return api.sendMessage("❗ Please reply to the user you want to unban.", threadID, messageID);
    }

    const targetID = messageReply.senderID;
    if (!bannedUsers.includes(targetID)) {
      return api.sendMessage("⚠️ That user is not banned.", threadID, messageID);
    }

    bannedUsers = bannedUsers.filter(id => id !== targetID);
    saveBannedUsers();

    const name = await getUserName(targetID);
    return api.sendMessage(`✅ ${name} has been unbanned.`, threadID, messageID);
  }

  // === SHOW BANNED LIST WITH NAMES
  if (input === "banned list") {
    if (bannedUsers.length === 0) {
      return api.sendMessage("✅ No users are currently banned.", threadID, messageID);
    }

    let listMsg = `🚫 Banned Users:\n`;
    for (let i = 0; i < bannedUsers.length; i++) {
      const name = await getUserName(bannedUsers[i]);
      listMsg += `${i + 1}. ${name} (UID: ${bannedUsers[i]})\n`;
    }

    return api.sendMessage(listMsg.trim(), threadID, messageID);
  }

  // === UNBAN ALL
  if (input === "unbanall") {
    if (bannedUsers.length === 0) {
      return api.sendMessage("✅ No users to unban.", threadID, messageID);
    }

    bannedUsers = [];
    saveBannedUsers();
    return api.sendMessage("✅ All users have been unbanned.", threadID, messageID);
  }

  // === MUSIC COMMAND
  if (/^(spotify|music|play)\s+/i.test(input)) {
    const songTitle = input.replace(/^(spotify|music|play)\s+/i, "");

    if (!songTitle) {
      return api.sendMessage("❗ Usage: opera spotify [song title]", threadID, messageID);
    }

    if (activeThreads.has(threadID)) {
      return api.sendMessage("⚠️ Please wait for the current song to finish processing.", threadID, messageID);
    }

    activeThreads.add(threadID);
    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const apiUrl = `https://aryanapi.up.railway.app/api/youtubeplay?query=${encodeURIComponent(songTitle)}`;
      const res = await axios.get(apiUrl);
      const data = res.data;

      if (!data || !data.status || !data.data || !data.data.audio) {
        activeThreads.delete(threadID);
        return api.sendMessage("❌ Failed to get music data.", threadID, messageID);
      }

      const audioUrl = data.data.audio;
      const filePath = path.join(__dirname, "cache", `${Date.now()}_opera.mp3`);

      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      const writer = fs.createWriteStream(filePath);
      const audioStream = await axios({
        url: audioUrl,
        method: "GET",
        responseType: "stream"
      });

      audioStream.data.pipe(writer);

      writer.on("finish", () => {
        api.sendMessage(
          { body: `🎵 Now playing: ${songTitle}`, attachment: fs.createReadStream(filePath) },
          threadID,
          () => {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error("⚠️ Failed to delete cache file:", err.message);
            }
            api.setMessageReaction("✅", messageID, () => {}, true);
            activeThreads.delete(threadID);
          }
        );
      });

      writer.on("error", (err) => {
        console.error("❌ File write error:", err);
        api.sendMessage("❌ Failed to save MP3 file.", threadID, messageID);
        activeThreads.delete(threadID);
      });

    } catch (err) {
      console.error("❌ Spotify API Error:", err.message);
      api.sendMessage("❌ Error: " + err.message, threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
      activeThreads.delete(threadID);
    }

    return;
  }

  // === ARIA AI QUESTION HANDLING
  try {
    const encodedQuestion = encodeURIComponent(input);
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/Aria?ask=${encodedQuestion}&userid=${senderID}&stream=`;

    const response = await axios.get(apiUrl);

    if (response.data?.status === "200") {
      const answer = response.data.response;
      const followUps = response.data.extra_content?.follow_up_questions || [];

      let msg = `🤖 Aria says:\n${answer}`;
      if (followUps.length > 0) {
        msg += `\n\n💡 Follow-up questions:\n${followUps.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
      }

      return api.sendMessage(msg, threadID, messageID);
    } else {
      return api.sendMessage("❌ Failed to get a response from Aria.", threadID, messageID);
    }

  } catch (error) {
    console.error("❌ Aria API error:", error.message);
    return api.sendMessage("❌ Error contacting Aria API.", threadID, messageID);
  }
};

