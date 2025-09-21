const { SlashCommandBuilder } = require("discord.js");
const owoify = require("owoify-js").default;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uwu")
    .setDescription("Uwufy your message!")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("The text to uwufy")
        .setRequired(true)
    ),
  category: "Fun",

  async execute(interaction) {
    const inputText = interaction.options.getString("text");

    const uwufiedText = owoify(inputText, "uwu");

    await interaction.reply(uwufiedText);
  },
};
