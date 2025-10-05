const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '..', 'users.json');
const postsPath = path.join(__dirname, '..', 'posts.json');

const ADMIN_UID = '61580959514473';
const DAILY_REWARD = 5000;

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

function formatNumber(num) {
  return Number(num).toLocaleString();
}

function addNotification(users, uid, message) {
  if (!users[uid]) return;
  if (!users[uid].notifications) users[uid].notifications = [];
  users[uid].notifications.push(message);
}

module.exports.config = {
  name: 'ultra',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Ultra system: user, posts, dashboard, reactions, comments, notifications',
  usages: `ultra register | ultra login | ultra profile | ultra verify | ultra notify | ultra dashboard | ultra post [content] | ultra react [postID] | ultra comment [postID] [comment]`,
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const users = loadJSON(usersPath);
  const posts = loadJSON(postsPath);
  const uid = event.senderID;

  const sub = args[0] ? args[0].toLowerCase() : '';

  try {
    // --------- Register ---------
    if (sub === 'register') {
      if (users[uid]) return api.sendMessage('You are already registered.', event.threadID, event.messageID);

      users[uid] = {
        points: 0,
        dollars: 0,
        postsCount: 0,
        reactionsCount: 0,
        commentsCount: 0,
        verified: false,
        notifications: [],
      };
      saveJSON(usersPath, users);
      return api.sendMessage('✅ Registration successful! Welcome!', event.threadID, event.messageID);
    }

    // --------- Login ---------
    else if (sub === 'login') {
      if (users[uid]) return api.sendMessage('✅ Login successful! Welcome back.', event.threadID, event.messageID);
      return api.sendMessage('❌ You are not registered yet. Please register first using "ultra register".', event.threadID, event.messageID);
    }

    // --------- Profile ---------
    else if (sub === 'profile') {
      if (!users[uid]) return api.sendMessage('❌ You are not registered. Please register first.', event.threadID, event.messageID);
      const u = users[uid];
      const msg = `👤 Your Profile\n` +
                  `Points: ${formatNumber(u.points)}\n` +
                  `Dollars: ₱${formatNumber(u.dollars.toFixed(2))}\n` +
                  `Posts: ${formatNumber(u.postsCount)}\n` +
                  `Reactions: ${formatNumber(u.reactionsCount)}\n` +
                  `Comments: ${formatNumber(u.commentsCount)}\n` +
                  `Verified: ${u.verified ? '✅ Yes' : '❌ No'}`;
      return api.sendMessage(msg, event.threadID, event.messageID);
    }

    // --------- Verify toggle ---------
    else if (sub === 'verify') {
      if (!users[uid]) return api.sendMessage('❌ You are not registered. Please register first.', event.threadID, event.messageID);

      users[uid].verified = !users[uid].verified;
      saveJSON(usersPath, users);
      return api.sendMessage(`Your verification status is now: ${users[uid].verified ? '✅ Verified' : '❌ Not Verified'}`, event.threadID, event.messageID);
    }

    // --------- Notifications ---------
    else if (sub === 'notify') {
      if (!users[uid]) return api.sendMessage('❌ You are not registered. Please register first.', event.threadID, event.messageID);

      const notifications = users[uid].notifications || [];
      if (notifications.length === 0) return api.sendMessage('🔔 You have no new notifications.', event.threadID, event.messageID);

      let notifyMsg = '🔔 Your Notifications:\n';
      notifications.forEach((n, i) => {
        notifyMsg += `${i + 1}. ${n}\n`;
      });

      // Clear notifications after reading
      users[uid].notifications = [];
      saveJSON(usersPath, users);

      return api.sendMessage(notifyMsg, event.threadID, event.messageID);
    }

    // --------- Dashboard ---------
    else if (sub === 'dashboard') {
      if (!users[uid]) return api.sendMessage('❌ You are not registered. Please register first.', event.threadID, event.messageID);

      const user = users[uid];
      const userPosts = Object.values(posts).filter(p => p.userID === uid);
      const totalViews = userPosts.reduce((acc, p) => acc + (p.views || 0), 0);

      const engagement = (user.postsCount * 10) + (user.reactionsCount * 2) + (user.commentsCount * 5) + (totalViews * 0.1);
      const isAdmin = uid === ADMIN_UID;
      const adminBadge = isAdmin ? '🔥 [24K Reactor Admin]' : '';

      const msg =
        `📊 Ultra Dashboard ${adminBadge}\n\n` +
        `💎 Points: ${formatNumber(user.points)}\n` +
        `💵 Dollars: ₱${formatNumber(user.dollars.toFixed(2))}\n` +
        `📝 Posts: ${formatNumber(user.postsCount)}\n` +
        `👍 Reactions: ${formatNumber(user.reactionsCount)}\n` +
        `💬 Comments: ${formatNumber(user.commentsCount)}\n` +
        `👀 Total Views (your posts): ${formatNumber(totalViews)}\n` +
        `📈 Engagement Score: ${formatNumber(engagement.toFixed(1))}\n`;
      return api.sendMessage(msg, event.threadID, event.messageID);
    }

    // --------- Post content ---------
    else if (sub === 'post') {
      if (!users[uid]) return api.sendMessage('❌ You are not registered. Please register first.', event.threadID, event.messageID);

      const content = args.slice(1).join(' ');
      if (!content) return api.sendMessage('Please provide content to post.', event.threadID, event.messageID);

      // Generate postID (timestamp + uid last 4)
      const postID = `p${Date.now()}${uid.slice(-4)}`;

      posts[postID] = {
        userID: uid,
        content,
        views: 0,
        reactions: 0,
        comments: [],
        createdAt: Date.now(),
      };

      users[uid].postsCount++;
      users[uid].points += 10; // Award points for posting
      users[uid].dollars += 1; // Award small dollars for posting

      // Save
      saveJSON(postsPath, posts);
      saveJSON(usersPath, users);

      return api.sendMessage(`📝 Post created! Post ID: ${postID}\nContent: ${content}`, event.threadID, event.messageID);
    }

    // --------- React post ---------
    else if (sub === 'react') {
      if (!users[uid]) return api.sendMessage('❌ You are not registered. Please register first.', event.threadID, event.messageID);
      const postID = args[1];
      if (!postID) return api.sendMessage('Specify post ID to react.', event.threadID, event.messageID);
      if (!posts[postID]) return api.sendMessage('Post not found.', event.threadID, event.messageID);

      posts[postID].reactions++;
      users[uid].reactionsCount++;
      users[posts[postID].userID].points += 2; // Award points to post owner
      users[posts[postID].userID].dollars += 0.5;

      saveJSON(postsPath, posts);
      saveJSON(usersPath, users);

      // Notify post owner
      if (posts[postID].userID !== uid) {
        addNotification(users, posts[postID].userID, `👍 Your post ${postID} got a new reaction!`);
        saveJSON(usersPath, users);
      }

      return api.sendMessage(`👍 You reacted to post ${postID}`, event.threadID, event.messageID);
    }

    // --------- Comment post ---------
    else if (sub === 'comment') {
      if (!users[uid]) return api.sendMessage('❌ You are not registered. Please register first.', event.threadID, event.messageID);
      const postID = args[1];
      const commentText = args.slice(2).join(' ');
      if (!postID) return api.sendMessage('Specify post ID to comment.', event.threadID, event.messageID);
      if (!posts[postID]) return api.sendMessage('Post not found.', event.threadID, event.messageID);
      if (!commentText) return api.sendMessage('Please enter comment text.', event.threadID, event.messageID);

      posts[postID].comments.push({ userID: uid, text: commentText, createdAt: Date.now() });
      users[uid].commentsCount++;
      users[posts[postID].userID].points += 3; // Award points to post owner
      users[posts[postID].userID].dollars += 0.75;

      saveJSON(postsPath, posts);
      saveJSON(usersPath, users);

      // Notify post owner
      if (posts[postID].userID !== uid) {
        addNotification(users, posts[postID].userID, `💬 Your post ${postID} got a new comment!`);
        saveJSON(usersPath, users);
      }

      return api.sendMessage(`💬 Comment added to post ${postID}`, event.threadID, event.messageID);
    }

    // --------- Feed (show posts) ---------
    else if (sub === 'feed') {
      const feedPosts = Object.entries(posts)
        .sort((a, b) => b[1].createdAt - a[1].createdAt)
        .slice(0, 10); // latest 10 posts

      if (feedPosts.length === 0) return api.sendMessage('No posts available yet.', event.threadID, event.messageID);

      let feedMsg = '📰 Ultra Feed - Latest Posts:\n\n';

      for (const [pid, post] of feedPosts) {
        // Increase view count if user views feed (optional)
        // posts[pid].views = (posts[pid].views || 0) + 1;

        feedMsg += `ID: ${pid}\nUser: ${post.userID}\nContent: ${post.content}\n` +
                   `Views: ${formatNumber(post.views || 0)} | Reactions: ${formatNumber(post.reactions)} | Comments: ${formatNumber(post.comments.length)}\n\n`;
      }

      saveJSON(postsPath, posts);

      return api.sendMessage(feedMsg, event.threadID, event.messageID);
    }

    // --------- Unknown command ---------
    else {
      return api.sendMessage('Unknown subcommand. Use:\nregister, login, profile, verify, notify, dashboard, post, react, comment, feed', event.threadID, event.messageID);
    }

  } catch (err) {
    console.error('❌ Error in ultra command:', err);
    return api.sendMessage('❌ Something went wrong. Please try again later.', event.threadID, event.messageID);
  }
};
