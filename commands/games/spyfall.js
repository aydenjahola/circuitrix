const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const SpyfallGame = require("../../models/SpyfallGame");
const SpyfallLocation = require("../../models/SpyfallLocation");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spyfall")
    .setDescription("Start a game of Spyfall."),
  category: "Games",

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const gameId = uuidv4();

    const existingGame = await SpyfallGame.findOne({ gameId });
    if (existingGame && existingGame.status === "ongoing") {
      return interaction.reply(
        "A game is already in progress! Please finish the current game first."
      );
    }

    try {
      const locations = await SpyfallLocation.find({});

      if (!locations || locations.length === 0) {
        return interaction.reply("No locations found. Please try again later.");
      }

      const selectedLocation =
        locations[Math.floor(Math.random() * locations.length)].name;

      const players = new Set();

      const joinEmbed = new EmbedBuilder()
        .setColor("#ffcc00")
        .setTitle("Join the Spyfall Game!")
        .setDescription("Click the button below to join the game.")
        .addFields({ name: "Current Players:", value: "None yet." })
        .setFooter({ text: "You need at least 2 players to start!" })
        .setTimestamp();

      const joinButton = new ButtonBuilder()
        .setCustomId("join_game")
        .setLabel("Join Game")
        .setStyle(ButtonStyle.Success);

      const leaveButton = new ButtonBuilder()
        .setCustomId("leave_game")
        .setLabel("Leave Game")
        .setStyle(ButtonStyle.Danger);

      const startButton = new ButtonBuilder()
        .setCustomId("start_game")
        .setLabel("Start Game")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

      const buttonRow = new ActionRowBuilder().addComponents(
        joinButton,
        leaveButton,
        startButton
      );

      const joinMessage = await interaction.reply({
        embeds: [joinEmbed],
        components: [buttonRow],
        fetchReply: true,
      });

      const filter = (i) =>
        i.customId === "join_game" ||
        i.customId === "leave_game" ||
        i.customId === "start_game";

      const collector = joinMessage.createMessageComponentCollector({ filter });

      collector.on("collect", async (i) => {
        try {
          if (!players.has(i.user.id) && i.customId !== "join_game") {
            return i.reply({
              content: "You cannot interact with this button.",
              ephemeral: true,
            });
          }

          if (i.customId === "join_game") {
            if (players.has(i.user.id)) {
              return i.reply({
                content: "You are already in the game!",
                ephemeral: true,
              });
            }

            players.add(i.user.id);
            const currentPlayers =
              Array.from(players)
                .map(
                  (id) => interaction.guild.members.cache.get(id).user.username
                )
                .join(", ") || "None yet.";

            joinEmbed
              .setDescription("Click the button below to join the game.")
              .setFields([{ name: "Current Players:", value: currentPlayers }]);

            if (players.size >= 2) {
              startButton.setDisabled(false);
            }

            await i.update({ embeds: [joinEmbed], components: [buttonRow] });
          } else if (i.customId === "leave_game") {
            if (players.has(i.user.id)) {
              players.delete(i.user.id);
              const currentPlayers =
                Array.from(players)
                  .map(
                    (id) =>
                      interaction.guild.members.cache.get(id).user.username
                  )
                  .join(", ") || "None yet.";

              joinEmbed
                .setDescription("Click the button below to join the game.")
                .setFields([
                  { name: "Current Players:", value: currentPlayers },
                ]);
              await i.update({ embeds: [joinEmbed], components: [buttonRow] });
            } else {
              await i.reply({
                content: "You are not part of the game.",
                ephemeral: true,
              });
            }
          } else if (i.customId === "start_game") {
            if (players.size < 2) {
              return i.reply({
                content: "You need at least 2 players to start the game.",
                ephemeral: true,
              });
            }

            const spyIndex = Math.floor(Math.random() * players.size);
            const spy = Array.from(players)[spyIndex];

            const newGame = new SpyfallGame({
              gameId,
              guildId,
              location: selectedLocation,
              spy,
              players: Array.from(players),
              status: "ongoing",
            });

            await newGame.save();

            const locationMessage = `The game has started! The location is **${selectedLocation}**.`;

            for (const playerId of players) {
              const player = await interaction.guild.members.cache.get(playerId)
                .user;

              if (playerId !== spy) {
                await player.send(locationMessage);
              } else {
                await player.send(
                  "The game has started! You are the spy! Try to blend in!"
                );
              }
            }

            const embed = new EmbedBuilder()
              .setColor("#ffcc00")
              .setTitle("Spyfall Game Started!")
              .setDescription("The game has started! One of you is the spy!")
              .setFooter({
                text: "The spy must figure out the location without revealing themselves!",
              })
              .setTimestamp();

            await interaction.followUp({ embeds: [embed], components: [] });
            collector.stop();
            await interaction.channel.send({
              content: "The game has started! Use `/stopspyfall` to end it.",
            });

            await startQuestioningPhase(
              interaction,
              spy,
              players,
              selectedLocation,
              gameId
            );
            return;
          }
        } catch (error) {
          console.error("Error during button interaction:", error);
          await i.reply({
            content:
              "There was an error processing your request. Please try again later.",
            ephemeral: true,
          });
        }
      });
    } catch (error) {
      console.error("Error fetching locations or starting the game:", error);
      await interaction.reply(
        "There was an error fetching locations or starting the game. Please try again later."
      );
    }
  },
};

