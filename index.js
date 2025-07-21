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

const configPath = path.join(__dirname, 'config.json');
let token, clientId, guildId, statusMessage, ownerId;
try {
  ({ token, clientId, guildId, statusMessage, ownerId } = JSON.parse(
    fs.readFileSync(configPath)
  ));
} catch (err) {
  console.error(
    'Failed to read config.json. Ensure it exists and contains valid JSON.'
  );
  process.exit(1);
}

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
  .setDescription('Select communication preference roles')
  .setDMPermission(true);

const postPanelCommand = new SlashCommandBuilder()
  .setName('postpanel')
  .setDescription('Post the preferences panel (owner only)')
  .setDMPermission(false);

const clearRolesCommand = new SlashCommandBuilder()
  .setName('clearroles')
  .setDescription('Remove all preference roles')
  .setDMPermission(true);

function buildPreferencesMenu() {
  const disclaimer = new EmbedBuilder()
    .setTitle('Communication Preferences')
    .setDescription(
      'These preference packs are generalised and optional.\n' +
        'You will not be given a role indicating you have autism or ADHD.\n' +
        'Choose what best suits your needs; anyone may use these options.'
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('pack_autism')
      .setLabel('Autism Pack')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('pack_adhd')
      .setLabel('ADHD Pack')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('pick_individual')
      .setLabel('Pick Individually')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('remove_all')
      .setLabel('Remove All')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [disclaimer], components: [row] };
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), {
      body: [
        preferencesCommand.toJSON(),
        postPanelCommand.toJSON(),
        clearRolesCommand.toJSON()
      ]
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
    await interaction.reply({
      ...menu,
      ephemeral: false
    });
  } else if (interaction.commandName === 'postpanel') {
    if (interaction.user.id !== ownerId) {
      await interaction.reply({
        content: 'You are not authorised to use this command.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Get Communication Preferences')
      .setDescription('Click the button below to set your preferences in DMs.');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_preferences')
        .setLabel('Open Preferences')
        .setStyle(ButtonStyle.Primary)
    );
    await interaction.reply({ embeds: [embed], components: [row] });
  } else if (interaction.commandName === 'clearroles') {
    if (interaction.channel.type !== ChannelType.DM) {
      await interaction.reply({
        content: 'Please DM me to use this command.',
        ephemeral: true
      });
      return;
    }

    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(interaction.user.id);
      const roleIds = Array.from(
        new Set([
          ...Object.values(roleData.packs).flatMap(p => p.roles),
          ...roleData.individual.map(r => r.role)
        ])
      );
      await member.roles.remove(roleIds);
      await interaction.reply({
        content: 'Preference roles removed.',
        ephemeral: false
      });
    } catch {
      await interaction.reply({
        content: 'Failed to remove roles.',
        ephemeral: false
      });
    }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'open_preferences') {
    const menu = buildPreferencesMenu();
    try {
      await interaction.user.send(menu);
      if (interaction.channel.type !== ChannelType.DM) {
        await interaction.reply({ content: 'Sent you a DM with the options.', ephemeral: true });
      }
    } catch {
      if (interaction.channel.type !== ChannelType.DM) {
        await interaction.reply({ content: 'I could not DM you.', ephemeral: true });
      }
    }
    return;
  }

  if (interaction.customId === 'remove_all') {
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(interaction.user.id);
      const roleIds = Array.from(
        new Set([
          ...Object.values(roleData.packs).flatMap(p => p.roles),
          ...roleData.individual.map(r => r.role)
        ])
      );
      await member.roles.remove(roleIds);
      await interaction.reply({
        content: 'Preference roles removed.',
        ephemeral: interaction.inGuild()
      });
    } catch {
      await interaction.reply({
        content: 'Failed to remove roles.',
        ephemeral: interaction.inGuild()
      });
    }
    return;
  }
  if (interaction.customId.startsWith('pack_')) {
    const packKey = interaction.customId.replace('pack_', '');
    const pack = roleData.packs[packKey];
    if (!pack) return;
    const list = pack.roles.map(r => `<@&${r}>`).join('\n');
    const embed = new EmbedBuilder()
      .setTitle(`${pack.name}`)
      .setDescription(`This pack will give you the following roles:\n${list}`);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_${packKey}`)
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger)
    );
    await interaction.update({ embeds: [embed], components: [row] });
  } else if (interaction.customId === 'pick_individual') {
    const rows = [];
    roleData.individual.forEach((item, index) => {
      const button = new ButtonBuilder()
        .setCustomId(`role_${index}`)
        .setLabel(item.label)
        .setStyle(ButtonStyle.Secondary);
      if (index % 5 === 0) {
        rows.push(new ActionRowBuilder());
      }
      rows[rows.length - 1].addComponents(button);
    });
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('cancel')
          .setLabel('Done')
          .setStyle(ButtonStyle.Success)
      )
    );
    await interaction.update({ embeds: [], components: rows, content: 'Select individual preferences:' });
  } else if (interaction.customId.startsWith('confirm_')) {
    const packKey = interaction.customId.replace('confirm_', '');
    const pack = roleData.packs[packKey];
    if (!pack) return;
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(interaction.user.id);
      await member.roles.add(pack.roles);
      await interaction.update({ content: `${pack.name} applied.`, embeds: [], components: [] });
    } catch (err) {
      await interaction.update({ content: 'Failed to assign roles.', embeds: [], components: [] });
    }
  } else if (interaction.customId.startsWith('role_')) {
    const index = parseInt(interaction.customId.replace('role_', ''));
    const item = roleData.individual[index];
    if (!item) return;
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(interaction.user.id);
      await member.roles.add(item.role);
      await interaction.reply({
        content: `Role ${item.label} added`,
        ephemeral: interaction.inGuild()
      });
    } catch {
      await interaction.reply({
        content: 'Failed to add role.',
        ephemeral: interaction.inGuild()
      });
    }
  } else if (interaction.customId === 'cancel') {
    await interaction.update({ content: 'Cancelled.', embeds: [], components: [] });
  }
});

registerCommands();
client.login(token);
