const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: 'net',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: true,
  aliases: ['net'],
  description: "Social network style rating and interaction system with posts, reactions, comments, sharing, friends, inbox, messaging, and dashboard",
  usages: [
    "net post <message> - Gumawa ng post",
    "net react <post_id> <emoji> - Mag-react sa post",
    "net comment <post_id> <comment> - Mag-comment sa post",
    "net share <post_id> <thread_id> - I-share ang post sa ibang thread",
    "net addfriend <user_id> - Magpadala ng friend request",
    "net accept <user_id> - Tanggapin ang friend request",
    "net inbox - Tingnan ang iyong inbox",
    "net message <user_id> <message> - Magpadala ng message sa user",
    "net dashboard - Tingnan ang iyong profile at stats",
    "net claim - Mag-claim ng libreng points"
  ].join('\n'),
  cooldowns: 0,
  credits: 'ChatGPT + You',
};

// Data file path
const dataFilePath = path.join(__dirname, 'net_data.json');

let netUsers = {};
let netPosts = [];
let netMessages = [];

let nextPostId = 1;
let nextMessageId = 1;

function loadData() {
  if (fs.existsSync(dataFilePath)) {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    const data = JSON.parse(raw);
    netUsers = data.netUsers || {};
    netPosts = data.netPosts || [];
    netMessages = data.netMessages || [];
    nextPostId = data.nextPostId || 1;
    nextMessageId = data.nextMessageId || 1;
  }
}

function saveData() {
  fs.writeFileSync(dataFilePath, JSON.stringify({
    netUsers,
    netPosts,
    netMessages,
    nextPostId,
    nextMessageId
  }, null, 2));
}

function ensureUser(userId) {
  if (!netUsers[userId]) {
    netUsers[userId] = {
      points: 0,
      posts: 0,
      views: 0,
      friends: [],
      friendRequests: []
    };
  }
}

async function handlePost(api, event, args) {
  const userId = event.senderID;
  const content = args.join(' ').trim();
  if (!content) return api.sendMessage("❌ Please provide content for your post.", event.threadID);

  ensureUser(userId);

  const post = {
    id: nextPostId++,
    userId,
    content,
    timestamp: Date.now(),
    views: 0,
    reactions: {},
    comments: []
  };

  netPosts.push(post);
  netUsers[userId].posts++;
  netUsers[userId].points += 10;

  saveData();

  api.sendMessage(`✅ Post created! Post ID: #${post.id}. You earned 10 points!`, event.threadID);
}

async function handleReact(api, event, args) {
  const userId = event.senderID;
  const postId = parseInt(args[0]);
  const emoji = args[1];

  if (!postId || !emoji) return api.sendMessage("❌ Usage: net react <post_id> <emoji>", event.threadID);

  const post = netPosts.find(p => p.id === postId);
  if (!post) return api.sendMessage("❌ Post not found.", event.threadID);

  post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;

  ensureUser(post.userId);
  netUsers[post.userId].points += 1;

  saveData();

  api.sendMessage(`👍 Reacted with ${emoji} to post #${postId}. Post owner earned 1 point!`, event.threadID);
}

async function handleComment(api, event, args) {
  const userId = event.senderID;
  const postId = parseInt(args[0]);
  const commentText = args.slice(1).join(' ').trim();

  if (!postId || !commentText) return api.sendMessage("❌ Usage: net comment <post_id> <comment>", event.threadID);

  const post = netPosts.find(p => p.id === postId);
  if (!post) return api.sendMessage("❌ Post not found.", event.threadID);

  post.comments.push({ userId, comment: commentText, timestamp: Date.now() });

  ensureUser(post.userId);
  netUsers[post.userId].points += 2;

  saveData();

  api.sendMessage(`💬 Comment added to post #${postId}. Post owner earned 2 points!`, event.threadID);
}

async function handleShare(api, event, args) {
  const userId = event.senderID;
  const postId = parseInt(args[0]);
  const targetThread = args[1];

  if (!postId || !targetThread) return api.sendMessage("❌ Usage: net share <post_id> <thread_id>", event.threadID);

  const post = netPosts.find(p => p.id === postId);
  if (!post) return api.sendMessage("❌ Post not found.", event.threadID);

  const shareMsg = `📢 Shared post from user ${post.userId}:\n\n${post.content}\n\nReact or comment with net react/net comment!`;

  api.sendMessage(shareMsg, targetThread, (err) => {
    if (err) return api.sendMessage("❌ Failed to share post.", event.threadID);
    else return api.sendMessage(`✅ Post #${postId} shared to thread ${targetThread}`, event.threadID);
  });
}

async function handleAddFriend(api, event, args) {
  const userId = event.senderID;
  const friendId = args[0];

  if (!friendId) return api.sendMessage("❌ Usage: net addfriend <user_id>", event.threadID);
  if (friendId === userId) return api.sendMessage("❌ You cannot add yourself.", event.threadID);

  ensureUser(userId);
  ensureUser(friendId);

  if (netUsers[userId].friends.includes(friendId)) {
    return api.sendMessage("✅ You are already friends.", event.threadID);
  }

  if (netUsers[friendId].friendRequests.includes(userId)) {
    return api.sendMessage("❌ Friend request already sent.", event.threadID);
  }

  netUsers[friendId].friendRequests.push(userId);
  saveData();

  api.sendMessage(`📨 Friend request sent to user ${friendId}.`, event.threadID);
}

