const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice!")
    .addIntegerOption((option) =>
      option
        .setName("sides")
        .setDescription("Number of sides on the dice")
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(100)
    ),
  category: "Games",

  async execute(interaction) {
    const sides = interaction.options.getInteger("sides") || 6;
    const result = Math.floor(Math.random() * sides) + 1;
    await interaction.reply(
      `🎲 You rolled a ${result} on a ${sides}-sided dice!`
    );
  },
};
