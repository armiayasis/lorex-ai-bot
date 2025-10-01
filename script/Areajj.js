const axios = require('axios');

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

function formatAriaPrompt(userQuestion) {
  return `
Please answer the following question in a structured format:

1. Quick explanation  
2. Details and examples  
3. Challenges or limitations  
4. Summary or conclusion  

Use a friendly but professional tone.  
Question: ${userQuestion}
`.trim();
}

const responseOpeners = [
  "✨ 𝗔𝗥𝗜𝗔 𝗔𝗜 𝗥𝗘𝗦𝗣𝗢𝗡𝗦𝗘"
];

module.exports.config = {
  name: 'aria',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['ariaai', 'aria'],
  description: "Ask Aria AI in English, structured format",
  usages: "aria [your question]",
  credits: 'You',
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

module.exports.run = async function({ api, event, args }) {
  const input = args.join(' ');
  const uid = event.senderID;
  const threadID = event.threadID;

  if (!input) {
    return api.sendMessage("❌ Please provide a question to ask Aria AI.\n\nExample: aria What is quantum computing?", threadID);
  }

  const tempMsg = await sendTemp(api, threadID, "⏳ Contacting Aria AI...");

  const wrappedPrompt = formatAriaPrompt(input);

  try {
    const { data } = await axios.get('https://daikyu-api.up.railway.app/api/aria-ai', {
      params: {
        query: wrappedPrompt,
        uid: uid
      },
      timeout: 10000
    });

    if (!data || typeof data.response !== 'string') {
      return api.editMessage("❌ Aria AI did not return a response. Please try again later.", tempMsg.messageID, threadID);
    }

    const formatted = data.response
      .replace(/\*\*(.*?)\*\*/g, (_, t) => convertToBold(t)) // bold markdown
      .replace(/##(.*?)##/g, (_, t) => convertToBold(t))     // bold headers
      .replace(/###\s*/g, '')                                 // strip markdown headers
      .replace(/\n{3,}/g, '\n\n')                             // normalize line spacing
      .trim();

    const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];
    return api.editMessage(`${opener}\n\n${formatted}`, tempMsg.messageID, threadID);

  } catch (err) {
    console.error("Aria AI Error:", err);
    let errMsg = "⚠️ Error while retrieving response from Aria AI.";
    if (err.code === 'ECONNABORTED') {
      errMsg = "⚠️ Aria AI took too long to respond.";
    }
    return api.editMessage(errMsg, tempMsg.messageID, threadID);
  }
};
