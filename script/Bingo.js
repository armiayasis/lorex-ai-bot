const { getUser, updateUser } = require("../utils/economy");

const BINGO_REWARD = 20000;

module.exports.config = {
  name: "bing",
  description: "Bingo game! Pick 4 numbers (1-75) and win if all match.",
  usages: "[num1] [num2] [num3] [num4]",
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const { senderID, threadID } = event;
  const user = getUser(senderID);

  if (args.length !== 4) {
    return api.sendMessage("🎯 Format: bing [num1] [num2] [num3] [num4] (numbers 1-75)", threadID);
  }

  // Parse numbers
  const nums = args.map(n => parseInt(n));
  if (nums.some(n => isNaN(n) || n < 1 || n > 75)) {
    return api.sendMessage("🔢 All numbers must be valid integers between 1 and 75.", threadID);
  }

  // Draw 4 unique random numbers between 1-75
  let drawn = [];
  while (drawn.length < 4) {
    const randNum = Math.floor(Math.random() * 75) + 1;
    if (!drawn.includes(randNum)) drawn.push(randNum);
  }

  // Check if all user numbers are in drawn numbers
  const isWin = nums.every(n => drawn.includes(n));

  let message = "🎲 BINGO GAME RESULT!\n";
  message += `🎯 Your Numbers: ${nums.join(", ")}\n`;
  message += `🎱 Drawn Numbers: ${drawn.join(", ")}\n\n`;

  if (isWin) {
    user.wallet += BINGO_REWARD;
    updateUser(senderID, user);
    message += `🎉 WOW! Panalo ka! Nakakuha ka ng ₱${BINGO_REWARD} credits!\n💼 Wallet: ${user.wallet}`;
  } else {
    message += `😢 Hindi nanalo. Try mo ulit next time!\n💼 Wallet: ${user.wallet}`;
  }

  return api.sendMessage(message, threadID);
};
