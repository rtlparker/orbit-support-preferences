const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Routes,
  SlashCommandBuilder,
  REST,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,

  Events
} = require('discord.js');

const rolesPath = path.join(__dirname, 'roles.json');
const roleData = JSON.parse(fs.readFileSync(rolesPath));

const buttonsPath = path.join(__dirname, 'buttons.json');
const buttonData = JSON.parse(fs.readFileSync(buttonsPath));

function buildButton(key, overrides = {}) {
  const cfg = buttonData.buttons[key];
  if (!cfg) throw new Error(`Button config for ${key} not found`);
  const button = new ButtonBuilder().setCustomId(overrides.customId || key);

  const label = overrides.label ?? cfg.label;
  if (label) button.setLabel(label);

  const style = overrides.style ?? cfg.style ?? 'Primary';
  button.setStyle(ButtonStyle[style]);

  const emoji = overrides.emoji ?? cfg.emoji;
  if (emoji) button.setEmoji(emoji);

  return button;
}

const configPath = path.join(__dirname, 'config.json');
const { token, clientId, guildId, statusMessage, ownerId } = JSON.parse(

  fs.readFileSync(configPath)
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const preferencesCommand = new SlashCommandBuilder()
  .setName('preferences')
  .setDescription('Select communication preference roles');


const postPanelCommand = new SlashCommandBuilder()
  .setName('postpanel')
  .setDescription('Post the preferences panel (owner only)');

function buildPreferencesMenu() {
  const disclaimer = new EmbedBuilder()
    .setTitle('💬 Communication Preferences')
    .setDescription(
      'These packs group roles for notifications, reminders and formatting.\n' +
        'Inspired by ADHD and autistic communication styles, but not a diagnosis!\n' +
        'Everyone is welcome to use them to chat in the way that works best.'
    );

  const row = new ActionRowBuilder().addComponents(
    buildButton('pack_autism'),
    buildButton('pack_adhd'),
    buildButton('pick_individual')
  );

  return { embeds: [disclaimer], components: [row] };
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), {
      body: [preferencesCommand.toJSON(), postPanelCommand.toJSON()]
    });
    console.log('Registered application commands');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  if (statusMessage) {
    client.user.setPresence({
      activities: [{ name: statusMessage }],
      status: 'online'
    });
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'preferences') {
    if (interaction.channel.type !== ChannelType.DM) {
      await interaction.reply({
        content: 'Please DM me to use this command.',
        ephemeral: true
      });
      return;
    }

    const menu = buildPreferencesMenu();
    await interaction.reply(menu);
  } else if (interaction.commandName === 'postpanel') {
    if (interaction.user.id !== ownerId) {
      await interaction.reply({
        content: 'You are not authorised to use this command.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('💌 Get Communication Preferences')
      .setDescription("Click below and I'll DM you the menu!");
    const row = new ActionRowBuilder().addComponents(
      buildButton('open_preferences')
    );
    await interaction.reply({ embeds: [embed], components: [row] });
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId === 'open_preferences') {
    await interaction.deferReply({ ephemeral: true });
    const menu = buildPreferencesMenu();
    try {
      await interaction.user.send(menu);
      if (interaction.channel.type !== ChannelType.DM) {
        await interaction.editReply({ content: '📩 Check your DMs for the menu!' });
      } else {
        await interaction.deleteReply();
      }
    } catch {
      if (interaction.channel.type !== ChannelType.DM) {
        await interaction.editReply({ content: '❗ I could not DM you.' });
      } else {
        await interaction.deleteReply();
      }
    }
    return;
  }

  if (interaction.customId.startsWith('pack_')) {
    await interaction.deferUpdate();
    const packKey = interaction.customId.replace('pack_', '');
    const pack = roleData.packs[packKey];
    if (!pack) return;
    const list = pack.roles.map(r => `<@&${r}>`).join('\n');
    const embed = new EmbedBuilder()
      .setTitle(`${pack.name}`)
      .setDescription(`This pack will give you the following roles:\n${list}`);
    const row = new ActionRowBuilder().addComponents(
      buildButton('confirm', { customId: `confirm_${packKey}` }),
      buildButton('cancel')
    );
    await interaction.editReply({ embeds: [embed], components: [row] });
  } else if (interaction.customId === 'pick_individual') {
    await interaction.deferUpdate();
    const rows = [];
    roleData.individual.forEach((item, index) => {
      const button = buildButton('individual', { customId: `role_${index}` })
        .setLabel(item.label);
      if (index % 5 === 0) {
        rows.push(new ActionRowBuilder());
      }
      rows[rows.length - 1].addComponents(button);
    });
    rows.push(
      new ActionRowBuilder().addComponents(
        buildButton('done'),
        buildButton('cancel')
      )
    );
    await interaction.editReply({ embeds: [], components: rows, content: 'Select individual preferences:' });
  } else if (interaction.customId.startsWith('confirm_')) {
    await interaction.deferUpdate();
    const packKey = interaction.customId.replace('confirm_', '');
    const pack = roleData.packs[packKey];
    if (!pack) return;
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(interaction.user.id);
      await member.roles.add(pack.roles);
      await interaction.editReply({
        content: `✅ ${pack.name} applied.`,
        embeds: [],
        components: [new ActionRowBuilder().addComponents(buildButton('remove', { customId: `remove_pack_${packKey}` }))]
      });
    } catch (err) {
      await interaction.editReply({ content: '❗ Failed to assign roles.', embeds: [], components: [] });
    }
  } else if (interaction.customId.startsWith('role_')) {
    await interaction.deferUpdate();
    const index = parseInt(interaction.customId.replace('role_', ''));
    const item = roleData.individual[index];
    if (!item) return;
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(interaction.user.id);
      await member.roles.add(item.role);
      await interaction.editReply({
        content: `✅ Role ${item.label} added`,
        components: [
          new ActionRowBuilder().addComponents(
            buildButton('remove', { customId: `remove_role_${index}` })
          )
        ]
      });
    } catch {
      await interaction.editReply({ content: '❗ Failed to add role.' });
    }
  } else if (interaction.customId === 'cancel') {
    await interaction.deferUpdate();
    await interaction.editReply({ content: '❌ Cancelled.', embeds: [], components: [] });
  } else if (interaction.customId.startsWith('remove_pack_')) {
    await interaction.deferUpdate();
    const packKey = interaction.customId.replace('remove_pack_', '');
    const pack = roleData.packs[packKey];
    if (!pack) return;
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(interaction.user.id);
      await member.roles.remove(pack.roles);
      await interaction.editReply({ content: `🗑️ Removed ${pack.name}.`, embeds: [], components: [] });
    } catch {
      await interaction.editReply({ content: '❗ Failed to remove roles.', embeds: [], components: [] });
    }
  } else if (interaction.customId.startsWith('remove_role_')) {
    await interaction.deferUpdate();
    const index = parseInt(interaction.customId.replace('remove_role_', ''));
    const item = roleData.individual[index];
    if (!item) return;
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(interaction.user.id);
      await member.roles.remove(item.role);
      await interaction.editReply({ content: `🗑️ Removed ${item.label}.`, embeds: [], components: [] });
    } catch {
      await interaction.editReply({ content: '❗ Failed to remove role.', embeds: [], components: [] });
    }
  }
});

registerCommands();
client.login(token);
