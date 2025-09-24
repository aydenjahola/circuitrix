require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  PresenceUpdateStatus,
} = require("discord.js");
const { DisTube, isVoiceChannelEmpty } = require("distube");
const { SpotifyPlugin } = require("@distube/spotify");
const { YouTubePlugin } = require("@distube/youtube");
const { SoundCloudPlugin } = require("@distube/soundcloud");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const ServerSettings = require("./models/ServerSettings");
const seedShopItems = require("./utils/seedShopItems");
const seedSpyfallLocations = require("./utils/seedSpyfallLocations");
const setupDisTubeEvents = require("./events/distubeEvents");

// Console colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
};

const printBanner = () => {
  console.log(`${colors.magenta}
 ▄████▄   ██▓ ██▀███   ▄████▄   █    ██  ██▓▄▄▄█████▓ ██▀███   ██▓▒██   ██▒
▒██▀ ▀█  ▓██▒▓██ ▒ ██▒▒██▀ ▀█   ██  ▓██▒▓██▒▓  ██▒ ▓▒▓██ ▒ ██▒▓██▒▒▒ █ █ ▒░
▒▓█    ▄ ▒██▒▓██ ░▄█ ▒▒▓█    ▄ ▓██  ▒██░▒██▒▒ ▓██░ ▒░▓██ ░▄█ ▒▒██▒░░  █   ░
▒▓▓▄ ▄██▒░██░▒██▀▀█▄  ▒▓▓▄ ▄██▒▓▓█  ░██░░██░░ ▓██▓ ░ ▒██▀▀█▄  ░██░ ░ █ █ ▒ 
▒ ▓███▀ ░░██░░██▓ ▒██▒▒ ▓███▀ ░▒▒█████▓ ░██░  ▒██▒ ░ ░██▓ ▒██▒░██░▒██▒ ▒██▒
░ ░▒ ▒  ░░▓  ░ ▒▓ ░▒▓░░ ░▒ ▒  ░░▒▓▒ ▒ ▒ ░▓    ▒ ░░   ░ ▒▓ ░▒▓░░▓  ▒▒ ░ ░▓ ░
  ░  ▒    ▒ ░  ░▒ ░ ▒░  ░  ▒   ░░▒░ ░ ░  ▒ ░    ░      ░▒ ░ ▒░ ▒ ░░░   ░▒ ░
░         ▒ ░  ░░   ░ ░         ░░░ ░ ░  ▒ ░  ░        ░░   ░  ▒ ░ ░    ░  
░ ░       ░     ░     ░ ░         ░      ░              ░      ░   ░    ░  
░                     ░                                                    
  ${colors.reset}`);
  console.log(
    `${colors.cyan}${colors.bright}⚡ Circuitrix Discord Bot ${colors.reset}`
  );
  console.log(
    `${colors.cyan}${colors.bright}✨ Developed with ❤️ by Ayden ${colors.reset}`
  );
  console.log(
    `${colors.cyan}${colors.bright}🌐 https://github.com/aydenjahola ${colors.reset}\n`
  );
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

// Initialize DisTube
client.distube = new DisTube(client, {
  plugins: [
    new YouTubePlugin(), // YouTube takes priority
    new SpotifyPlugin(), // resolves Spotify → YouTube
    new SoundCloudPlugin(), // resolves SoundCloud → YouTube
  ],
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: false, // scale for big playlists
  emitAddListWhenCreatingQueue: true,
  savePreviousSongs: false, // lower memory over long sessions
  joinNewVoiceChannel: true, // smoother UX if user moves VC
});

// Function to recursively read commands from subdirectories
function loadCommands(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      loadCommands(filePath);
    } else if (file.endsWith(".js")) {
      try {
        const command = require(filePath);
        if (command.data && command.data.name) {
          client.commands.set(command.data.name, command);
          console.log(
            `${colors.green}✅ Loaded command: ${colors.reset}${colors.cyan}/${command.data.name}${colors.reset}`
          );
        }
      } catch (error) {
        console.log(
          `${colors.red}❌ Failed to load command: ${filePath}${colors.reset}`
        );
        console.error(error);
      }
    }
  }
}

// Load commands
console.log(
  `${colors.yellow}${colors.bright}📦 Loading commands...${colors.reset}`
);
loadCommands(path.join(__dirname, "commands"));
console.log(
  `${colors.green}✅ Successfully loaded ${colors.bright}${client.commands.size}${colors.reset}${colors.green} commands!${colors.reset}\n`
);

async function registerCommands(guildId) {
  const commands = client.commands.map((cmd) => cmd.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
      body: commands,
    });
    console.log(
      `${colors.green}🔄 Registered ${colors.bright}${commands.length}${colors.reset}${colors.green} commands for guild: ${colors.cyan}${guildId}${colors.reset}`
    );
  } catch (error) {
    console.log(
      `${colors.red}❌ Error registering commands for guild ${guildId}:${colors.reset}`
    );
    console.error(error);
  }
}

