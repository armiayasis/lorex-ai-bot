const axios = require("axios");
const fs = require("fs");
const path = require("path");

const activeThreads = new Set();
const bannedFilePath = path.join(__dirname, "bannedUsers.json");
const configFilePath = path.join(__dirname, "operaConfig.json");

// Load banned users from file
let bannedUsers = [];
if (fs.existsSync(bannedFilePath)) {
  try {
    bannedUsers = JSON.parse(fs.readFileSync(bannedFilePath, "utf8"));
  } catch {
    bannedUsers = [];
  }
}

// Load opera config (for admin-only toggle)
let operaConfig = { adminOnly: false };
if (fs.existsSync(configFilePath)) {
  try {
    operaConfig = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
  } catch {
    operaConfig = { adminOnly: false };
  }
}

function saveBannedUsers() {
  fs.writeFileSync(bannedFilePath, JSON.stringify(bannedUsers, null, 2));
}

function saveOperaConfig() {
  fs.writeFileSync(configFilePath, JSON.stringify(operaConfig, null, 2));
}

module.exports.config = {
  name: "opera",
  version: "4.7",
  hasPermission: 0,
  usePrefix: false,
  aliases: ["op", "aria", "sp"],
  description:
    "Ask Aria, play music, manage bans, analyze images, kick users, and toggle admin-only access.",
  usages:
    "opera <question> | opera spotify <song> | opera ban/unban (reply) | opera banned list | opera unbanall | opera analyze image (reply) | opera kick (reply) | opera on/off",
  cooldowns: 0,
  credits: "GPT-5 + You",
};

