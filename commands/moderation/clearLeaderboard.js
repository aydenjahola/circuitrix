const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Leaderboard = require("../../models/Leaderboard");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearleaderboard")
    .setDescription("Clears all entries in the trivia leaderboard"),
  isModOnly: true,
  category: "Moderation",

  async execute(interaction) {
    try {
      // Check if the user has the Manage Server permission
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
      ) {
        await interaction.reply({
          content: "You do not have permission to use this command!",
          ephemeral: true,
        });
        return;
      }

      // Clear the leaderboard
      await Leaderboard.deleteMany({});

      // Notify the mod who executed the command
      await interaction.reply({
        content: "The leaderboard has been cleared successfully.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error executing clearleaderboard command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
