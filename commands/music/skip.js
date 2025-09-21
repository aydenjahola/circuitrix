const { SlashCommandBuilder } = require("discord.js");
const { requireVC, requireQueue } = require("../../utils/musicGuards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription(
      "Skips the current song (or jump to a specific upcoming track)."
    )
    .addIntegerOption((o) =>
      o
        .setName("to")
        .setDescription(
          "Queue index to jump to (as shown in /queue). 1 = next song."
        )
        .setMinValue(1)
    ),
  category: "Music",

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      requireVC(interaction);
      const queue = requireQueue(client, interaction);

      const toIndex = interaction.options.getInteger("to"); // 1-based (1 = next)
      const total = queue.songs.length;
      const upcomingCount = Math.max(0, total - 1);

      if (upcomingCount === 0 && !queue.autoplay) {
        // Nothing to skip to, and autoplay is off -> stop and leave
        try {
          queue.stop();
        } catch {}
        client.distube.voices.leave(interaction.guildId);
        try {
          const live = require("../../utils/liveLyricsManager");
          await live.stop(interaction.guildId, { deleteThread: true });
        } catch {}
        return interaction.followUp(
          "🏁 No more songs — stopped and left the voice channel."
        );
      }

      // If user specified a target index (jump)
      if (toIndex != null) {
        if (toIndex > upcomingCount) {
          // Jumping past the end
          // Clear all upcoming; then behave like “no more songs”
          queue.songs.splice(1); // remove all upcoming
          if (!queue.autoplay) {
            try {
              queue.stop();
            } catch {}
            client.distube.voices.leave(interaction.guildId);
            try {
              const live = require("../../utils/liveLyricsManager");
              await live.stop(interaction.guildId, { deleteThread: true });
            } catch {}
            return interaction.followUp(
              `⏭️ Skipped past the end (${toIndex}). Queue empty — stopped and left.`
            );
          }
          // Autoplay on: try to skip and let autoplay find a related track
          try {
            queue.skip(); // will trigger autoplay resolution
          } catch {}
          try {
            const live = require("../../utils/liveLyricsManager");
            await live.stop(interaction.guildId, { deleteThread: true });
          } catch {}
          return interaction.followUp(
            `⏭️ Skipped past the end (${toIndex}). Autoplay will pick something.`
          );
        }

        // Remove the tracks between current and target (keep current at index 0)
        // Example: toIndex=1 -> remove none, we’ll just skip once below.
        if (toIndex > 1) {
          // delete from position 1..(toIndex-1)
          queue.songs.splice(1, toIndex - 1);
        }

        // Now the desired target is at index 1, skip once to play it
        try {
          queue.skip();
        } catch (e) {
          // If skip throws but autoplay is on, let autoplay do its thing
          if (!queue.autoplay) throw e;
        }

        // Stop any active live-lyrics thread for the current song
        try {
          const live = require("../../utils/liveLyricsManager");
          await live.stop(interaction.guildId, { deleteThread: true });
        } catch {}

        return interaction.followUp(
          `⏭️ Jumped to track **#${toIndex}** in the queue.`
        );
      }

      // Simple “skip next”
      try {
        queue.skip();
      } catch (e) {
        // If there’s no next but autoplay is on, allow autoplay
        if (!queue.autoplay) {
          // Fallback: nothing to skip to
          try {
            queue.stop();
          } catch {}
          client.distube.voices.leave(interaction.guildId);
          try {
            const live = require("../../utils/liveLyricsManager");
            await live.stop(interaction.guildId, { deleteThread: true });
          } catch {}
          return interaction.followUp(
            "🏁 No more songs — stopped and left the voice channel."
          );
        }
      }

      try {
        const live = require("../../utils/liveLyricsManager");
        await live.stop(interaction.guildId, { deleteThread: true });
      } catch {}

      return interaction.followUp("⏭️ Skipped the current song!");
    } catch (e) {
      console.error("skip command failed:", e);
      const msg = e?.message || "❌ Failed to skip.";
      if (interaction.deferred || interaction.replied) {
        return interaction.followUp({ content: msg, ephemeral: true });
      }
      return interaction.reply({ content: msg, ephemeral: true });
    }
  },
};
