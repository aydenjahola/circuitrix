const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("randomfact")
    .setDescription("Get a random fun fact"),
  category: "Fun",

  async execute(interaction) {
    try {
      // Fetch a random fact from the Useless Facts API
      const response = await axios.get(
        "https://uselessfacts.jsph.pl/random.json?language=en"
      );
      const fact = response.data.text;

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Random Fun Fact")
        .setDescription(fact)
        .setTimestamp()
        .setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL(),
        });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching a random fact:", error);
      await interaction.reply({
        content: "Sorry, I was unable to fetch a random fact.",
        ephemeral: true,
      });
    }
  },
};
