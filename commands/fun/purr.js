const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purr")
    .setDescription("Fetch a random image or GIF from PurrBot API")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Select a category")
        .setRequired(true)
        .addChoices(
          // GIF endpoints
          { name: "Angry (GIF)", value: "img/sfw/angry/gif" },
          { name: "Bite (GIF)", value: "img/sfw/bite/gif" },
          { name: "Blush (GIF)", value: "img/sfw/blush/gif" },
          { name: "Comfy (GIF)", value: "img/sfw/comfy/gif" },
          { name: "Cry (GIF)", value: "img/sfw/cry/gif" },
          { name: "Cuddle (GIF)", value: "img/sfw/cuddle/gif" },
          { name: "Dance (GIF)", value: "img/sfw/dance/gif" },
          { name: "Eevee (GIF)", value: "img/sfw/eevee" }, // Requires {type} (gif or img)
          { name: "Fluff (GIF)", value: "img/sfw/fluff/gif" },
          { name: "Hug (GIF)", value: "img/sfw/hug/gif" },
          { name: "Kiss (GIF)", value: "img/sfw/kiss/gif" },
          { name: "Lay (GIF)", value: "img/sfw/lay/gif" },
          { name: "Lick (GIF)", value: "img/sfw/lick/gif" },
          { name: "Neko (GIF)", value: "img/sfw/neko" }, // Requires {type} (gif or img)
          { name: "Pat (GIF)", value: "img/sfw/pat/gif" },
          { name: "Poke (GIF)", value: "img/sfw/poke/gif" },
          { name: "Pout (GIF)", value: "img/sfw/pout/gif" },
          { name: "Slap (GIF)", value: "img/sfw/slap/gif" },
          { name: "Smile (GIF)", value: "img/sfw/smile/gif" },
          { name: "Tail (GIF)", value: "img/sfw/tail/gif" },
          { name: "Tickle (GIF)", value: "img/sfw/tickle/gif" },

          // Image endpoints (randomly chosen)
          { name: "Shiro (IMG)", value: "img/sfw/shiro/img" },
          { name: "Holo (IMG)", value: "img/sfw/holo/img" },
          { name: "Kitsune (IMG)", value: "img/sfw/kitsune/img" },
          { name: "Senko (IMG)", value: "img/sfw/senko/img" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription(
          'For Eevee or Neko: Provide type. Available values: "gif" or "img".'
        )
        .setRequired(false)
    ),
  category: "Fun",

  async execute(interaction) {
    const category = interaction.options.getString("category");
    const type = interaction.options.getString("type");

    let url = `https://purrbot.site/api/${category}`;

    // Check if the category is Eevee or Neko, and validate type
    const requiresType =
      category.includes("eevee") || category.includes("neko");

    if (requiresType) {
      if (type !== "gif" && type !== "img") {
        await interaction.reply({
          content: 'Please provide a valid type: "gif" or "img".',
          ephemeral: true,
        });
        return;
      }
      url += `/${type}`;
    }

    try {
      // Fetch the image or list from the API
      const response = await axios.get(url);
      const data = response.data;

      await interaction.reply({
        content: data.link || JSON.stringify(data),
        ephemeral: false,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "Something went wrong while fetching the image or list.",
        ephemeral: true,
      });
    }
  },
};
