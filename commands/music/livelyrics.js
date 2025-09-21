const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { requireVC, requireQueue } = require("../../utils/musicGuards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("livelyrics")
    .setDescription(
      "Show synced lyrics in a live thread for the current track."
    )
    .addSubcommand((sc) =>
      sc
        .setName("start")
        .setDescription("Start live lyrics for the currently playing song.")
        .addBooleanOption((o) =>
          o
            .setName("newthread")
            .setDescription(
              "Force a new thread even if one exists (default: reuse)."
            )
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("stop")
        .setDescription("Stop live lyrics and remove the thread.")
    ),
  category: "Music",

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const sub = interaction.options.getSubcommand();

      // Make sure user is in/with the VC and there is a queue
      requireVC(interaction);
      const queue = requireQueue(client, interaction);

      // Lazy-load manager to avoid circular requires on startup
      const live = require("../../utils/liveLyricsManager");

      if (sub === "start") {
        const forceNew = interaction.options.getBoolean("newthread") ?? false;

        // If a thread is already running and user didn't force, just re-sync and say it's on
        if (!forceNew) {
          // Re-sync to current time if already active (no-op otherwise)
          await live.resume(queue);
          await live.seek(queue);
        } else {
          // Ensure any old thread is removed before starting a new one
          await live.stop(queue.id, { deleteThread: true });
        }

        const song = queue.songs?.[0];
        if (!song) {
          return interaction.followUp("❌ Nothing is playing.");
        }

        await live.start(queue, song);
        return interaction.followUp(
          "🎤 Live lyrics started. I’ll post lines in a thread (or here if I can’t create one)."
        );
      } else if (sub === "stop") {
        await live.stop(queue.id, { deleteThread: true });
        return interaction.followUp(
          "🧹 Stopped live lyrics and removed the thread."
        );
      }

      return interaction.followUp("❌ Unknown subcommand.");
    } catch (e) {
      const msg = e?.message ?? "❌ Failed to run /livelyrics.";
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    }
  },
};
