const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Event = require("../../models/Event");
const moment = require("moment");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("listevents")
    .setDescription("List all upcoming events."),
  category: "Events",

  async execute(interaction) {
    const { user } = interaction;
    const upcomingEvents = await Event.find({ status: "upcoming" }).populate(
      "participants"
    );

    if (upcomingEvents.length === 0) {
      return interaction.reply("There are no upcoming events.");
    }

    const embed = new EmbedBuilder()
      .setTitle("Upcoming Events")
      .setColor("#00FF00")
      .setTimestamp()
      .setFooter({
        text: `Requested by ${user.username}`,
        iconURL: user.displayAvatarURL(),
      });

    upcomingEvents.forEach((event) => {
      const participantsList =
        event.participants.map((p) => p.username).join(", ") ||
        "No Particiapnts yet";

      embed.addFields({
        name: event.name,
        value: `**Description:** ${event.description}\n**Category:** ${
          event.category
        }\n**Location:** ${event.location}\n**Start Date:** ${moment(
          event.startDate
        ).format("YYYY-MM-DD HH:mm")}\n**End Date:** ${moment(
          event.endDate
        ).format("YYYY-MM-DD HH:mm")}\n**Recurrence:** ${
          event.recurrence
        }\n**Participants:** ${participantsList}`,
        inline: false,
      });
    });

    await interaction.reply({ embeds: [embed] });
  },
};
