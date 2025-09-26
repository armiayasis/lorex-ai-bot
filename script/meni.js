const axios = require('axios');

module.exports.config = {
  name: 'help',
  version: '6.8',
  role: 0,
  hasPrefix: true,
  aliases: ['command', 'commands', 'cmds'],
  description: "Beginner's guide and command reference",
  usage: "help [page number] | [command] | all",
  credits: 'Developer',
  countDown: 0,
};

module.exports.run = async function ({ api, event, enableCommands, args, Utils, prefix }) {
  const input = args.join(' ').trim().toLowerCase();

  try {
    const commands = enableCommands[0].commands;
    const totalCommands = commands.length;
    const commandsPerPage = 15;
    const pages = Math.ceil(totalCommands / commandsPerPage);

    // Helper to format a single command line
    const formatCommand = (cmd) => `⊂⊃ ➥ ${cmd}`;

    if (!input || !isNaN(input)) {
      // Show commands by page
      const page = input ? parseInt(input) : 1;
      if (page < 1 || page > pages) {
        return api.sendMessage(`❌ Page ${page} does not exist. Please select between 1 and ${pages}.`, event.threadID, event.messageID);
      }

      const start = (page - 1) * commandsPerPage;
      const end = Math.min(start + commandsPerPage, totalCommands);

      let helpMessage = `━━━ 𝙲𝙾𝙼𝙼𝙰𝙽𝙳𝚂 ━━━\n\n`;
      for (let i = start; i < end; i++) {
        helpMessage += formatCommand(commands[i]) + '\n';
      }
      helpMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      helpMessage += `Page: <${page}/${pages}>\n`;
      helpMessage += `Total commands: ${totalCommands}\n`;
      helpMessage += `Type "${prefix}help all" to see all commands.\n`;
      helpMessage += `━━━━━━━━━━ 𝗠𝗘𝗦𝗦𝗔𝗡𝗗𝗥𝗔 𝗚𝗣𝗧-4 ━━━━━━━━━\n`;

      return api.sendMessage(helpMessage, event.threadID, event.messageID);

    } else if (input === 'all') {
      // Show all commands
      let helpMessage = `━━━ 𝙰𝙻𝙻 𝙲𝙾𝙼𝙼𝙰𝙽𝙳𝚂 ━━━\n\n`;
      for (const cmd of commands) {
        helpMessage += formatCommand(cmd) + '\n';
      }
      helpMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      helpMessage += `Total commands: ${totalCommands}\n`;
      helpMessage += `━━━━━━━━━━ LLAMA ASSISTANT━━━━━━━━━\n`;

      return api.sendMessage(helpMessage, event.threadID, event.messageID);

    } else {
      // Show details for specific command
      const allCommands = [...Utils.handleEvent, ...Utils.commands].map(c => c[1]);
      const command = allCommands.find(cmd =>
        cmd.name.toLowerCase() === input ||
        (cmd.aliases && cmd.aliases.some(a => a.toLowerCase() === input))
      );

      if (!command) {
        return api.sendMessage(`❌ Command "${input}" not found.`, event.threadID, event.messageID);
      }

      const {
        name,
        version,
        role,
        aliases = [],
        description,
        usage,
        credits,
        cooldown,
        hasPrefix
      } = command;

      const roleMap = {
        0: 'User',
        1: 'Admin',
        2: 'Thread Admin',
        3: 'Super Admin'
      };

      const message = 
`「 Command Info 」

➛ Name: ${name}
➛ Version: ${version || 'N/A'}
➛ Permission: ${roleMap[role] || 'Unknown'}
${aliases.length ? `➛ Aliases: ${aliases.join(', ')}` : ''}
${description ? `➛ Description: ${description}` : ''}
${usage ? `➛ Usage: ${usage}` : ''}
${credits ? `➛ Credits: ${credits}` : ''}
${cooldown ? `➛ Cooldown: ${cooldown} second(s)` : ''}
➛ Requires Prefix: ${hasPrefix ? 'Yes' : 'No'}
`;

      return api.sendMessage(message, event.threadID, event.messageID);
    }

  } catch (error) {
    console.error("Help Command Error:", error);
    return api.sendMessage('⚠️ Something went wrong while fetching help.', event.threadID, event.messageID);
  }
};

module.exports.handleEvent = async function ({ api, event, prefix }) {
  const { threadID, messageID, body } = event;
  if (body?.toLowerCase().startsWith('prefix')) {
    const message = prefix ? `ℹ️ Current prefix: "${prefix}"` : "ℹ️ No prefix set.";
    api.sendMessage(message, threadID, messageID);
  }
};
