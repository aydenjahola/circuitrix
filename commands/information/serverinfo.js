const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Displays information about the server"),
  category: "Information",

  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const serverInfoEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Server Information")
        .addFields(
          { name: "Server Name", value: guild.name, inline: true },
          {
            name: "Total Members",
            value: `${guild.memberCount}`,
            inline: true,
          },
          {
            name: "Created On",
            value: guild.createdAt.toDateString(),
            inline: true,
          },
          {
            name: "Region",
            value: guild.preferredLocale || "Unknown",
            inline: true,
          }, // Fallback to "Unknown"
          {
            name: "Verification Level",
            value: guild.verificationLevel.toString(),
            inline: true,
          } // Convert enum to string
        )
        .setThumbnail(guild.iconURL())
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.reply({
        embeds: [serverInfoEmbed],
      });
    } catch (error) {
      console.error("Error executing serverinfo command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
