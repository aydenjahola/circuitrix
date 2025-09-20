const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("csstats")
    .setDescription("Fetches CS2 player stats.")
    .addStringOption((option) =>
      option
        .setName("steam_id")
        .setDescription("The Steam ID to fetch stats for.")
        .setRequired(true)
    ),
  category: "Stats",

  async execute(interaction) {
    const steamId = interaction.options.getString("steam_id");

    const apiUrl = process.env.TRACKER_API_URL;
    const apiKey = process.env.TRACKER_API_KEY;

    const url = `https://${apiUrl}/cs2/player/${steamId}`;

    try {
      await interaction.deferReply();

      const response = await axios.get(url, {
        headers: {
          "X-API-Key": apiKey,
        },
      });

      const data = response.data;

      const statsEmbed = new EmbedBuilder()
        .setColor("#ff4500")
        .setTitle(`CS2 Stats for Steam ID: ${data.steam_id}`);

      const fields = [
        { name: "🎮 Steam Name", value: data.player_name || "N/A" },
        { name: "⏳ Hours Played", value: `${data.hours_played}h` },
        {
          name: "🎮 Total Matches Played (Competitive)",
          value: `${data.total_gg_matches_played}`,
        },
        { name: "🎮 Kills", value: `${data.kills}` },
        { name: "📈 K/D Ratio", value: `${data.kd_ratio}` },
        { name: "🏅 Total Deaths", value: `${data.total_deaths}` },
        { name: "🏅 Wins", value: `${data.total_wins}` },
        { name: "⚔️ Total Damage Done", value: `${data.total_damage_done}` },
        { name: "💰 Total Money Earned", value: `${data.total_money_earned}` },
        { name: "🏆 Total MVPs", value: `${data.total_mvps}` },
      ];

      // Adding additional fields dynamically
      const additionalFields = [
        {
          name: "Total Matches Played (All Modes)",
          value: `${data.total_matches_played}`,
          inline: true,
        },
        {
          name: "Total Planted Bombs",
          value: `${data.total_planted_bombs}`,
          inline: true,
        },
        {
          name: "Total Defused Bombs",
          value: `${data.total_defused_bombs}`,
          inline: true,
        },
        {
          name: "Total Weapons Donated",
          value: `${data.total_weapons_donated}`,
          inline: true,
        },
        {
          name: "Total Rounds Played",
          value: `${data.total_rounds_played}`,
          inline: true,
        },
        {
          name: "Total Domination Overkills",
          value: `${data.total_domination_overkills}`,
          inline: true,
        },
        {
          name: "Total Revenges",
          value: `${data.total_revenges}`,
          inline: true,
        },
        {
          name: "Total Kills (AWP)",
          value: `${data.total_kills_awp}`,
          inline: true,
        },
        {
          name: "Total Kills (AK47)",
          value: `${data.total_kills_ak47}`,
          inline: true,
        },
        {
          name: "Total Kills (M4A1)",
          value: `${data.total_kills_m4a1}`,
          inline: true,
        },
        {
          name: "Total Kills (Headshot)",
          value: `${data.total_kills_headshot}`,
          inline: true,
        },
        {
          name: "Total Wins (Pistol Round)",
          value: `${data.total_wins_pistolround}`,
          inline: true,
        },
        {
          name: "Total Rounds (Dust2)",
          value: `${data.total_rounds_map_de_dust2}`,
          inline: true,
        },
      ];

      // Add each additional field if it exists and its value is greater than 0
      additionalFields.forEach((field) => {
        if (field.value > 0) {
          fields.push(field);
        }
      });

      statsEmbed.addFields(fields).setTimestamp().setFooter({
        text: "CS2 Stats API made by Ayden",
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
