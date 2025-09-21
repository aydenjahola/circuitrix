const { SlashCommandBuilder } = require("discord.js");
const { requireVC, requireQueue } = require("../../utils/musicGuards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pauses the current song."),
  category: "Music",

  async execute(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: false });

      requireVC(interaction);
      const queue = requireQueue(client, interaction);

      if (queue.paused) {
        return interaction.followUp({
          content: "⏸️ Music is already paused.",
          ephemeral: true,
        });
      }

      queue.pause();
      return interaction.followUp("⏸️ Paused the current song!");
    } catch (e) {
      console.error("pause command failed:", e);
      const msg = e?.message || "❌ Failed to pause the music.";
      // If something above threw (e.g., guards), ensure user gets a response
      if (interaction.deferred || interaction.replied) {
        return interaction.followUp({ content: msg, ephemeral: true });
      }
      return interaction.reply({ content: msg, ephemeral: true });
    }
  },
};
