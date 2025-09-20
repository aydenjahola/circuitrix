const { EmbedBuilder } = require("discord.js");

module.exports = (distube, botName) => {
  const footerConfig = {
    text: `Powered by ${botName}, developed with ❤️ by Ayden`,
    iconURL: "https://github.com/aydenjahola.png",
  };

  const createEmbed = (color, title, description, thumbnail = null) => {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter(footerConfig);

    if (thumbnail) {
      embed.setThumbnail(thumbnail);
    }

    return embed;
  };

  distube
    .on("playSong", (queue, song) => {
      const embed = createEmbed(
        0x0099ff,
        "🎶 Now Playing",
        `**${song.name}** - \`${song.formattedDuration}\``,
        song.thumbnail
      );
      queue.textChannel.send({ embeds: [embed] });
    })
    .on("addSong", (queue, song) => {
      const embed = createEmbed(
        0x00ff00,
        "✅ Song Added",
        `**${song.name}** - \`${song.formattedDuration}\``,
        song.thumbnail
      );
      queue.textChannel.send({ embeds: [embed] });
    })
    .on("error", (channel, error) => {
      console.error("DisTube error:", error);
      const embed = createEmbed(
        0xff0000,
        "❌ Error",
        `An error occurred: ${error.message}`
      );
      if (channel && channel.send) {
        channel.send({ embeds: [embed] });
      }
    })
    .on("finish", (queue) => {
      if (queue.textChannel) {
        const embed = createEmbed(
          0x0099ff,
          "🎵 Queue Finished",
          "The music queue has ended."
        );
        queue.textChannel.send({ embeds: [embed] });
      }
    })
    .on("pause", (queue) => {
      if (queue.textChannel) {
        const embed = createEmbed(
          0xffff00,
          "⏸️ Music Paused",
          "Playback has been paused."
        );
        queue.textChannel.send({ embeds: [embed] });
      }
    })
    .on("resume", (queue) => {
      if (queue.textChannel) {
        const embed = createEmbed(
          0x00ff00,
          "▶️ Music Resumed",
          "Playback has been resumed."
        );
        queue.textChannel.send({ embeds: [embed] });
      }
    })
    .on("volumeChange", (queue, volume) => {
      if (queue.textChannel) {
        const embed = createEmbed(
          0x0099ff,
          "🔊 Volume Changed",
          `Volume set to ${volume}%`
        );
        queue.textChannel.send({ embeds: [embed] });
      }
    })
    .on("noRelated", (queue) => {
      if (queue.textChannel) {
        const embed = createEmbed(
          0xff0000,
          "❌ No Related Videos",
          "Could not find related video for autoplay!"
        );
        queue.textChannel.send({ embeds: [embed] });
      }
    })
    .on("empty", (queue) => {
      if (queue.textChannel) {
        const embed = createEmbed(
          0xff0000,
          "🔇 Voice Channel Empty",
          "Voice channel is empty! Leaving the channel."
        );
        queue.textChannel.send({ embeds: [embed] });
      }
    });
};
