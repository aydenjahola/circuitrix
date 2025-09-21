const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const TimedOutUser = require("../../models/TimedOutUser");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a user in the server")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to timeout")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration of the timeout in minutes")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the timeout")
        .setRequired(true)
    ),
  isModOnly: true,
  category: "Moderation",

  async execute(interaction) {
    let replySent = false;

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
        replySent = true;
        return;
      }

      const user = interaction.options.getUser("user");
      const duration = interaction.options.getInteger("duration");
      const reason =
        interaction.options.getString("reason") || "No reason provided";

      // Fetch the member object from the guild
      const member = await interaction.guild.members.fetch(user.id);

      if (!member) {
        await interaction.reply({
          content: "User not found in the guild!",
          ephemeral: true,
        });
        replySent = true;
        return;
      }

      // Check if the bot has permission to manage roles
      if (
        !interaction.guild.members.me.permissions.has(
          PermissionsBitField.Flags.ManageRoles
        )
      ) {
        await interaction.reply({
          content: "I do not have permission to manage roles!",
          ephemeral: true,
        });
        replySent = true;
        return;
      }

      // Ensure the bot's role is high enough to apply the timeout
      if (
        member.roles.highest.position >=
        interaction.guild.members.me.roles.highest.position
      ) {
        await interaction.reply({
          content:
            "I cannot timeout this user as they have a higher or equal role than me!",
          ephemeral: true,
        });
        replySent = true;
        return;
      }

      // Create a timeout role or use an existing one
      let timeoutRole = interaction.guild.roles.cache.find(
        (role) => role.name === "Timed Out"
      );
      if (!timeoutRole) {
        timeoutRole = await interaction.guild.roles.create({
          name: "Timed Out",
          color: "#ff0000",
          permissions: [],
        });

        // Disable send messages permission for the timeout role in all channels
        interaction.guild.channels.cache.each(async (channel) => {
          await channel.permissionOverwrites.edit(timeoutRole, {
            SendMessages: false,
          });
        });
      }

      // Apply the timeout
      await member.roles.add(timeoutRole);
      const timeoutEnd = Date.now() + duration * 60 * 1000;

      // Save timed out user to MongoDB
      await TimedOutUser.create({
        timedOutUserId: user.id,
        timedOutUserTag: user.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason: reason,
        timeoutEnd: timeoutEnd,
      });

      // Inform the user of the timeout
      try {
        await user.send({
          content: `Hello ${user.username},\n\nWe wanted to inform you that a timeout has been applied to your account in **${interaction.guild.name}**. This action was taken to ensure the community remains respectful and enjoyable for everyone.\n\n**Reason:** ${reason}\n**Duration:** ${duration} minutes\n\nPlease use this time to review our community guidelines, and we look forward to welcoming you back after the timeout ends.\n\nIf you have any questions or concerns, feel free to reach out to the moderation team once your timeout is over.\n\nThank you for understanding, and we appreciate your cooperation.\n\nBest regards,\n**${interaction.guild.name}** Moderation Team`,
        });
      } catch (dmError) {
        console.error(`Error sending DM to ${user.tag}:`, dmError);
        // Inform mod about the DM failure
        if (!replySent) {
          await interaction.reply({
            content: `Failed to send a DM to ${user.tag}. They might have DMs disabled.`,
            ephemeral: true,
          });
          replySent = true;
        }
      }

      const timeoutEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("User Timed Out")
        .setDescription(
          `${user.tag} has been timed out in the server.\nReason: ${reason}\nDuration: ${duration} minutes.`
        )
        .setTimestamp();

      // Send confirmation as ephemeral message
      if (!replySent) {
        await interaction.reply({
          embeds: [timeoutEmbed],
          ephemeral: true,
        });
        replySent = true;
      }

      // Log the timeout in a designated channel
      const logChannelId = process.env.LOG_CHANNEL_ID;
      const logChannel = interaction.guild.channels.cache.get(logChannelId);

      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("User Timed Out")
          .setDescription(
            `${user.tag} was timed out in the server. Reason: ${reason}\nDuration: ${duration} minutes.`
          )
          .setFooter({
            text: `Timed out by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      console.error("Error executing timeout command:", error);

      // If the interaction hasn't been replied to yet, reply with an error message
      if (!replySent) {
        try {
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        } catch (replyError) {
          console.error("Error replying to interaction:", replyError);
        }
      }
    }
  },
};
