const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserEconomy = require("../../models/UserEconomy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily reward and start a streak!"),
  category: "Economy",

  async execute(interaction) {
    const { user, guild } = interaction;
    const dailyBaseReward = 100;
    const streakBonus = 10;
    const rareItemChance = 0.1;
    const oneDay = 24 * 60 * 60 * 1000;

    let userEconomy = await UserEconomy.findOne({
      userId: user.id,
      guildId: guild.id,
    });

    if (!userEconomy) {
      userEconomy = await UserEconomy.create({
        userId: user.id,
        guildId: guild.id,
        streak: 0,
        balance: 0,
      });
    }

    const now = new Date();

    if (userEconomy.lastDaily && now - userEconomy.lastDaily < oneDay) {
      const remainingTime =
        new Date(userEconomy.lastDaily.getTime() + oneDay) - now;
      const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
      const seconds = Math.floor((remainingTime / 1000) % 60);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("Daily Reward Claim")
        .setDescription(
          `Come back in **${hours}h ${minutes}m ${seconds}s** for your next reward!`
        )
        .setTimestamp()
        .setFooter({
          text: `Requested by ${user.username}`,
          iconURL: user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [errorEmbed] });
      return;
    }

    if (userEconomy.lastDaily && now - userEconomy.lastDaily >= oneDay) {
      userEconomy.streak = 0;
    }

    userEconomy.streak += 1;
    const reward = dailyBaseReward + userEconomy.streak * streakBonus;
    userEconomy.lastDaily = now;
    userEconomy.balance += reward;

    const rareItemEarned = Math.random() < rareItemChance;
    const rareItemMessage = rareItemEarned
      ? "\nYou also found a **rare item** in your reward!"
      : "";

    await userEconomy.save();

    const successEmbed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("Daily Reward Claimed!")
      .setDescription(
        `You've claimed **${reward}** coins and extended your streak!${rareItemMessage}`
      )
      .addFields({
        name: "Streak Bonus",
        value: `Current streak: **${userEconomy.streak}** days`,
        inline: true,
      })
      .setFooter({
        text: `Requested by ${user.username}`,
        iconURL: user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
  },
};
