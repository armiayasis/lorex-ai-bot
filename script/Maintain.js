const ADMIN_UID = "61575137262643";

let maintenanceMode = false;
let maintenanceEndTime = null;

function toggleMaintenance(on) {
  maintenanceMode = on;
  if (on) {
    maintenanceEndTime = Date.now() + 10 * 60 * 60 * 1000; // 10 hours
  } else {
    maintenanceEndTime = null;
  }
}

function getMaintenanceTimeLeft() {
  if (!maintenanceEndTime) return 0;
  const diff = maintenanceEndTime - Date.now();
  return diff > 0 ? diff : 0;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

module.exports.config = {
  name: "messandra3",
  version: "1.2.2",
  hasPermission: 0,
  usePrefix: false,
  aliases: ["messandra", "lorex", "maintenance", "reset", "bannedlist", "recover", "recoverall", "feedback"],
  description: "Messandra AI with maintenance mode and admin commands",
  usages: "ai [prompt]\nmaintenance on/off\nreset\nbannedlist\nrecover [uid]\nrecoverall\nfeedback [message]",
  credits: "LorexAi",
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;
  const input = args.join(" ").trim();
  const cmd = event.commandName?.toLowerCase();

  // Handle maintenance toggle
  if (cmd === "maintenance" && uid === ADMIN_UID) {
    if (args[0] === "on") {
      toggleMaintenance(true);
      return api.sendMessage("⚙️ Messandra AI is now under maintenance for 10 hours.", threadID, messageID);
    }
    if (args[0] === "off") {
      toggleMaintenance(false);
      return api.sendMessage("✅ Messandra AI maintenance mode turned OFF.", threadID, messageID);
    }
    return api.sendMessage("❓ Usage: messandra maintenance on/off", threadID, messageID);
  }

  // Block commands during maintenance if not admin
  if (maintenanceMode && uid !== ADMIN_UID) {
    const timeLeft = formatTime(getMaintenanceTimeLeft());
    return api.sendMessage(`⚠️ Messandra AI is currently under maintenance.\nPlease try again after: ${timeLeft}`, threadID, messageID);
  }

  // Your existing command handling logic here (ai text/image etc.)
  if (!input) {
    return api.sendMessage("❌ Please provide a prompt.", threadID, messageID);
  }

  // Example placeholder for actual AI processing (replace with your real logic)
  return api.sendMessage(`Processing your request: "${input}"`, threadID, messageID);
};
