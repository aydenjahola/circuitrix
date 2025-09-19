const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resumes the paused song"),
  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);

    if (!queue) {
      return interaction.reply("❌ There is no music playing!");
    }

    if (!queue.paused) {
      return interaction.reply("▶️ Music is not paused!");
    }

    try {
      await queue.resume();
      interaction.reply("▶️ Resumed the music!");
    } catch (error) {
      console.error(error);
      interaction.reply("❌ Failed to resume the music.");
    }
  },
};
