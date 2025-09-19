const { getUser, updateUser } = require("../utils/economy");

const LOTTO_REWARD = 10000;

module.exports.config = {
  name: "lotto",
  description: "Pick 2 numbers and win if both match! Use 'checklotto' to check and 'lottoclaim' to claim prize.",
  usages: "[number1] [number2] | checklotto | lottoclaim",
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const { senderID, threadID } = event;
  const user = getUser(senderID);

  const subcommand = args[0]?.toLowerCase();

  if (!subcommand) {
    return api.sendMessage(
      "🎯 Usage:\n" +
      "- lotto [number1] [number2]\n" +
      "- checklotto\n" +
      "- lottoclaim",
      threadID
    );
  }

  if (subcommand === "checklotto") {
    if (!user.lastLotto) {
      return api.sendMessage("ℹ️ Wala kang previous lotto entry.", threadID);
    }

    const { numbers, drawn, isWin, claimed } = user.lastLotto;

    let msg = `🎰 LAST LOTTO RESULT:\n`;
    msg += `🔢 Your Numbers: ${numbers.join(", ")}\n`;
    msg += `🎲 Drawn Numbers: ${drawn.join(", ")}\n`;
    msg += `Result: ${isWin ? "🎉 PANALO!" : "😢 Hindi nanalo."}\n`;
    msg += `Prize Claimed: ${claimed ? "✅ Yes" : "❌ No"}`;

    return api.sendMessage(msg, threadID);
  }

  if (subcommand === "lottoclaim") {
    if (!user.lastLotto) {
      return api.sendMessage("ℹ️ Wala kang lotto prize na pwedeng i-claim.", threadID);
    }
    const { isWin, claimed } = user.lastLotto;

    if (!isWin) {
      return api.sendMessage("😢 Hindi ka nanalo sa huling lotto mo.", threadID);
    }
    if (claimed) {
      return api.sendMessage("⚠️ Na-claim mo na ang prize mo.", threadID);
    }

    user.wallet += LOTTO_REWARD;
    user.lastLotto.claimed = true;
    updateUser(senderID, user);

    return api.sendMessage(`🎉 Congrats! Na-claim mo na ang iyong ₱${LOTTO_REWARD} prize!`, threadID);
  }

  // Otherwise, treat as lotto number submission: expect 2 numbers
  if (args.length < 2) {
    return api.sendMessage("🎯 Format: lotto [number1] [number2] (1-50)", threadID);
  }

  const num1 = parseInt(args[0]);
  const num2 = parseInt(args[1]);

  if (
    isNaN(num1) || isNaN(num2) ||
    num1 < 1 || num1 > 50 ||
    num2 < 1 || num2 > 50
  ) {
    return api.sendMessage("🔢 Please enter 2 valid numbers between 1 and 50.", threadID);
  }

  // Draw random winning numbers
  const win1 = Math.floor(Math.random() * 50) + 1;
  const win2 = Math.floor(Math.random() * 50) + 1;

  const isMatch = (num1 === win1 && num2 === win2) || (num1 === win2 && num2 === win1);

  // Save last lotto result for user
  user.lastLotto = {
    numbers: [num1, num2],
    drawn: [win1, win2],
    isWin: isMatch,
    claimed: false
  };

  updateUser(senderID, user);

  let message = `🎰 LOTTO ENTRY SUBMITTED!\n`;
  message += `🔢 Your Numbers: ${num1}, ${num2}\n`;
  message += `🎲 Drawn Numbers: ${win1}, ${win2}\n\n`;
  message += isMatch
    ? "🎉 You matched both numbers! Use 'lottoclaim' to claim your prize!"
    : "😢 Sorry, you didn't win. Try again next time!";

  return api.sendMessage(message, threadID);
};
