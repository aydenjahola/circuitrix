const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

function fmtTime(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function makeBar(current, duration, size = 20) {
  if (!Number.isFinite(duration) || duration <= 0) {
    // For live/unknown duration, just show a moving head at start
    const head = "🔘";
    const rest = "─".repeat(size - 1);
    return `${head}${rest}`;
  }
  const ratio = Math.min(1, Math.max(0, current / duration));
  const filled = Math.round(ratio * size);
  const head = "🔘";
  const left = "─".repeat(Math.max(0, filled - 1));
  const right = "─".repeat(Math.max(0, size - filled));
  return `${left}${head}${right}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Shows information about the current song"),
  category: "Music",

  async execute(interaction, client) {
    try {
      const queue = client.distube.getQueue(interaction.guildId);
      if (!queue || !queue.songs?.length) {
        return interaction.reply("❌ There is no music playing!");
      }

      const song = queue.songs[0];
      const current = Math.floor(queue.currentTime ?? 0); // seconds
      const duration = Number.isFinite(song.duration)
        ? Math.floor(song.duration)
        : null;

      const positionStr =
        duration != null
          ? `${fmtTime(current)} / ${fmtTime(duration)}`
          : `${fmtTime(current)} / LIVE`;

      const bar = makeBar(current, duration ?? 0, 20);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("🎵 Now Playing")
        .setDescription(
          [
            `**${song.name || "Unknown title"}**`,
            "",
            `\`\`\`${bar}\`\`\``,
            `**Position:** \`${positionStr}\``,
          ].join("\n")
        )
        .addFields(
          {
            name: "Requested by",
            value: song.user?.toString?.() || "Unknown",
            inline: true,
          },
          { name: "Volume", value: `${queue.volume ?? 100}%`, inline: true },
          { name: "URL", value: song.url || "No URL available", inline: false }
        )
        .setThumbnail(song.thumbnail || null);

      return interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error("nowplaying failed:", e);
      const msg = "❌ Failed to show now playing info.";
      if (interaction.deferred || interaction.replied) {
        return interaction.followUp({ content: msg, ephemeral: true });
      }
      return interaction.reply({ content: msg, ephemeral: true });
    }
  },
};
