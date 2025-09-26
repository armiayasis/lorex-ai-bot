const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports.config = {
  name: "post",
  version: "1.5",
  hasPermission: 0,
  usePrefix: false,
  aliases: [],
  description: "Creates a Facebook post with a message and optional attachment.",
  usages: "post <message> (or reply with an image attachment)",
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, messageReply, attachments } = event;
  const postMessage = args.join(" ");
  const files = [];

  try {
    // Collect attachments from replied message or direct attachments
    const allAttachments = (messageReply?.attachments?.length ? messageReply.attachments : attachments) || [];

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, "cache");
    fs.mkdirSync(tempDir, { recursive: true });

    // Download attachments if any
    for (const attachment of allAttachments) {
      const filePath = path.join(tempDir, `${Date.now()}_${attachment.filename}`);

      const fileResponse = await axios({
        url: attachment.url,
        method: "GET",
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      const writer = fs.createWriteStream(filePath);
      fileResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      files.push(fs.createReadStream(filePath));
    }

    // Prepare post data
    const postData = { body: postMessage };
    if (files.length > 0) postData.attachment = files.length === 1 ? files[0] : files;

    // Create the post
    try {
      const url = await api.createPost(postData);
      api.sendMessage(
        `✅ Post created successfully!\n🔗 ${url || "No URL returned."}`,
        threadID,
        messageID
      );
    } catch (error) {
      const errorUrl = error?.data?.story_create?.story?.url;
      if (errorUrl) {
        return api.sendMessage(
          `✅ Post created successfully!\n🔗 ${errorUrl}\n⚠️ (Note: Post created with server warnings)`,
          threadID,
          messageID
        );
      }

      let errorMessage = "❌ An unknown error occurred.";
      if (error?.errors?.length > 0) {
        errorMessage = error.errors.map((e) => e.message).join("\n");
      } else if (error.message) {
        errorMessage = error.message;
      }

      api.sendMessage(`❌ Error creating post:\n${errorMessage}`, threadID, messageID);
    }

  } catch (error) {
    console.error("❌ Error processing post:", error);
    api.sendMessage("❌ An error occurred while creating the post.", threadID, messageID);
  } finally {
    // Clean up downloaded files
    files.forEach((fileStream) => {
      if (fileStream.path) {
        fs.unlink(fileStream.path, (err) => {
          if (err) console.error("❌ Error deleting file:", err);
        });
      }
    });
  }
};
