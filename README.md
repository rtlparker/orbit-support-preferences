# Orbit – Support Preferences Discord Bot

This bot lets users adjust their **communication preference roles** by running the `/preferences` command in DMs. Preferences and pre-made packs are defined in `roles.json` and can be customized at any time.

---

## 🚀 Setup

1. Install dependencies (requires internet access):
   ```bash
   npm install
   ```
2. Copy `config.example.json` to `config.json` and fill in your Discord bot token, application (client) ID, the guild ID where roles are managed, the user ID allowed to post the panel, and an optional status message. **Make sure the file contains valid JSON with no trailing commas or comments.** The `config.json` file is listed in `.gitignore` so your credentials stay private.
3. Edit `roles.json` to customise packs or individual roles.
4. Start the bot:
   ```bash
   npm start
   ```
5. Slash commands are registered globally. It may take a few minutes for `/preferences` and `/postpanel` to appear for all users.
6. Run `/postpanel` in your server channel to post a button that DMs users the preferences menu. Only the configured user ID may run this command.

## 📘 Disclaimer

The "Inspired Packs" are generalised templates based on common communication styles — often found helpful by neurodivergent users — but they are not labels or diagnoses. Anyone is welcome to use these roles to help staff communicate with them more effectively.

Roles do not affect support priority — they’re just here to make support more accessible and comfortable.


Built with ❤️ by Scooperdive
MIT Licensed