async function analyzeImage(imagePath) {
  const stats = fs.statSync(imagePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  return `🖼️ Image Analysis:\n- Size: ${sizeKB} KB\n- Path: ${imagePath}`;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, messageReply } = event;
  const input = args.join(" ").trim().toLowerCase();

  async function isAdmin(uid) {
    const threadInfo = await api.getThreadInfo(threadID);
    return threadInfo.adminIDs.some((admin) => admin.id === uid);
  }

  async function getUserName(uid) {
    try {
      const user = await api.getUserInfo(uid);
      return user[uid]?.name || "Unknown User";
    } catch {
      return "Unknown User";
    }
  }

  // If admin-only mode enabled, only allow admins
  if (operaConfig.adminOnly) {
    const senderIsAdmin = await isAdmin(senderID);
    if (!senderIsAdmin)
      return api.sendMessage(
        "❗ Opera is currently restricted to admins only.",
        threadID,
        messageID
      );
  }

  // Check banned
  if (bannedUsers.includes(senderID))
    return api.sendMessage(
      "🚫 You are banned from using opera.",
      threadID,
      messageID
    );

  // Admin commands list
  const adminCommands = [
    "ban",
    "unban",
    "banned list",
    "unbanall",
    "kick",
    "on",
    "off",
  ];
  if (adminCommands.includes(input)) {
    const senderIsAdmin = await isAdmin(senderID);
    if (!senderIsAdmin)
      return api.sendMessage(
        "❗ Only group admins can use this command.",
        threadID,
        messageID
      );
  }

  // Toggle admin-only mode
  if (input === "on") {
    operaConfig.adminOnly = true;
    saveOperaConfig();
    return api.sendMessage(
      "✅ Opera is now restricted to admins only.",
      threadID,
      messageID
    );
  }

  if (input === "off") {
    operaConfig.adminOnly = false;
    saveOperaConfig();
    return api.sendMessage(
      "✅ Opera is now available to all users.",
      threadID,
      messageID
    );
  }

  // Ban user (reply)
  if (input === "ban") {
    if (!messageReply)
      return api.sendMessage(
        "❗ Please reply to the user you want to ban.",
        threadID,
        messageID
      );

    const targetID = messageReply.senderID;
    if (bannedUsers.includes(targetID))
      return api.sendMessage("⚠️ That user is already banned.", threadID, messageID);

    bannedUsers.push(targetID);
    saveBannedUsers();

    const name = await getUserName(targetID);
    return api.sendMessage(
      `✅ ${name} has been banned from using opera.`,
      threadID,
      messageID
    );
  }

  // Unban user (reply)
  if (input === "unban") {
    if (!messageReply)
      return api.sendMessage(
        "❗ Please reply to the user you want to unban.",
        threadID,
        messageID
      );

    const targetID = messageReply.senderID;
    if (!bannedUsers.includes(targetID))
      return api.sendMessage("⚠️ That user is not banned.", threadID, messageID);

    bannedUsers = bannedUsers.filter((id) => id !== targetID);
    saveBannedUsers();

    const name = await getUserName(targetID);
    return api.sendMessage(`✅ ${name} has been unbanned.`, threadID, messageID);
  }

  // Show banned list
  if (input === "banned list") {
    if (bannedUsers.length === 0)
      return api.sendMessage("✅ No users are currently banned.", threadID, messageID);

    let listMsg = `🚫 Banned Users:\n`;
    for (let i = 0; i < bannedUsers.length; i++) {
      const name = await getUserName(bannedUsers[i]);
      listMsg += `${i + 1}. ${name} (UID: ${bannedUsers[i]})\n`;
    }
    return api.sendMessage(listMsg.trim(), threadID, messageID);
  }

  // Unban all
  if (input === "unbanall") {
    if (bannedUsers.length === 0)
      return api.sendMessage("✅ No users to unban.", threadID, messageID);

    bannedUsers = [];
    saveBannedUsers();
    return api.sendMessage("✅ All users have been unbanned.", threadID, messageID);
  }

  // Kick user (reply)
  if (input === "kick") {
    if (!messageReply)
      return api.sendMessage(
        "❗ Please reply to the user you want to kick.",
        threadID,
        messageID
      );

    const targetID = messageReply.senderID;

    // Prevent kicking admins
    const isTargetAdmin = await isAdmin(targetID);
    if (isTargetAdmin)
      return api.sendMessage("❗ You cannot kick another admin.", threadID, messageID);

    try {
      await api.removeUserFromGroup(targetID, threadID);
      const name = await getUserName(targetID);
      return api.sendMessage(`✅ ${name} has been kicked from the group.`, threadID, messageID);
    } catch (error) {
      console.error("❌ Kick user error:", error);
      return api.sendMessage("❌ Failed to kick the user.", threadID, messageID);
    }
  }

  // Analyze image (reply with image)
  if (input === "analyze image") {
    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("❗ Please reply to a message with an image attachment.", threadID, messageID);
    }

    const imageAttachment = messageReply.attachments.find(
      (att) => att.type === "photo" || att.type === "image" || att.type === "photo_album"
    );

    if (!imageAttachment) {
      return api.sendMessage("❗ The replied message does not contain an image.", threadID, messageID);
    }

    const imageUrl = imageAttachment.url || imageAttachment.previewUrl || imageAttachment.largePreviewUrl;
    if (!imageUrl) return api.sendMessage("❗ Could not retrieve image URL.", threadID, messageID);

    const imageFileName = path.basename(imageUrl).split("?")[0];
    const filePath = path.join(__dirname, "cache", `${Date.now()}_${imageFileName}`);

    try {
      const response = await axios({
        url: imageUrl,
        method: "GET",
        responseType: "stream",
      });

      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const analysisResult = await analyzeImage(filePath);

      await api.sendMessage(analysisResult, threadID, messageID);

      fs.unlink(filePath, (err) => {
        if (err) console.error("⚠️ Failed to delete image cache:", err);
      });
    } catch (err) {
      console.error("❌ Image download or analysis error:", err);
      return api.sendMessage("❌ Failed to download or analyze the image.", threadID, messageID);
    }
    return;
  }

  // Music play command
  if (/^(spotify|music|play)\s+/i.test(input)) {
    const songTitle = input.replace(/^(spotify|music|play)\s+/i, "");

    if (!songTitle) {
      return api.sendMessage("❗ Usage: opera spotify [song title]", threadID, messageID);
    }

    if (activeThreads.has(threadID)) {
      return api.sendMessage(
        "⚠️ Please wait for the current song to finish processing.",
        threadID,
        messageID
      );
    }

    activeThreads.add(threadID);
    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const apiUrl = `https://aryanapi.up.railway.app/api/youtubeplay?query=${encodeURIComponent(
        songTitle
      )}`;
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
        responseType: "stream",
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
    } catch (err) {
      activeThreads.delete(threadID);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ Error playing music.", threadID, messageID);
    }
    return;
  }

  // Default fallback for unrecognized commands/questions
  // You can replace this with Aria AI API or other logic
  return api.sendMessage(
    "🤖 Opera ready! Use commands like `opera spotify <song>`, `opera ban` (reply), `opera kick` (reply), or `opera on/off` to manage.",
    threadID,
    messageID
  );
};
