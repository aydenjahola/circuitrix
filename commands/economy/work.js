const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserEconomy = require("../../models/UserEconomy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work to earn coins and experience random events!"),
  category: "Economy",

  async execute(interaction) {
    const { user, guild } = interaction;
    const jobs = [
      { name: "Farmer", reward: 100 },
      { name: "Miner", reward: 150 },
      { name: "Chef", reward: 120 },
      { name: "Artist", reward: 130 },
    ];
    const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
    const randomBonus =
      Math.random() < 0.1 ? Math.floor(Math.random() * 200) : 0;
    const workReward = randomJob.reward + randomBonus;

    let userEconomy = await UserEconomy.findOne({
      userId: user.id,
      guildId: guild.id,
    });
    const cooldownTime = 60 * 60 * 1000;

    if (!userEconomy) {
      userEconomy = await UserEconomy.create({
        userId: user.id,
        guildId: guild.id,
      });
    }

    const now = new Date();
    if (userEconomy.lastWork && now - userEconomy.lastWork < cooldownTime) {
      const remainingTime = cooldownTime - (now - userEconomy.lastWork);
      const remainingMinutes = Math.ceil(remainingTime / (60 * 1000));

      const cooldownEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("Cooldown")
        .setDescription(
          `You need to wait **${remainingMinutes}** minutes before you can work again.`
        )
        .setTimestamp()
        .setFooter({
          text: `Requested by ${user.username}`,
          iconURL: user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [cooldownEmbed] });
      return;
    }

    userEconomy.balance += workReward;
    userEconomy.lastWork = now;
    await userEconomy.save();

    const successEmbed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("Work Success")
      .setDescription(
        `You worked as a **${randomJob.name}** and earned **${workReward}** coins!`
      )
      .setTimestamp()
      .setFooter({
        text: `Requested by ${user.username}`,
        iconURL: user.displayAvatarURL(),
      });

    await interaction.reply({ embeds: [successEmbed] });
  },
};
