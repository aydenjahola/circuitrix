const { SlashCommandBuilder } = require("discord.js");
const ServerSettings = require("../../models/ServerSettings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("actionitems")
    .setDescription(
      "Create multiple action items and assign them to different users"
    )
    .addStringOption((option) =>
      option
        .setName("assignments")
        .setDescription(
          "List of tasks in the format @user: task1, @user2: task2"
        )
        .setRequired(true)
    ),
  category: "Moderation",

  async execute(interaction) {
    const serverSettings = await ServerSettings.findOne({
      guildId: interaction.guild.id,
    });

    if (!serverSettings) {
      return interaction.reply({
        content:
          "Server settings are not configured. Please run the setup command.",
        ephemeral: true,
      });
    }

    const actionItemsChannelId = serverSettings.actionItemsChannelId;

    if (interaction.channelId !== actionItemsChannelId) {
      return interaction.reply({
        content: `This command can only be used in the <#${actionItemsChannelId}> channel.`,
        ephemeral: true,
      });
    }

    const assignmentsInput = interaction.options.getString("assignments");
    const assignments = assignmentsInput
      .split(",")
      .map((assignment) => assignment.trim());

    const userTaskMap = new Map();
    const completedTasksMap = new Map();

    // Parse each assignment to map users and tasks
    for (const assignment of assignments) {
      const [userMention, task] = assignment
        .split(":")
        .map((part) => part.trim());

      const userId = userMention.match(/<@!?(\d+)>/)?.[1];
      if (!userId || !task) {
        return interaction.reply({
          content: `Invalid format. Please use "@user: task" format. Example: @User1: Task 1, @User2: Task 2`,
          ephemeral: true,
        });
      }

      const user = await interaction.guild.members.fetch(userId);
      if (!user) {
        return interaction.reply({
          content: `User ${userMention} not found.`,
          ephemeral: true,
        });
      }

      if (!userTaskMap.has(user)) {
        userTaskMap.set(user, []);
        completedTasksMap.set(user, new Set());
      }
      userTaskMap.get(user).push(task);
    }

    // initial message content
    let messageContent = `📝 **Action Items:**\n\n`;
    userTaskMap.forEach((tasks, user) => {
      messageContent += `👤 **Assigned to:** ${user}\n`;
      tasks.forEach((task, index) => {
        messageContent += `**${index + 1}.** ${task}\n`;
      });
      messageContent += "\n";
    });

    const targetChannelId = serverSettings.actionItemsTargetChannelId;
    const targetChannel = await interaction.guild.channels.fetch(
      targetChannelId
    );
    if (!targetChannel) {
      return interaction.reply({
        content: `Unable to find the target channel.`,
        ephemeral: true,
      });
    }

    const actionMessage = await targetChannel.send({
      content: messageContent + `✅ React with a checkmark to complete tasks!`,
    });

    await actionMessage.react("✅");

    const filter = (reaction, user) => {
      return reaction.emoji.name === "✅" && userTaskMap.has(user);
    };

    const collector = actionMessage.createReactionCollector({
      filter,
      dispose: true,
    });

    collector.on("collect", async (reaction, user) => {
      const tasks = userTaskMap.get(user);
      const completedTasks = completedTasksMap.get(user);

      if (completedTasks.size < tasks.length) {
        const nextTaskIndex = completedTasks.size;
        completedTasks.add(nextTaskIndex);

        let updatedMessageContent = `📝 **Action Items:**\n\n`;
        userTaskMap.forEach((userTasks, assignedUser) => {
          updatedMessageContent += `👤 **Assigned to:** ${assignedUser}\n`;
          userTasks.forEach((task, idx) => {
            updatedMessageContent += `**${idx + 1}.** ${task}\n`;
          });
          updatedMessageContent += "\n";
        });

        await actionMessage.edit({
          content:
            updatedMessageContent +
            `✅ React with a checkmark to complete tasks!`,
        });

        await interaction.followUp({
          content: `${user} has completed task **${tasks[nextTaskIndex]}**!`,
          ephemeral: true,
        });
      }
    });

    collector.on("end", () => {
      console.log("Collector ended");
    });

    // Confirm action items have been posted to the target channel
    await interaction.reply({
      content: `Action items have been successfully posted in <#${targetChannelId}>.`,
      ephemeral: true,
    });
  },
};
