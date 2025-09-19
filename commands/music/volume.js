const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Adjust the playback volume (1-100)")
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("Volume level (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  async execute(interaction, client) {
    const volume = interaction.options.getInteger("level");
    const queue = client.distube.getQueue(interaction.guildId);

    if (!queue) {
      return interaction.reply("❌ There is no music playing!");
    }

    try {
      await queue.setVolume(volume);
      interaction.reply(`🔊 Volume set to ${volume}%!`);
    } catch (error) {
      console.error(error);
      interaction.reply("❌ Failed to adjust volume.");
    }
  },
};
