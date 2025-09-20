const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserInventory = require("../../models/UserInventory");
const ShopItem = require("../../models/ShopItem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your inventory with item rarity"),
  category: "Economy",

  async execute(interaction) {
    const { user, guild } = interaction;
    const inventory = await UserInventory.find({
      userId: user.id,
      guildId: guild.id,
    });

    if (inventory.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("Inventory")
        .setDescription("Your inventory is empty.")
        .setTimestamp()
        .setFooter({
          text: `Requested by ${user.username}`,
          iconURL: user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [emptyEmbed] });
      return;
    }

    const itemDetails = await Promise.all(
      inventory.map(async (item) => {
        const shopItem = await ShopItem.findOne({ itemId: item.itemId });

        if (!shopItem) {
          return null;
        }

        if (item.quantity > 0) {
          return `${shopItem.name} (x${item.quantity}) - **Rarity**: ${
            shopItem.rarity
          } - **Type**: ${shopItem.type} - **Category**: ${
            shopItem.category || "N/A"
          }`;
        }
        return null;
      })
    );

    const filteredItemDetails = itemDetails.filter((detail) => detail !== null);

    const inventoryEmbed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle(`${user.username}'s Inventory`)
      .setDescription(
        filteredItemDetails.join("\n") || "No items in inventory."
      )
      .setTimestamp()
      .setFooter({
        text: `Requested by ${user.username}`,
        iconURL: user.displayAvatarURL(),
      });

    await interaction.reply({ embeds: [inventoryEmbed] });
  },
};
