const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "user_balances.json");

module.exports.config = {
  name: "balance",
  version: "1.1.0",
  description: "User balance tracking with top list",
  hasPermission: 0,
  usages: "balance [top]",
  cooldowns: 0
};

let users = {};

// Load user data from file
function loadUsers() {
  if (fs.existsSync(dataFile)) {
    try {
      users = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    } catch {
      users = {};
    }
  }
}

// Save user data to file
function saveUsers() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Error saving user balances:", e);
  }
}

// Get user data or create new user if not exists
function getUser(userID, name = "Unknown") {
  if (!users[userID]) {
    users[userID] = { name, balance: 0 };
    saveUsers();
  }
  return users[userID];
}

// Update user name (if changed)
function updateUserName(userID, name) {
  if (users[userID] && users[userID].name !== name) {
    users[userID].name = name;
    saveUsers();
  }
}

// Get current balance of user
function getBalance(userID) {
  return users[userID]?.balance || 0;
}

// Add or subtract balance; balance never goes below 0
function updateBalance(userID, amount, name = "Unknown") {
  const user = getUser(userID, name);
  user.balance += amount;
  if (user.balance < 0) user.balance = 0;
  saveUsers();
  return user.balance;
}

// Load users on module start
loadUsers();

module.exports = {
  config: module.exports.config,

  run: async function({ api, event, args }) {
    const { senderID, threadID } = event;
    const userInfo = await api.getUserInfo(senderID);
    const name = userInfo[senderID]?.name || "User";

    updateUserName(senderID, name);

    if (args[0]?.toLowerCase() === "top") {
      // Sort users by balance descending
      const sortedUsers = Object.entries(users)
        .sort((a, b) => b[1].balance - a[1].balance)
        .slice(0, 10); // top 10

      if (sortedUsers.length === 0) {
        return api.sendMessage("Walang user data para ipakita.", threadID);
      }

      let message = "🏆 Top 10 Users by Balance:\n\n";
      sortedUsers.forEach(([userID, data], index) => {
        message += `${index + 1}. ${data.name} — ${data.balance} credits\n`;
      });

      return api.sendMessage(message, threadID);
    } else {
      // Show user's balance
      const bal = getBalance(senderID);
      return api.sendMessage(`💰 ${name}, ang balance mo ay: ${bal} credits.`, threadID);
    }
  },

  // Helpers para gamitin sa ibang modules (ex: lotto claim)
  getBalance,
  updateBalance,
  updateUserName
};