async function startQuestioningPhase(
  interaction,
  spy,
  players,
  selectedLocation,
  gameId
) {
  const ongoingGame = await SpyfallGame.findOne({ gameId });

  if (!ongoingGame || ongoingGame.status !== "ongoing") {
    return;
  }

  const playerArray = Array.from(players);
  let currentIndex = 0;

  async function askQuestion() {
    if (currentIndex >= playerArray.length) {
      return startVotingPhase(interaction, spy, playerArray, gameId);
    }

    const currentPlayerId = playerArray[currentIndex];
    const currentPlayer =
      interaction.guild.members.cache.get(currentPlayerId).user;

    const questionEmbed = new EmbedBuilder()
      .setColor("#ffcc00")
      .setTitle("Your Turn to Ask a Question!")
      .setDescription(
        `It's **${currentPlayer.username}**'s turn to ask a question about the location.`
      )
      .setFooter({ text: "Click 'Finish Turn' when you're done." });

    const finishButton = new ButtonBuilder()
      .setCustomId(`finish_turn_${currentPlayerId}`)
      .setLabel("Finish Turn")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(finishButton);

    await interaction.channel.send({
      embeds: [questionEmbed],
      components: [buttonRow],
    });

    const filter = (i) =>
      i.customId === `finish_turn_${currentPlayerId}` &&
      i.user.id === currentPlayerId;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 30000,
    });

    collector.on("collect", async (i) => {
      await i.reply({ content: "Your turn has ended!", ephemeral: true });
      collector.stop();
    });

    collector.on("end", async () => {
      currentIndex++;
      await askQuestion();
    });
  }

  askQuestion();
}

async function startVotingPhase(
  interaction,
  spy,
  players,
  gameId,
  selectedLocation
) {
  // Ensure players is an array
  if (!Array.isArray(players)) {
    console.error("Players is not an array:", players);
    return;
  }

  const ongoingGame = await SpyfallGame.findOne({ gameId });

  if (!ongoingGame || ongoingGame.status !== "ongoing") {
    return;
  }

  const votes = new Map();
  const voteEmbed = new EmbedBuilder()
    .setColor("#ffcc00")
    .setTitle("Voting Phase")
    .setDescription(
      "Vote for who you think the spy is! (You cannot vote for yourself)"
    )
    .setFooter({ text: "Click the buttons below to vote." });

  const voteButtons = players.map((playerId) =>
    new ButtonBuilder()
      .setCustomId(`vote_${playerId}`)
      .setLabel(interaction.guild.members.cache.get(playerId).user.username)
      .setStyle(ButtonStyle.Primary)
  );

  const voteRow = new ActionRowBuilder().addComponents(voteButtons);
  const voteMessage = await interaction.channel.send({
    embeds: [voteEmbed],
    components: [voteRow],
  });

  const voteFilter = (i) =>
    i.customId.startsWith("vote_") && players.includes(i.user.id);
  const voteCollector = voteMessage.createMessageComponentCollector({
    filter: voteFilter,
  });

  voteCollector.on("collect", async (i) => {
    const votedPlayerId = i.customId.split("_")[1];

    if (i.user.id === votedPlayerId) {
      await i.reply({
        content: "You cannot vote for yourself.",
        ephemeral: true,
      });
      return;
    }

    // Add the vote
    votes.set(votedPlayerId, (votes.get(votedPlayerId) || 0) + 1);

    await i.reply({
      content: `You voted for ${
        interaction.guild.members.cache.get(votedPlayerId).user.username
      }.`,
      ephemeral: true,
    });

    if (votes.size === players.length) {
      voteCollector.stop();
      await revealSpy(interaction, spy, votes, selectedLocation, gameId);
    }
  });

  voteCollector.on("end", async () => {
    if (votes.size > 0) {
      await revealSpy(interaction, spy, votes, selectedLocation, gameId);
    } else {
      await interaction.channel.send("Voting timed out! No votes were cast.");
    }
  });
}

async function revealSpy(interaction, spy, votes, selectedLocation, gameId) {
  const voteEntries = Array.from(votes.entries());
  const highestVote = Math.max(...voteEntries.map(([_, v]) => v));
  const suspectedSpy = voteEntries.find(([_, v]) => v === highestVote)[0];

  const resultEmbed = new EmbedBuilder()
    .setColor("#ffcc00")
    .setTitle("Voting Results")
    .addFields(
      {
        name: "Suspected Spy:",
        value: interaction.guild.members.cache.get(suspectedSpy).user.username,
      },
      {
        name: "Actual Spy:",
        value: interaction.guild.members.cache.get(spy).user.username,
      }
    )
    .setFooter({
      text:
        suspectedSpy === spy
          ? "The spy has been caught!"
          : "The spy has escaped!",
    })
    .setTimestamp();

  const result = await SpyfallGame.updateOne({ gameId }, { status: "ended" });
  if (result.modifiedCount === 0) {
    console.log("No game found or status was already 'ended'.");
  }

  await interaction.channel.send({ embeds: [resultEmbed] });
}
