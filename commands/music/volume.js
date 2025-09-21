const { SlashCommandBuilder } = require("discord.js");
const { requireVC, requireQueue } = require("../../utils/musicGuards");

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Manage playback volume (0–200).")
    .addSubcommand((sc) =>
      sc.setName("show").setDescription("Show the current volume.")
    )
    .addSubcommand((sc) =>
      sc
        .setName("set")
        .setDescription("Set the volume to a specific level (0–200).")
        .addIntegerOption((o) =>
          o
            .setName("level")
            .setDescription("Volume percent (0–200)")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(200)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("up")
        .setDescription("Turn the volume up by N (default 10).")
        .addIntegerOption((o) =>
          o
            .setName("by")
            .setDescription("Percent to increase (1–100)")
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("down")
        .setDescription("Turn the volume down by N (default 10).")
        .addIntegerOption((o) =>
          o
            .setName("by")
            .setDescription("Percent to decrease (1–100)")
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand((sc) =>
      sc.setName("mute").setDescription("Set volume to 0%.")
    )
    .addSubcommand((sc) =>
      sc
        .setName("unmute")
        .setDescription("Restore volume to 100% (or specify level).")
        .addIntegerOption((o) =>
          o
            .setName("level")
            .setDescription("Volume percent (1–200)")
            .setMinValue(1)
            .setMaxValue(200)
        )
    ),
  category: "Music",

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      requireVC(interaction);
      const queue = requireQueue(client, interaction);

      const sub = interaction.options.getSubcommand();
      const current = clamp(Number(queue.volume ?? 100), 0, 200);

      // Helper to apply and confirm
      const apply = (val) => {
        const v = clamp(Math.round(val), 0, 200);
        queue.setVolume(v);
        const advisory = v > 100 ? " *(warning: may distort >100%)*" : "";
        return interaction.followUp(`🔊 Volume set to **${v}%**${advisory}`);
      };

      if (sub === "show") {
        const advisory = current > 100 ? " *(>100% may distort)*" : "";
        return interaction.followUp(
          `🔊 Current volume: **${current}%**${advisory}`
        );
      }

      if (sub === "set") {
        const level = interaction.options.getInteger("level", true);
        return apply(level);
      }

      if (sub === "up") {
        const step = interaction.options.getInteger("by") ?? 10;
        return apply(current + step);
      }

      if (sub === "down") {
        const step = interaction.options.getInteger("by") ?? 10;
        return apply(current - step);
      }

      if (sub === "mute") {
        return apply(0);
      }

      if (sub === "unmute") {
        const level = interaction.options.getInteger("level") ?? 100;
        return apply(level);
      }

      return interaction.followUp({
        content: "❌ Unknown subcommand.",
        ephemeral: true,
      });
    } catch (e) {
      console.error("volume command failed:", e);
      const msg = e?.message || "❌ Failed to adjust volume.";
      if (interaction.deferred || interaction.replied) {
        return interaction.followUp({ content: msg, ephemeral: true });
      }
      return interaction.reply({ content: msg, ephemeral: true });
    }
  },
};
