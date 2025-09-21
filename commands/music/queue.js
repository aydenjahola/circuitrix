const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const { requireQueue } = require("../../utils/musicGuards");

const PAGE_SIZE = 10;
const COLLECTOR_IDLE_MS = 60_000; // stop listening after 60s idle
const REFRESH_INTERVAL_MS = 2000; // live refresh throttle

function fmtHMS(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function safe(text, max = 128) {
  if (!text) return "";
  text = String(text);
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function sumDurations(songs) {
  let total = 0;
  for (const s of songs) if (Number.isFinite(s?.duration)) total += s.duration;
  return total;
}

function queueFingerprint(q) {
  // A tiny hash-ish snapshot: current song id/url + length + volume
  const now = q.songs?.[0];
  const id = now?.id || now?.url || now?.name || "";
  return `${id}|len:${q.songs?.length || 0}|vol:${q.volume || 0}|t:${Math.floor(
    q.currentTime || 0
  )}`;
}

/** Build a single queue page embed */
function buildEmbed(queue, page, totalPages) {
  const now = queue.songs[0];
  const upcoming = queue.songs.slice(1);

  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, upcoming.length);
  const chunk = upcoming.slice(start, end);

  const lines = chunk.map((song, i) => {
    const index = start + i + 1;
    const dur = Number.isFinite(song.duration) ? fmtHMS(song.duration) : "LIVE";
    const requester = song.user?.id || song.member?.id;
    return `**${index}.** ${safe(song.name, 90)} — \`${dur}\`${
      requester ? ` • <@${requester}>` : ""
    }`;
  });

  const totalLen = sumDurations(queue.songs);
  const footerParts = [
    `Page ${page + 1}/${totalPages}`,
    `Volume ${queue.volume ?? 100}%`,
    `Total: ${fmtHMS(totalLen)} • ${queue.songs.length} track${
      queue.songs.length === 1 ? "" : "s"
    }`,
  ];

  const embed = new EmbedBuilder()
    .setColor(0x00a2ff)
    .setTitle("🎶 Music Queue")
    .setDescription(
      [
        `**Now Playing**`,
        `${safe(now?.name ?? "Nothing", 128)} — \`${
          Number.isFinite(now?.duration) ? fmtHMS(now.duration) : "LIVE"
        }\`${now?.user?.id ? ` • <@${now.user.id}>` : ""}`,
        "",
        chunk.length ? "**Up Next**" : "*No more songs queued.*",
        lines.join("\n") || "",
      ].join("\n")
    )
    .setFooter({ text: footerParts.join("  •  ") });

  if (now?.thumbnail) embed.setThumbnail(now.thumbnail);
  return embed;
}

function buildButtons(page, totalPages, disabled = false) {
  const first = new ButtonBuilder()
    .setCustomId("queue_first")
    .setEmoji("⏮️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled || page === 0);
  const prev = new ButtonBuilder()
    .setCustomId("queue_prev")
    .setEmoji("◀️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled || page === 0);
  const next = new ButtonBuilder()
    .setCustomId("queue_next")
    .setEmoji("▶️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled || page >= totalPages - 1);
  const last = new ButtonBuilder()
    .setCustomId("queue_last")
    .setEmoji("⏭️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled || page >= totalPages - 1);
  const stop = new ButtonBuilder()
    .setCustomId("queue_stop")
    .setEmoji("🛑")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disabled);

  return new ActionRowBuilder().addComponents(first, prev, next, last, stop);
}

function buildJumpMenu(page, totalPages, disabled = false) {
  // Up to 25 options allowed by Discord — group pages in chunks
  const options = [];
  for (let p = 0; p < totalPages && options.length < 25; p++) {
    options.push({
      label: `Page ${p + 1}`,
      value: String(p),
      description: `Tracks ${p * PAGE_SIZE + 1}–${Math.min(
        (p + 1) * PAGE_SIZE,
        Math.max(0, totalPages * PAGE_SIZE)
      )}`,
      default: p === page,
    });
  }
  const menu = new StringSelectMenuBuilder()
    .setCustomId("queue_jump")
    .setPlaceholder("Jump to page…")
    .setDisabled(disabled)
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current music queue (live, paginated)."),
  category: "Music",

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const queue = requireQueue(client, interaction);
      const upcomingCount = Math.max(0, queue.songs.length - 1);
      let totalPages = Math.max(1, Math.ceil(upcomingCount / PAGE_SIZE));
      let page = 0;

      let fingerprint = queueFingerprint(queue);

      const embed = buildEmbed(queue, page, totalPages);
      const rowButtons = buildButtons(page, totalPages);
      const rowJump = buildJumpMenu(page, totalPages);

      const message = await interaction.followUp({
        embeds: [embed],
        components: [rowButtons, rowJump],
      });

      // Live refresh loop (throttled)
      let stopped = false;
      const interval = setInterval(async () => {
        if (stopped) return;
        const q = client.distube.getQueue(interaction.guildId);
        if (!q) return; // might have ended
        const fp = queueFingerprint(q);
        if (fp !== fingerprint) {
          fingerprint = fp;
          // recompute pagination info if size changed
          const upCount = Math.max(0, q.songs.length - 1);
          totalPages = Math.max(1, Math.ceil(upCount / PAGE_SIZE));
          if (page > totalPages - 1) page = totalPages - 1;

          const newEmbed = buildEmbed(q, page, totalPages);
          const newButtons = buildButtons(page, totalPages);
          const newJump = buildJumpMenu(page, totalPages);
          try {
            await message.edit({
              embeds: [newEmbed],
              components: [newButtons, newJump],
            });
          } catch {}
        }
      }, REFRESH_INTERVAL_MS);

      // Component collector (buttons + select menu)
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.MessageComponent,
        filter: (i) => i.user.id === interaction.user.id,
        idle: COLLECTOR_IDLE_MS,
        time: COLLECTOR_IDLE_MS * 3,
      });

      collector.on("collect", async (i) => {
        try {
          if (i.customId === "queue_stop") {
            collector.stop("stopped");
            return i.update({
              components: [
                buildButtons(page, totalPages, true),
                buildJumpMenu(page, totalPages, true),
              ],
            });
          }

          if (i.customId === "queue_jump" && i.isStringSelectMenu()) {
            const choice = Number(i.values?.[0] ?? 0);
            page = Math.min(Math.max(0, choice), totalPages - 1);
          } else if (i.customId === "queue_first") page = 0;
          else if (i.customId === "queue_prev") page = Math.max(0, page - 1);
          else if (i.customId === "queue_next")
            page = Math.min(totalPages - 1, page + 1);
          else if (i.customId === "queue_last") page = totalPages - 1;

          const q = client.distube.getQueue(interaction.guildId) ?? queue;
          const upCount = Math.max(0, q.songs.length - 1);
          totalPages = Math.max(1, Math.ceil(upCount / PAGE_SIZE));
          if (page > totalPages - 1) page = totalPages - 1;

          const newEmbed = buildEmbed(q, page, totalPages);
          const newButtons = buildButtons(page, totalPages);
          const newJump = buildJumpMenu(page, totalPages);
          await i.update({
            embeds: [newEmbed],
            components: [newButtons, newJump],
          });
        } catch (err) {
          console.error("queue component update failed:", err);
          try {
            await i.deferUpdate();
          } catch {}
        }
      });

      collector.on("end", async () => {
        stopped = true;
        clearInterval(interval);
        try {
          await message.edit({
            components: [
              buildButtons(page, totalPages, true),
              buildJumpMenu(page, totalPages, true),
            ],
          });
        } catch {}
      });
    } catch (e) {
      const msg = e?.message ?? "❌ Failed to show queue.";
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    }
  },
};
