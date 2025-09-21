// commands/editevent.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Event = require("../../models/Event");
const moment = require("moment");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("editevent")
    .setDescription("Edit an existing event.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the event to edit")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("New description of the event")
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("New category of the event")
        .addChoices(
          { name: "Tournament", value: "tournament" },
          { name: "Meeting", value: "meeting" },
          { name: "Giveaway", value: "giveaway" },
          { name: "Other", value: "other" }
        )
    )
    .addStringOption((option) =>
      option.setName("location").setDescription("New location of the event")
    )
    .addStringOption((option) =>
      option
        .setName("startdatetime")
        .setDescription(
          "New start date and time of the event (YYYY-MM-DD HH:mm)"
        )
    )
    .addStringOption((option) =>
      option
        .setName("enddatetime")
        .setDescription("New end date and time of the event (YYYY-MM-DD HH:mm)")
    )
    .addStringOption((option) =>
      option
        .setName("recurrence")
        .setDescription("New recurrence of the event")
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
    const event = await Event.findOne({ name });

    if (!event) {
      return await interaction.reply("Event not found!");
    }

    if (interaction.options.getString("description")) {
      event.description = interaction.options.getString("description");
    }
    if (interaction.options.getString("category")) {
      event.category = interaction.options.getString("category");
    }
    if (interaction.options.getString("location")) {
      event.location = interaction.options.getString("location");
    }
    if (interaction.options.getString("startdatetime")) {
      const newStartDate = moment(
        interaction.options.getString("startdatetime"),
        "YYYY-MM-DD HH:mm"
      );
      if (!newStartDate.isValid()) {
        return await interaction.reply(
          "Invalid start date format! Use YYYY-MM-DD HH:mm."
        );
      }
      event.startDate = newStartDate.toISOString();
    }
    if (interaction.options.getString("enddatetime")) {
      const newEndDate = moment(
        interaction.options.getString("enddatetime"),
        "YYYY-MM-DD HH:mm"
      );
      if (!newEndDate.isValid()) {
        return await interaction.reply(
          "Invalid end date format! Use YYYY-MM-DD HH:mm."
        );
      }
      if (moment(event.startDate).isAfter(newEndDate)) {
        return await interaction.reply(
          "End date must be after the start date."
        );
      }
      event.endDate = newEndDate.toISOString();
    }
    if (interaction.options.getString("recurrence")) {
      event.recurrence = interaction.options.getString("recurrence");
    }

    await event.save();

    const embed = new EmbedBuilder()
      .setTitle(`Event "${event.name}" Updated Successfully`)
      .setColor("#00FF00")
      .addFields(
        {
          name: "Description",
          value: event.description || "No description provided",
          inline: true,
        },
        {
          name: "Category",
          value: event.category || "Not specified",
          inline: true,
        },
        {
          name: "Location",
          value: event.location || "Not specified",
          inline: true,
        },
        {
          name: "Start Date",
          value: moment(event.startDate).format("YYYY-MM-DD HH:mm"),
          inline: true,
        },
        {
          name: "End Date",
          value: moment(event.endDate).format("YYYY-MM-DD HH:mm"),
          inline: true,
        },
        { name: "Recurrence", value: event.recurrence || "None", inline: true }
      )
      .setFooter({
        text: "Event updated successfully",
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
