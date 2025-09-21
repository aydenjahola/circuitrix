const { getSyncedLyrics } = require("./lyricsProvider");

const states = new Map(); // guildId -> { thread, parent, timers, startedAtMs, pausedAtMs, songId, lastSentAtMs, lyrics }

function clearTimers(state) {
  if (!state?.timers) return;
  for (const t of state.timers) clearTimeout(t);
  state.timers = new Set();
}

/** coerce number seconds */
function sec(x) {
  return Math.max(0, Math.floor(Number(x || 0)));
}

/** schedule lyric lines starting from startTimeSec */
function scheduleLines(state, queue, lyrics, startTimeSec) {
  clearTimers(state);
  state.timers = new Set();
  state.startedAtMs = Date.now() - startTimeSec * 1000;

  const parentToSend = state.thread || state.parent;
  const MIN_GAP_MS = 400; // rate-limit safety

  for (const line of lyrics) {
    if (!line || typeof line.t !== "number") continue;
    const delayMs = Math.max(0, Math.round((line.t - startTimeSec) * 1000));
    const timer = setTimeout(async () => {
      try {
        const now = Date.now();
        if (state.lastSentAtMs && now - state.lastSentAtMs < MIN_GAP_MS) {
          await new Promise((r) =>
            setTimeout(r, MIN_GAP_MS - (now - state.lastSentAtMs))
          );
        }
        state.lastSentAtMs = Date.now();
        await parentToSend.send(line.text || "");
      } catch (e) {
        console.error("live lyrics send failed:", e?.message || e);
      }
    }, delayMs);
    state.timers.add(timer);
  }
}

async function createThreadOrFallback(queue, song) {
  const parent = queue.textChannel;
  let thread = null;

  if (parent?.threads?.create) {
    try {
      thread = await parent.threads.create({
        name: `${(song?.name || "Now Playing").slice(0, 80)} • Live`,
        autoArchiveDuration: 60,
        reason: "Live lyrics",
      });
    } catch (e) {
      console.warn("Thread create failed, falling back to parent:", e?.message);
    }
  }

  return { thread, parent };
}

async function start(queue, song) {
  try {
    const guildId = queue.id;
    await stop(guildId, { deleteThread: true });

    const lyrics = await getSyncedLyrics(song);
    if (!lyrics || lyrics.length === 0) {
      queue.textChannel?.send("🎤 No synced lyrics available for this track.");
      return;
    }

    const { thread, parent } = await createThreadOrFallback(queue, song);
    const state = {
      thread,
      parent,
      timers: new Set(),
      startedAtMs: Date.now(),
      pausedAtMs: null,
      songId: song?.id || song?.url || song?.name,
      lastSentAtMs: 0,
      lyrics,
    };
    states.set(guildId, state);

    const header = `**Live lyrics for:** ${song?.name || "Unknown title"}`;
    if (thread) await thread.send(header);
    else await parent.send(`${header} *(thread unavailable, posting here)*`);

    const current = sec(queue.currentTime);
    scheduleLines(state, queue, lyrics, current);
  } catch (e) {
    console.error("liveLyrics.start failed:", e?.message || e);
  }
}

async function pause(guildId) {
  const state = states.get(guildId);
  if (!state || state.pausedAtMs) return;
  state.pausedAtMs = Date.now();
  clearTimers(state);
}

async function resume(queue) {
  const state = states.get(queue.id);
  if (!state || !state.pausedAtMs) return;
  state.pausedAtMs = null;
  const current = sec(queue.currentTime);
  scheduleLines(state, queue, state.lyrics, current);
}

async function seek(queue, timeSecOptional) {
  const state = states.get(queue.id);
  if (!state) return;
  const current = sec(timeSecOptional ?? queue.currentTime ?? 0);
  scheduleLines(state, queue, state.lyrics, current);
}

async function stop(guildId, { deleteThread = false } = {}) {
  const state = states.get(guildId);
  if (!state) return;
  clearTimers(state);

  try {
    if (deleteThread && state.thread?.delete) {
      await state.thread.delete("Song ended — removing live lyrics thread.");
    }
  } catch (e) {
    console.warn("liveLyrics thread delete failed:", e?.message || e);
  }

  states.delete(guildId);
}

module.exports = { start, pause, resume, seek, stop };
