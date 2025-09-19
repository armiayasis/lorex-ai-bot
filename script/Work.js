const { getUser, updateUser } = require("../utils/economy");

const MIN_EARN = 100;
const MAX_EARN = 1000;
const COOLDOWN_SECONDS = 60; // 1 minute cooldown

// Simple in-memory cooldown store (replace with DB or JSON for persistence)
const cooldowns = new Map();

module.exports.config = {
  name: "work",
  description: "Work and earn random amount of credits!",
  usages: "work",
  cooldowns: COOLDOWN_SECONDS
};

module.exports.run = async function({ api, event }) {
  const { senderID, threadID } = event;
  const user = getUser(senderID);

  const now = Date.now();
  const lastWork = cooldowns.get(senderID) || 0;
  const diff = (now - lastWork) / 1000;

  if (diff < COOLDOWN_SECONDS) {
    const wait = Math.ceil(COOLDOWN_SECONDS - diff);
    return api.sendMessage(`⏳ Please wait ${wait} seconds before working again.`, threadID);
  }

  // Calculate earning amount
  const earn = Math.floor(Math.random() * (MAX_EARN - MIN_EARN + 1)) + MIN_EARN;

  user.wallet += earn;
  updateUser(senderID, user);

  cooldowns.set(senderID, now);

  const message = `💼 You worked hard and earned ₱${earn} credits!\n💼 Wallet balance: ₱${user.wallet}`;

  return api.sendMessage(message, threadID);
};
