const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Loop the current song or entire queue")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Loop mode")
        .setRequired(true)
        .addChoices(
          { name: "Track (Current Song)", value: "track" },
          { name: "Queue (All Songs)", value: "queue" },
          { name: "Off (Disable Loop)", value: "off" }
        )
    ),
  category: "Music",

  async execute(interaction, client) {
    await interaction.deferReply();

    const queue = client.distube.getQueue(interaction.guildId);
    const mode = interaction.options.getString("mode");

    if (!queue || !queue.songs.length) {
      return interaction.followUp("❌ There is no music playing!");
    }

    try {
      let modeValue;
      let modeText;

      switch (mode) {
        case "track":
          modeValue = 1;
          modeText = "🔂 Track Loop";
          break;
        case "queue":
          modeValue = 2;
          modeText = "🔁 Queue Loop";
          break;
        case "off":
          modeValue = 0;
          modeText = "▶️ Loop Disabled";
          break;
        default:
          modeValue = 0;
          modeText = "▶️ Loop Disabled";
      }

      await queue.setRepeatMode(modeValue);

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("🔁 Loop Mode Updated")
        .setDescription(
          `**${modeText}**\n\nCurrent song: **${queue.songs[0].name}**`
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.followUp({ embeds: [embed] });
    } catch (error) {
      console.error("Error setting loop mode:", error);
      await interaction.followUp(
        "❌ Failed to set loop mode. Please try again."
      );
    }
  },
};
