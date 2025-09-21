const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { requireVC } = require("../../utils/musicGuards");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription(
      "Play a song or playlist (YouTube by default; Spotify supported)."
    )
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("URL or search query")
        .setRequired(true)
    ),
  category: "Music",

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const vc = requireVC(interaction);

      // Early permission check for better UX
      const me = interaction.guild.members.me;
      const perms = vc.permissionsFor(me);
      if (
        !perms?.has(PermissionFlagsBits.Connect) ||
        !perms?.has(PermissionFlagsBits.Speak)
      ) {
        throw new Error(
          "❌ I don't have permission to **Connect**/**Speak** in your voice channel."
        );
      }

      const query = interaction.options.getString("query", true).trim();
      if (!query) throw new Error("❌ Give me something to play.");

      // Avoid insanely long strings
      if (query.length > 2000) throw new Error("❌ Query too long.");

      // Play! (YouTube is default via plugin order)
      await client.distube.play(vc, query, {
        textChannel: interaction.channel,
        member: interaction.member,
      });

      await interaction.followUp(`🔍 Searching **${query.slice(0, 128)}**…`);
    } catch (e) {
      const msg = e?.message ?? "❌ Failed to play.";
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    }
  },
};
