const fs = require("fs");
const path = require("path");

// Config
module.exports.config = {
  name: "g7daily",
  version: "1.3.0",
  hasPermission: 0,
  usePrefix: true,
  aliases: ["g7d"],
  description: "G7 Daily autopost with Lotto submission and claim, with status.",
  usages: "g7daily on/off/status | lotto <num1> <num2> | claim <code>",
  cooldowns: 0,
  credits: "ChatGPT"
};

// Paths to data files
const statePath = path.join(__dirname, "../data/g7_daily_state.json");
const claimsPath = path.join(__dirname, "../data/g7_claims.json");
const lottoPath = path.join(__dirname, "../data/g7_lotto_submissions.json");

// Internal state
let isOn = false;
let lastThreadID = null;
let currentClaimCode = null;
let lastWinnerNumber = null; // Store last winner for status

// Load state
function loadState() {
  if (fs.existsSync(statePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(statePath, "utf8"));
      isOn = data.isOn || false;
      lastThreadID = data.threadID || null;
      currentClaimCode = data.currentClaimCode || null;
      lastWinnerNumber = data.lastWinnerNumber || null;
    } catch (err) {
      console.error("Failed to load G7 state:", err);
    }
  }
}

// Save state
function saveState() {
  try {
    fs.writeFileSync(statePath, JSON.stringify({
      isOn,
      threadID: lastThreadID,
      currentClaimCode,
      lastWinnerNumber
    }, null, 2));
  } catch (err) {
    console.error("Failed to save G7 state:", err);
  }
}

// Load claims
function loadClaims() {
  if (fs.existsSync(claimsPath)) {
    try {
      return JSON.parse(fs.readFileSync(claimsPath, "utf8"));
    } catch (err) {
      console.error("Failed to load claims:", err);
    }
  }
  return {};
}

