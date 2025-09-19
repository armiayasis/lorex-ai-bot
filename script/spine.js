const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');

// Cooldown time in milliseconds (1 hour)
const COOLDOWN = 60 * 60 * 1000;

// Fruits for slot spin
const fruits = ['🍒', '🍋', '🍇', '🍉', '🥝', '🍎', '🍌'];

module.exports.config = {
  name: 'spin',
  version: '2.0.0',
  hasPermission: 0,
  usePrefix: false,
  description: 'Spin to earn random money with fruit slots!',
  usages: 'spin',
  credits: 'LorexAi + ChatGPT',
  cooldowns: 5
};

module.exports.run = async function({ api, event }) {
  const uid = event.senderID;

  try {
    // Load user data
    let data = {};
    if (fs.existsSync(userDataPath)) {
      data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    }

    // Init user
    if (!data[uid]) {
      data[uid] = { balance: 0, lastSpin: 0 };
    }

    const now = Date.now();

    // Cooldown check
    if (now - (data[uid].lastSpin || 0) < COOLDOWN) {
      const remaining = COOLDOWN - (now - data[uid].lastSpin);
      const minutes = Math.ceil(remaining / 60000);
      return api.sendMessage(`⏳ You need to wait ${minutes} more minute(s) before spinning again.`, event.threadID, event.messageID);
    }

    // Send initial message
    api.sendMessage('🎰 Spinning the wheel...', event.threadID, async (err, info) => {
      // Fake delay for "spinning"
      setTimeout(() => {
        // Generate random fruits
        const slot = [
          fruits[Math.floor(Math.random() * fruits.length)],
          fruits[Math.floor(Math.random() * fruits.length)],
          fruits[Math.floor(Math.random() * fruits.length)]
        ];

        // Check for match
        let reward = 0;
        if (slot[0] === slot[1] && slot[1] === slot[2]) {
          // Triple match = big prize
          reward = Math.floor(Math.random() * 1000) + 1000; // ₱1000–₱1999
        } else if (slot[0] === slot[1] || slot[1] === slot[2] || slot[0] === slot[2]) {
          // Two match = medium prize
          reward = Math.floor(Math.random() * 500) + 200; // ₱200–₱699
        } else {
          // No match = small prize
          reward = Math.floor(Math.random() * 100); // ₱0–₱99
        }

        // Update balance
        data[uid].balance += reward;
        data[uid].lastSpin = now;

        // Save back to file
        fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));

        // Prepare result message
        const result = `🎰 Spinning result:\n\n[ ${slot.join(' | ')} ]\n\n💰 You won ₱${reward.toLocaleString()}!`;

        // Edit the original message with the result
        api.editMessage(result, info.messageID, event.threadID);
      }, 2000); // delay 2 seconds to simulate spin
    });

  } catch (err) {
    console.error('❌ Error in spin command:', err);
    api.sendMessage('❌ Something went wrong. Please try again later.', event.threadID, event.messageID);
  }
};
