// Tiny provider that tries LRCLIB first (synced LRC), then falls back to unsynced lines.
// Docs: https://lrclib.net (no API key required)
//
// Returned format: [{ t: Number(seconds), text: String }, ...] sorted by t

function parseLRC(lrcText) {
  // Supports tags like [ti:], [ar:], [length:], and timestamp lines [mm:ss.xx]
  const lines = lrcText.split(/\r?\n/);
  const out = [];
  const timeRe = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?]/g;

  for (const line of lines) {
    let m;
    let lastIndex = 0;
    // extract all timestamps from this line
    const stamps = [];
    while ((m = timeRe.exec(line)) !== null) {
      const mm = Number(m[1]);
      const ss = Number(m[2]);
      const ms = Number(m[3] || 0);
      const t = mm * 60 + ss + ms / 1000;
      stamps.push({ t, idx: m.index });
      lastIndex = timeRe.lastIndex;
    }
    if (!stamps.length) continue;
    // text is after last timestamp tag
    const text = line.slice(lastIndex).trim();
    if (!text) continue;
    for (const s of stamps) out.push({ t: s.t, text });
  }

  // remove duplicates, sort
  out.sort((a, b) => a.t - b.t);
  const dedup = [];
  let prev = "";
  for (const l of out) {
    const key = `${l.t.toFixed(2)}|${l.text}`;
    if (key !== prev) dedup.push(l);
    prev = key;
  }
  return dedup;
}

function splitUnsyncedLyrics(text) {
  // Fallback for plain lyrics (no timestamps): just emit a line every ~2s
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 500); // keep it sane
  const out = [];
  let t = 0;
  for (const l of lines) {
    out.push({ t, text: l });
    t += 2;
  }
  return out;
}

function pickArtistAndTitle(song) {
  // Try to infer artist/title for better matches
  const name = song?.name || "";
  const byUploader = song?.uploader?.name || "";
  let title = name;
  let artist = "";

  // If the title looks like "Artist - Title"
  if (name.includes(" - ")) {
    const [a, b] = name.split(" - ");
    if (a && b) {
      artist = a.trim();
      title = b.trim();
    }
  }
  if (!artist) {
    artist = byUploader || song?.author || "";
  }
  return { artist, title };
}

async function fetchLRCLIBLyrics(song) {
  const { artist, title } = pickArtistAndTitle(song);
  // Build a simple query, we also try with raw name as a fallback
  const candidates = [];

  if (title) {
    candidates.push({ track_name: title, artist_name: artist || "" });
  }
  if (song?.name) {
    candidates.push({ track_name: song.name, artist_name: artist || "" });
  }

  for (const c of candidates) {
    try {
      const url = new URL("https://lrclib.net/api/get");
      if (c.track_name) url.searchParams.set("track_name", c.track_name);
      if (c.artist_name) url.searchParams.set("artist_name", c.artist_name);
      // lrclib also accepts album_name + duration if you have them

      const res = await fetch(url.toString(), {
        headers: {
          "user-agent": "CircuitrixBot/1.0 (+https://github.com/aydenjahola)",
        },
      });

      if (!res.ok) continue;
      const data = await res.json();

      // Prefer synced lyrics
      if (data?.syncedLyrics) {
        const parsed = parseLRC(data.syncedLyrics);
        if (parsed.length) return parsed;
      }

      // Fallback to unsynced lyrics
      if (data?.plainLyrics) {
        const parsed = splitUnsyncedLyrics(data.plainLyrics);
        if (parsed.length) return parsed;
      }
    } catch (e) {
      // Keep trying next candidate
      // console.warn("LRCLIB fetch failed:", e?.message);
    }
  }
  return null;
}

/**
 * Return an array of { t, text } (seconds) for synced display, or null if none.
 * This is the only function the rest of the bot uses.
 */
async function getSyncedLyrics(song) {
  // LRCLIB (synced LRC, free)
  const lrclib = await fetchLRCLIBLyrics(song);
  if (lrclib && lrclib.length) return lrclib;

  return null;
}

module.exports = { getSyncedLyrics, parseLRC, splitUnsyncedLyrics };
