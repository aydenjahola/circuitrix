const { SlashCommandBuilder } = require("discord.js");
const { getAIResponse } = require("../../utils/aiAPI");
const QuotaUsage = require("../../models/QuotaUsage");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Chat with AI")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Your message to the AI")
        .setRequired(true)
    ),
  category: "AI",

  async execute(interaction) {
    await interaction.deferReply(); // Defer initial response

    try {
      const guildId = interaction.guild.id;
      const input = interaction.options.getString("message");
      const currentMonthYear = new Date().toISOString().slice(0, 7);

      // Check quota first
      let quotaUsage = await QuotaUsage.findOne({
        guildId,
        monthYear: currentMonthYear,
      });
      if (!quotaUsage) {
        quotaUsage = new QuotaUsage({ guildId, monthYear: currentMonthYear });
        await quotaUsage.save();
      }

      if (quotaUsage.quotaUsed >= quotaUsage.quotaLimit) {
        return await interaction.editReply(
          "❌ This server has reached its monthly usage limit."
        );
      }

      // Update quota after successful check
      quotaUsage.quotaUsed += 1;
      await quotaUsage.save();

      // Get AI response with retry logic
      const model_name = "facebook/blenderbot-3B";
      let aiResponse = null;
      let attempts = 0;

      while (!aiResponse && attempts < 3) {
        attempts++;
        aiResponse = await getAIResponse(model_name, input);

        if (!aiResponse) {
          await interaction.editReply(`⏳ AI is waking up...`);
        }
      }

      if (aiResponse) {
        await interaction.editReply(aiResponse.generated_text);
      } else {
        await interaction.editReply(
          "❌ Failed to get response after 3 attempts. Please try again later."
        );
      }
    } catch (error) {
      console.error("Command Error:", error);
      await interaction.editReply(
        "⚠️ An error occurred. Please try again later."
      );
    }
  },
};
