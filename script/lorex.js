const axios = require('axios');

// Track per-user message usage
const userUsage = {}; // Format: { [uid]: remainingMessages }
const MAX_USAGE = 300;

const bannedWords = [
  "fuck", "shit", "bitch", "asshole", "damn", "crap", "dick", "piss",
  "putang ina", "pakyu", "gago", "tangina", "joder", "tarantado", "ulol",
  "gago", "tanga", "paasa", "tanginamo", "gaga", "bobo", "leche",
];

function containsBannedWord(text) {
  const lowerText = text.toLowerCase();
  return bannedWords.some(word => {
    const regex = new RegExp(`\\b${word.trim()}\\b`, 'i');
    return regex.test(lowerText);
  });
}

function convertToBold(text) {
  const boldMap = {
    'a': '𝗮','b': '𝗯','c': '𝗰','d': '𝗱','e': '𝗲','f': '𝗳','g': '𝗴','h': '𝗵','i': '𝗶','j': '𝗷',
    'k': '𝗸','l': '𝗹','m': '𝗺','n': '𝗻','o': '𝗼','p': '𝗽','q': '𝗾','r': '𝗿','s': '𝘀','t': '𝘁',
    'u': '𝘂','v': '𝘃','w': '𝘄','x': '𝘅','y': '𝘆','z': '𝘇',
    'A': '𝗔','B': '𝗕','C': '𝗖','D': '𝗗','E': '𝗘','F': '𝗙','G': '𝗚','H': '𝗛','I': '𝗜','J': '𝗝',
    'K': '𝗞','L': '𝗟','M': '𝗠','N': '𝗡','O': '𝗢','P': '𝗣','Q': '𝗤','R': '𝗥','S': '𝗦','T': '𝗧',
    'U': '𝗨','V': '𝗩','W': '𝗪','X': '𝗫','Y': '𝗬','Z': '𝗭',
  };
  return text.split('').map(char => boldMap[char] || char).join('');
}

function getCurrentPHTime() {
  const options = { timeZone: 'Asia/Manila', hour12: true, hour: 'numeric', minute: 'numeric', second: 'numeric' };
  return new Date().toLocaleTimeString('en-PH', options);
}

const responseOpener = "𝗣𝗲𝗿𝘀𝗼𝗻𝗮𝗹 𝗔𝘀𝘀𝗶𝘀𝘁𝗮𝗻𝘁";

module.exports.config = {
  name: 'lorexai',
  version: '2.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['ai', 'lorex', 'lorexai'],
  description: "AI command powered by Lorex AI with image analysis",
  usages: "lorexai [prompt]",
  credits: 'LorexAi + You',
  cooldowns: 0
};

// TEMP message sender
async function sendTemp(api, threadID, message) {
  return new Promise((resolve, reject) => {
    api.sendMessage(message, threadID, (err, info) => {
      if (err) return reject(err);
      resolve(info);
    });
  });
}

// Lorex AI API call
async function callLorexPersonalAPI(prompt, uid) {
  try {
    const { data } = await axios.get('https://daikyu-api.up.railway.app/api/lorex-ai', {
      params: { ask: prompt, uid }
    });
    return data?.response || null;
  } catch (error) {
    console.error('Error calling Lorex AI:', error.message);
    return null;
  }
}

// 🧠 Image caption + OCR analyzer
async function analyzeImage(url) {
  try {
    const { data } = await axios.get('https://daikyu-api.up.railway.app/api/image-all', {
      params: { image: url }
    });

    const caption = data?.caption || 'No caption found.';
    const ocr = data?.text || 'No readable text found.';

    return { caption, ocr };
  } catch (err) {
    console.error('Image analysis error:', err.message);
    return null;
  }
}

// MAIN FUNCTION
module.exports.run = async function ({ api, event, args }) {
  const input = args.join(' ').trim();
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;
  const attachments = event.messageReply?.attachments || event.attachments;

  if (!userUsage[uid]) userUsage[uid] = MAX_USAGE;

  if (input.toLowerCase() === "reset") {
    userUsage[uid] = MAX_USAGE;
    return api.sendMessage("✅ Your usage has been reset to 300/300.", threadID, messageID);
  }

  if (!input && attachments.length === 0) {
    return api.sendMessage("❗ Please type your question or send an image.", threadID, messageID);
  }

  if (input && containsBannedWord(input)) {
    return api.sendMessage("⚠️ Your prompt contains inappropriate language. Please rephrase and try again.", threadID, messageID);
  }

  if (userUsage[uid] <= 0) {
    return api.sendMessage("🚫 You have reached your daily usage limit (0/300). Type `reset` to reset your usage.", threadID, messageID);
  }

  userUsage[uid]--;

  const tempMsg = await sendTemp(api, threadID, "⏳ 𝗣𝗲𝗿𝘀𝗼𝗻𝗮𝗹 𝗔𝘀𝘀𝗶𝘀𝘁𝗮𝗻𝘁 𝗶𝘀 𝗽𝗿𝗼𝗰𝗲𝘀𝘀𝗶𝗻𝗴...");

  let finalPrompt = input;

  // If image exists, analyze it
  if (attachments.length > 0 && attachments[0]?.type === 'photo') {
    const imageUrl = attachments[0].url;
    const analysis = await analyzeImage(imageUrl);

    if (!analysis) {
      return api.editMessage("⚠️ Failed to analyze image. Please try again later.", tempMsg.messageID, threadID);
    }

    const { caption, ocr } = analysis;

    finalPrompt = input
      ? `${input}\n\nImage description: ${caption}\nExtracted text: ${ocr}`
      : `Describe and interpret this image.\n\nImage description: ${caption}\nExtracted text: ${ocr}`;
  }

  const response = await callLorexPersonalAPI(finalPrompt, uid);

  if (!response) {
    return api.editMessage("⚠️ There was a problem retrieving the answer. Please try again later.", tempMsg.messageID, threadID);
  }

  const formatted = response
    .replace(/\*\*(.*?)\*\*/g, (_, t) => convertToBold(t))
    .replace(/##(.*?)##/g, (_, t) => convertToBold(t))
    .replace(/###\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const time = getCurrentPHTime();
  const usage = `${userUsage[uid]}/${MAX_USAGE}`;

  const finalMessage = `${responseOpener}\n🕒 ${time} | 🟢 ${usage} messages remaining\n\n${formatted}`;

  return api.editMessage(finalMessage, tempMsg.messageID, threadID);
};
