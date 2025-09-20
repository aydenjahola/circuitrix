const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const BannedUser = require("../../models/BannedUser");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bans a user from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for banning the user")
        .setRequired(true)
    ),
  isModOnly: true,
  category: "Moderation",

  async execute(interaction) {
    let replySent = false;

    try {
      // Check if the user has the Ban Members permission
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        await interaction.reply({
          content: "You do not have permission to use this command!",
          ephemeral: true,
        });
        replySent = true;
        return;
      }

      const user = interaction.options.getUser("user");
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

      // Check if the bot can ban the member
      if (
        member.roles.highest.position >=
        interaction.guild.members.me.roles.highest.position
      ) {
        await interaction.reply({
          content:
            "I cannot ban this user as they have a higher or equal role than me!",
          ephemeral: true,
        });
        replySent = true;
        return;
      }

      // Ban the user
      await member.ban({ reason });

      // Save banned user to MongoDB
      await BannedUser.create({
        bannedUserId: user.id,
        bannedUserTag: user.tag,
        bannerId: interaction.user.id,
        bannerTag: interaction.user.tag,
        reason: reason,
      });

      // Send DM to the banned user
      try {
        await user.send({
          content: `You have been banned from the server. Reason: ${reason}`,
        });
      } catch (dmError) {
        console.error(`Error sending DM to ${user.tag}:`, dmError);
        // Only reply with this if the interaction hasn't been replied to yet
        if (!replySent) {
          await interaction.reply({
            content: `Failed to send a DM to ${user.tag}. They might have DMs disabled.`,
            ephemeral: true,
          });
          replySent = true;
        }
      }

      const banEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("User Banned")
        .setDescription(
          `${user.tag} has been banned from the server.\nReason: ${reason}`
        )
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      // Send confirmation as an ephemeral message
      if (!replySent) {
        await interaction.reply({
          embeds: [banEmbed],
          ephemeral: true,
        });
        replySent = true;
      }

      // Log the ban in a designated channel
      const logChannelId = process.env.LOG_CHANNEL_ID;
      const logChannel = interaction.guild.channels.cache.get(logChannelId);

      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("User Banned")
          .setDescription(
            `${user.tag} was banned from the server. Reason: ${reason}`
          )
          .setFooter({
            text: `Banned by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      console.error("Error executing ban command:", error);

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
