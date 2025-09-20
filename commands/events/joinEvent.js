const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Event = require("../../models/Event");
const Participant = require("../../models/Participant");
const moment = require("moment");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("joinevent")
    .setDescription("Join an event.")
    .addStringOption((option) =>
      option
        .setName("event_name")
        .setDescription("Name of the event to join")
        .setRequired(true)
    ),
  category: "Events",

  async execute(interaction) {
    const eventName = interaction.options.getString("event_name");
    const event = await Event.findOne({ name: eventName });

    if (!event) {
      return interaction.reply({
        content: `Event "${eventName}" not found.`,
        ephemeral: false,
      });
    }

    let participant = await Participant.findOne({
      userId: interaction.user.id,
    });

    if (!participant) {
      participant = new Participant({
        userId: interaction.user.id,
        username: interaction.user.username,
      });
      await participant.save();
    }

    if (!event.participants.includes(participant._id)) {
      event.participants.push(participant._id);
      await event.save();
    }

    const embed = new EmbedBuilder()
      .setTitle(`Successfully Joined Event: ${event.name}`)
      .setColor("#3498db")
      .addFields(
        {
          name: "Category",
          value: event.category ? String(event.category) : "Not specified",
          inline: true,
        },
        {
          name: "Location",
          value: event.location ? String(event.location) : "Virtual",
          inline: true,
        },
        {
          name: "Start Date",
          value: moment(event.startDate).isValid()
            ? moment(event.startDate).format("YYYY-MM-DD HH:mm")
            : "N/A",
          inline: true,
        },
        {
          name: "End Date",
          value: moment(event.endDate).isValid()
            ? moment(event.endDate).format("YYYY-MM-DD HH:mm")
            : "N/A",
          inline: true,
        },
        {
          name: "Recurrence",
          value: event.recurrence ? String(event.recurrence) : "None",
          inline: true,
        },
        {
          name: "Participants",
          value: String(event.participants.length),
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({
        text: `Joined by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    await interaction.reply({ embeds: [embed] });
  },
};
