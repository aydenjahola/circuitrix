const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops the music and clears the queue."),
  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply("❌ No music is playing!");
    try {
      await client.distube.stop(interaction.guildId);
      interaction.reply("🛑 Stopped the player and cleared the queue!");
    } catch (error) {
      interaction.reply("❌ Failed to stop.");
    }
  },
};
