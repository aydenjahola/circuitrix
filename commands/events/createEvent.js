const { SlashCommandBuilder } = require("discord.js");
const Event = require("../../models/Event");
const Participant = require("../../models/Participant");
const moment = require("moment");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("createevent")
    .setDescription("Create a new event.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the event")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of the event")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Category of the event")
        .addChoices(
          { name: "Tournament", value: "tournament" },
          { name: "Meeting", value: "meeting" },
          { name: "Giveaway", value: "giveaway" },
          { name: "Other", value: "other" }
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("Location of the event (default is Online)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("startdatetime")
        .setDescription("Start date and time of the event (YYYY-MM-DD HH:mm)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("enddatetime")
        .setDescription("End date and time of the event (YYYY-MM-DD HH:mm)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("recurrence")
        .setDescription("Recurrence of the event")
        .addChoices(
          { name: "None", value: "none" },
          { name: "Daily", value: "daily" },
          { name: "Weekly", value: "weekly" },
          { name: "Monthly", value: "monthly" }
        )
    ),
  category: "Events",

  async execute(interaction) {
    const name = interaction.options.getString("name");
    const description = interaction.options.getString("description");
    const category = interaction.options.getString("category");
    const location = interaction.options.getString("location") || "Online";
    const startDate = moment(
      interaction.options.getString("startdatetime"),
      "YYYY-MM-DD HH:mm"
    );
    const endDate = moment(
      interaction.options.getString("enddatetime"),
      "YYYY-MM-DD HH:mm"
    );

    if (!startDate.isValid() || !endDate.isValid()) {
      return await interaction.reply(
        "Invalid date format! Use YYYY-MM-DD HH:mm."
      );
    }

    if (startDate.isAfter(endDate)) {
      return await interaction.reply("Start date must be before the end date.");
    }

    // Create new event
    const event = new Event({
      name,
      description,
      category,
      location,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      organizerId: interaction.user.id,
    });

    try {
      await event.save();
      await interaction.reply(
        `Event "${name}" created! Starts at ${startDate.format(
          "MMMM Do YYYY, h:mm a"
        )} and ends at ${endDate.format("MMMM Do YYYY, h:mm a")}.`
      );
    } catch (error) {
      if (error.code === 11000) {
        await interaction.reply("An event with that name already exists.");
      } else {
        await interaction.reply("Error creating event. Please try again.");
      }
    }
  },
};
