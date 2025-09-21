exports.requireVC = (interaction) => {
  const userVC = interaction.member?.voice?.channel;
  if (!userVC) throw new Error("❌ You need to be in a voice channel!");

  const meVC = interaction.guild?.members?.me?.voice?.channel;
  if (meVC && meVC.id !== userVC.id) {
    throw new Error("❌ You must be in the same voice channel as me.");
  }
  return userVC;
};

exports.requireQueue = (client, interaction) => {
  const q = client.distube.getQueue(interaction.guildId);
  if (!q || !q.songs?.length) throw new Error("❌ Nothing is playing.");
  return q;
};
