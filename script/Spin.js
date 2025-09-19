const { updateBalance, updateUserName } = require("./balance");

module.exports.config = {
  name: "spin",
  version: "1.0.0",
  description: "Spin the wheel to earn random credits!",
  hasPermission: 0,
  usages: "spin",
  cooldowns: 0 // 0 seconds cooldown
};

module.exports.run = async function({ api, event }) {
  const { senderID, threadID } = event;

  try {
    const userInfo = await api.getUserInfo(senderID);
    const name = userInfo[senderID]?.name || "User";

    // Update username in your database
    updateUserName(senderID, name);

    // Random reward
    const rewards = [0, 10, 20, 50, 100, 150, 200, 500];
    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    // Update user's balance
    updateBalance(senderID, reward, name);

    // Send message to user
    let message = `🎡 SPIN RESULT:\n`;
    if (reward === 0) {
      message += `🙁 Sayang, wala kang nakuha! Better luck next time.`;
    } else {
      message += `🎉 Congrats, ${name}! Nanalo ka ng ${reward} credits!`;
    }

    return api.sendMessage(message, threadID);

  } catch (error) {
    console.error("❌ Spin command error:", error);
    return api.sendMessage("⚠️ Nagkaroon ng error habang nag-spin. Paki-try ulit.", threadID);
  }
};
