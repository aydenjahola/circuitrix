const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Deletes messages from the channel")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Type of purge operation")
        .setRequired(true)
        .addChoices(
          { name: "Purge Specific Number", value: "specific" },
          { name: "Purge All", value: "all" }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The number of messages to delete (1-100)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  isModOnly: true,
  category: "Moderation",

  async execute(interaction) {
    try {
      // Check if the user has the Manage Messages permission
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)
      ) {
        await interaction.reply({
          content: "You do not have permission to use this command!",
          ephemeral: true,
        });
        return;
      }

      const type = interaction.options.getString("type");
      let amount = interaction.options.getInteger("amount");
      const logChannelId = process.env.LOG_CHANNEL_ID;
      const logChannel = interaction.guild.channels.cache.get(logChannelId);

      if (type === "specific") {
        // Ensure the number of messages to delete is between 1 and 100
        if (amount < 1 || amount > 100) {
          await interaction.reply({
            content: "Please specify a number between 1 and 100.",
            ephemeral: true,
          });
          return;
        }

        // Delete a specific number of messages
        const fetchedMessages = await interaction.channel.messages.fetch({
          limit: amount,
        });
        await interaction.channel.bulkDelete(fetchedMessages);

        const purgeEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("Messages Purged")
          .setDescription(`Successfully deleted ${amount} messages.`)
          .setTimestamp()
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        // Send confirmation as ephemeral message
        await interaction.reply({
          embeds: [purgeEmbed],
          ephemeral: true,
        });

        // Send log to the logs channel
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("Purge Operation")
            .setDescription(
              `User ${interaction.user.tag} purged ${amount} messages from ${interaction.channel.name}.`
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      } else if (type === "all") {
        // Purge all messages (up to 100 messages at a time)
        let messages;
        let deletedMessagesCount = 0;
        do {
          messages = await interaction.channel.messages.fetch({ limit: 100 });
          if (messages.size === 0) break;
          deletedMessagesCount += messages.size;
          await interaction.channel.bulkDelete(messages);
        } while (messages.size >= 2); // Keep fetching and deleting until no more messages are left

        const purgeEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("All Messages Purged")
          .setDescription("Successfully deleted all messages in the channel.")
          .setTimestamp()
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        // Send confirmation as ephemeral message
        await interaction.reply({
          embeds: [purgeEmbed],
          ephemeral: true,
        });

        // Send log to the logs channel
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("Purge Operation")
            .setDescription(
              `User ${interaction.user.tag} purged all messages from ${interaction.channel.name}. Total messages deleted: ${deletedMessagesCount}.`
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    } catch (error) {
      console.error("Error executing purge command:", error);

      try {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } catch (replyError) {
        console.error("Error replying to interaction:", replyError);
      }
    }
  },
};
