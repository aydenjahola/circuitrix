const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const ScrambledWord = require("../../models/ScrambledWord");

const ACTIVE_GAMES = new Set(); // Track users with ongoing games

const fetchRandomWord = async () => {
  try {
    const response = await axios.get(
      "https://random-word-api.herokuapp.com/word?number=1"
    );
    return response.data[0];
  } catch (error) {
    console.error("Error fetching a random word:", error);
    throw new Error("Error fetching a word");
  }
};

const scrambleWord = (word) => {
  return word
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

const createScrambleEmbed = (scrambledWord, guild, timeLimit, source) => {
  return new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("Word Scramble")
    .setDescription(
      `Unscramble the letters to find the word: **${scrambledWord}**`
    )
    .setTimestamp()
    .setFooter({
      text: `${guild.name} | Answer within ${
        timeLimit / 1000
      } seconds | Source: ${source}`,
      iconURL: guild.iconURL(),
    });
};

const handleScrambleAnswer = async (
  interaction,
  originalWord,
  userId,
  timeLimit
) => {
  try {
    const filter = (response) =>
      response.author.id === userId &&
      response.content.trim().toLowerCase() === originalWord.toLowerCase();

    const collector = interaction.channel.createMessageCollector({
      filter,
      max: 1,
      time: timeLimit,
    });

    collector.on("collect", async () => {
      await interaction.followUp(
        `🎉 Congratulations <@${userId}>! You unscrambled the word: **${originalWord}**.`
      );
      ACTIVE_GAMES.delete(userId);
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        await interaction.followUp(
          `⏰ Time's up <@${userId}>! The correct word was **${originalWord}**.`
        );
        ACTIVE_GAMES.delete(userId);
      }
    });
  } catch (error) {
    console.error("Error processing collected answer:", error);
    await interaction.followUp({
      content: `There was an error processing your answer, <@${userId}>.`,
      ephemeral: true,
    });
    ACTIVE_GAMES.delete(userId);
  }
};

const getUniqueWord = async () => {
  let originalWord;
  let source = "API";

  while (true) {
    originalWord = await fetchRandomWord();
    const existingWord = await ScrambledWord.findOne({ word: originalWord });

    if (!existingWord) {
      // Word is unique, break the loop
      break;
    }
  }

  return { originalWord, source };
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("scramble")
    .setDescription("Play a word scramble game"),
  category: "Games",

  async execute(interaction) {
    const userId = interaction.user.id;
    const guild = interaction.guild;
    const timeLimit = 30000; // 30 seconds

    if (ACTIVE_GAMES.has(userId)) {
      return interaction.reply({
        content:
          "You already have an ongoing word scramble game. Please finish it before starting a new one.",
        ephemeral: true,
      });
    }

    ACTIVE_GAMES.add(userId);

    try {
      const { originalWord, source } = await getUniqueWord();
      const scrambledWord = scrambleWord(originalWord);

      // Save to database
      await ScrambledWord.create({
        word: originalWord,
        scrambled: scrambledWord,
        created_at: new Date(),
      });

      const scrambleEmbed = createScrambleEmbed(
        scrambledWord,
        guild,
        timeLimit,
        source
      );
      await interaction.reply({ embeds: [scrambleEmbed] });

      await handleScrambleAnswer(interaction, originalWord, userId, timeLimit);
    } catch (error) {
      console.error("Error executing scramble command:", error);
      await interaction.reply({
        content:
          "An error occurred while starting the word scramble game. Please try again later.",
        ephemeral: true,
      });
      ACTIVE_GAMES.delete(userId);
    }
  },
};
