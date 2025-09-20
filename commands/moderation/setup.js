const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const ServerSettings = require("../../models/ServerSettings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure server settings for verification.")
    .addChannelOption((option) =>
      option
        .setName("logchannel")
        .setDescription("Select the log channel for logging actions.")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("generalchannel")
        .setDescription("Select the general channel for join messages.")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("verificationchannel")
        .setDescription("Select the verification channel where users verify.")
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("verifiedrole")
        .setDescription("Select the Verified role for verified users.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("emaildomains")
        .setDescription("Comma-separated list of allowed email domains.")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("actionitemschannel")
        .setDescription(
          "Select the allowed channel for action items. (Optional)"
        )
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("actionitemstargetchannel")
        .setDescription(
          "Select the target channel where action items are going to be sent. (Optional)"
        )
        .setRequired(false)
    ),
  category: "Moderation",

  async execute(interaction) {
    // Check if the user has admin permissions
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    const logChannel = interaction.options.getChannel("logchannel");
    const generalChannel = interaction.options.getChannel("generalchannel");
    const verificationChannel = interaction.options.getChannel(
      "verificationchannel"
    );
    const verifiedRole = interaction.options.getRole("verifiedrole");
    const emailDomains = interaction.options
      .getString("emaildomains")
      .split(",")
      .map((domain) => domain.trim());
    const actionitemschannel =
      interaction.options.getChannel("actionitemschannel");
    const actionitemstargetchannel = interaction.options.getChannel(
      "actionitemstargetchannel"
    );

    try {
      // Store the channel IDs instead of names
      await ServerSettings.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          guildId: interaction.guild.id,
          logChannelId: logChannel.id,
          verifiedRoleName: verifiedRole.name,
          verificationChannelId: verificationChannel.id,
          generalChannelId: generalChannel.id,
          emailDomains: emailDomains,
          actionItemsChannelId: actionitemschannel
            ? actionitemschannel.id
            : null,
          actionItemsTargetChannelId: actionitemstargetchannel
            ? actionitemstargetchannel.id
            : null,
        },
        { upsert: true, new: true }
      );

      interaction.reply({
        content: `Server settings have been updated successfully!\n
        **Log Channel**: <#${logChannel.id}>\n
        **General Channel**: <#${generalChannel.id}>\n
        **Verification Channel**: <#${verificationChannel.id}>\n
        **Verified Role**: ${verifiedRole.name}\n
        **Allowed Email Domains**: ${emailDomains.join(", ")}\n
        **Action Item Channel**: ${
          actionitemschannel ? `<#${actionitemschannel.id}>` : "None"
        }\n
        **Action Item Target Channel**: ${
          actionitemstargetchannel
            ? `<#${actionitemstargetchannel.id}>`
            : "None"
        }
        `,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error updating server settings:", error);
      interaction.reply({
        content: "There was an error updating the server settings.",
        ephemeral: true,
      });
    }
  },
};
