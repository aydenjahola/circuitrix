const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("Shows how long the bot has been running"),
  category: "Core",

  async execute(interaction, client) {
    try {
      const uptime = client.uptime;
      const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
      const hours = Math.floor(
        (uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
      );
      const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((uptime % (60 * 1000)) / 1000);
      const serverName = interaction.guild.name;

      const uptimeEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Bot Uptime")
        .setDescription(`The bot has been online for:`)
        .addFields(
          { name: "Days", value: `${days}`, inline: true },
          { name: "Hours", value: `${hours}`, inline: true },
          { name: "Minutes", value: `${minutes}`, inline: true },
          { name: "Seconds", value: `${seconds}`, inline: true }
        )
        .setTimestamp()
        .setFooter({
          text: `${serverName} | Made with ❤️ by Ayden`,
          iconURL: client.user.displayAvatarURL(),
        });

      await interaction.reply({
        embeds: [uptimeEmbed],
      });
    } catch (error) {
      console.error("Error executing the uptime command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
