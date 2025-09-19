const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Genius } = require("genius-lyrics");

const geniusClient = new Genius.Client(process.env.GENIUS_API_TOKEN);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Get lyrics for the current song or a specific song")
    .addStringOption((option) =>
      option
        .setName("song")
        .setDescription("Song name to search lyrics for (optional)")
        .setRequired(false)
    ),
  async execute(interaction, client) {
    await interaction.deferReply();

    let songQuery = interaction.options.getString("song");
    const queue = client.distube.getQueue(interaction.guildId);

    if (!songQuery && queue && queue.songs.length > 0) {
      songQuery = queue.songs[0].name;
    }

    if (!songQuery) {
      return interaction.followUp(
        "❌ Please specify a song name or play a song first!"
      );
    }

    try {
      const searches = await geniusClient.songs.search(songQuery);
      if (searches.length === 0) {
        return interaction.followUp("❌ No lyrics found for this song!");
      }

      const song = searches[0];
      const lyrics = await song.lyrics();

      if (lyrics.length > 4096) {
        const embed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle(`Lyrics for: ${song.title}`)
          .setDescription(
            `The lyrics are too long to display in Discord. [View on Genius](${song.url})`
          )
          .setThumbnail(song.thumbnail)
          .setFooter({ text: "Powered by Genius API" });

        return interaction.followUp({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`Lyrics for: ${song.title}`)
        .setDescription(lyrics)
        .setThumbnail(song.thumbnail)
        .setFooter({ text: "Powered by Genius API" });

      interaction.followUp({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      interaction.followUp(
        "❌ Failed to fetch lyrics. Please try again later."
      );
    }
  },
};
