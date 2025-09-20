const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("thisdayinhistory")
    .setDescription("Shows historical events that happened on this day."),
  category: "General",

  async execute(interaction) {
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      const response = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`
      );

      if (response.data.events.length === 0) {
        return interaction.reply("No significant events found for today.");
      }

      const events = response.data.events
        .map((event) => `${event.year}: ${event.text}`)
        .join("\n");

      const maxDescriptionLength = 4096;
      const truncatedEvents =
        events.length > maxDescriptionLength
          ? events.slice(0, maxDescriptionLength - 3) + "..."
          : events;

      const historyEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`This Day in History: ${month}/${day}`)
        .setDescription(truncatedEvents)
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [historyEmbed] });
    } catch (error) {
      console.error("Error executing the thisdayinhistory command:", error);

      if (error.response) {
        await interaction.reply({
          content: `API returned an error: ${error.response.status} - ${error.response.data.title}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content:
            "There was an error while executing this command! Please try again later.",
          ephemeral: true,
        });
      }
    }
  },
};
