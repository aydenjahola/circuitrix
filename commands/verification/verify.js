const { SlashCommandBuilder } = require("discord.js");
const nodemailer = require("nodemailer");
const VerificationCode = require("../../models/VerificationCode");
const ServerSettings = require("../../models/ServerSettings");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER, // Email user and pass still from .env (for now)
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify your account with your DCU email address")
    .addStringOption((option) =>
      option
        .setName("email")
        .setDescription("Your DCU email address")
        .setRequired(true)
    ),
  category: "Verification",

  async execute(interaction, client) {
    // Fetch the server settings from the database using guild ID
    const serverSettings = await ServerSettings.findOne({
      guildId: interaction.guild.id,
    });

    if (!serverSettings) {
      return interaction.reply({
        content:
          "Server settings have not been configured yet. Please contact an administrator.",
        ephemeral: true,
      });
    }

    // Ensure command is only used in the specified verification channel
    const verificationChannelId = serverSettings.verificationChannelId;
    if (interaction.channel.id !== verificationChannelId) {
      return interaction.reply({
        content: `This command can only be used in <#${verificationChannelId}> channel.`,
        ephemeral: true,
      });
    }

    const email = interaction.options.getString("email");
    const emailDomain = email.split("@")[1];
    const allowedEmailDomains = serverSettings.emailDomains;

    // Check if the email domain is allowed
    if (!allowedEmailDomains.includes(emailDomain)) {
      return interaction.reply({
        content: "You must use a valid DCU email address.",
        ephemeral: true,
      });
    }

    const guild = client.guilds.cache.get(interaction.guild.id);

    if (!guild) {
      console.error("Guild not found.");
      return interaction.reply({
        content: "Guild not found.",
        ephemeral: true,
      });
    }

    const member = guild.members.cache.get(interaction.user.id);

    if (!member) {
      console.error("Member not found in the guild.");
      return interaction.reply({
        content: "Member not found in the guild.",
        ephemeral: true,
      });
    }

    const role = guild.roles.cache.find(
      (r) => r.name === serverSettings.verifiedRoleName
    );

    if (!role) {
      console.error(`Role "${serverSettings.verifiedRoleName}" not found.`);
      return interaction.reply({
        content: `Role "${serverSettings.verifiedRoleName}" not found.`,
        ephemeral: true,
      });
    }

    if (member.roles.cache.has(role.id)) {
      return interaction.reply({
        content: "You are already verified!",
        ephemeral: true,
      });
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #1e90ff;">Your Esports Verification Code</h2>
          <p>Hi there,</p>
          <p>Your Esports verification code is:</p>
          <h3 style="background-color: #f4f4f4; padding: 10px; border: 1px solid #ddd; border-radius: 5px; text-align: center; color: #1e90ff;">
            ${verificationCode}
          </h3>
          <p>This code is valid for 10 minutes. Use it with the command <code>/code your_code</code>.</p>
          <p>If you did not request this code, please ignore this email.</p>
          <p>Best regards,<br>Esports Committee</p>
        </body>
      </html>
    `;

    try {
      // Send the verification email
      await transporter.sendMail({
        from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Esports Verification Code",
        html: emailHtml,
      });

      // Save the verification code and email in the database
      await VerificationCode.create({
        userId: interaction.user.id,
        email: email,
        code: verificationCode,
      });

      interaction.reply({
        content: `A verification code has been sent to your email. Use \`/code your_code\` to verify your account. The code is valid for 10 minutes.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("Error sending email or saving verification code:", err);
      interaction.reply({
        content: "There was an error sending the verification email.",
        ephemeral: true,
      });
    }
  },
};
