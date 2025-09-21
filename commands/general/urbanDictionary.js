const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const UrbanDictionary = require("../../models/UrbanDictionary");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("urban")
    .setDescription("Get the definition from Urban Dictionary")
    .addStringOption((option) =>
      option
        .setName("term")
        .setDescription("The term to look up")
        .setRequired(true)
    ),
  category: "General",

  async execute(interaction, client) {
    const term = interaction.options.getString("term").toLowerCase();
    const guild = interaction.guild;
    const serverName = guild.name;
    const serverIcon = guild.iconURL();
    let source = "API";

    try {
      // Check if the term exists in the database
      let definition = await UrbanDictionary.findOne({ term });

      if (!definition) {
        // If definition is not found, fetch from the API
        const url = `https://mashape-community-urban-dictionary.p.rapidapi.com/define?term=${encodeURIComponent(
          term
        )}`;

        const options = {
          method: "GET",
          url: url,
          headers: {
            "X-RapidAPI-Key": process.env.RAPIDAPI_KEY, // everything started shouting at me so lets just save the key in the .env file
            "X-RapidAPI-Host":
              "mashape-community-urban-dictionary.p.rapidapi.com",
          },
        };

        const response = await axios.request(options);
        const data = response.data;

        if (data.list.length === 0) {
          return await interaction.reply({
            content: "🚫 No definitions found.",
            ephemeral: true,
          });
        }

        // Save the new definition to the database
        definition = new UrbanDictionary({
          term,
          definition: data.list[0].definition,
          example: data.list[0].example || "No example provided",
          author: data.list[0].author || "Unknown",
          thumbs_up: data.list[0].thumbs_up || 0,
          thumbs_down: data.list[0].thumbs_down || 0,
        });

        await definition.save();
      } else {
        // If found in the database, set source to "Database"
        source = "Database";
      }

      // Create and send the embed message
      const embed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle(`📚 Definition of: **${definition.term}**`)
        .setDescription(definition.definition)
        .setThumbnail(
          "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Urban_Dictionary_Logo.svg/1200px-Urban_Dictionary_Logo.svg.png"
        )
        .addFields(
          {
            name: "📖 Example",
            value: definition.example || "No example provided",
            inline: false,
          },
          {
            name: "👍 Votes",
            value: `${definition.thumbs_up} 👍 | ${definition.thumbs_down} 👎`,
            inline: true,
          },
          {
            name: "✍️ Submitted by",
            value: definition.author || "Unknown",
            inline: false,
          }
        )
        .setFooter({
          text: `${serverName} | Powered by Urban Dictionary | Source: ${source}`,
          iconURL: serverIcon,
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error processing Urban Dictionary term:", error);
      await interaction.reply({
        content:
          "⚠️ There was an error while processing the term. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
