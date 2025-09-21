const MusicSettings = require("../models/MusicSettings");

/** in-memory cache to cut Mongo roundtrips */
const cache = new Map(); // guildId -> settings doc (lean POJO)

async function ensure(guildId) {
  if (!guildId) throw new Error("Missing guildId");
  if (cache.has(guildId)) return cache.get(guildId);

  let doc = await MusicSettings.findOne({ guildId }).lean();
  if (!doc) {
    doc = await MusicSettings.create({ guildId });
    doc = doc.toObject();
  }
  cache.set(guildId, doc);
  return doc;
}

async function set(guildId, patch) {
  const updated = await MusicSettings.findOneAndUpdate(
    { guildId },
    { $set: patch },
    { upsert: true, new: true }
  ).lean();
  cache.set(guildId, updated);
  return updated;
}

function clear(guildId) {
  if (guildId) cache.delete(guildId);
  else cache.clear();
}

module.exports = { ensure, set, clear };
