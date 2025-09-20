const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays a song from YouTube, Spotify, or SoundCloud.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Song name or URL")
        .setRequired(true)
    ),
  category: "Music",

  async execute(interaction, client) {
    await interaction.deferReply();
    const query = interaction.options.getString("query");
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.followUp("❌ You need to be in a voice channel!");
    }
    try {
      await client.distube.play(voiceChannel, query, {
        textChannel: interaction.channel,
        member: interaction.member,
      });
      await interaction.followUp(`🔍 Searching: \`${query}\``);
    } catch (error) {
      console.error(error);
      interaction.followUp("❌ Failed to play the song.");
    }
  },
};
