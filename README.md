# Orbit Support Preferences Bot ✨

Orbit is a lightweight Discord bot focused on neurodivergent-friendly communication. DM the bot and run `/preferences` to pick individual options or fun packs inspired by ADHD and autistic communication styles. It's not a diagnosis and you don't need one—these are just handy presets anyone can use. All packs and buttons are defined in easy-to-edit JSON files so you can remix Orbit for any community.

## Setup

1. Install dependencies (requires internet access):
   ```bash
   npm install
   ```

2. Copy `config.example.json` to `config.json` and fill in your Discord bot token, application (client) ID, the guild ID where roles are managed, the user ID allowed to post the panel, and an optional status message. The `config.json` file is listed in `.gitignore` so your credentials stay private.
3. Edit `roles.json` to customise packs or individual roles, and `buttons.json` if you want to tweak labels or colours.
4. Start the bot:
   ```bash
   npm start
   ```
5. Slash commands are registered globally. It may take a few minutes for `/preferences` and `/postpanel` to appear for all users.
6. Run `/postpanel` in your server channel to post a button that DMs users the preferences menu. Only the configured user ID may run this command.

Orbit's options come entirely from `roles.json` and `buttons.json`, so you can swap out labels, colours or whole packs without touching the code.

### Buttons Configuration

All the buttons shown by the bot are listed in `buttons.json`. You can change the labels, emojis or colours there. Styles map to Discord's built-in button colours (`Primary`, `Secondary`, `Success`, `Danger`, `Link`).

After adding a role or pack, Orbit shows a **Remove** button so you can undo a choice at any time.

## How It Works

Each preference corresponds to a role in your Discord server. When you select a pack or individual options, the bot assigns those roles to you so others know your communication preferences. You can change these roles at any time by rerunning `/preferences`.

## Disclaimer

The preference packs bundle common options for notifications, reminders and formatting. They take cues from ADHD and autistic communication styles, but they **aren't** a diagnosis and you don't need any diagnosis to use them. Feel free to mix and match whatever helps you communicate!

