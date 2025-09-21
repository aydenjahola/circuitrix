const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const ServerSettings = require("../../models/ServerSettings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serversettings")
    .setDescription("Displays the current server settings"),

  isModOnly: true,
  category: "Moderation",

  async execute(interaction) {
    let replySent = false;

    try {
      // Check if the user has the Administrator permission
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        await interaction.reply({
          content: "You do not have permission to use this command!",
          ephemeral: true,
        });
        replySent = true;
        return;
      }

      // Fetch the server settings from MongoDB
      const serverSettings = await ServerSettings.findOne();

      if (!serverSettings) {
        await interaction.reply({
          content: "No server settings found.",
          ephemeral: true,
        });
        replySent = true;
        return;
      }

      // Get channel mentions based on channel IDs
      const generalChannel = interaction.guild.channels.cache.get(
        serverSettings.generalChannelId
      );
      const logChannel = interaction.guild.channels.cache.get(
        serverSettings.logChannelId
      );
      const verificationChannel = interaction.guild.channels.cache.get(
        serverSettings.verificationChannelId
      );

      const generalChannelMention = generalChannel
        ? `<#${generalChannel.id}>`
        : "None";
      const logChannelMention = logChannel ? `<#${logChannel.id}>` : "None";
      const verificationChannelMention = verificationChannel
        ? `<#${verificationChannel.id}>`
        : "None";

      const emailDomains =
        serverSettings.emailDomains && serverSettings.emailDomains.length > 0
          ? serverSettings.emailDomains.join(", ")
          : "None";

      const actionItemsChannel = interaction.guild.channels.cache.get(
        serverSettings.actionItemsChannelId
      );

      const actionItemsTargetChannel = interaction.guild.channels.cache.get(
        serverSettings.actionItemsTargetChannelId
      );

      const settingsEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("🌟 Current Server Settings 🌟")
        .addFields(
          { name: "🆔 Guild ID", value: serverSettings.guildId, inline: true },
          {
            name: "📢 General Channel",
            value: generalChannelMention,
            inline: true,
          },
          { name: "📜 Log Channel", value: logChannelMention, inline: true },
          {
            name: "🔒 Verification Channel",
            value: verificationChannelMention,
            inline: true,
          },
          {
            name: "✅ Verified Role Name",
            value: serverSettings.verifiedRoleName || "None",
            inline: true,
          },
          { name: "📧 Email Domains", value: emailDomains, inline: true },
          {
            name: "📋 Action Items Channel",
            value: actionItemsChannel ? `<#${actionItemsChannel.id}>` : "None",
            inline: true,
          },
          {
            name: "🎯 Action Items Target Channel",
            value: actionItemsTargetChannel
              ? `<#${actionItemsTargetChannel.id}>`
              : "None",
            inline: true,
          }
        )
        .setTimestamp()
        .setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL(),
        });

      await interaction.reply({ embeds: [settingsEmbed], ephemeral: false });
    } catch (error) {
      console.error("Error executing server settings command:", error);

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
