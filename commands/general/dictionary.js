const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Word = require("../../models/wordModel");
const axios = require("axios");

const WORDNIK_API_KEY = process.env.WORDNIK_API_KEY;

// Function to clean up XML-like tags from the text
function cleanText(text) {
  // Ensure text is a string and remove XML-like tags
  return (text || "").replace(/<[^>]*>/g, "");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dictionary")
    .setDescription("Look up a word in the dictionary.")
    .addStringOption((option) =>
      option
        .setName("word")
        .setDescription("The word to look up")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("ephemeral")
        .setDescription("Whether the response should be ephemeral")
        .setRequired(false)
    ),
  category: "General",

  async execute(interaction) {
    const word = interaction.options.getString("word").toLowerCase();
    const isEphemeral = interaction.options.getBoolean("ephemeral") || false;
    const defaultWordnikUrl = `https://www.wordnik.com/words/${word}`;

    // Create the base embed
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(`Dictionary: ${word.charAt(0).toUpperCase() + word.slice(1)}`)
      .setURL(defaultWordnikUrl) // Set URL to the Wordnik page for the word
      .setFooter({
        text: "Powered by Wordnik | Source: Loading...",
        iconURL: "https://wordnik.com/favicon.ico",
      });

    // Try to find the word in the database
    let result = await Word.findOne({ word });

    if (result) {
      // If the word is found in the database
      embed
        .setDescription(
          `**Definition:** ${cleanText(
            result.definition || "No definition found"
          )}\n` +
            `**Part of Speech:** ${result.partOfSpeech || "Unknown"}\n` +
            `**Attribution:** ${result.attributionText || "No attribution"}\n` +
            `**Source Dictionary:** ${
              result.sourceDictionary || "Unknown source"
            }\n` +
            `**Example:** ${result.exampleSentence || "No examples found"}`
        )
        .setURL(result.wordnikUrl || defaultWordnikUrl) // Use URL from database or default
        .setFooter({
          text: `Powered by Wordnik | Source: Database`,
          iconURL: "https://wordnik.com/favicon.ico",
        });
    } else {
      // Fetch the word information from Wordnik API
      try {
        // Fetch definitions
        const definitionResponse = await axios.get(
          `https://api.wordnik.com/v4/word.json/${word}/definitions`,
          {
            params: {
              api_key: WORDNIK_API_KEY,
              limit: 1,
              includeRelated: true,
              sourceDictionaries: "all",
              useCanonical: true,
              includeTags: false,
            },
          }
        );

        const definitionData = definitionResponse.data[0];
        if (definitionData) {
          const definition = cleanText(
            definitionData.text || "No definition found"
          );
          const partOfSpeech = definitionData.partOfSpeech || "Unknown";
          const attributionText =
            definitionData.attributionText || "No attribution";
          const sourceDictionary =
            definitionData.sourceDictionary || "Unknown source";
          const wordnikUrl = definitionData.wordnikUrl || defaultWordnikUrl; // Use local URL or default

          // Example sentence extraction (make sure `exampleUses` is correctly handled)
          const exampleSentence =
            (definitionData.exampleUses &&
              definitionData.exampleUses[0] &&
              definitionData.exampleUses[0].text) ||
            "No examples found";

          // Save the new word and definition in the database
          await Word.create({
            word,
            definition,
            partOfSpeech,
            attributionText,
            sourceDictionary,
            exampleSentence,
            wordnikUrl,
          });

          embed
            .setDescription(
              `**Definition:** ${definition}\n` +
                `**Part of Speech:** ${partOfSpeech}\n` +
                `**Attribution:** ${attributionText}\n` +
                `**Source Dictionary:** ${sourceDictionary}\n` +
                `**Example:** ${exampleSentence}`
            )
            .setURL(wordnikUrl) // Use URL from API response
            .setFooter({
              text: `Powered by Wordnik | Source: API`,
              iconURL: "https://wordnik.com/favicon.ico",
            });
        } else {
          embed.setDescription(
            `Sorry, I couldn't find a definition for **${word}**.`
          );
        }
      } catch (error) {
        console.error("Error fetching Wordnik data:", error.message);
        embed.setDescription(
          `An error occurred while fetching the definition for **${word}**. ${error.message}`
        );
      }
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: isEphemeral,
    });
  },
};
