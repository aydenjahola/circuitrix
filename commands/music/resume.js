const { SlashCommandBuilder } = require("discord.js");
const { requireVC, requireQueue } = require("../../utils/musicGuards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resumes the paused song."),
  category: "Music",

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      requireVC(interaction);
      const queue = requireQueue(client, interaction);

      if (!queue.paused) {
        return interaction.followUp({
          content: "▶️ Music is not paused.",
          ephemeral: true,
        });
      }

      queue.resume();

      // If you use live lyrics, resume the scheduler to stay in sync
      try {
        const live = require("../../utils/liveLyricsManager");
        await live.resume(queue);
      } catch {}

      return interaction.followUp("▶️ Resumed the music!");
    } catch (e) {
      console.error("resume command failed:", e);
      const msg = e?.message || "❌ Failed to resume the music.";
      if (interaction.deferred || interaction.replied) {
        return interaction.followUp({ content: msg, ephemeral: true });
      }
      return interaction.reply({ content: msg, ephemeral: true });
    }
  },
};
