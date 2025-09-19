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
  const userInfo = await api.getUserInfo(senderID);
  const name = userInfo[senderID]?.name || "User";

  updateUserName(senderID, name);

  // Define the wheel values (you can modify these)
  const rewards = [0, 10, 20, 50, 100, 150, 200, 500];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];

  // Add the reward to the user's balance
  updateBalance(senderID, reward, name);

  // Prepare response message
  let message = `🎡 SPIN RESULT:\n`;
  if (reward === 0) {
    message += `🙁 Sayang, wala kang nakuha! Better luck next time.`;
  } else {
    message += `🎉 Congrats, ${name}! Nanalo ka ng ${reward} credits!`;
  }

  return api.sendMessage(message, threadID);
};
