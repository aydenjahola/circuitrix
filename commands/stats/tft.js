const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tftstats")
    .setDescription("Fetches TFT player stats.")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription(
          "The TFT username to fetch stats for (e.g., Shitter#1234"
        )
        .setRequired(true)
    ),
  category: "Stats",

  async execute(interaction) {
    const username = interaction.options.getString("username");

    // Convert the username by replacing "#" with "%23"
    const formattedUsername = username.replace("#", "%23");

    const apiUrl = process.env.TRACKER_API_URL;
    const apiKey = process.env.TRACKER_API_KEY;

    const url = `https://${apiUrl}/tft/player/${formattedUsername}`;

    try {
      await interaction.deferReply();

      // Fetch data from the API
      const response = await axios.get(url, {
        headers: {
          "X-API-Key": apiKey,
        },
      });

      const data = response.data;

      const statsEmbed = new EmbedBuilder()
        .setColor("#ff4500")
        .setTitle(`${data.username}'s TFT Stats`)
        .addFields(
          {
            name: "🏆 Current Rank",
            value: data.current_rank,
          },
          {
            name: "📈 LP",
            value: `${data.lp}`,
          },
          {
            name: "🎮 Matches Played",
            value: `${data.matches_played}`,
          },
          {
            name: "🏅 Wins",
            value: `${data.wins}`,
          },
          {
            name: "💔 Losses",
            value: `${data.losses}`,
          },
          {
            name: "📊 Win Percentage",
            value: `${data.win_percentage}%`,
          }
        )
        .setTimestamp()
        .setFooter({
          text: "TFT Stats API made by Ayden",
          iconURL: interaction.guild.iconURL(),
        });

      return interaction.editReply({ embeds: [statsEmbed] });
    } catch (error) {
      console.error("Error fetching player stats:", error);
      if (error.response) {
        return interaction.editReply(
          `Error: ${error.response.data.message || error.response.statusText}`
        );
      } else {
        return interaction.editReply(
          "An error occurred while fetching player stats."
        );
      }
    }
  },
};
