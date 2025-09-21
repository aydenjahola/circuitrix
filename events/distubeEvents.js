const { EmbedBuilder } = require("discord.js");
const { ensure: ensureMusicSettings } = require("../utils/musicSettings");
const live = require("../utils/liveLyricsManager"); // we still use this to sync/cleanup

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

    if (thumbnail) embed.setThumbnail(thumbnail);
    return embed;
  };

  distube
    .on("initQueue", async (queue) => {
      try {
        const settings = await ensureMusicSettings(queue.id);
        queue.volume = Math.max(
          0,
          Math.min(200, settings.defaultVolume ?? 100)
        );
        queue.autoplay = !!settings.autoplay;

        const maxQ = settings.maxQueue ?? 1000;
        if (Array.isArray(queue.songs) && queue.songs.length > maxQ) {
          queue.songs.length = maxQ;
        }
      } catch (e) {
        console.error("initQueue settings apply failed:", e);
        queue.volume = 100;
        queue.autoplay = false;
      }
    })

    .on("playSong", async (queue, song) => {
      // ❗️ NO auto-start of live lyrics here anymore
      const embed = createEmbed(
        0x0099ff,
        "🎶 Now Playing",
        `**${song.name}** - \`${song.formattedDuration}\``,
        song.thumbnail
      );
      queue.textChannel?.send({ embeds: [embed] });
      // If /livelyrics was already started manually, keep it aligned after a track change:
      live.seek(queue).catch(() => {});
    })

    .on("addSong", (queue, song) => {
      const embed = createEmbed(
        0x00ff00,
        "✅ Song Added",
        `**${song.name}** - \`${song.formattedDuration}\``,
        song.thumbnail
      );
      queue.textChannel?.send({ embeds: [embed] });
    })

    .on("addList", (queue, playlist) => {
      const embed = createEmbed(
        0x00ccff,
        "📚 Playlist Added",
        `**${playlist.name}** with **${playlist.songs.length}** tracks has been queued.`
      );
      queue.textChannel?.send({ embeds: [embed] });
    })

    .on("pause", (queue) => {
      const embed = createEmbed(
        0xffff00,
        "⏸️ Music Paused",
        "Playback has been paused."
      );
      queue.textChannel?.send({ embeds: [embed] });
      // If live lyrics are running, pause scheduling (no-op otherwise)
      live.pause(queue.id).catch(() => {});
    })

    .on("resume", (queue) => {
      const embed = createEmbed(
        0x00ff00,
        "▶️ Music Resumed",
        "Playback has been resumed."
      );
      queue.textChannel?.send({ embeds: [embed] });
      // If live lyrics are running, resume scheduling (no-op otherwise)
      live.resume(queue).catch(() => {});
    })

    .on("seek", (queue, time) => {
      // Keep live thread synced if it’s running (no-op otherwise)
      live.seek(queue, time).catch(() => {});
    })

    .on("volumeChange", (queue, volume) => {
      const embed = createEmbed(
        0x0099ff,
        "🔊 Volume Changed",
        `Volume set to ${volume}%`
      );
      queue.textChannel?.send({ embeds: [embed] });
    })

    .on("finishSong", (queue, song) => {
      // If a manual /livelyrics is active, stop the current thread for this song.
      // If the next song plays and the user wants lyrics again, they can run /livelyrics start.
      live.stop(queue.id, { deleteThread: true }).catch(() => {});
      // If nothing left and autoplay is off, leave now.
      setImmediate(() => {
        try {
          const remaining = Array.isArray(queue.songs) ? queue.songs.length : 0;
          if (remaining === 0 && !queue.autoplay) {
            queue.distube.voices.leave(queue.id);
            queue.textChannel?.send({
              embeds: [
                createEmbed(
                  0x0099ff,
                  "🏁 No More Songs",
                  `Finished **${
                    song?.name ?? "track"
                  }** — nothing left, disconnecting.`
                ),
              ],
            });
          }
        } catch (e) {
          console.error("finishSong immediate-leave failed:", e);
        }
      });
    })

    .on("noRelated", (queue) => {
      const embed = createEmbed(
        0xff0000,
        "❌ No Related Videos",
        "Could not find related video for autoplay!"
      );
      queue.textChannel?.send({ embeds: [embed] });
    })

    .on("finish", (queue) => {
      try {
        queue.distube.voices.leave(queue.id);
        const embed = createEmbed(
          0x0099ff,
          "🏁 Queue Finished",
          "Queue ended — disconnecting now."
        );
        queue.textChannel?.send({ embeds: [embed] });
      } catch (e) {
        console.error("Immediate leave on finish failed:", e);
      } finally {
        // Always cleanup any live thread if one was running
        live.stop(queue.id, { deleteThread: true }).catch(() => {});
      }
    })

    .on("empty", (queue) => {
      try {
        queue.distube.voices.leave(queue.id);
        queue.textChannel?.send({
          embeds: [
            createEmbed(
              0xff0000,
              "🔇 Left Voice Channel",
              "Channel became empty — disconnecting now."
            ),
          ],
        });
      } catch (e) {
        console.error("Immediate leave on empty failed:", e);
      } finally {
        live.stop(queue.id, { deleteThread: true }).catch(() => {});
      }
    })

    .on("disconnect", (queue) => {
      // Always cleanup on manual disconnect too
      live.stop(queue.id, { deleteThread: true }).catch(() => {});
    })

    .on("error", (error, queue) => {
      console.error("DisTube error:", error);
      queue?.textChannel?.send(
        "❌ Playback error: " + (error?.message || String(error)).slice(0, 500)
      );
      if (queue?.id)
        live.stop(queue.id, { deleteThread: true }).catch(() => {});
    });
};
