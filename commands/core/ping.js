const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong! and bot latency"),
  category: "Core",

  async execute(interaction, client) {
    try {
      const sent = await interaction.reply({
        content: "Pinging...",
        fetchReply: true,
      });

      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      const apiLatency = Math.round(client.ws.ping);
      const serverName = interaction.guild.name;

      const pingEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Pong! 🏓")
        .setDescription("Bot latency information:")
        .addFields(
          { name: "Latency", value: `${latency} ms`, inline: true },
          { name: "API Latency", value: `${apiLatency} ms`, inline: true }
        )
        .setTimestamp()
        .setFooter({
          text: `${serverName} | Made with ❤️ by Ayden`,
          iconURL: client.user.displayAvatarURL(),
        });

      await interaction.editReply({
        embeds: [pingEmbed],
      });
    } catch (error) {
      console.error("Error executing the ping command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
