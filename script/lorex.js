const axios = require('axios');

const bannedWords = [
  "fuck", "shit", "bitch", "asshole", "damn", "crap", "dick", "piss",
  "putang ina", "pakyu", "gago", "tangina", "joder", "tarantado", "ulol",
  " gago", "tanga", "paasa", "tanginamo", "gaga", "ulol", "bobo", "leche",
];

function containsBannedWord(text) {
  const lowerText = text.toLowerCase();
  return bannedWords.some(word => lowerText.includes(word));
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

const responseOpeners = [
  "𝗣𝗲𝗿𝘀𝗼𝗻𝗮𝗹 𝗔𝘀𝘀𝗶𝘀𝘁𝗮𝗻𝘁"
];

module.exports.config = {
  name: 'ai',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['lorexai', 'lorex', 'ai'],
  description: "AI command powered by Lorex AI Personal",
  usages: "lorexai [prompt]",
  credits: 'LorexAi',
  cooldowns: 0
};

async function sendTemp(api, threadID, message) {
  return new Promise((resolve, reject) => {
    api.sendMessage(message, threadID, (err, info) => {
      if (err) return reject(err);
      resolve(info);
    });
  });
}

async function callLorexPersonalAPI(prompt, uid) {
  try {
    const { data } = await axios.get('https://daikyu-api.up.railway.app/api/lorex-ai-personal', {
      params: { ask: prompt, uid }
    });
    return data?.response || null;
  } catch (error) {
    console.error('Error calling Lorex AI Personal:', error.message);
    return null;
  }
}

module.exports.run = async function({ api, event, args }) {
  const input = args.join(' ').trim();
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;

  if (!input) {
    return api.sendMessage("Please type your question or command.", threadID, messageID);
  }

  if (containsBannedWord(input)) {
    return api.sendMessage("⚠️ Your prompt contains inappropriate language. Please rephrase and try again.", threadID, messageID);
  }

  const tempMsg = await sendTemp(api, threadID, "⏳𝗟𝗼𝗿𝗲𝘅-𝗣𝗲𝗿𝘀𝗼𝗻𝗮𝗹 𝗚𝗲𝗻𝗲𝗿𝗮𝘁𝗶𝗻𝗴...");

  const response = await callLorexPersonalAPI(input, uid);

  if (!response) {
    return api.editMessage("⚠️ There was a problem retrieving the answer. Please try again later.", tempMsg.messageID, threadID);
  }

  const formatted = response
    .replace(/\*\*(.*?)\*\*/g, (_, t) => convertToBold(t))
    .replace(/##(.*?)##/g, (_, t) => convertToBold(t))
    .replace(/###\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];
  return api.editMessage(`${opener}\n\n${formatted}`, tempMsg.messageID, threadID);
};
