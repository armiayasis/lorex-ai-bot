const fs = require("fs");
const dataPath = "./users.json";

// Utility functions
function loadUsers() {
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "{}");
  return JSON.parse(fs.readFileSync(dataPath));
}

function saveUsers(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function getUser(id, name = "User") {
  const users = loadUsers();
  if (!users[id]) {
    users[id] = {
      name,
      wallet: 0,
      bank: 0,
      savings: 0,
      loan: 0
    };
    saveUsers(users);
  }
  return users[id];
}

function updateUser(id, data) {
  const users = loadUsers();
  users[id] = { ...users[id], ...data };
  saveUsers(users);
}

// Main command handler
module.exports.config = {
  name: "mine",
  version: "1.0",
  description: "minebank system (mine, deposit, withdraw, balance, loan)",
  usages: "[mine | deposit | withdraw | balance | loan]",
  hasPermission: 0,
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const { senderID, threadID } = event;
  const users = loadUsers();
  const userInfo = await api.getUserInfo(senderID);
  const name = userInfo[senderID]?.name || "User";
  const user = getUser(senderID, name);

  const command = args[0]?.toLowerCase();
  const value = args[1];

  switch (command) {
    case "mine": {
      const amount = Math.floor(Math.random() * 500) + 100;
      user.wallet += amount;
      updateUser(senderID, user);
      return api.sendMessage(`⛏️ You mined ${amount} credits!`, threadID);
    }

    case "deposit": {
      const amount = value === "all" ? user.wallet : parseInt(value);
      if (isNaN(amount) || amount <= 0 || amount > user.wallet)
        return api.sendMessage("❌ Invalid deposit amount.", threadID);

      const savings = Math.floor(amount * 0.1);
      const toBank = amount - savings;

      user.wallet -= amount;
      user.bank += toBank;
      user.savings += savings;

      updateUser(senderID, user);
      return api.sendMessage(
        `🏦 Deposited ${toBank} to bank.\n💰 Saved ${savings} in savings.`,
        threadID
      );
    }

    case "withdraw": {
      const amount = value === "all" ? user.bank : parseInt(value);
      if (isNaN(amount) || amount <= 0 || amount > user.bank)
        return api.sendMessage("❌ Invalid withdraw amount.", threadID);

      const savings = Math.floor(amount * 0.1);
      const toWallet = amount - savings;

      user.bank -= amount;
      user.wallet += toWallet;
      user.savings += savings;

      updateUser(senderID, user);
      return api.sendMessage(
        `💸 Withdrew ${toWallet} to wallet.\n💰 Saved ${savings} in savings.`,
        threadID
      );
    }

    case "balance": {
      return api.sendMessage(
        `💼 Balance for ${user.name}:\n\n` +
          `👛 Wallet: ${user.wallet} credits\n` +
          `🏦 Bank: ${user.bank} credits\n` +
          `💰 Savings: ${user.savings} credits\n` +
          `💳 Loan: ${user.loan} / 50000`,
        threadID
      );
    }

    case "loan": {
      const amount = parseInt(value);
      if (isNaN(amount) || amount <= 0)
        return api.sendMessage("❌ Invalid loan amount.", threadID);

      const maxLoan = 50000;
      const available = maxLoan - user.loan;

      if (amount > available)
        return api.sendMessage(
          `⚠️ You can only loan up to ${available} credits.`,
          threadID
        );

      user.wallet += amount;
      user.loan += amount;

      updateUser(senderID, user);
      return api.sendMessage(`✅ You borrowed ${amount} credits.`, threadID);
    }

    default: {
      return api.sendMessage(
        "🪙 Economy Commands:\n" +
          `- mine\n` +
          `- deposit [amount/all]\n` +
          `- withdraw [amount/all]\n` +
          `- balance\n` +
          `- loan [amount]\n`,
        threadID
      );
    }
  }
};
