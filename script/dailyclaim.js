const { getUser, updateUser } = require("../utils/economy");

const CLAIM_AMOUNT = 50000000; // 50 million credits
const COOLDOWN_HOURS = 10;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

module.exports.config = {
  name: "dailyclaim",
  description: "Claim free credits every 10 hours (limit 50M).",
  usages: "dailyclaim",
  cooldowns: 0
};

module.exports.run = async function({ api, event }) {
  const { senderID, threadID } = event;
  const user = getUser(senderID);

  const now = Date.now();
  const lastClaim = user.lastDailyClaim || 0;

  if (now - lastClaim < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - (now - lastClaim);
    const hrs = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    const secs = Math.floor((remaining % (60 * 1000)) / 1000);

    return api.sendMessage(
      `⏳ You already claimed your daily reward.\n` +
      `Please wait ${hrs}h ${mins}m ${secs}s before claiming again.`,
      threadID
    );
  }

  user.wallet += CLAIM_AMOUNT;
  user.lastDailyClaim = now;
  updateUser(senderID, user);

  return api.sendMessage(
    `🎉 Daily Claim Success! You received ₱${CLAIM_AMOUNT.toLocaleString()} credits.\n` +
    `💼 Your wallet balance is now ₱${user.wallet.toLocaleString()}.`,
    threadID
  );
};
