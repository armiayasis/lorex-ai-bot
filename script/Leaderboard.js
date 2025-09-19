const { getAllUsers } = require("../utils/economy");

module.exports.config = {
  name: "leaderboard",
  description: "Show top users by wallet balance",
  usages: "leaderboard",
  cooldowns: 0
};

module.exports.run = async function({ api, event }) {
  const { threadID } = event;
  const users = getAllUsers();

  // Sort users by wallet balance descending
  const sorted = Object.entries(users)
    .sort(([, a], [, b]) => b.wallet - a.wallet)
    .slice(0, 10); // top 10

  if (sorted.length === 0) {
    return api.sendMessage("ℹ️ Walang user data pa.", threadID);
  }

  let message = "🏆 TOP 10 Richest Users 🏆\n\n";
  sorted.forEach(([id, user], index) => {
    message += `${index + 1}. ${user.name || "User"} — ₱${user.wallet}\n`;
  });

  return api.sendMessage(message, threadID);
};
