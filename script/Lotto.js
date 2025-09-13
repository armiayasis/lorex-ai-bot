
const fs = require("fs");
const path = require("path");

// Sample lotto games and result generators
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
    },
    "6/49": () => {
        const numbers = [];
        while (numbers.length < 6) {
            const num = Math.floor(Math.random() * 49) + 1;
            if (!numbers.includes(num)) numbers.push(num);
        }
        return numbers.sort((a, b) => a - b).join(" - ");
    },
    "4D": () => Math.floor(1000 + Math.random() * 9000),  // 4-digit number
    "3D": () => Math.floor(100 + Math.random() * 900),   // 3-digit number
    "2D": () => Math.floor(10 + Math.random() * 90)       // 2-digit number
};

// Module configuration
module.exports.config = {
    name: "lottopost",
    version: "1.0.0",
    hasPermission: 0,
    usePrefix: false,
    aliases: ["lp"],
    description: "Autoposts lotto results every 3 minutes.",
    usages: "lottopost on/off",
    credits: "Lotto autopost module",
    cooldowns: 0,
    dependencies: { "fs": "", "path": "" }
};

// State file
const stateFile = path.join(__dirname, "lottopost_state.json");

// Global state
let isLottoPostOn = false;
let lottoInterval = null;
let countdownNumber = 0;

// Load state
function loadState() {
    if (fs.existsSync(stateFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            isLottoPostOn = data.isOn || false;
            countdownNumber = data.countdown || 0;
            if (isLottoPostOn) startLottoPost();
        } catch (err) {
            console.error("Error loading lotto state:", err);
        }
    }
}

// Save state
function saveState() {
    try {
        fs.writeFileSync(stateFile, JSON.stringify({ isOn: isLottoPostOn, countdown: countdownNumber }, null, 2));
    } catch (err) {
        console.error("Error saving lotto state:", err);
    }
}

// Start lotto autopost every 3 minutes
function startLottoPost(api, threadID) {
    if (lottoInterval) clearInterval(lottoInterval);
    lottoInterval = setInterval(async () => {
        try {
            // Generate random lotto results
            const gameNames = Object.keys(lottoGames);
            const randomGame = gameNames[Math.floor(Math.random() * gameNames.length)];
            const result = lottoGames[randomGame]();

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
            const message = `🎰 Lotto Result (${randomGame}):\n${result}\n\nDraw Time: ${phTime}`;
            const fullMessage = `🕒 ${phTime} (Philippine Time)\n\n⏳ Countdown: ${countdownNumber}\n\n${message}`;

            const postData = { body: fullMessage };
            const url = await api.createPost(postData);
            console.log(`Lotto autopost: ${url || 'No URL'}`);

            countdownNumber++;
            saveState();
        } catch (error) {
            console.error("Lotto autopost error:", error.message);
        }
    }, 3 * 60 * 1000);  // 3 minutes
}

// Stop lotto autopost
function stopLottoPost() {
    if (lottoInterval) {
        clearInterval(lottoInterval);
        lottoInterval = null;
    }
}

// Main function
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const command = args[0]?.toLowerCase();

    if (command === 'on') {
        if (isLottoPostOn) {
            return api.sendMessage("✅ Lotto autopost is already enabled.", threadID, messageID);
        }
        isLottoPostOn = true;
        saveState();
        startLottoPost(api, threadID);
        api.sendMessage("✅ Lotto autopost enabled! Posting results every 3 minutes.", threadID, messageID);
    } else if (command === 'off') {
        if (!isLottoPostOn) {
            return api.sendMessage("❌ Lotto autopost is already disabled.", threadID, messageID);
        }
        isLottoPostOn = false;
        saveState();
        stopLottoPost();
        api.sendMessage("❌ Lotto autopost disabled.", threadID, messageID);
    } else {
        api.sendMessage("❗ Usage: lottopost on/off", threadID, messageID);
    }
};

// Load on start
loadState();
