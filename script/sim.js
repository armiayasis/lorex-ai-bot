
const fs = require("fs");
const path = require("path");

// Sample data
const gagstockUpdates = [
    "Gas Stock Update: Current price per liter is ₱58.50. Stock levels are stable.",
    "Gagstock Tracker: Gasoline prices up by 2% this week. Monitor for changes.",
    "Gas Stock Alert: Diesel at ₱55.20. Refill stations reporting high demand.",
    "Gagstock Tracker: Unleaded gas down 1.5%. Good time to fill up!",
    "Gas Stock Update: Prices holding at ₱57.00. No major fluctuations."
];

const marketItems = [
    "🍎 Apple at GAG MARKET: ₱50/kg",
    "🍌 Banana at GAG MARKET: ₱30/kg",
    "🍊 Orange at GAG MARKET: ₱40/kg",
    "🍇 Grapes at GAG MARKET: ₱80/kg",
    "🍓 Strawberry at GAG MARKET: ₱120/kg",
    "🥕 Carrot at GAG MARKET: ₱25/kg",
    "🍅 Tomato at GAG MARKET: ₱35/kg",
    "🥒 Cucumber at GAG MARKET: ₱20/kg",
    "🧅 Onion at GAG MARKET: ₱45/kg",
    "🥔 Potato at GAG MARKET: ₱30/kg"
];

// Module configuration
module.exports.config = {
    name: "autopost",
    version: "1.1.0",
    hasPermission: 0,
    usePrefix: false,
    aliases: ["ap"],
    description: "Autoposts gagstock tracker and GAG MARKET items with top users and average score.",
    usages: "autopost on/off/leaderboard",
    credits: 'With leaderboard',
    cooldowns: 0,
    dependencies: { "fs": "", "path": "" }
};

// File paths
const stateFile = path.join(__dirname, "autopost_state.json");
const userDataFile = path.join(__dirname, "user_data.json");

// Global state
let isAutopostOn = false;
let autopostInterval = null;
let countdownNumber = 0;
let userData = {};  // { threadID: { userID: points } }

// Load state
function loadState() {
    if (fs.existsSync(stateFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            isAutopostOn = data.isOn || false;
            countdownNumber = data.countdown || 0;
            if (isAutopostOn) startAutopost();
        } catch (err) {
            console.error("Error loading state:", err);
        }
    }
    if (fs.existsSync(userDataFile)) {
        try {
            userData = JSON.parse(fs.readFileSync(userDataFile, 'utf8'));
        } catch (err) {
            console.error("Error loading user data:", err);
        }
    }
}

// Save state
function saveState() {
    try {
        fs.writeFileSync(stateFile, JSON.stringify({ isOn: isAutopostOn, countdown: countdownNumber }, null, 2));
        fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
    } catch (err) {
        console.error("Error saving data:", err);
    }
}

// Get or init user points
function getUserPoints(threadID, userID) {
    if (!userData[threadID]) userData[threadID] = {};
    if (!userData[threadID][userID]) userData[threadID][userID] = 0;
    return userData[threadID][userID];
}

// Start autopost
function startAutopost(api, threadID) {
    if (autopostInterval) clearInterval(autopostInterval);
    autopostInterval = setInterval(async () => {
        try {
            // Award points to all users in thread
            for (const userID in userData[threadID] || {}) {
                userData[threadID][userID] += 1;
            }

            // Random content
            const contentTypes = ['gagstock', 'market'];
            const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
            let message = contentType === 'gagstock' ?
                `⛽ Gagstock Tracker:\n${gagstockUpdates[Math.floor(Math.random() * gagstockUpdates.length)]}` :
                `🛒 GAG MARKET Update:\n${marketItems[Math.floor(Math.random() * marketItems.length)]}`;

            // Philippine time
            const now = new Date();
            const phTime = now.toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });

            const fullMessage = `🕒 ${phTime} (Philippine Time)\n\n⏳ Countdown: ${countdownNumber}\n\n${message}`;

            const postData = { body: fullMessage };
            const url = await api.createPost(postData);
            console.log(`Autopost: ${url || 'No URL'}`);

            countdownNumber++;
            saveState();
        } catch (error) {
            console.error("Autopost error:", error.message);
        }
    }, 60 * 1000);
}

// Stop autopost
function stopAutopost() {
    if (autopostInterval) {
        clearInterval(autopostInterval);
        autopostInterval = null;
    }
}

// Main function
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const command = args[0]?.toLowerCase();

    if (command === 'on') {
        if (isAutopostOn) return api.sendMessage("✅ Autopost is already enabled.", threadID, messageID);
        isAutopostOn = true;
        getUserPoints(threadID, senderID) += 10;  // Bonus for toggling
        saveState();
        startAutopost(api, threadID);
        api.sendMessage("✅ Autopost enabled! Posting every 1 minute.", threadID, messageID);
    } else if (command === 'off') {
        if (!isAutopostOn) return api.sendMessage("❌ Autopost is already disabled.", threadID, messageID);
        isAutopostOn = false;
        getUserPoints(threadID, senderID) += 10;
        saveState();
        stopAutopost();
        api.sendMessage("❌ Autopost disabled.", threadID, messageID);
    } else if (command === 'leaderboard') {
        const users = Object.entries(userData[threadID] || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // Calculate average
        const allPoints = Object.values(userData[threadID] || {});
        const totalPoints = allPoints.reduce((sum, val) => sum + val, 0);
        const avgPoints = allPoints.length > 0 ? (totalPoints / allPoints.length).toFixed(2) : 0;

        let avgEmoji = "📊";
        if (parseFloat(avgPoints) >= 100) avgEmoji = "📈";
        else if (parseFloat(avgPoints) <= 30) avgEmoji = "📉";

        let leaderboard = "🏆 Top Users Leaderboard (Richest) 🏆\n\n";
        const medals = ["🥇", "🥈", "🥉", "🏅", "🎖"];
        users.forEach(([userID, points], index) => {
            const medal = medals[index] || "🏆";
            leaderboard += `${medal} User ${userID}: ${points} points\n`;
        });
        leaderboard += `\n${avgEmoji} Average Score: ${avgPoints} points`;

        api.sendMessage(leaderboard, threadID, messageID);
    } else {
        api.sendMessage("❗ Usage: autopost on/off/leaderboard", threadID, messageID);
    }
};

// Load on start
loadState();
