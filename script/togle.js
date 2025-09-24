const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '..', 'settings.json');

module.exports.config = {
  name: 'dailyclaimtoggle',
  version: '1.0.1',
  hasPermission: 0, // All users can use this now
  description: 'Toggle daily claim system ON or OFF (all users)',
  usages: 'dailyclaimtoggle <on|off>',
  cooldowns: 0 // No cooldown
};

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;

  if (!args[0] || !['on', 'off'].includes(args[0].toLowerCase())) {
    return api.sendMessage('❗ Usage: dailyclaimtoggle <on|off>', threadID, event.messageID);
  }

  try {
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }

    settings.dailyClaimEnabled = args[0].toLowerCase() === 'on';

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    api.sendMessage(`✅ Daily claim bonus is now ${settings.dailyClaimEnabled ? 'ENABLED' : 'DISABLED'}.`, threadID, event.messageID);

  } catch (err) {
    console.error('Error in dailyclaimtoggle command:', err);
    api.sendMessage('❌ Something went wrong.', threadID, event.messageID);
  }
};
