const { getUser, updateUser } = require("../utils/economy");

const items = [
  "✏️ Lapis",
  "📚 Notebook",
  "📐 Triangle",
  "🖊️ Ballpen",
  "🧮 Calculator",
  "📏 Ruler",
  "📓 Paper",
  "🖍️ Crayons"
];

module.exports.config = {
  name: "gamble",
  description: "Gamble your credits in exchange for school supplies!",
  usages: "[amount/all]",
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const { senderID, threadID } = event;
  const user = getUser(senderID);
  const input = args[0];

  let amount;
  if (input === "all") {
    amount = user.wallet;
  } else {
    amount = parseInt(input);
  }

  if (isNaN(amount) || amount <= 0 || amount > user.wallet) {
    return api.sendMessage("📛 Invalid amount. Check your wallet or input.", threadID);
  }

  const chosenItem = items[Math.floor(Math.random() * items.length)];
  const win = Math.random() < 0.5;

  let message = `🎒 Sugalan ng School Supplies!\n`;
  message += `🎁 Prize item: ${chosenItem}\n`;
  message += `🎲 Betting: ${amount} credits\n\n`;

  if (win) {
    const winnings = amount;
    user.wallet += winnings;
    message += `✅ You won the bet and got double!\n📈 Gained: ${winnings} credits\n💼 Wallet: ${user.wallet}`;
  } else {
    user.wallet -= amount;
    message += `❌ You lost the bet...\n📉 Lost: ${amount} credits\n💼 Wallet: ${user.wallet}`;
  }

  updateUser(senderID, user);
  return api.sendMessage(message, threadID);
};
