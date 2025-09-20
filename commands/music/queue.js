const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Shows the current music queue."),
  category: "Music",

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue || queue.songs.length === 0) {
      return interaction.reply("❌ The queue is empty!");
    }
    const tracks = queue.songs.map(
      (song, index) =>
        `${index + 1}. ${song.name} - \`${song.formattedDuration}\``
    );
    interaction.reply(`**Current Queue:**\n${tracks.join("\n")}`);
  },
};
