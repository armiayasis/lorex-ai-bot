const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');

module.exports.config = {
  name: 'transfer',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  description: 'Transfer money to another user using UID',
  usages: 'transfer <UID> <amount>',
  credits: 'LorexAi + ChatGPT',
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const senderID = event.senderID;
  const [targetUID, amountStr] = args;

  // Validate input
  if (!targetUID || !amountStr || isNaN(amountStr)) {
    return api.sendMessage(
      '❌ Invalid command usage.\n\n✅ Correct format: transfer <UID> <amount>\nExample: transfer 100012345678901 1000',
      event.threadID,
      event.messageID
    );
  }

  const amount = parseInt(amountStr);
  if (amount <= 0) {
    return api.sendMessage('❌ You can only transfer a positive amount.', event.threadID, event.messageID);
  }

  if (targetUID === senderID) {
    return api.sendMessage('❌ You cannot transfer money to yourself.', event.threadID, event.messageID);
  }

  try {
    // Load or initialize data
    let data = {};
    if (fs.existsSync(userDataPath)) {
      data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    }

    if (!data[senderID]) {
      data[senderID] = { balance: 0, lastSpin: 0, lastDaily: 0 };
    }

    if (!data[targetUID]) {
      data[targetUID] = { balance: 0, lastSpin: 0, lastDaily: 0 };
    }

    if (data[senderID].balance < amount) {
      return api.sendMessage(`❌ You don't have enough money to transfer ₱${amount.toLocaleString()}.`, event.threadID, event.messageID);
    }

    // Do the transfer
    data[senderID].balance -= amount;
    data[targetUID].balance += amount;

    // Save updated data
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));

    // Confirm transfer
    api.sendMessage(
      `✅ Successfully transferred ₱${amount.toLocaleString()} to UID ${targetUID}.\n💰 Your new balance: ₱${data[senderID].balance.toLocaleString()}`,
      event.threadID,
      event.messageID
    );

    // Optional: Notify recipient (if in same thread)
    try {
      api.sendMessage(
        `📩 You have received ₱${amount.toLocaleString()} from UID ${senderID}.`,
        targetUID
      );
    } catch (err) {
      console.log(`Could not send message to ${targetUID} — maybe not in same thread.`);
    }

  } catch (err) {
    console.error('❌ Error in transfer command:', err);
    api.sendMessage('❌ Something went wrong during the transfer. Please try again later.', event.threadID, event.messageID);
  }
};
