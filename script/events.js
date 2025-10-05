const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '..', 'users.json');
const eventsPath = path.join(__dirname, '..', 'events.json');

const DAILY_REWARD = 5000;
const REWARD_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_EVENTS_LIST = 10;

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function addNotification(users, uid, message) {
  if (!users[uid]) return;
  if (!users[uid].notifications) users[uid].notifications = [];
  users[uid].notifications.push(message);
}

function addEvent(events, eventObj) {
  if (!Array.isArray(events.list)) events.list = [];
  events.list.push(eventObj);
  // Keep only last MAX_EVENTS_LIST events
  if (events.list.length > MAX_EVENTS_LIST) {
    events.list = events.list.slice(events.list.length - MAX_EVENTS_LIST);
  }
}

module.exports.config = {
  name: 'events',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  description: 'Ultra system event handler: join events, daily rewards, notifications, recent events list',
  usages: 'N/A (event-driven; no direct commands)',
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const users = loadJSON(usersPath);
  const events = loadJSON(eventsPath);
  const uid = event?.senderID;
  if (!uid) return;

  const now = Date.now();

  // 1. Auto-register user on first join
  if (!users[uid]) {
    users[uid] = {
      points: 0,
      dollars: 0,
      postsCount: 0,
      reactionsCount: 0,
      commentsCount: 0,
      verified: false,
      notifications: [],
      lastDailyReward: 0,
      lastActive: 0,
    };

    // Add join event
    addEvent(events, {
      type: 'join',
      userID: uid,
      timestamp: now,
      description: `User ${uid} joined.`,
    });

    saveJSON(usersPath, users);
    saveJSON(eventsPath, events);
    return;
  }

  // 2. Update last active timestamp
  users[uid].lastActive = now;

  // 3. Daily reward system
  if (!users[uid].lastDailyReward || now - users[uid].lastDailyReward >= REWARD_INTERVAL) {
    users[uid].dollars += DAILY_REWARD;
    users[uid].lastDailyReward = now;
    addNotification(users, uid, `🎉 You received your daily reward of ₱${DAILY_REWARD.toLocaleString()}!`);

    // Add daily reward event
    addEvent(events, {
      type: 'daily_reward',
      userID: uid,
      timestamp: now,
      description: `User ${uid} claimed daily reward.`,
    });
  }

  saveJSON(usersPath, users);
  saveJSON(eventsPath, events);
};

// Extra method to get last 10 events in formatted string for display or logs
module.exports.listEvents = function() {
  const events = loadJSON(eventsPath);
  if (!events.list || events.list.length === 0) return 'No recent events found.';

  let msg = '📜 Last 10 Ultra Events:\n\n';
  for (const ev of events.list) {
    const date = new Date(ev.timestamp).toLocaleString();
    msg += `- [${date}] (${ev.type}) User: ${ev.userID} - ${ev.description}\n`;
  }
  return msg;
};

// Optional daily cleanup method for notifications, event logs pruning
module.exports.maintenance = function() {
  const users = loadJSON(usersPath);
  const events = loadJSON(eventsPath);

  // Prune old notifications per user (max 20)
  for (const uid in users) {
    if (users[uid].notifications && users[uid].notifications.length > 20) {
      users[uid].notifications = users[uid].notifications.slice(-20);
    }
  }

  // Prune old events (keep last MAX_EVENTS_LIST)
  if (events.list && events.list.length > MAX_EVENTS_LIST) {
    events.list = events.list.slice(events.list.length - MAX_EVENTS_LIST);
  }

  saveJSON(usersPath, users);
  saveJSON(eventsPath, events);
};
