const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pauses the current song"),
  category: "Music",

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);

    if (!queue) {
      return interaction.reply("❌ There is no music playing!");
    }

    if (queue.paused) {
      return interaction.reply("⏸️ Music is already paused!");
    }

    try {
      await queue.pause();
      interaction.reply("⏸️ Paused the current song!");
    } catch (error) {
      console.error(error);
      interaction.reply("❌ Failed to pause the music.");
    }
  },
};
