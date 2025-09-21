const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const KickedUser = require("../../models/KickedUser");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kicks a user from the server")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to kick")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for kicking the user")
        .setRequired(true)
    ),
  isModOnly: true,
  category: "Moderation",

  async execute(interaction) {
    try {
      // Check if the user has the Kick Members permission
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.KickMembers)
      ) {
        await interaction.reply({
          content: "You do not have permission to use this command!",
          ephemeral: true,
        });
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
        return;
      }

      // Check if the bot can kick the member
      if (
        member.roles.highest.position >=
        interaction.guild.members.me.roles.highest.position
      ) {
        await interaction.reply({
          content:
            "I cannot kick this user as they have a higher or equal role than me!",
          ephemeral: true,
        });
        return;
      }

      // Kick the user
      await member.kick(reason);

      // Save kicked user to MongoDB
      await KickedUser.create({
        kickedUserId: user.id,
        kickedUserTag: user.tag,
        kickerId: interaction.user.id,
        kickerTag: interaction.user.tag,
        reason: reason,
      });

      // Send DM to the kicked user
      try {
        await user.send({
          content: `You have been kicked from the server. Reason: ${reason}`,
        });
      } catch (dmError) {
        console.error(`Error sending DM to ${user.tag}:`, dmError);
        // Handle DM errors appropriately, if needed
      }

      const kickEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("User Kicked")
        .setDescription(
          `${user.tag} has been kicked from the server.\nReason: ${reason}`
        )
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      // Send confirmation as ephemeral message
      await interaction.reply({
        embeds: [kickEmbed],
        ephemeral: true,
      });

      // Log the kick in a designated channel
      const logChannelId = process.env.LOG_CHANNEL_ID;
      const logChannel = interaction.guild.channels.cache.get(logChannelId);

      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("User Kicked")
          .setDescription(
            `${user.tag} was kicked from the server. Reason: ${reason}`
          )
          .setFooter({
            text: `Kicked by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      console.error("Error executing kick command:", error);

      try {
        if (!interaction.replied) {
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        }
      } catch (replyError) {
        console.error("Error replying to interaction:", replyError);
      }
    }
  },
};
