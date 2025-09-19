const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Genius = require("genius-lyrics"); // Correct import

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
      songQuery = songQuery.replace(/\([^)]*\)|\[[^\]]*\]/g, "").trim();
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
        const lyricChunks = [];
        for (let i = 0; i < lyrics.length; i += 4090) {
          lyricChunks.push(lyrics.substring(i, i + 4090));
        }

        const firstEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle(`Lyrics for: ${song.title}`)
          .setDescription(lyricChunks[0])
          .setThumbnail(song.thumbnail)
          .setFooter({
            text: `Part 1/${lyricChunks.length} - Powered by Genius API`,
          });

        await interaction.followUp({ embeds: [firstEmbed] });

        for (let i = 1; i < lyricChunks.length; i++) {
          const chunkEmbed = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription(lyricChunks[i])
            .setFooter({
              text: `Part ${i + 1}/${
                lyricChunks.length
              } - Powered by Genius API`,
            });

          await interaction.followUp({ embeds: [chunkEmbed] });
        }
        return;
      }

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`Lyrics for: ${song.title}`)
        .setDescription(lyrics)
        .setThumbnail(song.thumbnail)
        .setFooter({ text: "Powered by Genius API" });

      await interaction.followUp({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      await interaction.followUp(
        "❌ Failed to fetch lyrics. Please try again later."
      );
    }
  },
};
