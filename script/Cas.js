
const fs = require("fs");
const path = require("path");

// Sample AI notes for lotto and bingo
const lottoNotes = [
    "Cassandra Agent AI predicts: This draw favors high numbers! Stay lucky! 🍀",
    "AI Insight: Watch for patterns in recent draws. Your win is near! 🎯",
    "Cassandra says: Balance your picks—mix evens and odds for best odds. 🤖",
    "Agent AI Note: Lotto is luck, but strategy helps. Play smart! 💡",
    "Cassandra Forecast: Low numbers trending. Adjust your ticket! 📈"
];

const bingoNotes = [
    "Cassandra Agent AI: Bingo energy is high! Mark your cards fast! 🎲",
    "AI Tip: Focus on corners for quick wins. You've got this! 🃏",
    "Cassandra Insight: Random calls incoming—stay alert! 🚨",
    "Agent AI Message: Bingo Plus jackpot vibes! Check often! 💰",
    "Cassandra Note: Patterns emerge in chaos. Trust the process! 🌟"
];

// Lotto games
const lottoGames = {
    "6/42": () => {
        const numbers = [];
        while (numbers.length < 6) {
            const num = Math.floor(Math.random() * 42) + 1;
            if (!numbers.includes(num)) numbers.push(num);
        }
        return numbers.sort((a, b) => a - b).join(" - ");
    },
    "6/45": () => {
        const numbers = [];
        while (numbers.length < 6) {
            const num = Math.floor(Math.random() * 45) + 1;
            if (!numbers.includes(num)) numbers.push(num);
        }
        return numbers.sort((a, b) => a - b).join(" - ");
    }
};

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
    name: "cassandra",
    version: "1.0.0",
    hasPermission: 0,
    usePrefix: false,
    aliases: ["cass"],
    description: "Autoposts Cassandra Agent AI notes for Lotto and Bingo Plus every 3 minutes.",
    usages: "cassandra on/off",
    credits: "Cassandra Agent AI autopost module",
    cooldowns: 10,
    dependencies: { "fs": "", "path": "" }
};

// State file
const stateFile = path.join(__dirname, "cassandra_state.json");

// Global state
let isCassandraOn = false;
let cassandraInterval = null;
let countdownNumber = 0;
let isLottoTurn = true;  // Alternate between lotto and bingo

// Load state
function loadState() {
    if (fs.existsSync(stateFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            isCassandraOn = data.isOn || false;
            countdownNumber = data.countdown || 0;
            isLottoTurn = data.isLottoTurn !== undefined ? data.isLottoTurn : true;
            if (isCassandraOn) startCassandraPost();
        } catch (err) {
            console.error("Error loading cassandra state:", err);
        }
    }
}

// Save state
function saveState() {
    try {
        fs.writeFileSync(stateFile, JSON.stringify({ isOn: isCassandraOn, countdown: countdownNumber, isLottoTurn }, null, 2));
    } catch (err) {
        console.error("Error saving cassandra state:", err);
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

// Start cassandra autopost every 3 minutes
function startCassandraPost(api, threadID) {
    if (cassandraInterval) clearInterval(cassandraInterval);
    cassandraInterval = setInterval(async () => {
        try {
            let result, note, type;
            if (isLottoTurn) {
                const gameNames = Object.keys(lottoGames);
                const randomGame = gameNames[Math.floor(Math.random() * gameNames.length)];
                result = lottoGames[randomGame]();
                note = lottoNotes[Math.floor(Math.random() * lottoNotes.length)];
                type = `🎰 Lotto Result (${randomGame}):\n${result}`;
            } else {
                const calls = [];
                for (let i = 0; i < 10; i++) {
                    calls.push(generateBingoCall());
                }
                result = calls.join(" | ");
                note = bingoNotes[Math.floor(Math.random() * bingoNotes.length)];
                type = `🎲 Bingo Plus Calls:\n${result}`;
            }

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

            // Message
            const message = `🤖 𝗖𝗮𝘀𝘀𝗮𝗻𝗱𝗿𝗮 𝗔𝗴𝗲𝗻𝘁 𝗔𝗜 𝗡𝗼𝘁𝗲𝘀 🤖\n\n${type}\n\n💬 ${note}`;
            const fullMessage = `🕒 ${phTime} (Philippine Time)\n\n⏳ Countdown: ${countdownNumber}\n\n${message}`;

            const postData = { body: fullMessage };
            const url = await api.createPost(postData);
            console.log(`Cassandra autopost: ${url || 'No URL'}`);

            isLottoTurn = !isLottoTurn;  // Alternate
            countdownNumber++;
            saveState();
        } catch (error) {
            console.error("Cassandra autopost error:", error.message);
        }
    }, 3 * 60 * 1000);  // 3 minutes
}

// Stop cassandra autopost
function stopCassandraPost() {
    if (cassandraInterval) {
        clearInterval(cassandraInterval);
        cassandraInterval = null;
    }
}

// Main function
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const command = args[0]?.toLowerCase();

    if (command === 'on') {
        if (isCassandraOn) {
            return api.sendMessage("✅ Cassandra autopost is already enabled.", threadID, messageID);
        }
        isCassandraOn = true;
        saveState();
        startCassandraPost(api, threadID);
        api.sendMessage("✅ Cassandra autopost enabled! Posting AI notes for Lotto and Bingo every 3 minutes.", threadID, messageID);
    } else if (command === 'off') {
        if (!isCassandraOn) {
            return api.sendMessage("❌ Cassandra autopost is already disabled.", threadID, messageID);
        }
        isCassandraOn = false;
        saveState();
        stopCassandraPost();
        api.sendMessage("❌ Cassandra autopost disabled.", threadID, messageID);
    } else {
        api.sendMessage("❗ Usage: cassandra on/off", threadID, messageID);
    }
};

// Load on start
loadState();
