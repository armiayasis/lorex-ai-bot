const fs = require("fs");
const path = require("path");

// Path to player data
const dataFile = path.join(__dirname, "racecar_data.json");

// Load player data
let playerData = {};
if (fs.existsSync(dataFile)) {
    playerData = JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

// Save player data
function saveData() {
    fs.writeFileSync(dataFile, JSON.stringify(playerData, null, 2));
}

// Car shop list
const carShop = [
    { id: "basic", name: "🚗 Basic Runner", price: 0, details: "🟢 Starter car. Reliable but slow." },
    { id: "zoomx", name: "🏎️ Zoom X", price: 200, details: "⚡ Fast compact car with great acceleration." },
    { id: "racer1", name: "🚘 Racer One", price: 350, details: "🏁 Balanced speed and handling." },
    { id: "storm", name: "🌪️ Storm Cruiser", price: 500, details: "💨 Built for stormy speed." },
    { id: "hyperjet", name: "🚀 Hyper Jet", price: 800, details: "🔥 Blazing fast jet engine." },
    { id: "thunder", name: "⚡ Thunderstrike", price: 1200, details: "⚙️ Heavy torque, explosive start." },
    { id: "inferno", name: "🔥 Inferno", price: 1600, details: "🔥 Flame-themed beast racer." },
    { id: "vortex", name: "🌀 Vortex V9", price: 2000, details: "💨 Futuristic wind-shaping body." },
    { id: "phantom", name: "👻 Phantom Shadow", price: 2500, details: "🔇 Stealth car with smooth control." },
    { id: "nova", name: "🌠 Nova Blast", price: 3000, details: "✨ Cosmic car with stellar speed." },
    { id: "beast", name: "🐉 Street Beast", price: 3500, details: "💪 Urban monster feared by racers." },
    { id: "hydra", name: "🐍 Hydra GT", price: 4000, details: "🧬 Multi-engine powerhouse." },
    { id: "titan", name: "🛡️ Titan XR", price: 4500, details: "🚛 Heavy-duty racer, unstoppable." },
    { id: "cyber", name: "🤖 Cyber Strike", price: 5000, details: "🧠 AI-enhanced racing machine." },
    { id: "raptor", name: "🦖 Raptor Z", price: 5500, details: "🦴 Wild beast. Fast, agile, and aggressive." },
    { id: "eclipse", name: "🌑 Eclipse Night", price: 6000, details: "🌌 Dark-themed stealth racer." },
    { id: "omega", name: "♾️ Omega Supreme", price: 6500, details: "🚨 Top-tier performance. No limits." },
    { id: "legend", name: "👑 Legend X", price: 7000, details: "🏆 Elite car for ultimate champions." }
];

// Module config
module.exports.config = {
    name: "racecar",
    version: "1.0.0",
    hasPermission: 0,
    usePrefix: false,
    aliases: ["rcar", "racer"],
    description: "Race game with cars and coins.",
    usages: "racecar help",
    credits: "You",
    cooldowns: 3,
    dependencies: { "fs": "", "path": "" }
};

// Command handler
module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const command = args[0]?.toLowerCase();

    // 📘 HELP COMMAND
    if (command === "help") {
        const helpMsg = 
`🆘 𝗥𝗔𝗖𝗘𝗖𝗔𝗥 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦

🏁 RACE COMMANDS
• racecar start – 🏁 Start a new race
• racecar join – 👥 Join an active race

🛒 SHOP & CARS
• racecar shop – 🛍️ View all available cars
• racecar buy <car_id> – 💸 Buy a car using your coins
• racecar equip <car_id> – 🚘 Equip a car you own

📊 STATS & INFO
• racecar balance – 💰 View your coin balance & current car
• racecar leaderboard – 🏆 Show top 5 players
• racecar help – 📘 Show this help message

💡 TIP: Win races to earn coins and unlock better cars!`;
        return api.sendMessage(helpMsg, threadID, messageID);
    }

    // ❓ IF NO COMMAND
    if (!command) {
        return api.sendMessage("❓ Type `racecar help` to see all available commands.", threadID, messageID);
    }

    // 🛒 VIEW SHOP
    if (command === "shop") {
        let msg = "🛒 CAR SHOP:\n\n";
        for (const car of carShop) {
            msg += `🆔 ${car.id}\n${car.name}\n💰 ${car.price} coins\n📄 ${car.details}\n\n`;
        }
        return api.sendMessage(msg.trim(), threadID, messageID);
    }

    // 💸 BUY CAR
    if (command === "buy") {
        const carId = args[1];
        const car = carShop.find(c => c.id === carId);
        if (!car) return api.sendMessage("❌ Invalid car ID.", threadID, messageID);

        if (!playerData[senderID]) {
            playerData[senderID] = { coins: 500, ownedCars: ["basic"], equippedCar: "basic", wins: 0 };
        }

        if (playerData[senderID].ownedCars.includes(carId)) {
            return api.sendMessage("✅ You already own this car.", threadID, messageID);
        }

        if (playerData[senderID].coins < car.price) {
            return api.sendMessage("💸 Not enough coins to buy this car.", threadID, messageID);
        }

        playerData[senderID].coins -= car.price;
        playerData[senderID].ownedCars.push(carId);
        saveData();
        return api.sendMessage(`✅ Successfully purchased ${car.name}!\nUse it with: racecar equip ${car.id}`, threadID, messageID);
    }

    // 🚘 EQUIP CAR
    if (command === "equip") {
        const carId = args[1];
        const car = carShop.find(c => c.id === carId);
        if (!car) return api.sendMessage("❌ Invalid car ID.", threadID, messageID);

        if (!playerData[senderID]?.ownedCars.includes(carId)) {
            return api.sendMessage("🚫 You don't own this car.", threadID, messageID);
        }

        playerData[senderID].equippedCar = carId;
        saveData();
        return api.sendMessage(`🚘 You equipped ${car.name} successfully!`, threadID, messageID);
    }

    // 💰 BALANCE
    if (command === "balance") {
        const user = playerData[senderID] || { coins: 0, equippedCar: "basic" };
        const car = carShop.find(c => c.id === user.equippedCar) || carShop[0];
        return api.sendMessage(`💰 Coins: ${user.coins}\n🚗 Equipped Car: ${car.name}`, threadID, messageID);
    }

    // 🏆 LEADERBOARD
    if (command === "leaderboard") {
        const top = Object.entries(playerData)
            .sort((a, b) => b[1].coins - a[1].coins)
            .slice(0, 5);

        if (top.length === 0) return api.sendMessage("📉 No players yet.", threadID, messageID);

        let lb = "🏆 TOP 5 RICHEST RACERS:\n\n";
        for (let i = 0; i < top.length; i++) {
            lb += `${i + 1}. ID: ${top[i][0]}\n💰 Coins: ${top[i][1].coins}\n🚗 Car: ${top[i][1].equippedCar}\n\n`;
        }

        return api.sendMessage(lb.trim(), threadID, messageID);
    }

    // ✅ Unknown command
    return api.sendMessage("❌ Invalid command. Type `racecar help` to see options.", threadID, const
