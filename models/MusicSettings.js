const { Schema, model } = require("mongoose");

const MusicSettingsSchema = new Schema(
  {
    guildId: { type: String, unique: true, index: true, required: true },
    defaultVolume: { type: Number, default: 100, min: 0, max: 200 },
    autoplay: { type: Boolean, default: false },
    allowedTextChannelIds: { type: [String], default: [] }, // empty => all allowed
    djRoleIds: { type: [String], default: [] },
    maxQueue: { type: Number, default: 1000, min: 1, max: 5000 },
    maxPlaylistImport: { type: Number, default: 500, min: 1, max: 2000 },
  },
  { timestamps: true }
);

module.exports = model("MusicSettings", MusicSettingsSchema);
