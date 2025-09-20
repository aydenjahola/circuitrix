const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Displays server statistics."),
  category: "Utils",

  async execute(interaction) {
    try {
      const totalMembers = interaction.guild.memberCount;

      const onlineMembers = interaction.guild.members.cache.filter(
        (member) => member.presence?.status !== "offline"
      ).size;

      const offlineMembers = totalMembers - onlineMembers;
      const humanMembers = interaction.guild.members.cache.filter(
        (member) => !member.user.bot
      ).size;
      const botMembers = totalMembers - humanMembers;

      const statsEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Server Statistics")
        .addFields(
          {
            name: "Total Members",
            value: totalMembers.toString(),
            inline: true,
          },
          {
            name: "Online Members",
            value: onlineMembers.toString(),
            inline: true,
          },
          {
            name: "Offline Members",
            value: offlineMembers.toString(),
            inline: true,
          },
          {
            name: "Human Members",
            value: humanMembers.toString(),
            inline: true,
          },
          { name: "Bot Members", value: botMembers.toString(), inline: true }
        )
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [statsEmbed] });
    } catch (error) {
      console.error("Error executing the stats command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
