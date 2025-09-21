const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const UserInventory = require("../../models/UserInventory");
const ShopItem = require("../../models/ShopItem");
const UserEconomy = require("../../models/UserEconomy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sell")
    .setDescription("Sell an item from your inventory."),
  category: "Economy",

  async execute(interaction) {
    const { user, guild } = interaction;

    const userInventory = await UserInventory.find({
      userId: user.id,
      guildId: guild.id,
    });

    if (userInventory.length === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("🛑 Inventory Empty")
        .setDescription("You have no items in your inventory to sell.")
        .setTimestamp()
        .setFooter({
          text: `Requested by ${user.username}`,
          iconURL: user.displayAvatarURL(),
        });

      await interaction.reply({ embeds: [errorEmbed], ephemeral: false });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("sell_item")
      .setPlaceholder("Select an item to sell")
      .addOptions(
        userInventory.map((item) => ({
          label: item.itemId,
          value: item.itemId,
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const promptEmbed = new EmbedBuilder()
      .setColor("#00ffff")
      .setTitle("📦 Select Item to Sell")
      .setDescription(
        "Choose an item from your inventory to sell. The selling price is 50% less than the original item price."
      )
      .setTimestamp()
      .setFooter({
        text: `Requested by ${user.username}`,
        iconURL: user.displayAvatarURL(),
      });

    await interaction.reply({ embeds: [promptEmbed], components: [row] });

    const filter = (i) => {
      return i.user.id === user.id;
    };

    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "sell_item") {
        const selectedItemId = i.values[0];
        const selectedItem = userInventory.find(
          (item) => item.itemId === selectedItemId
        );

        const shopItem = await ShopItem.findOne({
          itemId: selectedItemId,
          guildId: guild.id,
        });

        if (!shopItem) {
          await i.reply({
            content: "Item not found in the shop.",
            ephemeral: false,
          });
          return;
        }

        const sellingPrice = Math.floor(shopItem.price / 2);

        const quantityPrompt = new EmbedBuilder()
          .setColor("#ffff00")
          .setTitle(`💰 Selling ${shopItem.name}`)
          .setDescription(
            `How many of **${shopItem.name}** would you like to sell?`
          )
          .addFields({
            name: "Sell Price",
            value: `Each item sells for **${sellingPrice}** coins.`,
            inline: true,
          })
          .setTimestamp()
          .setFooter({
            text: `Requested by ${user.username}`,
            iconURL: user.displayAvatarURL(),
          });

        await i.reply({ embeds: [quantityPrompt], ephemeral: false });

        const quantityFilter = (response) => {
          return (
            response.author.id === user.id &&
            !isNaN(response.content) &&
            response.content > 0
          );
        };

        const quantityCollector = interaction.channel.createMessageCollector({
          filter: quantityFilter,
          time: 15000,
        });

        quantityCollector.on("collect", async (response) => {
          const quantityToSell = parseInt(response.content);

          if (quantityToSell > selectedItem.quantity) {
            await response.reply({
              content: `You do not have enough **${shopItem.name}** to sell!`,
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
              balance: 0,
            });
          }

          userEconomy.balance += sellingPrice * quantityToSell;
          await userEconomy.save();

          selectedItem.quantity -= quantityToSell;
          if (selectedItem.quantity === 0) {
            await UserInventory.deleteOne({
              userId: user.id,
              itemId: selectedItemId,
            });
          } else {
            await selectedItem.save();
          }

          const successEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle("🎉 Item Sold!")
            .setDescription(
              `You sold **${quantityToSell}** of **${shopItem.name}** for **${
                sellingPrice * quantityToSell
              }** coins!`
            )
            .addFields({
              name: "New Balance",
              value: `${userEconomy.balance} coins`,
              inline: true,
            })
            .setFooter({
              text: `Requested by ${user.username}`,
              iconURL: user.displayAvatarURL(),
            })
            .setTimestamp();

          await response.reply({ embeds: [successEmbed], ephemeral: false });
          quantityCollector.stop();
        });

        quantityCollector.on("end", async (collected) => {
          if (collected.size === 0) {
            await i.followUp({
              content: "You did not respond in time to sell the item.",
              ephemeral: false,
            });
          }
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.followUp({
          content: "You did not select an item in time.",
          ephemeral: false,
        });
      }
    });
  },
};
