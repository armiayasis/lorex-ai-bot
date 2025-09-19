module.exports.config = {
  name: 'setallnickname',
  version: '1.0.0',
  hasPermission: 2, // admin only
  usePrefix: true,
  description: 'Set nickname for all group members',
  usages: 'setallnickname <nickname>',
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;

  if (!args.length) {
    return api.sendMessage('❌ Please provide a nickname.\nUsage: setallnickname <nickname>', threadID);
  }

  const nickname = args.join(' ').trim();

  try {
    // Get all participants of the group
    const threadInfo = await api.getThreadInfo(threadID);
    const participants = threadInfo.participantIDs;

    // Loop and set nickname for each member
    for (const userID of participants) {
      await api.changeNickname(nickname, threadID, userID);
    }

    api.sendMessage(`✅ Successfully set nickname "${nickname}" for all ${participants.length} group members.`, threadID);
  } catch (error) {
    console.error('Error setting nicknames:', error);
    api.sendMessage('❌ Failed to set nicknames for all members.', threadID);
  }
};
