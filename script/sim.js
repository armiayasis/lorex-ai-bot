
const axios = require('axios');

// Module configuration
module.exports.config = {
    name: "sim",
    version: "1.0.1",  // Bumped version for updates
    author: "Ai",  // Original author credited
    description: "A simple SimSimi-like command",
    usage: "sim <message> or reply to a message",
    hasPermission: 0,  // Assuming no special permissions needed
    usePrefix: false,
    aliases: [],  // Add aliases if needed, e.g., ['chat', 'simsimi']
    credits: 'Ai',  // Credits to the original author
    cooldowns: 0,
    dependencies: { "axios": "" }
};

// Main function (renamed from onStart to run for consistency)
module.exports.run = async function({ api, event, args }) {
    // Access control: Check author hex (consider moving to env var for security)
    const authorHex = Buffer.from(this.config.author).toString('hex');
    if (authorHex !== '5072696e6365') {  // This is hardcoded; in production, use process.env.AUTHOR_CHECK or remove if not needed
        return api.sendMessage('Access Denied', event.threadID, event.messageID);
    }

    const ID = event.messageID;  // Use event.messageID for consistency

    // Determine input: From reply or args
    let input;
    if (event.type === "message_reply") {
        input = event.messageReply.body;
    } else if (args.length > 0) {
        input = args.join(" ");
    } else {
        return api.sendMessage(`💬 | Usage: ${this.config.name} <message> or reply to a message`, event.threadID, ID);
    }

    // Validate input
    if (!input || input.trim() === "") {
        return api.sendMessage(`💬 | Please provide a message`, event.threadID, ID);
    }

    // Send loading message
    const loading = await api.sendMessage("⏳ | Loading...", event.threadID, ID);

    try {
        // Encode input for URL safety
        const encodedInput = encodeURIComponent(input);
        if (!encodedInput) {
            await api.unsendMessage(loading.messageID);
            return api.sendMessage("😔 | Invalid input. Please try again.", event.threadID, ID);
        }

        // API request with timeout
        const response = await axios.get(`https://daikyu-api.up.railway.app/api/sim-simi?talk=${encodedInput}`, {
            timeout: 10000  // Prevent hanging requests
        });

        // Check response and send message
        if (response.data && response.data.response) {
            const message = response.data.response;
            await api.unsendMessage(loading.messageID);
            api.sendMessage(message, event.threadID, ID);
        } else {
            await api.unsendMessage(loading.messageID);
            api.sendMessage("😔 | No response from SimSimi. Please try again later.", event.threadID, ID);
        }
    } catch (error) {
        await api.unsendMessage(loading.messageID);
        api.sendMessage("😔 | An error occurred. Please try again later.", event.threadID, ID);
        console.error('SimSimi API Error:', error.message);  // Log for debugging
    }
};
