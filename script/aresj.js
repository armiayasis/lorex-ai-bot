const axios = require("axios");
const fs = require("fs");
const path = require("path");

const activeThreads = new Set();
const configFilePath = path.join(__dirname, "operaConfig.json");

// Load config (for admin-only and maintenance toggles)
let operaConfig = { adminOnly: false, maintenance: false };
if (fs.existsSync(configFilePath)) {
  try {
    operaConfig = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
  } catch {
    operaConfig = { adminOnly: false, maintenance: false };
  }
}

function saveOperaConfig() {
  fs.writeFileSync(configFilePath, JSON.stringify(operaConfig, null, 2));
}

const OWNER_UID = "61580959514473";

module.exports.config = {
  name: "opera",
  version: "5.0",
  hasPermission: 0,
  usePrefix: false,
  aliases: ["op", "aria", "sp"],
  description:
    "Ask Aria, play music, analyze images, kick users, toggle admin-only and maintenance modes.",
  usages:
    "opera <question> | opera spotify <song> | opera analyze image (reply) | opera kick (reply) | opera admin only on/off | opera maintenance on/off",
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
  const inputRaw = args.join(" ").trim();
  const input = inputRaw.toLowerCase();

  async function isAdmin(uid) {
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      return threadInfo.adminIDs.some((admin) => admin.id === uid);
    } catch {
      return false;
    }
  }

  async function getUserName(uid) {
    try {
      const user = await api.getUserInfo(uid);
      return user[uid]?.name || "Unknown User";
    } catch {
      return "Unknown User";
    }
  }

  // Maintenance mode check: only owner can use bot if enabled
  if (operaConfig.maintenance && senderID !== OWNER_UID) {
    return api.sendMessage(
      "⚠️ Bot is currently under maintenance. Please try again later.",
      threadID,
      messageID
    );
  }

  // Admin-only mode check
  if (operaConfig.adminOnly) {
    const senderIsAdmin = await isAdmin(senderID);
    if (!senderIsAdmin) {
      return api.sendMessage(
        "❗ Opera is currently restricted to admins only.",
        threadID,
        messageID
      );
    }
  }

  // Admin commands only for owner
  const ownerCommands = ["admin only on", "admin only off", "maintenance on", "maintenance off"];
  if (ownerCommands.includes(input) && senderID !== OWNER_UID) {
    return api.sendMessage(
      "❗ Only the owner can use this command.",
      threadID,
      messageID
    );
  }

  // Toggle admin-only mode
  if (input === "admin only on") {
    operaConfig.adminOnly = true;
    saveOperaConfig();
    return api.sendMessage(
      "✅ Opera is now restricted to admins only.",
      threadID,
      messageID
    );
  }
  if (input === "admin only off") {
    operaConfig.adminOnly = false;
    saveOperaConfig();
    return api.sendMessage(
      "✅ Opera is now available to all users.",
      threadID,
      messageID
    );
  }

  // Toggle maintenance mode
  if (input === "maintenance on") {
    operaConfig.maintenance = true;
    saveOperaConfig();
    return api.sendMessage(
      "🛠️ Maintenance mode activated. Only the owner can use Opera now.",
      threadID,
      messageID
    );
  }
  if (input === "maintenance off") {
    operaConfig.maintenance = false;
    saveOperaConfig();
    return api.sendMessage(
      "🛠️ Maintenance mode deactivated. Opera is available to all permitted users.",
      threadID,
      messageID
    );
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

  // Music play command (spotify, music, play)
  if (/^(spotify|music|play)\s+/i.test(input)) {
    const songTitle = inputRaw.replace(/^(spotify|music|play)\s+/i, "").trim();

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

  // Default: Use Aria AI from your API link
  try {
    const encodedQuestion = encodeURIComponent(inputRaw);
    const apiUrl = `https://kaiz-apis.gleeze.com/api/aria?ask=${encodedQuestion}&uid=${OWNER_UID}&apikey=585674da-1b3b-4eed-bb58-13710096c461`;

    const response = await axios.get(apiUrl);
    if (response.data && response.data.response) {
      return api.sendMessage(response.data.response.trim(), threadID, messageID);
    }
  } catch (err) {
    console.error("❌ Aria API error:", err);
  }

  return api.sendMessage(
    "🤖 Opera ready! Use commands like `opera spotify <song>`, `opera analyze image` (reply), `opera kick` (reply), `opera admin only on/off`, `opera maintenance on/off`.",
    threadID,
    messageID
  );
};
