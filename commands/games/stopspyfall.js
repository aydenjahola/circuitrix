const { SlashCommandBuilder } = require("discord.js");
const SpyfallGame = require("../../models/SpyfallGame");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stopspyfall")
    .setDescription("Stop the current Spyfall game in this server."),
  category: "Games",

  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;

      const ongoingGame = await SpyfallGame.findOne({
        guildId: guildId,
        status: "ongoing",
      });

      if (!ongoingGame) {
        return interaction.reply({
          content: "No Spyfall game is currently in progress in this server!",
          ephemeral: true,
        });
      }

      ongoingGame.status = "ended";
      await ongoingGame.save();

      await interaction.reply("The Spyfall game has been stopped!");
    } catch (error) {
      console.error("Error stopping the game:", error);
      await interaction.reply({
        content:
          "There was an error trying to stop the game. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
