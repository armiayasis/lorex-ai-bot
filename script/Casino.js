const fs = require("fs");
const path = require("path");

// Sample games
const casinoGames = [
    "🎰 Slot Machine",
    "🎲 Roulette",
    "🃏 Blackjack",
    "🎮 Poker",
    "🎯 Lucky 7",
    "🤑 Mega Wheel"
];

// Sample first/last names
const firstNames = ["Jake", "Lara", "Chris", "Mika", "Sam", "Alex", "Jamie", "Taylor"];
const lastNames = ["Santos", "Reyes", "Cruz", "Gomez", "Lopez", "Torres", "Garcia", "Castro"];

// Module configuration
module.exports.config = {
    name: "cwinpost",
    version: "1.0.0",
    hasPermission: 0,
    usePrefix: false,
    aliases: ["casino", "cw"],
    description: "Autoposts random casino winners every 3 minutes.",
    usages: "cwinpost on/off",
    credits: "Casino Winner Autopost by ChatGPT",
    cooldowns: 10,
    dependencies: { "fs": "", "path": "" }
};

// State file
const stateFile = path.join(__dirname, "cwinpost_state.json");

// Global state
let isCasinoPostOn = false;
let casinoInterval = null;
let winCount = 0;

// Load state
function loadState() {
    if (fs.existsSync(stateFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(stateFile, "utf8"));
            isCasinoPostOn = data.isOn || false;
            winCount = data.winCount || 0;
            if (isCasinoPostOn) startCasinoPost();
        } catch (err) {
            console.error("Error loading casino state:", err);
        }
    }
}

// Save state
function saveState() {
    try {
        fs.writeFileSync(stateFile, JSON.stringify({ isOn: isCasinoPostOn, winCount }, null, 2));
    } catch (err) {
        console.error("Error saving casino state:", err);
    }
}

// Generate random winner
function generateWinner() {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const game = casinoGames[Math.floor(Math.random() * casinoGames.length)];
    const amount = Math.floor(Math.random() * 90000) + 10000; // ₱10k to ₱100k
    return {
        name: `${first} ${last}`,
        game,
        amount
    };
}

// Start casino winner autopost
function startCasinoPost(api, threadID) {
    if (casinoInterval) clearInterval(casinoInterval);
    casinoInterval = setInterval(async () => {
        try {
            const winner = generateWinner();

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

            // Message format
            const message = `🎉 𝗖𝗔𝗦𝗜𝗡𝗢 𝗪𝗜𝗡𝗡𝗘𝗥 𝗔𝗟𝗘𝗥𝗧! 🎉\n\n` +
                `👤 Player: ${winner.name}\n` +
                `🎮 Game: ${winner.game}\n` +
                `💸 Winnings: ₱${winner.amount.toLocaleString()}\n\n` +
                `🕒 ${phTime} (Philippine Time)\n` +
                `🏆 Congratulations! Another lucky winner!\n` +
                `🎲 Keep playing and you might be next!\n\n` +
                `#CasinoWinner #BigWin #Jackpot`;

            const postData = { body: message };
            const url = await api.createPost(postData);
            console.log(`Casino winner autopost: ${url || 'No URL'}`);

            winCount++;
            saveState();
        } catch (error) {
            console.error("Casino autopost error:", error);
        }
    }, 3 * 60 * 1000); // 3 minutes
}

// Stop autopost
function stopCasinoPost() {
    if (casinoInterval) {
        clearInterval(casinoInterval);
        casinoInterval = null;
    }
}

// Command handler
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const command = args[0]?.toLowerCase();

    if (command === "on") {
        if (isCasinoPostOn) {
            return api.sendMessage("✅ Casino autopost is already enabled.", threadID, messageID);
        }
        isCasinoPostOn = true;
        saveState();
        startCasinoPost(api, threadID);
        api.sendMessage("✅ Casino autopost enabled! Posting random winners every 3 minutes.", threadID, messageID);
    } else if (command === "off") {
        if (!isCasinoPostOn) {
            return api.sendMessage("❌ Casino autopost is already disabled.", threadID, messageID);
        }
        isCasinoPostOn = false;
        saveState();
        stopCasinoPost();
        api.sendMessage("❌ Casino autopost disabled.", threadID, messageID);
    } else {
        api.sendMessage("❗ Usage: cwinpost on/off", threadID, messageID);
    }
};

// Load state on start
loadState();