client.once("ready", async () => {
  printBanner();

  console.log(
    `${colors.green}${colors.bright}🚀 Bot successfully logged in as ${colors.cyan}${client.user.tag}${colors.reset}`
  );
  console.log(
    `${colors.green}${colors.bright}📊 Serving ${colors.cyan}${client.guilds.cache.size}${colors.reset}${colors.green} servers${colors.reset}`
  );
  console.log(
    `${colors.green}${colors.bright}👥 Watching ${colors.cyan}${client.users.cache.size}${colors.reset}${colors.green} users${colors.reset}\n`
  );

  // Set up DisTube events
  setupDisTubeEvents(client.distube, client.user.username);

  const guilds = client.guilds.cache.map((guild) => guild.id);
  console.log(
    `${colors.yellow}${colors.bright}⚙️  Initializing server configurations...${colors.reset}`
  );

  await Promise.all(
    guilds.map(async (guildId) => {
      await seedShopItems(guildId);
      await seedSpyfallLocations(guildId);
      await registerCommands(guildId);
    })
  );

  client.user.setPresence({
    activities: [{ name: "Powering Servers! 🚀", type: 3 }],
    status: PresenceUpdateStatus.Online,
  });

  console.log(
    `\n${colors.green}${colors.bright}🎉 Bot is now fully operational and ready!${colors.reset}`
  );
  console.log(
    `${colors.cyan}${colors.bright}==============================================${colors.reset}\n`
  );
});

client.on("guildCreate", async (guild) => {
  try {
    await ServerSettings.create({ guildId: guild.id });
    console.log(
      `${colors.green}✅ Registered new server: ${colors.cyan}${guild.name}${colors.reset} ${colors.dim}(${guild.id})${colors.reset}`
    );
    await seedShopItems(guild.id);
    await seedSpyfallLocations(guild.id);
    await registerCommands(guild.id);

    console.log(
      `${colors.green}🎉 Successfully initialized ${colors.cyan}${guild.name}${colors.reset}${colors.green} with all features!${colors.reset}`
    );
  } catch (error) {
    console.log(`${colors.red}❌ Error registering new server:${colors.reset}`);
    console.error(error);
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    // ignore bot state changes (including the music bot itself)
    if (oldState.member?.user?.bot || newState.member?.user?.bot) return;

    const guildId = oldState.guild?.id || newState.guild?.id;
    if (!guildId) return;

    const queue = client.distube.getQueue(guildId);
    if (!queue) return;

    const vc = queue.voice?.channel ?? queue.voiceChannel;
    if (!vc) return;

    // Only react to humans leaving/moving out of our VC
    const userLeftOurVC =
      oldState.channelId === vc.id && newState.channelId !== vc.id;
    if (!userLeftOurVC) return;

    // Check emptiness based on the channel they just left
    if (isVoiceChannelEmpty(oldState)) {
      client.distube.voices.leave(guildId);
      queue.textChannel?.send("🔇 Channel is empty — leaving.");
    }
  } catch (e) {
    console.error("voiceStateUpdate immediate-leave error:", e);
  }
});

// MongoDB connection
console.log(
  `${colors.yellow}${colors.bright}🔗 Connecting to MongoDB...${colors.reset}`
);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(
      `${colors.green}✅ Successfully connected to MongoDB!${colors.reset}\n`
    );
  })
  .catch((err) => {
    console.log(`${colors.red}❌ Failed to connect to MongoDB:${colors.reset}`);
    console.error(err);
    process.exit(1);
  });

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.log(
      `${colors.red}❌ Error executing command ${colors.cyan}/${interaction.commandName}${colors.reset}`
    );
    console.error(err);
    const replyOptions = {
      content: "❌ There was an error while executing this command!",
      ephemeral: true,
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions);
    } else {
      await interaction.reply(replyOptions);
    }
  }
});

client.on("error", (err) => {
  console.log(`${colors.red}${colors.bright}⚠️  Client error:${colors.reset}`);
  console.error(err);
});

process.on("unhandledRejection", (error) => {
  console.log(
    `${colors.red}${colors.bright}⚠️  Unhandled promise rejection:${colors.reset}`
  );
  console.error(error);
});

process.on("uncaughtException", (error) => {
  console.log(
    `${colors.red}${colors.bright}⚠️  Uncaught exception:${colors.reset}`
  );
  console.error(error);
});

// Login
console.log(
  `${colors.yellow}${colors.bright}🔐 Logging in to Discord...${colors.reset}`
);
client
  .login(process.env.BOT_TOKEN)
  .then(() => {
    console.log(
      `${colors.green}✅ Authentication successful!${colors.reset}\n`
    );
  })
  .catch((error) => {
    console.log(`${colors.red}❌ Failed to login to Discord:${colors.reset}`);
    console.error(error);
    process.exit(1);
  });
