const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const ShopItem = require("../../models/ShopItem");
const UserEconomy = require("../../models/UserEconomy");
const UserInventory = require("../../models/UserInventory");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Browse the shop for items with rarity and discounts!")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("The item you want to buy (use item name)")
        .setRequired(false)
    ),
  category: "Economy",

  async execute(interaction) {
    const { user, guild } = interaction;
    const discountChance = 0.3;
    const itemName = interaction.options.getString("item");

    const items = await ShopItem.find({ guildId: guild.id });

    if (items.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("🛒 Shop Items")
        .setDescription("No items in the shop currently.")
        .setTimestamp()
        .setFooter({
          text: `Requested by ${user.username}`,
          iconURL: user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [emptyEmbed] });
      return;
    }

    if (itemName) {
      const item = items.find(
        (item) => item.name.toLowerCase() === itemName.toLowerCase()
      );
      if (!item) {
        await interaction.reply({
          content: "Item not found in the shop!",
          ephemeral: false,
        });
        return;
      }

      let userEconomy = await UserEconomy.findOne({
        userId: user.id,
        guildId: guild.id,
      });
      if (!userEconomy) {
        userEconomy = await UserEconomy.create({
          userId: user.id,
          guildId: guild.id,
        });
      }

      const discount = Math.random() < discountChance ? 0.8 : 1;
      const discountedPrice = Math.floor(item.price * discount);

      if (userEconomy.balance < discountedPrice) {
        const insufficientFundsEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("💸 Insufficient Funds")
          .setDescription(
            `You don't have enough coins to buy **${item.name}**!`
          )
          .addFields(
            {
              name: "Your Balance",
              value: `${userEconomy.balance} coins`,
              inline: true,
            },
            {
              name: "Item Price",
              value: `${discountedPrice} coins`,
              inline: true,
            }
          )
          .setTimestamp()
          .setFooter({
            text: `Requested by ${user.username}`,
            iconURL: user.displayAvatarURL(),
          });

        await interaction.reply({
          embeds: [insufficientFundsEmbed],
          ephemeral: false,
        });
        return;
      }

      userEconomy.balance -= discountedPrice;
      await userEconomy.save();

      const userInventory = await UserInventory.findOne({
        userId: user.id,
        guildId: guild.id,
        itemId: item.itemId,
      });
      if (userInventory) {
        userInventory.quantity += 1;
        await userInventory.save();
      } else {
        await UserInventory.create({
          userId: user.id,
          guildId: guild.id,
          itemId: item.itemId,
          quantity: 1,
        });
      }

      const successEmbed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("🎉 Purchase Successful")
        .setDescription(
          `You bought **${item.name}** for **${discountedPrice}** coins!`
        )
        .setTimestamp()
        .setFooter({
          text: `Requested by ${user.username}`,
          iconURL: user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [successEmbed], ephemeral: false });
      return;
    }

    const shopItemsDetails = items.map((item) => {
      const discount = Math.random() < discountChance ? 0.8 : 1;
      const price = Math.floor(item.price * discount);
      const discountText = discount < 1 ? " (Discounted!)" : "";

      return `${item.name} - **${price}** coins${discountText} - Rarity: ${
        item.rarity
      } - Type: ${item.type} - Category: ${item.category || "N/A"}`;
    });

    const shopEmbed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("🛒 Shop Items")
      .setDescription(shopItemsDetails.join("\n"))
      .setTimestamp()
      .setFooter({
        text: `Requested by ${user.username}`,
        iconURL: user.displayAvatarURL(),
      });

    await interaction.reply({ embeds: [shopEmbed] });
  },
};
