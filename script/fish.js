const { getUser, updateUser } = require("../utils/economy");

// Define possible fishes with their values (credits earned)
const fishes = [
  { name: "🐟 Tilapia", value: 200 },
  { name: "🐠 Bangus", value: 350 },
  { name: "🐡 Pufferfish", value: 500 },
  { name: "🐬 Dolphin (rare!)", value: 1500 },
  { name: "🦀 Crab", value: 300 },
  { name: "🦞 Lobster (rare!)", value: 2000 },
  { name: "🐙 Octopus", value: 800 },
  { name: "❌ Nothing caught", value: 0 }
];

const COOLDOWN_SECONDS = 60; // 1 min cooldown
const cooldowns = new Map();

module.exports.config = {
  name: "fish",
  description: "Go fishing and earn credits based on the fish you catch!",
  usages: "fish",
  cooldowns: COOLDOWN_SECONDS
};

module.exports.run = async function({ api, event }) {
  const { senderID, threadID } = event;
  const user = getUser(senderID);

  const now = Date.now();
  const lastFish = cooldowns.get(senderID) || 0;
  const diff = (now - lastFish) / 1000;

  if (diff < COOLDOWN_SECONDS) {
    const wait = Math.ceil(COOLDOWN_SECONDS - diff);
    return api.sendMessage(`⏳ Please wait ${wait} seconds before fishing again.`, threadID);
  }

  // Randomly pick a fish based on weighted chance
  // We can assign probabilities by repeating items or using weighted random
  // For simplicity, we'll do equal chance here but can be adjusted

  const catchIndex = Math.floor(Math.random() * fishes.length);
  const caughtFish = fishes[catchIndex];

  let message = "";

  if (caughtFish.value === 0) {
    message = `🎣 You went fishing but caught nothing this time. Better luck next time!`;
  } else {
    user.wallet += caughtFish.value;
    updateUser(senderID, user);
    message = `🎣 You caught a ${caughtFish.name} worth ₱${caughtFish.value} credits!\n💼 Wallet: ₱${user.wallet}`;
  }

  cooldowns.set(senderID, now);

  return api.sendMessage(message, threadID);
};
