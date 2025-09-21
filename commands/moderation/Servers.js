const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("servers")
    .setDescription("Displays a list of servers the bot is currently in"),
  isModOnly: true,
  category: "Moderation",

  async execute(interaction) {
    try {
      // Check if the user has the Manage Server permission
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.ManageGuild
        )
      ) {
        await interaction.reply({
          content: "You do not have permission to use this command!",
          ephemeral: false,
        });
        return;
      }

      const guilds = interaction.client.guilds.cache.map((guild) => ({
        name: guild.name,
        memberCount: guild.memberCount,
        id: guild.id,
      }));

      const serversEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Servers the Bot is In")
        .setDescription(`Currently in ${guilds.length} servers`)
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      guilds.forEach((guild) => {
        serversEmbed.addFields({
          name: guild.name,
          value: `ID: ${guild.id}\nMembers: ${guild.memberCount}`,
          inline: true,
        });
      });

      await interaction.reply({
        embeds: [serversEmbed],
        ephemeral: false,
      });
    } catch (error) {
      console.error("Error executing servers command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: false,
      });
    }
  },
};
