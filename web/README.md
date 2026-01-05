# Ticket Transcript Viewer

Next.js web application untuk melihat transcript ticket Discord bot.

## Setup

1. Install dependencies:
```bash
cd web
npm install
```

2. Copy `.env.example` to `.env.local` dan isi `DATABASE_URL`:
```bash
cp .env.example .env.local
```

3. Run development server:
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Build untuk Production

```bash
npm run build
npm start
```

## Deploy ke Vercel

1. Push ke GitHub
2. Import project di Vercel
3. Set environment variable `DATABASE_URL`
4. Deploy

## Struktur

- `app/` - Next.js App Router pages
- `components/` - React components (shadcn/ui)
- `lib/` - Utilities dan database connection
- `public/` - Static assets

## Features

- Dark mode by default
- Responsive design
- Discord-like message display
- Avatar support
- Attachment links
- Timestamp formatting
- Shadcn/ui components
