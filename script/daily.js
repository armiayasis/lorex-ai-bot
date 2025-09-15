const fs = require("fs");
const path = require("path");
const { updateBalance, updateUserName } = require("./balance");

const claimDataFile = path.join(__dirname, "daily_claims.json");

// Load daily claim data
let claimData = {};
if (fs.existsSync(claimDataFile)) {
  try {
    claimData = JSON.parse(fs.readFileSync(claimDataFile, "utf8"));
  } catch (e) {
    console.error("Failed to load daily claims:", e);
    claimData = {};
  }
}

// Save daily claim data
function saveClaimData() {
  fs.writeFileSync(claimDataFile, JSON.stringify(claimData, null, 2));
}

module.exports.config = {
  name: "daily",
  version: "1.0.0",
  description: "Claim your daily bonus (800 credits)",
  hasPermission: 0,
  usages: "daily",
  cooldowns: 5
};

module.exports.run = async function({ api, event }) {
  const { senderID, threadID } = event;
  const userInfo = await api.getUserInfo(senderID);
  const name = userInfo[senderID]?.name || "User";

  updateUserName(senderID, name);

  const now = Date.now();
  const lastClaim = claimData[senderID] || 0;
  const diff = now - lastClaim;

  const hours24 = 24 * 60 * 60 * 1000;

  if (diff < hours24) {
    const remaining = hours24 - diff;
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

    return api.sendMessage(
      `⏳ ${name}, nakakuha ka na ng daily bonus mo.\nPwede kang bumalik ulit sa:\n${hours}h ${minutes}m ${seconds}s.`,
      threadID
    );
  }

  const reward = 800;
  updateBalance(senderID, reward, name);
  claimData[senderID] = now;
  saveClaimData();

  return api.sendMessage(
    `🎁 Hello, ${name}!\n✅ Naklaim mo na ang iyong daily bonus na ${reward} credits.\nBumalik ulit bukas!`,
    threadID
  );
};
