const { SlashCommandBuilder } = require("discord.js");
const UserInventory = require("../../models/UserInventory");
const UserEconomy = require("../../models/UserEconomy");
const Trade = require("../../models/Trade");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Trade an item and/or coins with another user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to trade with")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("The ID of the item to trade")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("quantity")
        .setDescription("Quantity of the item to trade")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("coins")
        .setDescription("Amount of coins to trade")
        .setRequired(false)
    ),
  category: "Economy",

  async execute(interaction) {
    const { user, guild } = interaction;
    const tradeUser = interaction.options.getUser("user");
    const itemId = interaction.options.getString("item");
    const quantity = interaction.options.getInteger("quantity");
    const coins = interaction.options.getInteger("coins") || 0;

    if (tradeUser.id === user.id) {
      await interaction.reply("You can't trade items with yourself.");
      return;
    }

    const userInventory = await UserInventory.findOne({
      userId: user.id,
      guildId: guild.id,
      itemId,
    });
    if (!userInventory || userInventory.quantity < quantity) {
      await interaction.reply("You don't have enough of this item to trade.");
      return;
    }

    const tradeUserEconomy = await UserEconomy.findOne({
      userId: tradeUser.id,
      guildId: guild.id,
    });
    if (!tradeUserEconomy || tradeUserEconomy.balance < coins) {
      await interaction.reply(
        `${tradeUser.username} does not have enough coins to trade.`
      );
      return;
    }

    const tradeProposal = new Trade({
      from: user.id,
      to: tradeUser.id,
      itemId,
      quantity,
      coins,
    });
    await tradeProposal.save();

    await interaction.reply({
      content: `Trade proposed: You are trading **${quantity}** of **${itemId}** and **${coins}** coins with ${tradeUser.username}.`,
      ephemeral: true,
    });

    await tradeUser.send(
      `Trade proposal: You are being offered **${quantity}** of **${itemId}** and **${coins}** coins by ${user.username}. Type \`/accept ${tradeProposal._id}\` to accept or \`/reject ${tradeProposal._id}\` to reject the trade.`
    );
  },

  async accept(interaction) {
    const tradeId = interaction.options.getString("tradeId");
    const tradeProposal = await Trade.findById(tradeId);

    if (!tradeProposal) {
      await interaction.reply("Trade not found or already completed.");
      return;
    }

    const { from, to, itemId, quantity, coins } = tradeProposal;

    const fromInventory = await UserInventory.findOne({
      userId: from,
      guildId: interaction.guild.id,
      itemId,
    });

    if (!fromInventory || fromInventory.quantity < quantity) {
      await interaction.reply(
        "Trade cannot be completed because the item no longer exists in the sender's inventory."
      );
      return;
    }

    let toInventory = await UserInventory.findOne({
      userId: to,
      guildId: interaction.guild.id,
      itemId,
    });
    if (toInventory) {
      toInventory.quantity += quantity;
    } else {
      toInventory = new UserInventory({
        userId: to,
        guildId: interaction.guild.id,
        itemId,
        quantity,
      });
    }
    await toInventory.save();

    const fromEconomy = await UserEconomy.findOne({
      userId: from,
      guildId: interaction.guild.id,
    });
    const toEconomy = await UserEconomy.findOne({
      userId: to,
      guildId: interaction.guild.id,
    });

    if (fromEconomy) {
      fromEconomy.balance -= coins;
      await fromEconomy.save();
    }

    if (toEconomy) {
      toEconomy.balance += coins;
      await toEconomy.save();
    }

    await Trade.deleteOne({ _id: tradeId });

    await interaction.reply(
      `Trade completed! You traded **${quantity}** of **${itemId}** and **${coins}** coins with ${interaction.user.username}.`
    );
  },

  async reject(interaction) {
    const tradeId = interaction.options.getString("tradeId");
    const tradeProposal = await Trade.findById(tradeId);

    if (!tradeProposal) {
      await interaction.reply("Trade not found or already completed.");
      return;
    }

    await Trade.deleteOne({ _id: tradeId });
    await interaction.reply(`Trade rejected.`);
  },
};
