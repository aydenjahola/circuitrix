const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("valstats")
    .setDescription("Fetches Valorant player stats.")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription(
          "The Valorant username to fetch stats for (e.g., Shitter#1234)"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("stats_type")
        .setDescription("Type of stats to fetch")
        .addChoices(
          { name: "Current Act Stats", value: "current" },
          { name: "All Acts Stats", value: "all" }
        )
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("include_weapons")
        .setDescription("Include top weapons stats?")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("include_maps")
        .setDescription("Include top maps stats?")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("include_roles")
        .setDescription("Include roles stats?")
        .setRequired(false)
    ),
  category: "Stats",

  async execute(interaction) {
    // Immediately defer the reply
    await interaction.deferReply();

    const username = interaction.options.getString("username");

    // Check if username contains '#'
    if (!username.includes("#")) {
      return interaction.editReply({
        content:
          "Error: Please include your tag in the username (e.g., Shitter#1234).",
        ephemeral: true,
      });
    }

    const statsType = interaction.options.getString("stats_type");
    const includeWeapons = interaction.options.getBoolean("include_weapons");
    const includeMaps = interaction.options.getBoolean("include_maps");
    const includeRoles = interaction.options.getBoolean("include_roles");

    // Convert the username by replacing "#" with "%23"
    const formattedUsername = username.replace("#", "%23");

    const apiUrl = process.env.TRACKER_API_URL;
    const apiKey = process.env.TRACKER_API_KEY;

    // Use statsType for the main URL
    const url = `https://${apiUrl}/valorant/player/${formattedUsername}/${statsType}`;

    try {
      const response = await axios.get(url, {
        headers: {
          "X-API-Key": apiKey,
        },
      });

      const data = response.data;

      // Create the embed for player stats
      const statsEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`${data.username}'s Valorant Stats`)
        .setDescription(`${data.username}'s **${data.season}** stats`)
        .addFields(
          {
            name: "🏆 Current Rank",
            value: data.current_rank,
          },
          {
            name: "🔝 Peak Rank",
            value: `${data.peak_rank} (${data.peak_rank_episode})`,
          },
          {
            name: "⏳ Hours Played",
            value: `${data.playtime_hours}h`,
          },
          {
            name: "🎮 Matches Played",
            value: `${data.matches_played}`,
          },
          { name: "🏅 Wins", value: `${data.wins}` },
          {
            name: "📊 Win Percentage",
            value: `${data.win_percentage}%`,
          },
          { name: "⚔️ Kills", value: `${data.kills}` },
          {
            name: "📈 K/D Ratio",
            value: `${data.kd_ratio}`,
          },
          {
            name: "📊 ACS",
            value: `${data.acs}`,
          },
          {
            name: "🎯 Headshot Percentage",
            value: `${data.headshot_percentage}%`,
          }
        )
        .setTimestamp()
        .setFooter({
          text: "Valorant Stats API made by Ayden",
          iconURL: interaction.guild.iconURL(),
        });

      // Add the Tracker Score field only if statsType is "current"
      if (statsType === "current") {
        statsEmbed.addFields({
          name: "💯 Tracker Score",
          value: `${data.tracker_score}/1000`,
        });
      }

      const embeds = [statsEmbed];

      // Optional weapons embed
      if (includeWeapons) {
        const weaponsEmbed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle(`${data.username}'s Top Weapons`)
          .setDescription(`${data.username}'s top weapons stats:`)
          .setTimestamp()
          .setFooter({
            text: "Valorant Stats API made by Ayden",
            iconURL: interaction.guild.iconURL(),
          });

        // Use a counter to number the weapons
        data.top_weapons.forEach((weapon, index) => {
          if (weapon.weapon_name) {
            const accuracy = Array.isArray(weapon.weapon_accuracy)
              ? weapon.weapon_accuracy
              : ["N/A", "N/A", "N/A"];
            const formattedAccuracy = `Head: ${accuracy[0]}\nBody: ${accuracy[1]}\nLegs: ${accuracy[2]}`;

            weaponsEmbed.addFields({
              name: `${index + 1}. ${weapon.weapon_name}`, // Include numbering
              value:
                `Type: ${weapon.weapon_type}\n` +
                `Kills: ${weapon.weapon_kills}\n` +
                `**Accuracy**: \n${formattedAccuracy}\n`,
              inline: true,
            });
          } else {
            console.warn("Weapon name is undefined:", weapon);
          }
        });

        embeds.push(weaponsEmbed);
      }

      // Optional maps embed
      if (includeMaps) {
        const mapsEmbed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle(`${data.username}'s Top Maps`)
          .setDescription(`${data.username}'s top maps stats:`)
          .setTimestamp()
          .setFooter({
            text: "Valorant Stats API made by Ayden",
            iconURL: interaction.guild.iconURL(),
          });

        // Use a counter to number the maps
        data.top_maps.forEach((map, index) => {
          if (map.map_name) {
            mapsEmbed.addFields({
              name: `${index + 1}. ${map.map_name}`,
              value: `Win Percentage: ${map.map_win_percentage}%\nMatches: ${map.map_matches}`,
              inline: true,
            });
          } else {
            console.warn("Map name is undefined:", map);
          }
        });

        embeds.push(mapsEmbed);
      }

      // Optional roles embed
      if (includeRoles) {
        const rolesEmbed = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle(`${data.username}'s Roles`)
          .setDescription(`${data.username}'s performance by role:`)
          .setTimestamp()
          .setFooter({
            text: "Valorant Stats API made by Ayden",
            iconURL: interaction.guild.iconURL(),
          });

        // Use a counter to number the roles
        data.roles.forEach((role, index) => {
          if (role.role_name) {
            rolesEmbed.addFields({
              name: `${index + 1}. ${role.role_name}`,
              value:
                `Win Rate: ${role.role_win_rate}%\n` +
                `KDA: ${role.role_kda}\n` +
                `Wins: ${role.role_wins}\n` +
                `Losses: ${role.role_losses}\n` +
                `Kills: ${role.role_kills}\n` +
                `Deaths: ${role.role_deaths}\n` +
                `Assists: ${role.role_assists}`,
              inline: true,
            });
          } else {
            console.warn("Role name is undefined:", role);
          }
        });

        embeds.push(rolesEmbed);
      }

      return interaction.editReply({ embeds });
    } catch (error) {
      console.error("Error fetching player stats:", error);
      if (error.response) {
        return interaction.editReply({
          content: `Error: ${
            error.response.data.message || error.response.statusText
          }`,
          ephemeral: true,
        });
      } else {
        return interaction.editReply({
          content: "An error occurred while fetching player stats.",
          ephemeral: true,
        });
      }
    }
  },
};
