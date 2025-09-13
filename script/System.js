
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");  // For ping and restart

// Track start time for uptime
const startTime = Date.now();

// Module configuration
module.exports.config = {
    name: "system",
    version: "1.3.2",  // Updated
    hasPermission: 0,
    usePrefix: false,
    aliases: ["sys"],
    description: "Autoposts System status with admin panel.",
    usages: "system on/off/restart/reset",
    credits: "System status autopost module",
    cooldowns: 10,
    dependencies: { "fs": "", "path": "", "os": "", "child_process": "" }
};

// State file
const stateFile = path.join(__dirname, "system_state.json");

// Global state
let isSystemOn = false;
let systemInterval = null;
let countdownNumber = 0;

// Load state
function loadState() {
    if (fs.existsSync(stateFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            isSystemOn = data.isOn || false;
            countdownNumber = data.countdown || 0;
            if (isSystemOn) startSystemPost();
        } catch (err) {
            console.error("Error loading system state:", err);
        }
    }
}

// Save state
function saveState() {
    try {
        fs.writeFileSync(stateFile, JSON.stringify({ isOn: isSystemOn, countdown: countdownNumber }, null, 2));
    } catch (err) {
        console.error("Error saving system state:", err);
    }
}

// Get uptime
function getUptime() {
    const uptimeMs = Date.now() - startTime;
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

// Get system stats
function getSystemStats() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = ((usedMem / totalMem) * 100).toFixed(2);
    const cpuUsage = os.loadavg()[0].toFixed(2);  // 1-minute load average
    return { memUsage, cpuUsage };
}

// Calculate score
function calculateScore(uptimeHours, memUsage, cpuUsage) {
    let score = 50;  // Base
    score += uptimeHours * 2;  // Bonus for uptime
    score -= memUsage * 0.5;  // Penalty for high memory
    score -= cpuUsage * 5;  // Penalty for high CPU
    return Math.max(0, Math.min(100, score)).toFixed(0);
}

// Get ping and network status
function getNetworkStats() {
    return new Promise((resolve) => {
        exec("ping -c 4 google.com", (error, stdout, stderr) => {
            let ping = "N/A";
            let status = "Unknown";
            if (!error && stdout) {
                const match = stdout.match(/time=([0-9.]+) ms/);
                if (match) {
                    ping = parseFloat(match[1]).toFixed(0) + "ms";
                    const pingNum = parseFloat(match[1]);
                    status = pingNum < 100 ? "Fast" : pingNum < 500 ? "Slow" : "Very Slow";
                }
            }
            const cignalStatus = "Active";  // Simulated Cignal status
            resolve({ ping, status, cignalStatus });
        });
    });
}

// Restart server (for role 2)
function restartServer() {
    return new Promise((resolve) => {
        exec("pm2 restart all", (error, stdout, stderr) => {  // Assuming PM2 for process management
            if (error) {
                console.error("Restart error:", error);
                resolve("Failed to restart server.");
            } else {
                resolve("Server restarting...");
            }
        });
    });
}

// Start system autopost every 30 minutes
function startSystemPost(api, threadID) {
    if (systemInterval) clearInterval(systemInterval);
    systemInterval = setInterval(async () => {
        try {
            const uptime = getUptime();
            const stats = getSystemStats();
            const network = await getNetworkStats();
            const uptimeHours = parseInt(uptime.split('h')[0]);
            const score = calculateScore(uptimeHours, parseFloat(stats.memUsage), parseFloat(stats.cpuUsage));

            // Get group chat count
            let groupCount = 0;
            try {
                const threadList = await api.getThreadList(100, null, ['GROUP']);  // Fetch up to 100 groups
                groupCount = threadList.filter(t => t.isGroup).length;
            } catch (error) {
                console.error("Error fetching group count:", error.message);
                groupCount = "Unable to fetch";
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
            const message = `🤖 𝗦𝘆𝘀𝘁𝗲𝗺 𝗦𝘁𝗮𝘁𝘂𝘀 🤖\n\n` +
                            `⏱️ Uptime: ${uptime}\n` +
                            `💾 Memory Usage: ${stats.memUsage}%\n` +
                            `⚙️ CPU Load: ${stats.cpuUsage}%\n` +
                            `📊 Performance Score: ${score}/100\n` +
                            `👥 Group Chats: ${groupCount}\n` +
                            `🌐 Cignal Status: ${network.cignalStatus}\n` +
                            `📡 Ping: ${network.ping} (${network.status})\n\n` +
                            `🔧 𝗔𝗗𝗠𝗜𝗡 𝗣𝗔𝗡𝗘𝗟 🔧\n` +
                            `𝙏𝙃𝙄𝙎 𝙈𝙀𝙎𝙎𝘼𝙉𝘿𝙍𝘼 𝘿𝙀𝙑𝙀𝙇𝙊𝙋𝙀𝙍 𝙈𝘼𝙉𝙐𝙀𝙇𝙎𝙊𝙉 𝙔𝘼𝙎𝙄𝙎 𝘼𝙂𝙀 15 𝙎𝘾𝙃𝙊𝙊𝙇 𝙃𝙄𝙂𝙃𝙎𝘾𝙃𝙊𝙊𝙇 𝙂𝙍𝘼𝘿𝙀 7\n\n` +
                            `Status: ${score > 70 ? 'Excellent' : score > 50 ? 'Good' : 'Needs Attention'}!\n\n` +
                            `𝙋𝙊𝙒𝙀𝙍𝙀𝘿 𝘽𝙔 𝙇𝙊𝙍𝙀𝙓/𝙎𝘼𝙉𝘿𝙍𝘼`;

            const fullMessage = `🕒 ${phTime} (Philippine Time)\n\n⏳ Countdown: ${countdownNumber}\n\n${message}`;

            const postData = { body: fullMessage };
            const url = await api.createPost(postData);
            console.log(`System autopost: ${url || 'No URL'}`);

            countdownNumber++;
            saveState();
        } catch (error) {
            console.error("System autopost error:", error.message);
        }
    }, 30 * 60 * 1000);  // 30 minutes
}

// Stop system autopost
function stopSystemPost() {
    if (systemInterval) {
        clearInterval(systemInterval);
        systemInterval = null;
    }
}

// Main function
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const command = args[0]?.toLowerCase();

    // Check if user is admin (role 2)
    let isAdmin = false;
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        isAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);
    } catch (error) {
        console.error("Error checking admin:", error);
    }

    if (command === 'on') {
        if (isSystemOn) {
            return api.sendMessage("✅ System autopost is already enabled.", threadID, messageID);
        }
        isSystemOn = true;
        saveState();
        startSystemPost(api, threadID);
        api.sendMessage("✅ System autopost enabled! Posting status every 30 minutes.", threadID, messageID);
    } else if (command === 'off') {
        if (!isSystemOn) {
            return api.sendMessage("❌ System autopost is already disabled.", threadID, messageID);
        }
        isSystemOn = false;
        saveState();
        stopSystemPost();
        api.sendMessage("❌ System autopost disabled.", threadID, messageID);
    } else if (command === 'restart') {
        if (!isAdmin) {
            return api.sendMessage("❌ Only role 2 (admins) can restart the server.", threadID, messageID);
        }
        const result = await restartServer();
        api.sendMessage(`🔄 ${result}`, threadID, messageID);
    } else if (command === 'reset') {
        countdownNumber = 0;
        saveState();
        api.sendMessage("✅ Countdown reset to 0.", threadID, messageID);
    } else {
        api.sendMessage("❗ Usage: system on/off/restart/reset", threadID, messageID);
    }
};

// Load on start
loadState();
