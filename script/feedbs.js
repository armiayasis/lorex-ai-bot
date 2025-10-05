const fs = require('fs');
const path = require('path');

const reportsPath = path.join(__dirname, '..', 'reports.json');
const ADMIN_UID = '61580959514473';

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

module.exports.config = {
  name: 'feedback',
  version: '1.0.0',
  hasPermission: 2,  // admin only
  usePrefix: true,
  description: 'View all reported issues (admin only)',
  usages: 'ultra feedback',
  cooldowns: 5,
};

module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  if (uid !== ADMIN_UID) {
    return api.sendMessage('❌ You do not have permission to use this command.', event.threadID, event.messageID);
  }

  const reports = loadJSON(reportsPath);

  if (reports.length === 0) {
    return api.sendMessage('ℹ️ No reports found.', event.threadID, event.messageID);
  }

  let msg = '📋 All Reported Issues:\n\n';

  reports.forEach((report, i) => {
    msg += `${i + 1}. From: ${report.reporter}\n` +
           `Time: ${new Date(report.timestamp).toLocaleString()}\n` +
           `Issue: ${report.issue}\n\n`;
  });

  return api.sendMessage(msg.trim(), event.threadID, event.messageID);
};
