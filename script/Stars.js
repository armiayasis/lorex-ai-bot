module.exports.config = {
  name: 'ratingstar',
  version: '2.0.0',
  hasPermission: 0,
  usePrefix: true,
  aliases: ['rate', 'star', 'report', 'bug', 'feedback'],
  description: "Mag-rate, magbigay feedback, mag-report ng bugs/issues, tingnan stats at users, at manage ratings",
  usages: [
    "ratingstar <1-5> [feedback] - Mag-rate at magbigay feedback",
    "ratingstar stats - Tingnan ang summary ng ratings",
    "ratingstar rules - Basahin ang rules, privacy, terms, at instructions",
    "ratingstar users - (Admin) Tingnan ang listahan ng mga nag-rate",
    "ratingstar report <feedback text> - Mag-send ng feedback report sa admin",
    "ratingstar bug <bug description> - Mag-report ng bug sa admin",
    "ratingstar logs - (Admin) Tingnan ang logs ng actions"
  ].join('\n'),
  cooldowns: 5,
  credits: 'ChatGPT + YourName',
};

// In-memory data stores (ideally use DB or file persistence)
const ratingsData = {};
const logs = [];
const admins = ['1234567890']; // Palitan ng actual admin IDs

function addLog(type, userId, content) {
  const timestamp = new Date().toISOString();
  logs.push({ timestamp, type, userId, content });
}

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;
  const messageID = event.messageID;
  const senderID = event.senderID;

  if (!args[0]) {
    const helpMsg = 
      `📌 **Paano gamitin ang Llama Assistant Rating:**\n\n` +
      `⭐ \`ratingstar <1-5> [feedback]\` — Magbigay ng rating at optional feedback\n` +
      `📊 \`ratingstar stats\` — Tingnan ang kabuuang rating at top users\n` +
      `📜 \`ratingstar rules\` — Basahin ang Rules, Privacy, Terms, at Instructions\n` +
      (admins.includes(senderID) ? `👥 \`ratingstar users\` — Tingnan ang listahan ng mga nag-rate\n` : '') +
      `🛠️ \`ratingstar report <feedback>\` — Magpadala ng feedback report sa admin\n` +
      `🐞 \`ratingstar bug <description>\` — Mag-report ng bug sa admin\n` +
      (admins.includes(senderID) ? `📋 \`ratingstar logs\` — Tingnan ang logs ng mga aksyon\n` : '') +
      `\n🚀 Mag-type ng \`llamaa <iyong mensahe>\` para makipag-chat sa Llama Assistant!`;

    return api.sendMessage(helpMsg, threadID, messageID);
  }

  const cmd = args[0].toLowerCase();

  if (cmd === 'rules') {
    const rulesText = 
      `📜 **LLAMA ASSISTANT RULES & POLICIES** 📜\n\n` +
      `🔹 **Mga Alituntunin:**\n` +
      `• Gamitin ang assistant nang responsable at may respeto sa kapwa.\n` +
      `• Iwasan ang hindi angkop na salita o mensahe.\n` +
      `• Ang assistant ay gabay lamang, hindi kapalit ng propesyonal na payo.\n\n` +

      `🔒 **Privacy Policy:**\n` +
      `• Ligtas ang iyong impormasyon at hindi ibinabahagi sa iba.\n` +
      `• Iwasan ang pagbibigay ng sensitibong data sa chat.\n\n` +

      `📃 **Terms of Service:**\n` +
      `• Ginagamit mo ang assistant sa sariling responsibilidad.\n` +
      `• Hindi kami mananagot sa anumang pinsala o problema.\n` +
      `• Maaring baguhin ang serbisyo anumang oras.\n\n` +

      `🚀 **Paano Gamitin ang Llama Express:**\n` +
      `• I-type ang \`llamaa <iyong mensahe>\` para magtanong o makipag-chat.\n` +
      `• Siguraduhing malinaw ang tanong para sa pinakamahusay na sagot.\n` +
      `• Mag-rate gamit ang \`ratingstar <1-5>\` para makatulong sa pagpapabuti.\n\n` +

      `✨ Salamat sa paggamit ng Llama Assistant! 🦙💬`;

    addLog('rules_view', senderID, 'Nag-view ng rules');
    return api.sendMessage(rulesText, threadID, messageID);
  }

  if (cmd === 'stats') {
    const allRatings = [];
    for (const userId in ratingsData) {
      allRatings.push(...ratingsData[userId].ratings);
    }
    if (allRatings.length === 0) {
      return api.sendMessage("⚠️ **Wala pang ratings na naibigay. Maging una sa pag-rate!**", threadID, messageID);
    }

    const totalRatings = allRatings.length;
    const sum = allRatings.reduce((a, b) => a + b, 0);
    const avg = (sum / totalRatings).toFixed(2);
    const roundedAvg = Math.round(avg);
    const stars = '⭐'.repeat(roundedAvg) + '☆'.repeat(5 - roundedAvg);

    const sortedUsers = Object.entries(ratingsData)
      .sort((a, b) => b[1].totalQuestions - a[1].totalQuestions)
      .slice(0, 3);

    let topUsersText = '';
    if (sortedUsers.length === 0) {
      topUsersText = "Walang datos ng mga user na nagtatanong pa.";
    } else {
      topUsersText = sortedUsers
        .map(([userId, data], idx) => `➤ #${idx + 1} User ID: **${userId}** — *${data.totalQuestions} tanong*`)
        .join('\n');
    }

    const reply = 
      `🌟📊 **Llama Assistant Rating Summary** 📊🌟\n\n` +
      `• **Average Rating:** ${stars} (${avg}/5)\n` +
      `• **Total Ratings:** ${totalRatings}\n\n` +
      `👥 **Top 3 Users na Pinaka-Madalas Magtanong:**\n${topUsersText}`;

    addLog('stats_view', senderID, 'Nag-view ng stats');
    return api.sendMessage(reply, threadID, messageID);
  }

  if (cmd === 'users') {
    if (!admins.includes(senderID)) {
      return api.sendMessage("❌ Hindi ka authorized para gamitin ito.", threadID, messageID);
    }

    if (Object.keys(ratingsData).length === 0) {
      return api.sendMessage("⚠️ Wala pang user ratings na naitala.", threadID, messageID);
    }

    let userList = '👥 **Listahan ng mga Nag-rate:**\n\n';

    for (const [userId, data] of Object.entries(ratingsData)) {
      const avgRating = (data.ratings.reduce((a,b) => a+b, 0) / data.ratings.length).toFixed(2);
      userList += `• User ID: **${userId}**\n` +
                  `  - Average Rating: ${avgRating}/5\n` +
                  `  - Total Ratings: ${data.ratings.length}\n` +
                  `  - Tanong: ${data.totalQuestions}\n` +
                  `  - Feedback:\n`;
      if (data.feedbacks.length === 0) {
        userList += `    • Walang feedback\n\n`;
      } else {
        data.feedbacks.forEach((fb, i) => {
          userList += `    ${i+1}. "${fb}"\n`;
        });
        userList += '\n';
      }
    }

    addLog('users_view', senderID, 'Nag-view ng users list');
    return api.sendMessage(userList, threadID, messageID);
  }

  if (cmd === 'logs') {
    if (!admins.includes(senderID)) {
      return api.sendMessage("❌ Hindi ka authorized para gamitin ito.", threadID, messageID);
    }

    if (logs.length === 0) {
      return api.sendMessage("⚠️ Wala pang logs na naitala.", threadID, messageID);
    }

    // Limit logs to last 20 for brevity
    const lastLogs = logs.slice(-20).map(log => {
      return `[${log.timestamp}] (${log.type}) User: ${log.userId} — ${log.content}`;
    }).join('\n');

    return api.sendMessage(`📋 **Huling 20 Logs ng System:**\n\n${lastLogs}`, threadID, messageID);
  }

  // Handle report and bug commands (feedback to admin)
  if (cmd === 'report' || cmd === 'feedback') {
    const reportText = args.slice(1).join(' ').trim();
    if (!reportText) {
      return api.sendMessage("❌ Paki-sulat ang feedback o report text.", threadID, messageID);
    }

    addLog('feedback_report', senderID, reportText);

    // Send report to all admins
    const adminPromises = admins.map(adminID => 
      api.sendMessage(
        `📢 **Feedback Report mula sa User ${senderID}**:\n\n"${reportText}"`,
        adminID
      )
    );

    await Promise.all(adminPromises);

    return api.sendMessage("✅ Naipadala ang iyong feedback report sa admin. Salamat!", threadID, messageID);
  }

  if (cmd === 'bug') {
    const bugText = args.slice(1).join(' ').trim();
    if (!bugText) {
      return api.sendMessage("❌ Paki-sulat ang description ng bug.", threadID, messageID);
    }

    addLog('bug_report', senderID, bugText);

    // Send bug report to all admins
    const adminPromises = admins.map(adminID => 
      api.sendMessage(
        `🐞 **Bug Report mula sa User ${senderID}**:\n\n"${bugText}"`,
        adminID
      )
    );

    await Promise.all(adminPromises);

    return api.sendMessage("✅ Naipadala ang iyong bug report sa admin. Salamat!", threadID, messageID);
  }

  // Otherwise, process rating + optional feedback
  const rating = parseInt(cmd, 10);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return api.sendMessage("❌ **Invalid rating.** Pumili ng numero mula 1 hanggang 5 lamang.", threadID, messageID);
  }

  const feedback = args.slice(1).join(' ').trim();

  if (!ratingsData[senderID]) {
    ratingsData[senderID] = {
      ratings: [],
      feedbacks: [],
      totalQuestions: 0
    };
  }

  ratingsData[senderID].ratings.push(rating);
  if (feedback.length > 0) ratingsData[senderID].feedbacks.push(feedback);
  ratingsData[senderID].totalQuestions++;

  addLog('rating', senderID, `Rating: ${rating}, Feedback: ${feedback || "Walang feedback"}`);

  const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

  const reply = 
    `🌟 **Salamat sa iyong rating!** 🌟\n\n` +
    `⭐ **Rating mo:** ${stars} (${rating}/5)\n` +
    (feedback.length > 0 ? `💬 **Feedback mo:** "${feedback}"\n\n` : '') +
    `📊 **Tanong mo ngayon ay #${ratingsData[senderID].totalQuestions} sa Llama Assistant!**\n\n` +
    `🚀 Gamitin ang \`llamaa <iyong mensahe>\` para magpatuloy sa pag-chat!`;

  return api.sendMessage(reply, threadID, messageID);
};
