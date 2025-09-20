const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Provides an invite link to add the bot to your server."),
  category: "Core",

  async execute(interaction, client) {
    try {
      const botInviteLink = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

      const inviteEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Invite the Bot to Your Server!")
        .setDescription(`**[Click here to invite the bot!](${botInviteLink})**`)
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.reply({
        embeds: [inviteEmbed],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error executing the invite command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
