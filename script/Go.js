
const fs = require("fs");
const path = require("path");

// Bingo columns
const bingoColumns = {
    B: { min: 1, max: 15 },
    I: { min: 16, max: 30 },
    N: { min: 31, max: 45 },
    G: { min: 46, max: 60 },
    O: { min: 61, max: 75 }
};

// Module configuration
module.exports.config = {
    name: "bingopost",
    version: "1.1.0",  // Improved version
    hasPermission: 0,
    usePrefix: false,
    aliases: ["bp"],
    description: "Autoposts enhanced Bingo Plus results every 3 minutes.",
    usages: "bingopost on/off",
    credits: "Improved Bingo Plus autopost module",
    cooldowns: 10,
    dependencies: { "fs": "", "path": "" }
};

// State file
const stateFile = path.join(__dirname, "bingopost_state.json");

// Global state
let isBingoPostOn = false;
let bingoInterval = null;
let countdownNumber = 0;

// Load state
function loadState() {
    if (fs.existsSync(stateFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            isBingoPostOn = data.isOn || false;
            countdownNumber = data.countdown || 0;
            if (isBingoPostOn) startBingoPost();
        } catch (err) {
            console.error("Error loading bingo state:", err);
        }
    }
}

// Save state
function saveState() {
    try {
        fs.writeFileSync(stateFile, JSON.stringify({ isOn: isBingoPostOn, countdown: countdownNumber }, null, 2));
    } catch (err) {
        console.error("Error saving bingo state:", err);
    }
}

// Generate random Bingo call
function generateBingoCall() {
    const columns = Object.keys(bingoColumns);
    const column = columns[Math.floor(Math.random() * columns.length)];
    const { min, max } = bingoColumns[column];
    const number = Math.floor(Math.random() * (max - min + 1)) + min;
    return `${column}-${number}`;
}

// Start bingo autopost every 3 minutes
function startBingoPost(api, threadID) {
    if (bingoInterval) clearInterval(bingoInterval);
    bingoInterval = setInterval(async () => {
        try {
            // Generate 8-12 random Bingo calls
            const numCalls = Math.floor(Math.random() * 5) + 8;  // 8 to 12 calls
            const calls = [];
            for (let i = 0; i < numCalls; i++) {
                calls.push(generateBingoCall());
            }

            // Random jackpot
            const jackpot = Math.floor(Math.random() * 50000) + 10000;  // 10k to 60k

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

            // Enhanced message
            const message = `🎉 𝗕𝗶𝗻𝗴𝗼 𝗣𝗹𝘂𝘀 𝗗𝗿𝗮𝘄! 🎉\n\n` +
                            `🎲 Called Numbers:\n${calls.join(" | ")}\n\n` +
                            `💰 Current Jackpot: ₱${jackpot.toLocaleString()}\n\n` +
                            `🃏 Check your Bingo cards! Reply with "BINGO" if you win.\n` +
                            `Next draw in 3 minutes! ⏰`;

            const fullMessage = `🕒 ${phTime} (Philippine Time)\n\n⏳ Countdown: ${countdownNumber}\n\n${message}`;

            const postData = { body: fullMessage };
            const url = await api.createPost(postData);
            console.log(`Bingo autopost: ${url || 'No URL'}`);

            countdownNumber++;
            saveState();
        } catch (error) {
            console.error("Bingo autopost error:", error.message);
        }
    }, 3 * 60 * 1000);  // 3 minutes
}

// Stop bingo autopost
function stopBingoPost() {
    if (bingoInterval) {
        clearInterval(bingoInterval);
        bingoInterval = null;
    }
}

// Main function
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const command = args[0]?.toLowerCase();

    if (command === 'on') {
        if (isBingoPostOn) {
            return api.sendMessage("✅ Bingo autopost is already enabled.", threadID, messageID);
        }
        isBingoPostOn = true;
        saveState();
        startBingoPost(api, threadID);
        api.sendMessage("✅ Bingo autopost enabled! Posting enhanced results every 3 minutes.", threadID, messageID);
    } else if (command === 'off') {
        if (!isBingoPostOn) {
            return api.sendMessage("❌ Bingo autopost is already disabled.", threadID, messageID);
        }
        isBingoPostOn = false;
        saveState();
        stopBingoPost();
        api.sendMessage("❌ Bingo autopost disabled.", threadID, messageID);
    } else {
        api.sendMessage("❗ Usage: bingopost on/off", threadID, messageID);
    }
};

// Load on start
loadState();
