const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const WordAssociation = require("../../models/WordAssociation");

const MAX_FIELDS = 25; // Maximum number of fields in an embed
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 1 month

const fetchAssociatedWordsFromAPI = async (word) => {
  try {
    const response = await axios.get(
      `https://api.datamuse.com/words?rel_trg=${word}`
    );
    return response.data.slice(0, MAX_FIELDS); // Limit the number of associated words
  } catch (error) {
    console.error("Error fetching associated words from API:", error);
    throw new Error("Error fetching associated words");
  }
};

const getAssociatedWords = async (word) => {
  try {
    let wordAssociation = await WordAssociation.findOne({ word });

    if (
      wordAssociation &&
      Date.now() - new Date(wordAssociation.last_updated).getTime() <
        CACHE_EXPIRY
    ) {
      return wordAssociation.associatedWords;
    }

    // Fetch from API if not cached or cache expired
    const associatedWords = await fetchAssociatedWordsFromAPI(word);

    // Save or update cache
    if (wordAssociation) {
      wordAssociation.associatedWords = associatedWords.map(
        (entry) => entry.word
      );
      wordAssociation.last_updated = new Date();
      await wordAssociation.save();
    } else {
      await WordAssociation.create({
        word,
        associatedWords: associatedWords.map((entry) => entry.word),
        last_updated: new Date(),
      });
    }

    return associatedWords.map((entry) => entry.word);
  } catch (error) {
    console.error("Error getting associated words:", error);
    throw new Error("Error retrieving associated words");
  }
};

const createWordAssociationEmbed = (word, associatedWords, guild) => {
  return new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("Word Association")
    .setDescription(`Words associated with **${word}**:`)
    .addFields(
      associatedWords.map((word, index) => ({
        name: `Option ${index + 1}`,
        value: word,
        inline: true,
      }))
    )
    .setTimestamp()
    .setFooter({
      text: `${guild.name}`,
      iconURL: guild.iconURL(),
    });
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wordassoc")
    .setDescription("Find words associated with a given word")
    .addStringOption((option) =>
      option
        .setName("word")
        .setDescription("The word to find associations for")
        .setRequired(true)
    ),
  category: "General",

  async execute(interaction) {
    const word = interaction.options.getString("word");

    try {
      const associatedWords = await getAssociatedWords(word);

      if (associatedWords.length === 0) {
        return interaction.reply({
          content: `No associated words found for **${word}**.`,
          ephemeral: true,
        });
      }

      const wordAssociationEmbed = createWordAssociationEmbed(
        word,
        associatedWords,
        interaction.guild
      );

      await interaction.reply({ embeds: [wordAssociationEmbed] });
    } catch (error) {
      console.error("Error executing word association command:", error);
      await interaction.reply({
        content:
          "There was an error fetching associated words. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