// Save claims
function saveClaims(data) {
  try {
    fs.writeFileSync(claimsPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save claims:", err);
  }
}

// Load lotto submissions
function loadLotto() {
  if (fs.existsSync(lottoPath)) {
    try {
      return JSON.parse(fs.readFileSync(lottoPath, "utf8"));
    } catch (err) {
      console.error("Failed to load lotto submissions:", err);
    }
  }
  return {};
}

// Save lotto submissions
function saveLotto(data) {
  try {
    fs.writeFileSync(lottoPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save lotto submissions:", err);
  }
}

// Generate winner number (6 digits)
function generateWinnerNumber() {
  return Math.floor(Math.random() * 900000) + 100000;
}

// Generate claim code (6 chars alphanumeric)
function generateClaimCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Schedule daily post at 12:00 PM PH Time
function scheduleDailyPost(api) {
  function getNextNoonPHTime() {
    const now = new Date();
    const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    phTime.setHours(12, 0, 0, 0);

    if (phTime <= now) {
      phTime.setDate(phTime.getDate() + 1);
    }
    return phTime.getTime() - now.getTime();
  }

  const msUntilNoon = getNextNoonPHTime();

  setTimeout(async () => {
    if (!lastThreadID) return;

    const dateStr = new Date().toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // Generate winner and claim code
    const winnerNumber = generateWinnerNumber();
    currentClaimCode = generateClaimCode();
    lastWinnerNumber = winnerNumber;

    // Clear claims and lotto submissions for new day
    saveClaims({});
    saveLotto({});

    saveState();

    // Load lotto submissions to include in post
    const lottoSubs = loadLotto();

    // Format lotto submissions for message
    let lottoList = "";
    if (Object.keys(lottoSubs).length === 0) {
      lottoList = "Walang lotto submissions ngayon.";
    } else {
      for (const userID in lottoSubs) {
        lottoList += `\n- ${lottoSubs[userID].name}: ${lottoSubs[userID].numbers.join(", ")}`;
      }
    }

    const message = 
`📆 ${dateStr}
🎯 G7 PANALO DAILY DRAW 🎯

🏆 Winner Number: #${winnerNumber} (Winner)

💥 Claim your prize now!  
Type in chat: claim ${currentClaimCode}  

📝 Lotto submissions so far:${lottoList}

⏰ Next draw: Tomorrow at 12:00 PM`;

    api.sendMessage(message, lastThreadID, (err) => {
      if (err) console.error("G7 daily post failed:", err);
    });

    // Schedule next post
    scheduleDailyPost(api);
  }, msUntilNoon);
}

// Start autopost
function startDailyG7(api, threadID) {
  lastThreadID = threadID;
  saveState();
  scheduleDailyPost(api);
}

// Handle claim command
async function handleClaim(api, event, code) {
  const { senderID, threadID, messageID } = event;
  if (!currentClaimCode) {
    return api.sendMessage("⚠️ Walang active claim code ngayon.", threadID, messageID);
  }

  if (code.toUpperCase() !== currentClaimCode) {
    return api.sendMessage("❌ Mali ang claim code mo. Pakicheck ulit.", threadID, messageID);
  }

  const claims = loadClaims();

  if (Object.values(claims).includes(code.toUpperCase())) {
    const claimer = Object.keys(claims).find(k => claims[k] === code.toUpperCase());
    if (claimer === senderID) {
      return api.sendMessage("✅ Naka-claim mo na ito dati.", threadID, messageID);
    }
    return api.sendMessage("❌ Claim code na ito ay nakuha na ng ibang user.", threadID, messageID);
  }

  claims[senderID] = code.toUpperCase();
  saveClaims(claims);

  const userInfo = await api.getUserInfo(senderID);
  const name = userInfo[senderID]?.name || "User";

  api.sendMessage(`🎉 Congratulations ${name}! Na-claim mo ang prize gamit ang code ${code.toUpperCase()}.`, threadID, messageID);
}

// Handle lotto submission
async function handleLotto(api, event, nums) {
  const { senderID, threadID, messageID } = event;

  // Validate module ON & thread
  if (!isOn || threadID !== lastThreadID) {
    return api.sendMessage("⚠️ Hindi available ang lotto submission dito.", threadID, messageID);
  }

  if (nums.length !== 2) {
    return api.sendMessage("❗ Usage: lotto <number1> <number2> (2 numbers lang)", threadID, messageID);
  }

  // Validate numbers (1-99)
  for (const n of nums) {
    const num = parseInt(n, 10);
    if (isNaN(num) || num < 1 || num > 99) {
      return api.sendMessage(`❌ Invalid number: ${n}. Dapat 1-99 lang.`, threadID, messageID);
    }
  }

  // Get user info for name
  const userInfo = await api.getUserInfo(senderID);
  const name = userInfo[senderID]?.name || "User";

  // Load existing lotto submissions
  const lottoSubs = loadLotto();

  // Save or overwrite submission for user
  lottoSubs[senderID] = { name, numbers: nums.map(n => parseInt(n, 10)) };

  saveLotto(lottoSubs);

  // Confirm submission
  api.sendMessage(`🎉 ${name}, na-submit mo na ang lotto numbers mo: ${nums.join(", ")}`, threadID, messageID);
}

// Handle status command
function handleStatus(api, threadID, messageID) {
  let msg = `📊 G7 Daily Status:\n\n`;
  msg += `✅ Autopost: ${isOn ? "ON" : "OFF"}\n`;
  msg += `📍 Active Thread: ${lastThreadID || "Walang naka-set"}\n`;
  msg += `🏆 Last Winner Number: ${lastWinnerNumber ? "#" + lastWinnerNumber + " (Winner)" : "Walang data"}\n`;
  msg += `🔑 Current Claim Code: ${currentClaimCode || "Walang active claim code"}\n`;
  api.sendMessage(msg, threadID, messageID);
}

// Command entry
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const command = args[0]?.toLowerCase();

  if (command === "on") {
    if (isOn) {
      return api.sendMessage("✅ G7 Daily autopost already running.", threadID, messageID);
    }
    isOn = true;
    startDailyG7(api, threadID);
    api.sendMessage("✅ G7 Daily Winner autopost started! Magpo-post araw-araw 12:00 PM (PH time).", threadID, messageID);
  } else if (command === "off") {
    if (!isOn) {
      return api.sendMessage("❌ G7 Daily autopost already stopped.", threadID, messageID);
    }
    isOn = false;
    saveState();
    api.sendMessage("🛑 G7 Daily autopost stopped.", threadID, messageID);
  } else if (command === "claim") {
    if (args.length < 2) {
      return api.sendMessage("❗ Usage: claim <code>", threadID, messageID);
    }
    await handleClaim(api, event, args[1]);
  } else if (command === "lotto") {
    if (args.length < 3) {
      return api.sendMessage("❗ Usage: lotto <number1> <number2>", threadID, messageID);
    }
    await handleLotto(api, event, args.slice(1, 3));
  } else if (command === "status") {
    handleStatus(api, threadID, messageID);
  } else {
    api.sendMessage("❗ Commands:\n- g7daily on/off/status\n- lotto <number1> <number2>\n- claim <code>", threadID, messageID);
  }
};

// Load state on start
loadState();
