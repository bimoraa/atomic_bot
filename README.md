# Atomic Bot

A Discord bot for server management and automation.

## Prerequisites

- Node.js >= 20.19.0
- npm >= 10.0.0
- MongoDB database
- Discord Bot Token

## Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Build and run
npm run build
npm start
```

## Development

```bash
npm run dev
```

## Project Structure

```
src/
├── core/
│   ├── client/
│   └── handlers/
│
├── modules/
│   ├── music/
│   ├── moderation/
│   ├── staff/
│   └── ...
│
├── shared/
│   ├── config/
│   ├── types/
│   ├── utils/
│   └── database/
│
└── infrastructure/
    ├── api/
    ├── cache/
    └── webhooks/
```

## Tech Stack

- TypeScript
- Discord.js v14
- Node.js
- MongoDB
- Express

## License

MIT License - see [LICENSE.txt](LICENSE.txt)

---

Made with Love by Atomic Team (AZure48)
