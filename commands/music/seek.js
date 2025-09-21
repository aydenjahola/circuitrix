const { SlashCommandBuilder } = require("discord.js");
const { requireVC, requireQueue } = require("../../utils/musicGuards");

/** Parse "90", "1:30", "01:02:03", "+30", "-10", "+1:00", "-0:30" */
function parseTime(input) {
  const t = input.trim();
  const sign = t.startsWith("+") ? 1 : t.startsWith("-") ? -1 : 0;
  const core = sign ? t.slice(1) : t;

  if (/^\d+$/.test(core)) {
    const secs = Number(core);
    return { seconds: sign ? sign * secs : secs, relative: Boolean(sign) };
  }

  if (/^\d{1,2}:\d{1,2}(:\d{1,2})?$/.test(core)) {
    const parts = core.split(":").map(Number);
    let secs = 0;
    if (parts.length === 3) {
      const [hh, mm, ss] = parts;
      secs = hh * 3600 + mm * 60 + ss;
    } else {
      const [mm, ss] = parts;
      secs = mm * 60 + ss;
    }
    return { seconds: sign ? sign * secs : secs, relative: Boolean(sign) };
  }

  return null;
}

function fmt(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("Seek to a timestamp or jump by seconds.")
    .addStringOption((opt) =>
      opt
        .setName("to")
        .setDescription("e.g. 90, 1:30, 01:02:03, +30, -10")
        .setRequired(true)
    ),
  category: "Music",

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      requireVC(interaction);
      const queue = requireQueue(client, interaction);

      const song = queue.songs?.[0];
      if (!song || !Number.isFinite(song.duration) || song.isLive) {
        throw new Error("❌ This stream/track doesn’t support seeking.");
      }

      const input = interaction.options.getString("to", true);
      const parsed = parseTime(input);
      if (!parsed) {
        throw new Error(
          "❌ Invalid time. Use `90`, `1:30`, `01:02:03`, `+30`, or `-10`."
        );
      }

      const current = Math.floor(queue.currentTime ?? 0);
      const duration = Math.floor(song.duration);

      let target = parsed.relative ? current + parsed.seconds : parsed.seconds;
      target = Math.max(0, Math.min(duration - 1, Math.floor(target)));

      await queue.seek(target);

      try {
        const live = require("../../utils/liveLyricsManager");
        live.seek(queue, target);
      } catch {}

      await interaction.followUp(
        `⏭️ Seeked to **${fmt(target)}** (track length \`${fmt(duration)}\`).`
      );
    } catch (e) {
      const msg = e?.message ?? "❌ Failed to seek.";
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    }
  },
};
