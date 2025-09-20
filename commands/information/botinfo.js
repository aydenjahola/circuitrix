const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Displays information about the bot"),
  category: "Information",

  async execute(interaction, client) {
    try {
      const uptime = client.uptime; // Uptime in milliseconds
      const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
      const hours = Math.floor(
        (uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
      );
      const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((uptime % (60 * 1000)) / 1000);

      const botInfoEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Bot Information")
        .addFields(
          { name: "Bot Name", value: client.user.tag, inline: true },
          {
            name: "Uptime",
            value: `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`,
            inline: true,
          },
          {
            name: "Server Count",
            value: `${client.guilds.cache.size}`,
            inline: true,
          },
          {
            name: "User Count",
            value: `${client.users.cache.size}`,
            inline: true,
          }
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.reply({
        embeds: [botInfoEmbed],
      });
    } catch (error) {
      console.error("Error executing botinfo command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
