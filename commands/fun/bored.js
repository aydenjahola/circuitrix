const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bored")
    .setDescription("Get a random activity to do."),
  category: "Fun",

  async execute(interaction) {
    try {
      const res = await axios.get("https://bored-api.appbrewery.com/random");

      const activity = res.data.activity;
      const type = res.data.type;
      const accessibility = res.data.accessibility;
      const duration = res.data.duration;
      const kidFriendly = res.data.kidFriendly;

      const embed = new EmbedBuilder()
        .setColor("#9b226a")
        .setTitle("Random Activity to Do")
        .addFields(
          { name: "Activity", value: `${activity}` },
          { name: "Type", value: `${type}` },
          { name: "Accessibility", value: `${accessibility}` },
          { name: "Duration", value: `${duration}` },
          { name: "Kid Friendly", value: `${kidFriendly}` }
        )

        .setTimestamp()
        .setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL(),
        });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error trying to fetch a random activity.",
        epemeral: true,
      });
    }
  },
};
