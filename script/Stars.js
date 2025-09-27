module.exports.config = {
  name: 'ratingstar',
  version: '2.0.0',
  hasPermission: 0,
  usePrefix: true,
  aliases: ['rate', 'star', 'post', 'react', 'comment', 'dashboard', 'claim', 'stats', 'users', 'logs', 'admin_dashboard'],
  description: "Rating, posts, react, comment, dashboard, admin panel",
  usages: [
    "ratingstar <1-5> - Mag-rate (feedback command removed)",
    "ratingstar stats - Tingnan summary ng ratings",
    "ratingstar rules - Basahin rules, privacy, terms",
    "ratingstar users - (Admin) Listahan ng mga users",
    "ratingstar post <content> - Mag-post ng content",
    "ratingstar feed - Tingnan lahat ng mga post",
    "ratingstar react <post_id> <emoji> - Mag-react sa post",
    "ratingstar comment <post_id> <comment> - Mag-comment sa post",
    "ratingstar dashboard - Tingnan sariling points at posts stats",
    "ratingstar claim - Claim your free daily points",
    "ratingstar admin_dashboard - (Admin) Tingnan lahat ng user stats"
  ].join('\n'),
  cooldowns: 0,
  credits: 'ChatGPT + You',
};

const admins = ['100051724779220']; // Admin ID

// Data stores (replace with DB in production)
const ratingsData = {}; // { userId: {ratings: [], totalQuestions: 0} }
const logs = []; // {timestamp, type, userId, content}
const posts = []; // {postId, userId, content, timestamp, reactions: {emoji: [userId]}, comments: [{userId, comment, timestamp}]}
const userPoints = {}; // userId => points
const dailyClaimed = {}; // userId => date string yyyy-mm-dd

// Helpers
function addLog(type, userId, content) {
  logs.push({ timestamp: new Date().toISOString(), type, userId, content });
}
function getUserPoints(userId) {
  if (!userPoints[userId]) userPoints[userId] = 0;
  return userPoints[userId];
}
function addUserPoints(userId, pts) {
  if (!userPoints[userId]) userPoints[userId] = 0;
  userPoints[userId] += pts;
}

