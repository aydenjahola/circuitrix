const { SlashCommandBuilder } = require("discord.js");
const VerificationCode = require("../../models/VerificationCode");
const ServerSettings = require("../../models/ServerSettings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("code")
    .setDescription("Verify your account with a verification code")
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("Your verification code")
        .setRequired(true)
    ),
  category: "Verification",

  async execute(interaction, client) {
    // Fetch server settings from the database
    const serverSettings = await ServerSettings.findOne({
      guildId: interaction.guild.id,
    });

    if (!serverSettings) {
      return interaction.reply({
        content:
          "Server settings have not been configured yet. Please contact an administrator.",
        ephemeral: true,
      });
    }

    // Ensure command is only used in the specified verification channel
    const verificationChannelId = serverSettings.verificationChannelId;
    if (interaction.channel.id !== verificationChannelId) {
      return interaction.reply({
        content: `This command can only be used in <#${verificationChannelId}> channel.`,
        ephemeral: true,
      });
    }

    const code = interaction.options.getString("code");

    if (!code) {
      return interaction.reply({
        content:
          "Please provide the verification code sent to your email address.",
        ephemeral: true,
      });
    }

    try {
      // Find the verification code and user email in the database
      const verificationEntry = await VerificationCode.findOne({
        userId: interaction.user.id,
        code,
      });

      if (!verificationEntry) {
        return interaction.reply({
          content: "Invalid or expired verification code. Please try again.",
          ephemeral: true,
        });
      }

      const guild = client.guilds.cache.get(interaction.guild.id);

      if (!guild) {
        console.error("Guild not found.");
        return interaction.reply({
          content: "The guild could not be found.",
          ephemeral: true,
        });
      }

      const member = guild.members.cache.get(interaction.user.id);

      if (!member) {
        console.error("Member not found in the guild.");
        return interaction.reply({
          content: "You are not a member of the guild.",
          ephemeral: true,
        });
      }

      const role = guild.roles.cache.find(
        (r) => r.name === serverSettings.verifiedRoleName
      );

      if (!role) {
        console.error(`Role "${serverSettings.verifiedRoleName}" not found.`);
        return interaction.reply({
          content: `The role "${serverSettings.verifiedRoleName}" could not be found.`,
          ephemeral: true,
        });
      }

      if (member.roles.cache.has(role.id)) {
        return interaction.reply({
          content: "You are already verified!",
          ephemeral: true,
        });
      }

      // Add the verified role to the member
      await member.roles.add(role);
      // Delete the verification code entry
      await VerificationCode.deleteOne({ userId: interaction.user.id, code });

      // Get the log channel and send a log message, including the user's email
      const adminLogChannel = client.channels.cache.get(
        serverSettings.logChannelId
      );
      if (adminLogChannel) {
        await adminLogChannel.send({
          content: `🎉 **Verification Success**\nUser: <@${interaction.user.id}> (${interaction.user.tag})\nEmail: ${verificationEntry.email}\nRole: ${role.name}`,
        });
      } else {
        console.error("Admin log channel not found.");
      }

      // Get the general channel and send a welcome message
      const generalChannel = client.channels.cache.get(
        serverSettings.generalChannelId
      );
      if (generalChannel) {
        await generalChannel.send({
          content: `Welcome <@${interaction.user.id}> to the server! 🎉`,
        });
      } else {
        console.error("General channel not found.");
      }

      return interaction.reply({
        content: `Congratulations <@${interaction.user.id}>, you have been verified!`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("Error processing verification code:", err);
      return interaction.reply({
        content:
          "There was an error processing your verification. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
