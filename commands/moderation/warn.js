const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const Warning = require("../../models/warning");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issue a warning to a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to warn")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("The reason for the warning")
        .setRequired(true)
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

      const user = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");
      const member = interaction.guild.members.cache.get(user.id);

      // Save the warning to the database
      const warning = new Warning({
        userId: user.id,
        guildId: interaction.guild.id,
        reason: reason,
      });

      await warning.save();

      const logChannelId = process.env.LOG_CHANNEL_ID;
      const logChannel = interaction.guild.channels.cache.get(logChannelId);

      if (!logChannel) {
        await interaction.reply({
          content: "Log channel not found!",
          ephemeral: true,
        });
        return;
      }

      // Create and send the warning log to the log channel
      const warnEmbed = new EmbedBuilder()
        .setColor("#ffcc00")
        .setTitle("User Warned")
        .addFields(
          { name: "User", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Reason", value: reason, inline: true },
          { name: "Issued By", value: interaction.user.tag, inline: true },
          { name: "Date", value: new Date().toLocaleString(), inline: true }
        )
        .setTimestamp()
        .setFooter({
          text: `Warned in ${interaction.guild.name}`,
          iconURL: interaction.guild.iconURL(),
        });

      await logChannel.send({ embeds: [warnEmbed] });

      // Send a DM to the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#ffcc00")
          .setTitle("Warning Notice")
          .setDescription(
            `You have been warned in **${interaction.guild.name}**.`
          )
          .addFields(
            { name: "Reason", value: reason, inline: false },
            { name: "Issued By", value: interaction.user.tag, inline: false },
            { name: "Date", value: new Date().toLocaleString(), inline: false }
          )
          .setFooter({
            text: `Please follow the rules of ${interaction.guild.name}`,
            iconURL: interaction.guild.iconURL(),
          })
          .setTimestamp();

        await user.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.error("Error sending DM to user:", dmError);
        await interaction.reply({
          content: `Failed to send a DM to ${user.tag}.`,
          ephemeral: true,
        });
        return;
      }

      // Notify the mod who issued the warning
      await interaction.reply({
        content: `Successfully warned ${user.tag} for: ${reason}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error executing warn command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