// Notify top user if points > 34.23 (called after points update)
async function notifyTopUser(api) {
  let topUser = null;
  let maxPoints = 0;
  for (const [userId, pts] of Object.entries(userPoints)) {
    if (pts > maxPoints) {
      maxPoints = pts;
      topUser = userId;
    }
  }
  if (topUser && maxPoints > 34.23) {
    await api.sendMessage(`🔥 Top User Alert! User ${topUser} has the highest points: ${maxPoints.toFixed(2)}!`, topUser);
  }
}

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;
  const messageID = event.messageID;
  const senderID = event.senderID;

  if (!args[0]) {
    let helpMsg =
      `📌 Paano gamitin ang Llama Assistant Rating:\n\n` +
      `⭐ ratingstar <1-5> - Magbigay rating\n` +
      `📊 ratingstar stats - Tingnan summary ng ratings\n` +
      `📜 ratingstar rules - Basahin rules, privacy, terms\n` +
      (admins.includes(senderID) ? `👥 ratingstar users - Tingnan listahan ng users\n` : '') +
      `📝 ratingstar post <content> - Mag-post ng content\n` +
      `📢 ratingstar feed - Tingnan lahat ng mga post\n` +
      `❤️ ratingstar react <post_id> <emoji> - Mag-react sa post\n` +
      `💬 ratingstar comment <post_id> <comment> - Mag-comment sa post\n` +
      `📈 ratingstar dashboard - Tingnan sariling points at posts stats\n` +
      `🎁 ratingstar claim - Claim your free daily points\n` +
      (admins.includes(senderID) ? `📋 ratingstar logs - Tingnan logs\n` : '') +
      (admins.includes(senderID) ? `📊 ratingstar admin_dashboard - Tingnan admin dashboard\n` : '');

    return api.sendMessage(helpMsg, threadID, messageID);
  }

  const cmd = args[0].toLowerCase();

  // RULES
  if (cmd === 'rules') {
    const rulesText =
      `📜 LLAMA ASSISTANT RULES & POLICIES\n\n` +
      `🔹 Mga Alituntunin:\n` +
      `• Gamitin nang responsable at may respeto.\n` +
      `• Iwasan ang hindi angkop na salita.\n` +
      `• Assistant ay gabay lamang, hindi kapalit ng propesyonal na payo.\n\n` +
      `🔒 Privacy Policy:\n` +
      `• Ligtas ang info, hindi ibinabahagi.\n` +
      `• Iwasan ang sensitibong data.\n\n` +
      `📃 Terms of Service:\n` +
      `• Ginagamit mo sa sariling responsibilidad.\n` +
      `• Hindi kami mananagot sa anumang pinsala.\n` +
      `• Maaring baguhin ang serbisyo anumang oras.\n\n` +
      `🚀 Paano Gamitin:\n` +
      `• llamaa <iyong mensahe> para magtanong.\n` +
      `• Mag-rate gamit ratingstar <1-5> para makatulong.\n\n` +
      `✨ Salamat sa paggamit ng Llama Assistant! 🦙`;

    addLog('rules_view', senderID, 'Nag-view ng rules');
    return api.sendMessage(rulesText, threadID, messageID);
  }

  // STATS
  if (cmd === 'stats') {
    const allRatings = [];
    for (const userId in ratingsData) {
      allRatings.push(...ratingsData[userId].ratings);
    }
    if (allRatings.length === 0) {
      return api.sendMessage("⚠️ Wala pang ratings na naibigay.", threadID, messageID);
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
        .map(([userId, data], idx) => `➤ #${idx + 1} User ID: ${userId} — ${data.totalQuestions} tanong`)
        .join('\n');
    }

    const reply =
      `🌟 Llama Assistant Rating Summary 🌟\n\n` +
      `• Average Rating: ${stars} (${avg}/5)\n` +
      `• Total Ratings: ${totalRatings}\n\n` +
      `👥 Top 3 Users na Pinaka-Madalas Magtanong:\n${topUsersText}`;

    addLog('stats_view', senderID, 'Nag-view ng stats');
    return api.sendMessage(reply, threadID, messageID);
  }

  // USERS - ADMIN ONLY
  if (cmd === 'users') {
    if (!admins.includes(senderID)) {
      return api.sendMessage("❌ Hindi ka authorized para gamitin ito.", threadID, messageID);
    }

    if (Object.keys(ratingsData).length === 0) {
      return api.sendMessage("⚠️ Wala pang user ratings na naitala.", threadID, messageID);
    }

    let userList = '👥 Listahan ng mga Nag-rate:\n\n';

    for (const [userId, data] of Object.entries(ratingsData)) {
      const avgRating = (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(2);
      userList += `• User ID: ${userId}\n` +
        `  - Average Rating: ${avgRating}/5\n` +
        `  - Total Ratings: ${data.ratings.length}\n` +
        `  - Tanong: ${data.totalQuestions}\n\n`;
    }

    addLog('users_view', senderID, 'Nag-view ng users list');
    return api.sendMessage(userList, threadID, messageID);
  }

  // LOGS - ADMIN ONLY
  if (cmd === 'logs') {
    if (!admins.includes(senderID)) {
      return api.sendMessage("❌ Hindi ka authorized para gamitin ito.", threadID, messageID);
    }

    if (logs.length === 0) {
      return api.sendMessage("⚠️ Wala pang logs na naitala.", threadID, messageID);
    }

    const lastLogs = logs.slice(-20).map(log => {
      return `[${log.timestamp}] (${log.type}) User: ${log.userId} — ${log.content}`;
    }).join('\n');

    return api.sendMessage(`📋 Huling 20 Logs ng System:\n\n${lastLogs}`, threadID, messageID);
  }

  // ADMIN DASHBOARD
  if (cmd === 'admin_dashboard') {
    if (!admins.includes(senderID)) {
      return api.sendMessage("❌ Hindi ka authorized para gamitin ito.", threadID, messageID);
    }
    let text = `📊 Admin Dashboard - Lahat ng User Stats\n\n`;
    for (const [userId, data] of Object.entries(ratingsData)) {
      const avgRating = (data.ratings.reduce((a,b)=>a+b,0)/data.ratings.length).toFixed(2);
      const points = getUserPoints(userId);
      const totalPosts = posts.filter(p => p.userId === userId).length;
      text += `User ID: ${userId}\n` +
        ` - Avg Rating: ${avgRating}\n` +
        ` - Total Ratings: ${data.ratings.length}\n` +
        ` - Total Questions: ${data.totalQuestions}\n` +
        ` - Points: ${points}\n` +
        ` - Total Posts: ${totalPosts}\n\n`;
    }
    return api.sendMessage(text, threadID, messageID);
  }

  // POST content
  if (cmd === 'post') {
    const content = args.slice(1).join(' ').trim();
    if (!content) return api.sendMessage("❌ Paki-sulat ang content na ipo-post.", threadID, messageID);

    const postId = posts.length + 1;
    posts.push({
      postId,
      userId: senderID,
      content,
      timestamp: new Date().toISOString(),
      reactions: {},
      comments: []
    });

    addLog('post_created', senderID, content);
    addUserPoints(senderID, 2); // Reward points for posting
    await notifyTopUser(api);

    return api.sendMessage(`✅ Na-post mo ang content mo (ID: ${postId}). Nakakuha ka ng 2 points!`, threadID, messageID);
  }

  // FEED all posts
  if (cmd === 'feed') {
    if (posts.length === 0) return api.sendMessage("Walang posts sa feed.", threadID, messageID);

    let feedText = '📢 Posts Feed:\n\n';
    posts.slice(-10).reverse().forEach(post => {
      const reactionSummary = Object.entries(post.reactions).map(([emoji, users]) => `${emoji}(${users.length})`).join(' ') || 'Walang reactions';
      const commentCount = post.comments.length;
      feedText += `ID:${post.postId} | User:${post.userId}\n` +
        `Content: ${post.content}\n` +
        `Reactions: ${reactionSummary}\n` +
        `Comments: ${commentCount}\n\n`;
    });

    return api.sendMessage(feedText, threadID, messageID);
  }

  // REACT to a post
  if (cmd === 'react') {
    const postId = parseInt(args[1]);
    const emoji = args[2];
    if (!postId || !emoji) return api.sendMessage("❌ Tama ang format: ratingstar react <post_id> <emoji>", threadID, messageID);

    const post = posts.find(p => p.postId === postId);
    if (!post) return api.sendMessage("❌ Hindi nakita ang post na ito.", threadID, messageID);

    if (!post.reactions[emoji]) post.reactions[emoji] = [];
    if (post.reactions[emoji].includes(senderID)) {
      return api.sendMessage("⚠️ Na-react mo na ang post na ito gamit ang emoji na ito.", threadID, messageID);
    }
    post.reactions[emoji].push(senderID);

    addLog('react', senderID, `Post ID ${postId} reacted with ${emoji}`);
    addUserPoints(senderID, 0.5); // Points for reacting
    await notifyTopUser(api);

    return api.sendMessage(`✅ Na-react mo ang post (ID: ${postId}) gamit ang ${emoji}! Nakakuha ka ng 0.5 points.`, threadID, messageID);
  }

  // COMMENT on a post
  if (cmd === 'comment') {
    const postId = parseInt(args[1]);
    const commentText = args.slice(2).join(' ').trim();

    if (!postId || !commentText) {
      return api.sendMessage("❌ Tama ang format: ratingstar comment <post_id> <comment>", threadID, messageID);
    }

    const post = posts.find(p => p.postId === postId);
    if (!post) return api.sendMessage("❌ Hindi nakita ang post na ito.", threadID, messageID);

    post.comments.push({
      userId: senderID,
      comment: commentText,
      timestamp: new Date().toISOString()
    });

    addLog('comment', senderID, `Post ID ${postId} commented: ${commentText}`);
    addUserPoints(senderID, 1); // Points for commenting
    await notifyTopUser(api);

    return api.sendMessage(`✅ Nakapag-comment ka sa post (ID: ${postId}). Nakakuha ka ng 1 point!`, threadID, messageID);
  }

  // DASHBOARD - user stats
  if (cmd === 'dashboard') {
    const userData = ratingsData[senderID] || { ratings: [], totalQuestions: 0 };
    const points = getUserPoints(senderID);
    const userPosts = posts.filter(p => p.userId === senderID);

    let avgRating = "Wala pang rating";
    if (userData.ratings.length > 0) {
      avgRating = (userData.ratings.reduce((a, b) => a + b, 0) / userData.ratings.length).toFixed(2);
    }

    const dashboardText =
      `📈 Dashboard ng User\n\n` +
      `• Average Rating: ${avgRating}\n` +
      `• Total Ratings Given: ${userData.ratings.length}\n` +
      `• Total Questions Asked: ${userData.totalQuestions}\n` +
      `• Total Points: ${points}\n` +
      `• Total Posts: ${userPosts.length}`;

    return api.sendMessage(dashboardText, threadID, messageID);
  }

  // CLAIM daily points
  if (cmd === 'claim') {
    const today = new Date().toISOString().slice(0,10);
    if (dailyClaimed[senderID] === today) {
      return api.sendMessage("⚠️ Nakakuha ka na ng daily points ngayon. Subukan bukas ulit.", threadID, messageID);
    }

    addUserPoints(senderID, 5);
    dailyClaimed[senderID] = today;

    return api.sendMessage("🎉 Nakakuha ka ng 5 daily points! Salamat sa paggamit ng assistant.", threadID, messageID);
  }

  // RATING input (1-5)
  if (!isNaN(cmd)) {
    const rating = parseInt(cmd);
    if (rating < 1 || rating > 5) {
      return api.sendMessage("❌ Ang rating ay dapat nasa pagitan ng 1 hanggang 5.", threadID, messageID);
    }

    if (!ratingsData[senderID]) {
      ratingsData[senderID] = {
        ratings: [],
        totalQuestions: 0
      };
    }
    ratingsData[senderID].ratings.push(rating);
    ratingsData[senderID].totalQuestions += 1;

    addLog('rating', senderID, `Nag-rate ng ${rating} stars`);
    addUserPoints(senderID, rating * 0.2); // Reward points based on rating
    await notifyTopUser(api);

    return api.sendMessage(`✅ Salamat sa pag-rate ng ${rating} star(s)!`, threadID, messageID);
  }

  // Default fallback
  return api.sendMessage("❌ Hindi maintindihan ang command. Paki-check ang help gamit ang walang argument.", threadID, messageID);
};
