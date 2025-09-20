const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { Rcon } = require("rcon-client");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Auto-whitelist a user on the Minecraft server")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("The Minecraft username to whitelist")
        .setRequired(true)
    ),
  isModOnly: true,
  category: "Minecraft",

  async execute(interaction) {
    const username = interaction.options.getString("username");
    await interaction.deferReply();

    try {
      const rcon = new Rcon({
        host: process.env.RCON_HOST,
        port: Number(process.env.RCON_PORT),
        password: process.env.RCON_PASSWORD,
      });
      await rcon.connect();
      const response = await rcon.send(`whitelist add ${username}`);
      await rcon.end();

      await interaction.editReply(`RCON Response: ${response}`);
    } catch (error) {
      console.error("RCON Error:", error);
      await interaction.editReply(
        "There was an error executing the whitelist command."
      );
    }
  },
};
