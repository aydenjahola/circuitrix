# Circuitrix Discord Bot

---

## IMPORTANT: PLEASE READ BEFORE DEPLOYING

This bot includes game statistics functionality (currently supports Valorant, CS2 and TFT). Unfortunately, due to [Tracker.gg](https://tracker.gg/) no longer providing API keys, I have created my own API to retrieve the data. Currently, this API is not publicly available. If you wish to use the bot's game stats commands, please feel free to reach out to me via my [email](mailto:info@aydenjahola.com).

---

Welcome to **Circuitrix Discord Bot**! A powerful multipurpose Discord bot featuring email verification, trivia games, music functionality, and comprehensive server management tools.

## ✨ Features

### 🔐 Verification System

- **Email Verification**: Secure verification system where users receive a verification code via email
- **Role Management**: Automatically assigns roles to verified users
- **Customizable Settings**: Configure allowed email domains, verification channels, and roles

### 🎮 Entertainment

- **Trivia Game**: Video game-themed trivia with multiple categories:

  - Anime & Manga
  - Computers & Technology
  - Board Games
  - Comics
  - Film & TV
  - General Knowledge
  - Science & Nature
  - Music
  - History & Mythology
  - Geography

- **Music System**: Advanced music player with support for multiple platforms:
  - YouTube, Spotify, SoundCloud integration
  - High-quality audio playback
  - Queue management
  - Volume control
  - Loop functionality (track/queue)
  - Lyrics display
  - Live synchronized lyrics

### ⚙️ Moderation Tools

- **Warning System**: Issue and track user warnings with reasons
- **Message Purge**: Bulk delete messages from channels
- **User Information**: Detailed user profiles with role information
- **Admin Logs**: Comprehensive logging of moderation actions

### 📊 Statistics & Tracking

- **Leaderboard System**: Track top trivia players
- **Game Statistics**: Valorant, CS2, and TFT stats (requires API access)
- **Server Analytics**: Monitor server activity and usage

### 🎵 Music Commands

- `/play` - Play songs from YouTube, Spotify, or SoundCloud
- `/skip` - Skip the current song
- `/stop` - Stop playback and clear queue
- `/queue` - View current music queue
- `/volume` - Adjust playback volume
- `/loop` - Loop current track or entire queue
- `/lyrics` - Display lyrics for current or specified song
- `/pause` / `/resume` - Control playback
- `/nowplaying` - Show current track information

## 🚀 Installation

1. **Clone the Repository**

```sh
git clone git@github.com:aydenjahola/circuitrix.git
cd circuitrix
```

2. **Install Dependencies**

```sh
npm install
```

3. **Environment Configuration**

   - Rename `.env.example` to `.env`
   - Fill in all required environment variables:
     - Discord Bot Token
     - MongoDB Connection URI
     - Email Service Credentials
     - Genius API Key (for lyrics functionality)
     - Custom API Keys for game statistics

4. **Start the Bot**

```sh
node index.js
```

## ⚙️ Setup

After inviting the bot to your server, run `/setup` to configure the verification system and other essential settings.

## 💡 Usage

Use `/help` to view all available commands and their descriptions. For detailed information about specific commands, visit the [commands directory](./commands/).

## 🎵 Music Setup

The bot requires FFmpeg for audio processing. Ensure FFmpeg is installed on your system:

**Windows:**

```sh
choco install ffmpeg
```

**macOS:**

```sh
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**

```sh
sudo apt install ffmpeg
```

## 🔧 Docker Deployment

The bot includes Docker support for easy deployment:

```sh
docker-compose up --build
```

## 📊 Dashboard (Work in Progress)

I'm currently developing a web dashboard for bot management in the `dashboard` branch. Contributors with experience in Discord bot dashboards are welcome to help!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 📞 Support

For questions about the game statistics API or general support:

- Email: [info@aydenjahola.com](mailto:info@aydenjahola.com)
- GitHub Issues: [Create an issue](https://github.com/aydenjahola/discord-multipurpose-bot/issues)

---

**Circuitrix Discord Bot** - Developed with ❤️ by [Ayden Jahola](https://github.com/aydenjahola)
