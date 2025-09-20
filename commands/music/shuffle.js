const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Shuffles the current queue"),
  category: "Music",

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);

    if (!queue || queue.songs.length <= 2) {
      return interaction.reply("❌ Not enough songs in the queue to shuffle!");
    }

    try {
      await queue.shuffle();
      interaction.reply("🔀 Shuffled the queue!");
    } catch (error) {
      console.error(error);
      interaction.reply("❌ Failed to shuffle the queue.");
    }
  },
};