async function handleAccept(api, event, args) {
  const userId = event.senderID;
  const requesterId = args[0];

  if (!requesterId) return api.sendMessage("❌ Usage: net accept <user_id>", event.threadID);

  ensureUser(userId);
  ensureUser(requesterId);

  const requests = netUsers[userId].friendRequests;
  const index = requests.indexOf(requesterId);
  if (index === -1) return api.sendMessage("❌ No friend request from that user.", event.threadID);

  requests.splice(index, 1);
  netUsers[userId].friends.push(requesterId);
  netUsers[requesterId].friends.push(userId);

  saveData();

  api.sendMessage(`🤝 You are now friends with user ${requesterId}!`, event.threadID);
}

async function handleInbox(api, event) {
  const userId = event.senderID;

  const messages = netMessages.filter(m => m.to === userId);
  if (!messages.length) return api.sendMessage("📭 Your inbox is empty.", event.threadID);

  let inboxText = "📩 Your Messages:\n\n";
  messages.slice(-10).forEach(m => {
    inboxText += `From: ${m.from}\nAt: ${new Date(m.timestamp).toLocaleString()}\n${m.content}\n\n`;
    m.read = true;
  });

  saveData();

  api.sendMessage(inboxText.trim(), event.threadID);
}

async function handleSendMessage(api, event, args) {
  const fromUser = event.senderID;
  const toUser = args[0];
  const messageContent = args.slice(1).join(' ').trim();

  if (!toUser || !messageContent) return api.sendMessage("❌ Usage: net message <user_id> <message>", event.threadID);

  ensureUser(fromUser);
  ensureUser(toUser);

  netMessages.push({
    id: nextMessageId++,
    from: fromUser,
    to: toUser,
    content: messageContent,
    timestamp: Date.now(),
    read: false
  });

  saveData();

  api.sendMessage(`✉️ Message sent to user ${toUser}.`, event.threadID);
}

async function handleDashboard(api, event) {
  const userId = event.senderID;
  ensureUser(userId);
  const user = netUsers[userId];

  const recent = netPosts.filter(p => p.userId === userId).slice(-5).reverse();
  const totalViews = recent.reduce((sum, p) => sum + p.views, 0);

  const friendReqCount = user.friendRequests.length;
  const unreadMessages = netMessages.filter(m => m.to === userId && !m.read).length;

  const postList = recent.length
    ? recent.map(p => {
        const reacts = Object.entries(p.reactions).map(([e, c]) => `${e} ${c}`).join(' ') || '0';
        return `─────────────────────
📄 Post #${p.id}
🕒 ${new Date(p.timestamp).toLocaleString()}
${p.content}
👀 Views: ${p.views}   💖 Reactions: ${reacts}   💬 Comments: ${p.comments.length}`;
      }).join('\n')
    : "📭 You haven't posted anything yet.";

  const dashboardMessage = `
╔══════════════════════════════╗
║       🧑 Your Profile         ║
╠══════════════════════════════╣
👤 User ID: ${userId}
🏅 Points: ${user.points}
📝 Posts: ${user.posts}
👥 Friends: ${user.friends.length}
👀 Total Views (last 5 posts): ${totalViews}
╚══════════════════════════════╝

╔══════════════════════════════╗
║      🔔 Notifications         ║
╠══════════════════════════════╣
👥 Friend Requests: ${friendReqCount}
📩 Unread Messages: ${unreadMessages}
╚══════════════════════════════╝

╔══════════════════════════════╗
║      📰 Recent Posts          ║
╠══════════════════════════════╣
${postList}
╚══════════════════════════════╝

╔══════════════════════════════╗
║      ⚡ Quick Actions          ║
╠══════════════════════════════╣
📤 Post: \`net post <message>\`
❤️ React: \`net react <post_id> <emoji>\`
💬 Comment: \`net comment <post_id> <message>\`
🔗 Share: \`net share <post_id> <thread_id>\`
👥 Add friend: \`net addfriend <user_id>\`
✅ Accept friend: \`net accept <user_id>\`
📩 Inbox: \`net inbox\`
✉️ Message user: \`net message <user_id> <message>\`
🎁 Claim points: \`net claim\`
╚══════════════════════════════╝
`;

  api.sendMessage(dashboardMessage.trim(), event.threadID);
}

async function handleClaim(api, event) {
  const userId = event.senderID;
  ensureUser(userId);
  netUsers[userId].points += 5;
  saveData();
  api.sendMessage("🎉 You claimed 5 points!", event.threadID);
}

async function run(api, event) {
  const message = event.body || '';
  if (!message.toLowerCase().startsWith('net ')) return;

  const args = message.trim().split(/\s+/).slice(1);
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'post': return handlePost(api, event, args);
    case 'react': return handleReact(api, event, args);
    case 'comment': return handleComment(api, event, args);
    case 'share': return handleShare(api, event, args);
    case 'addfriend': return handleAddFriend(api, event, args);
    case 'accept': return handleAccept(api, event, args);
    case 'inbox': return handleInbox(api, event);
    case 'message': return handleSendMessage(api, event, args);
    case 'dashboard': return handleDashboard(api, event);
    case 'claim': return handleClaim(api, event);
    default:
      return api.sendMessage("❓ Unknown command.", event.threadID);
  }
}

module.exports.run = run;
module.exports.loadData = loadData;
module.exports.saveData = saveData;
