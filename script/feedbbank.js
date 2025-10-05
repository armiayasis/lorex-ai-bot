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

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: 'report',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Report issues to the admin (61580959514473)',
  usages: 'ultra report [issue description]',
  cooldowns: 5,
};

module.exports.run = async function({ api, event, args }) {
  const reports = loadJSON(reportsPath);
  const uid = event.senderID;

  const sub = args[0] ? args[0].toLowerCase() : '';
  if (sub !== 'report') {
    return api.sendMessage('Usage: ultra report [describe your issue]', event.threadID, event.messageID);
  }

  const issue = args.slice(1).join(' ').trim();
  if (!issue) {
    return api.sendMessage('❌ Please provide a description of the issue to report.', event.threadID, event.messageID);
  }

  const now = Date.now();

  const reportObj = {
    reporter: uid,
    issue,
    timestamp: now,
  };

  reports.push(reportObj);
  saveJSON(reportsPath, reports);

  // Notify user
  api.sendMessage('✅ Your report has been sent to the admin. Thank you for helping improve the system!', event.threadID, event.messageID);

  // Notify admin
  const reportMsg =
    `🚨 New Issue Report 🚨\n\n` +
    `From: ${uid}\n` +
    `Time: ${new Date(now).toLocaleString()}\n` +
    `Issue:\n${issue}`;

  return api.sendMessage(reportMsg, ADMIN_UID);
};
