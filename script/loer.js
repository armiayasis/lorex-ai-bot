const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');
const lottoDataPath = path.join(__dirname, '..', 'lottoData.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function generateLottoResult() {
  // Generate 2 unique random numbers between 1-45
  let nums = new Set();
  while (nums.size < 2) {
    nums.add(Math.floor(Math.random() * 45) + 1);
  }
  return [...nums];
}

module.exports.config = {
  name: 'lotto',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Play lotto by submitting 2 numbers',
  usages: 'lotto <num1> <num2> | checklotto | lottoclaim',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const userData = readJson(userDataPath);
  const lottoData = readJson(lottoDataPath);

  const command = args[0]?.toLowerCase();

  if (command === 'lotto') {
    if (args.length !== 3) return api.sendMessage('❌ Usage: lotto <num1> <num2> (both numbers 1-45)', event.threadID);

    const num1 = parseInt(args[1]);
    const num2 = parseInt(args[2]);

    if (
      isNaN(num1) || isNaN(num2) ||
      num1 < 1 || num1 > 45 ||
      num2 < 1 || num2 > 45 ||
      num1 === num2
    ) {
      return api.sendMessage('❌ Please submit two different numbers between 1 and 45.', event.threadID);
    }

    // Save user picks
    lottoData[uid] = { picks: [num1, num2], claimed: false };
    writeJson(lottoDataPath, lottoData);

    return api.sendMessage(`✅ You submitted your lotto numbers: ${num1} and ${num2}. Good luck!`, event.threadID);

  } else if (command === 'checklotto') {
    if (!lottoData.lastDraw) {
      // If no draw yet, generate one
      lottoData.lastDraw = generateLottoResult();
      writeJson(lottoDataPath, lottoData);
    }

    const lastDraw = lottoData.lastDraw;
    const userPicks = lottoData[uid]?.picks;

    let message = `🎰 Last Lotto Draw: ${lastDraw.join(' and ')}\n`;

    if (!userPicks) {
      message += '❌ You have not submitted any numbers yet.';
    } else {
      const matched = userPicks.filter(n => lastDraw.includes(n)).length;
      message += `Your picks: ${userPicks.join(' and ')}\n`;
      if (matched === 2) {
        message += '🎉 Congratulations! You matched both numbers!';
      } else if (matched === 1) {
        message += '👍 You matched 1 number!';
      } else {
        message += '😞 No matches this time. Better luck next time!';
      }
    }

    return api.sendMessage(message, event.threadID);

  } else if (command === 'lottoclaim') {
    if (!lottoData.lastDraw) return api.sendMessage('❌ No lotto has been drawn yet.', event.threadID);

    const userEntry = lottoData[uid];
    if (!userEntry || !userEntry.picks) {
      return api.sendMessage('❌ You have no submitted lotto numbers.', event.threadID);
    }
    if (userEntry.claimed) {
      return api.sendMessage('❌ You already claimed your prize for the last lotto.', event.threadID);
    }

    const matched = userEntry.picks.filter(n => lottoData.lastDraw.includes(n)).length;

    if (matched === 2) {
      // Award prize (example: add 1000 to balance)
      userData[uid] = userData[uid] || {};
      userData[uid].balance = (userData[uid].balance || 0) + 1000;
      writeJson(userDataPath, userData);

      lottoData[uid].claimed = true;
      writeJson(lottoDataPath, lottoData);

      return api.sendMessage('🎉 Congratulations! You claimed ₱1000 prize!', event.threadID);

    } else if (matched === 1) {
      // Smaller prize (example: 200)
      userData[uid] = userData[uid] || {};
      userData[uid].balance = (userData[uid].balance || 0) + 200;
      writeJson(userDataPath, userData);

      lottoData[uid].claimed = true;
      writeJson(lottoDataPath, lottoData);

      return api.sendMessage('👍 You matched 1 number! You claimed ₱200 prize!', event.threadID);

    } else {
      return api.sendMessage('😞 Sorry, no prize to claim.', event.threadID);
    }

  } else {
    return api.sendMessage('❌ Invalid command. Use: lotto <num1> <num2> | checklotto | lottoclaim', event.threadID);
  }
};
