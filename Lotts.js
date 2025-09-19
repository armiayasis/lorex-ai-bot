const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');
const lottoDataPath = path.join(__dirname, '..', 'lottoData.json');

const PRIZE = 50000;

module.exports.config = {
  name: 'lotto',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  description: 'Enter or check Lotto draw (pick 2 numbers)',
  usages: 'lotto <number1> <number2> | lotto check',
  credits: 'LorexAi + ChatGPT',
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;

  // Load existing lotto entries
  let lottoData = {};
  if (fs.existsSync(lottoDataPath)) {
    lottoData = JSON.parse(fs.readFileSync(lottoDataPath, 'utf8'));
  }

  // Load user data
  let userData = {};
  if (fs.existsSync(userDataPath)) {
    userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
  }

  if (!userData[uid]) {
    userData[uid] = { balance: 0, lastSpin: 0, lastDaily: 0 };
  }

  // =============== SUBMIT ENTRY ===============
  if (args.length === 2 && !isNaN(args[0]) && !isNaN(args[1])) {
    const num1 = parseInt(args[0]);
    const num2 = parseInt(args[1]);

    if (num1 < 1 || num1 > 99 || num2 < 1 || num2 > 99) {
      return api.sendMessage('❌ Lotto numbers must be between 1 and 99.', event.threadID, event.messageID);
    }

    lottoData[uid] = [num1, num2];

    fs.writeFileSync(lottoDataPath, JSON.stringify(lottoData, null, 2));

    return api.sendMessage(`✅ You have entered the lotto with numbers: ${num1} and ${num2}.\n🕓 Wait for the draw!`, event.threadID, event.messageID);
  }

  // =============== CHECK / DRAW WINNERS ===============
  if (args[0] === 'check') {
    // Generate 2 random winning numbers
    const win1 = Math.floor(Math.random() * 99) + 1;
    const win2 = Math.floor(Math.random() * 99) + 1;

    const winningNumbers = [win1, win2];
    let winners = [];

    for (const id in lottoData) {
      const entry = lottoData[id];
      const matchCount = entry.filter(num => winningNumbers.includes(num)).length;

      if (matchCount === 2) {
        // Perfect match
        userData[id].balance += PRIZE;
        winners.push({ uid: id, match: 2 });
      } else if (matchCount === 1) {
        // Partial match (optional: small reward)
        userData[id].balance += Math.floor(PRIZE / 10); // ₱5,000
        winners.push({ uid: id, match: 1 });
      }
    }

    // Save updated user balances
    fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));

    // Reset lotto entries
    fs.writeFileSync(lottoDataPath, JSON.stringify({}, null, 2));

    // Prepare result message
    let result = `🎉 Lotto Draw Results 🎉\n\n🟡 Winning Numbers: ${win1} & ${win2}\n\n`;

    if (winners.length === 0) {
      result += '😢 No winners this round.';
    } else {
      for (const winner of winners) {
        const reward = winner.match === 2 ? PRIZE : Math.floor(PRIZE / 10);
        result += `🏆 UID ${winner.uid} matched ${winner.match} number(s) and won ₱${reward.toLocaleString()}\n`;
      }
    }

    return api.sendMessage(result, event.threadID, event.messageID);
  }

  // Invalid usage
  return api.sendMessage(
    '❌ Invalid command.\n\nUsage:\n• lotto <num1> <num2> — to submit your numbers\n• lotto check — to draw and check winners',
    event.threadID,
    event.messageID
  );
};
