const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Event = require("../../models/Event");
const Participant = require("../../models/Participant");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaveevent")
    .setDescription("Leave an event.")
    .addStringOption((option) =>
      option
        .setName("event_name")
        .setDescription("Name of the event to leave")
        .setRequired(true)
    ),
  category: "Events",

  async execute(interaction) {
    const eventName = interaction.options.getString("event_name");
    const event = await Event.findOne({ name: eventName });

    if (!event) {
      return await interaction.reply({
        content: `Event "${eventName}" not found.`,
        ephemeral: false,
      });
    }

    const participant = await Participant.findOne({
      userId: interaction.user.id,
    });

    if (!participant) {
      return await interaction.reply({
        content: `You are not a participant of this event.`,
        ephemeral: false,
      });
    }

    event.participants.pull(participant._id);
    await event.save();

    const isInOtherEvents = await Event.exists({
      participants: participant._id,
    });
    if (!isInOtherEvents) {
      await Participant.deleteOne({ userId: interaction.user.id });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Left Event: ${event.name}`)
      .setColor("#e74c3c")
      .addFields(
        {
          name: "Category",
          value: event.category || "Not specified",
          inline: true,
        },
        { name: "Location", value: event.location || "Virtual", inline: true },
        {
          name: "Participants Remaining",
          value: String(event.participants.length),
          inline: true,
        }
      )
      .setFooter({
        text: `Left by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
