const { SlashCommandBuilder } = require("discord.js");
const { requireVC, requireQueue } = require("../../utils/musicGuards");

function fisherYates(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Shuffles the up-next songs (keeps the current track).")
    .addIntegerOption((o) =>
      o
        .setName("amount")
        .setDescription(
          "Only shuffle the first N upcoming songs (default: all)."
        )
        .setMinValue(2)
    ),
  category: "Music",

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      requireVC(interaction);
      const queue = requireQueue(client, interaction);

      const total = queue.songs.length;
      if (total <= 2) {
        // 0 or 1 upcoming track is not worth shuffling
        return interaction.followUp({
          content: "❌ Not enough songs to shuffle.",
          ephemeral: true,
        });
      }

      const upcoming = queue.songs.slice(1); // exclude the currently playing track
      const amountOpt = interaction.options.getInteger("amount");
      const amount = Math.min(
        Math.max(amountOpt ?? upcoming.length, 2),
        upcoming.length
      );

      // If user didn't specify an amount, prefer DisTube's built-in shuffle
      if (amountOpt == null && typeof queue.shuffle === "function") {
        // DisTube's shuffle shuffles upcoming by default (keeps current)
        queue.shuffle();
        return interaction.followUp(
          `🔀 Shuffled **${upcoming.length}** upcoming track(s)!`
        );
      }

      // Manual partial shuffle (first N upcoming)
      const head = upcoming.slice(0, amount);
      const tail = upcoming.slice(amount);
      fisherYates(head);

      // Splice back into queue: [ current, ...shuffledHead, ...tail ]
      queue.songs.splice(1, amount, ...head);
      // tail is already in place so no need to modify if amount === upcoming.length

      return interaction.followUp(
        `🔀 Shuffled the next **${amount}** track(s).`
      );
    } catch (e) {
      console.error("shuffle command failed:", e);
      const msg = e?.message || "❌ Failed to shuffle the queue.";
      if (interaction.deferred || interaction.replied) {
        return interaction.followUp({ content: msg, ephemeral: true });
      }
      return interaction.reply({ content: msg, ephemeral: true });
    }
  },
};
