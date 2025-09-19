const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips the current song."),
  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply("❌ No songs in queue!");
    try {
      await queue.skip();
      interaction.reply("⏭️ Skipped the current song!");
    } catch (error) {
      interaction.reply("❌ Failed to skip.");
    }
  },
};
