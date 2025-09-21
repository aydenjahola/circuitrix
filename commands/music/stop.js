const { SlashCommandBuilder } = require("discord.js");
const { requireVC } = require("../../utils/musicGuards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription(
      "Stops playback, clears the queue, and leaves the voice channel."
    ),
  category: "Music",

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const vc = requireVC(interaction);
      const queue = client.distube.getQueue(interaction.guildId);

      if (!queue) {
        return interaction.followUp({
          content: "ℹ️ Nothing is playing.",
          ephemeral: true,
        });
      }

      // Clear the queue and stop playback
      // In DisTube v5, `queue.stop()` stops playback and clears upcoming songs.
      queue.stop();

      // Leave the voice channel via manager (recommended)
      client.distube.voices.leave(interaction.guildId);

      // If you use live lyrics, clean up the thread
      try {
        const live = require("../../utils/liveLyricsManager");
        await live.stop(interaction.guildId, { deleteThread: true });
      } catch {}

      return interaction.followUp(
        "⏹️ Stopped playback, cleared the queue, and left the voice channel."
      );
    } catch (e) {
      console.error("stop command failed:", e);
      const msg = e?.message || "❌ Failed to stop playback.";
      if (interaction.deferred || interaction.replied) {
        return interaction.followUp({ content: msg, ephemeral: true });
      }
      return interaction.reply({ content: msg, ephemeral: true });
    }
  },
};
