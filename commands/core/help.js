const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Lists all available commands"),
  category: "Core",

  async execute(interaction, client) {
    try {
      const isMod = interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageRoles
      );

      const serverName = interaction.guild.name;

      // Group commands by category
      const categories = {};
      client.commands.forEach((command) => {
        const category = command.category || "Uncategorized"; // Default to "Uncategorized"
        if (!categories[category]) {
          categories[category] = [];
        }

        const commandLine = `/${command.data.name} - ${command.data.description}`;
        // Check if command is mod-only and user has permissions
        if (!command.isModOnly || (command.isModOnly && isMod)) {
          categories[category].push(commandLine);
        }
      });

      const helpEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Available Commands")
        .setDescription(
          "This bot comes from an Open Source project developed by [Ayden](https://github.com/aydenjahola/discord-multipurpose-bot)\n\nHere are all the available commands:"
        )
        .setTimestamp()
        .setFooter({
          text: `${serverName} | Made with ❤️ by Ayden`,
          iconURL: client.user.displayAvatarURL(),
        });

      // Function to split commands into fields under 1024 characters
      const addCommandFields = (embed, commands, title) => {
        if (commands.length === 0) return;

        let commandChunk = "";
        let chunkCount = 1;

        commands.forEach((command) => {
          if ((commandChunk + command + "\n").length > 1024) {
            embed.addFields({
              name: `${title} (Part ${chunkCount})`,
              value: commandChunk,
            });
            commandChunk = "";
            chunkCount += 1;
          }
          commandChunk += command + "\n";
        });

        if (commandChunk) {
          embed.addFields({
            name: chunkCount > 1 ? `${title} (Part ${chunkCount})` : title,
            value: commandChunk,
          });
        }
      };

      // Add commands for each category
      for (const [categoryName, commands] of Object.entries(categories)) {
        addCommandFields(helpEmbed, commands, `${categoryName} Commands`);
      }

      await interaction.reply({ embeds: [helpEmbed] });
    } catch (error) {
      console.error("Error executing the help command:", error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
