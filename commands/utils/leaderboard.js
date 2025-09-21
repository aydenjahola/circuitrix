const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Leaderboard = require("../../models/Leaderboard");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Displays the trivia leaderboard"),
  category: "Utils",

  async execute(interaction, client) {
    const guild = interaction.guild;

    try {
      // Fetch top 10 leaderboard entries sorted by correct answers
      const scores = await Leaderboard.find()
        .sort({ correctAnswers: -1 })
        .limit(10);

      // Fetch display names for each leaderboard entry
      const leaderboardEntries = await Promise.all(
        scores.map(async (entry, index) => {
          try {
            const member = await guild.members.fetch(entry.userId);
            const displayName = member ? member.displayName : entry.username; // Fallback if member not found

            return {
              position: index + 1,
              name: displayName,
              correctAnswers: entry.correctAnswers,
              gamesPlayed: entry.gamesPlayed,
              streak: entry.streak, // Include streak
            };
          } catch (error) {
            console.error(
              `Error fetching member for userId: ${entry.userId}`,
              error
            );
            return {
              position: index + 1,
              name: entry.username,
              correctAnswers: entry.correctAnswers,
              gamesPlayed: entry.gamesPlayed,
              streak: entry.streak, // Include streak
            };
          }
        })
      );

      const leaderboardEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Trivia Leaderboard")
        .setTimestamp();

      // Add each leaderboard entry
      leaderboardEntries.forEach((entry) => {
        const fieldValue = `${entry.correctAnswers} correct answers in ${entry.gamesPlayed} games\nCurrent streak: ${entry.streak}`;

        leaderboardEmbed.addFields({
          name: `${entry.position}. ${entry.name}`,
          value: fieldValue,
          inline: false,
        });
      });

      if (guild.iconURL()) {
        leaderboardEmbed.setFooter({
          text: guild.name,
          iconURL: guild.iconURL(),
        });
      } else {
        leaderboardEmbed.setFooter({
          text: guild.name,
        });
      }

      await interaction.reply({ embeds: [leaderboardEmbed] });
    } catch (error) {
      console.error("Error executing leaderboard command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
