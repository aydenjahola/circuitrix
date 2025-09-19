const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Shows information about the current song"),
  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);

    if (!queue || !queue.songs.length) {
      return interaction.reply("❌ There is no music playing!");
    }

    const song = queue.songs[0];
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("🎵 Now Playing")
      .setDescription(`**${song.name}**`)
      .addFields(
        { name: "Duration", value: song.formattedDuration, inline: true },
        { name: "Requested by", value: song.user.toString(), inline: true },
        { name: "URL", value: song.url || "No URL available" }
      )
      .setThumbnail(song.thumbnail || null);

    interaction.reply({ embeds: [embed] });
  },
};
