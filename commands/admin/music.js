const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { ensure, set } = require("../../utils/musicSettings");

function ok(s) {
  return `✅ ${s}`;
}
function err(s) {
  return `❌ ${s}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Configure music settings for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sc) =>
      sc.setName("show").setDescription("Show current music settings.")
    )
    .addSubcommand((sc) =>
      sc
        .setName("set")
        .setDescription("Set basic music defaults.")
        .addIntegerOption((o) =>
          o.setName("volume").setDescription("Default volume (0–200)")
        )
        .addBooleanOption((o) =>
          o
            .setName("autoplay")
            .setDescription("Autoplay when queue ends (true/false)")
        )
        .addIntegerOption((o) =>
          o.setName("maxqueue").setDescription("Max queue size (1–5000)")
        )
        .addIntegerOption((o) =>
          o
            .setName("maxplaylist")
            .setDescription("Max playlist import size (1–2000)")
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("djrole-add")
        .setDescription("Allow a role to use DJ commands.")
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("djrole-remove")
        .setDescription("Remove a DJ role.")
        .addRoleOption((o) =>
          o.setName("role").setDescription("Role").setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("channel-allow")
        .setDescription(
          "Restrict music commands to a text channel (call multiple times)."
        )
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Text channel").setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("channel-remove")
        .setDescription("Remove an allowed text channel.")
        .addChannelOption((o) =>
          o.setName("channel").setDescription("Text channel").setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("channel-clear")
        .setDescription("Allow music commands in all text channels.")
    ),
  category: "Admin",

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;

    const sub = interaction.options.getSubcommand();
    const settings = await ensure(guildId);

    if (sub === "show") {
      const lines = [
        `**Default Volume:** ${settings.defaultVolume}%`,
        `**Autoplay:** ${settings.autoplay ? "On" : "Off"}`,
        `**Max Queue:** ${settings.maxQueue}`,
        `**Max Playlist Import:** ${settings.maxPlaylistImport}`,
        `**DJ Roles:** ${
          settings.djRoleIds.length
            ? settings.djRoleIds.map((id) => `<@&${id}>`).join(", ")
            : "*none*"
        }`,
        `**Allowed Text Channels:** ${
          settings.allowedTextChannelIds.length
            ? settings.allowedTextChannelIds.map((id) => `<#${id}>`).join(", ")
            : "*all*"
        }`,
      ];
      return interaction.followUp(lines.join("\n"));
    }

    // mutate helpers
    const update = {};
    if (sub === "set") {
      const vol = interaction.options.getInteger("volume");
      const autoplay = interaction.options.getBoolean("autoplay");
      const maxQ = interaction.options.getInteger("maxqueue");
      const maxP = interaction.options.getInteger("maxplaylist");

      if (vol !== null) {
        if (vol < 0 || vol > 200)
          return interaction.followUp(err("Volume must be 0–200."));
        update.defaultVolume = vol;
      }
      if (autoplay !== null) update.autoplay = autoplay;
      if (maxQ !== null) {
        if (maxQ < 1 || maxQ > 5000)
          return interaction.followUp(err("Max queue must be 1–5000."));
        update.maxQueue = maxQ;
      }
      if (maxP !== null) {
        if (maxP < 1 || maxP > 2000)
          return interaction.followUp(err("Max playlist must be 1–2000."));
        update.maxPlaylistImport = maxP;
      }

      await set(guildId, update);
      return interaction.followUp(ok("Settings updated."));
    }

    if (sub === "djrole-add") {
      const role = interaction.options.getRole("role", true);
      const setDoc = new Set(settings.djRoleIds || []);
      setDoc.add(role.id);
      await set(guildId, { djRoleIds: Array.from(setDoc) });
      return interaction.followUp(ok(`Added DJ role ${role}.`));
    }

    if (sub === "djrole-remove") {
      const role = interaction.options.getRole("role", true);
      const setDoc = new Set(settings.djRoleIds || []);
      setDoc.delete(role.id);
      await set(guildId, { djRoleIds: Array.from(setDoc) });
      return interaction.followUp(ok(`Removed DJ role ${role}.`));
    }

    if (sub === "channel-allow") {
      const ch = interaction.options.getChannel("channel", true);
      const setDoc = new Set(settings.allowedTextChannelIds || []);
      setDoc.add(ch.id);
      await set(guildId, { allowedTextChannelIds: Array.from(setDoc) });
      return interaction.followUp(ok(`Allowed ${ch} for music commands.`));
    }

    if (sub === "channel-remove") {
      const ch = interaction.options.getChannel("channel", true);
      const setDoc = new Set(settings.allowedTextChannelIds || []);
      setDoc.delete(ch.id);
      await set(guildId, { allowedTextChannelIds: Array.from(setDoc) });
      return interaction.followUp(ok(`Removed ${ch} from allowed channels.`));
    }

    if (sub === "channel-clear") {
      await set(guildId, { allowedTextChannelIds: [] });
      return interaction.followUp(
        ok("Cleared channel restrictions (music commands allowed everywhere).")
      );
    }

    return interaction.followUp(err("Unknown subcommand."));
  },
};
