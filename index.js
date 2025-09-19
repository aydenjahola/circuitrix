require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  PresenceUpdateStatus,
} = require("discord.js");
const { DisTube } = require("distube");
const { SpotifyPlugin } = require("@distube/spotify");
const { SoundCloudPlugin } = require("@distube/soundcloud");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const ServerSettings = require("./models/ServerSettings");
const seedShopItems = require("./utils/seedShopItems");
const seedSpyfallLocations = require("./utils/seedSpyfallLocations");

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
  emitNewSongOnly: true,
  plugins: [new SpotifyPlugin(), new SoundCloudPlugin()],
});

// DisTube event listeners
client.distube
  .on("playSong", (queue, song) => {
    queue.textChannel.send(
      `🎶 Playing: **${song.name}** - \`${song.formattedDuration}\``
    );
  })
  .on("addSong", (queue, song) => {
    queue.textChannel.send(
      `✅ Added: **${song.name}** - \`${song.formattedDuration}\``
    );
  })
  .on("error", (channel, error) => {
    console.error("DisTube error:", error);
    queue.textChannel.send("❌ An error occurred: " + error.message);
  })
  .on("finish", (queue) => {
    queue.textChannel.send("🎵 Queue finished!");
  })
  .on("pause", (queue) => {
    queue.textChannel.send("⏸️ Music paused!");
  })
  .on("resume", (queue) => {
    queue.textChannel.send("▶️ Music resumed!");
  })
  .on("volumeChange", (queue, volume) => {
    queue.textChannel.send(`🔊 Volume changed to ${volume}%`);
  })
  .on("noRelated", (queue) => {
    queue.textChannel.send("❌ Could not find related video for autoplay!");
  });

// Function to recursively read commands from subdirectories
function loadCommands(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      loadCommands(filePath);
    } else if (file.endsWith(".js")) {
      const command = require(filePath);
      client.commands.set(command.data.name, command);
    }
  }
}

loadCommands(path.join(__dirname, "commands"));

async function registerCommands(guildId) {
  const commands = client.commands.map((cmd) => cmd.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
      body: commands,
    });
    console.log(`🔄 Registered commands for guild: ${guildId}`);
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}

client.once("ready", async () => {
  console.log(`\n==============================`);
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`==============================`);

  const guilds = client.guilds.cache.map((guild) => guild.id);
  await Promise.all(
    guilds.map(async (guildId) => {
      await seedShopItems(guildId);
      await seedSpyfallLocations(guildId);
      await registerCommands(guildId);
    })
  );

  client.user.setPresence({
    activities: [{ name: "Degenerate Gamers!", type: 3 }],
    status: PresenceUpdateStatus.Online,
  });
  console.log(`\n==============================\n`);
});

client.on("guildCreate", async (guild) => {
  try {
    await ServerSettings.create({ guildId: guild.id });
    console.log(`✅ Registered new server: ${guild.name} (ID: ${guild.id})`);
    await seedShopItems(guild.id);
    await seedSpyfallLocations(guild.id);
    await registerCommands(guild.id);
  } catch (error) {
    console.error("Error registering new server or commands:", error);
  }
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ Failed to connect to MongoDB", err));

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error("Error executing command:", err);
    const replyOptions = {
      content: "Error executing command!",
      ephemeral: true,
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions);
    } else {
      await interaction.reply(replyOptions);
    }
  }
});

client.on("error", (err) => console.error("Client error:", err));
client.login(process.env.BOT_TOKEN);
