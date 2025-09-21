const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays information about a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to get information about")
        .setRequired(false)
    ),
  isModOnly: true,
  category: "Moderation",

  async execute(interaction) {
    try {
      // Check if the user has the Manage Roles permission
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.ManageRoles
        )
      ) {
        await interaction.reply({
          content: "You do not have permission to use this command!",
          ephemeral: true,
        });
        return;
      }

      const user = interaction.options.getUser("user") || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);

      // Create the embed for user information
      const userInfoEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("User Information")
        .addFields(
          { name: "Username", value: user.tag, inline: true },
          {
            name: "Joined Server On",
            value: member ? member.joinedAt.toDateString() : "N/A",
            inline: true,
          },
          {
            name: "Account Created On",
            value: user.createdAt.toDateString(),
            inline: true,
          },
          {
            name: "Roles",
            value: member
              ? member.roles.cache.map((role) => role.name).join(", ")
              : "N/A",
            inline: false,
          }
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.reply({
        embeds: [userInfoEmbed],
      });
    } catch (error) {
      console.error("Error executing userinfo command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
