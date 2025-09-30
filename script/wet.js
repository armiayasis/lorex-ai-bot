const axios = require('axios');

module.exports.config = {
  name: 'weather',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['wtr', 'forecast'],
  description: 'Get current weather information by location',
  usages: 'weather <location>',
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;
  const messageID = event.messageID;

  const query = args.join(" ");
  if (!query) {
    return api.sendMessage("🌤️ Please provide a location.\n\nUsage: weather <city>", threadID, messageID);
  }

  try {
    const res = await axios.get(`https://arychauhann.onrender.com/api/weather`, {
      params: { search: query }
    });

    const weather = res.data.result;
    if (!weather) throw new Error("Invalid response");

    const { location, current } = weather;
    const msg = 
`🌤️ 𝗪𝗲𝗮𝘁𝗵𝗲𝗿 𝗨𝗽𝗱𝗮𝘁𝗲: ${location.name}, ${location.country}

📍 Region: ${location.region}
🕓 Local Time: ${location.localtime}

🌡️ Temp: ${current.temp_c}°C / ${current.temp_f}°F
🌡️ Feels Like: ${current.feelslike_c}°C
💧 Humidity: ${current.humidity}%
☁️ Condition: ${current.condition.text}
💨 Wind: ${current.wind_kph} kph (${current.wind_dir})
🌧️ Precipitation: ${current.precip_mm} mm
🌞 UV Index: ${current.uv}
🔭 Visibility: ${current.vis_km} km
🧭 Pressure: ${current.pressure_mb} mb`;

    const imageUrl = current.condition.iconUrl;

    return api.sendMessage({
      body: msg,
      attachment: await global.utils.getStreamFromURL(imageUrl)
    }, threadID, messageID);

  } catch (err) {
    console.error(err);
    return api.sendMessage("⚠️ Unable to fetch weather data. Try again later or check the location name.", threadID, messageID);
  }
};
