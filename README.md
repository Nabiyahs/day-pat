# Praise Calendar Polaroid

A personal daily praise journal where you can capture moments worth celebrating with polaroid-style photos, emoji stickers, and classic Korean teacher stamps (참 잘했어요).

## Features

- **Polaroid Day Cards**: Upload and edit one representative photo per day
- **Emoji Stickers**: Add draggable, scalable, and rotatable emoji stickers to your photos
- **Teacher Stamps**: Classic "참 잘했어요" style stamps to celebrate achievements
- **Unlimited Praises**: Add multiple text entries per day
- **Calendar Views**: Month, Week (Mon-Sun), and Day views
- **Streak Tracking**: Automatic streak calculation that revives when backfilling past dates
- **Responsive Design**: Works beautifully on mobile and desktop

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth + Postgres + Storage)
- **Framer Motion** for animations
- **Lucide React** for icons

## Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd daily-compliments
npm install
```

### 2. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Database Migrations

In your Supabase Dashboard, go to **SQL Editor** and run the migration files in order:

1. `supabase/migrations/00001_create_tables.sql` - Creates tables, indexes, and RLS policies
2. `supabase/migrations/00002_storage_policies.sql` - Sets up storage bucket and policies

Or use the Supabase CLI:

```bash
npx supabase db push
```

### 5. Configure Email Auth

This app uses email magic link (OTP) authentication. Configure it in Supabase:

1. Go to **Authentication > Providers > Email** in your Supabase Dashboard
2. Ensure Email provider is enabled
3. Go to **Authentication > URL Configuration**
4. Set **Site URL** to your app URL (e.g., `http://localhost:3000` for dev)
5. Add **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://your-vercel-domain.vercel.app/auth/callback
   ```

See `docs/EMAIL_AUTH_SETUP.md` for detailed configuration instructions.

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes (login, callback)
│   ├── (protected)/       # Protected routes (app)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/
│   ├── auth/              # Auth components (UserMenu)
│   ├── calendar/          # Calendar views (Month, Week)
│   ├── day/               # Day view components (Polaroid, Praise, Stamp)
│   └── ui/                # Shared UI components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── supabase/          # Supabase client setup
│   ├── image-upload.ts    # Image compression & upload
│   ├── streak.ts          # Streak computation
│   └── utils.ts           # Utility functions
├── types/                 # TypeScript type definitions
└── middleware.ts          # Next.js middleware for auth
```

## Database Schema

### Tables

- **praises**: Unlimited text entries per day
- **day_cards**: One polaroid card per day (photo + stickers + caption)
- **stamp_assets**: Catalog of available stamps
- **day_stamps**: One stamp per day

### Storage

- **praise-photos**: Public bucket for photo storage
  - Path format: `{user_id}/{YYYY-MM-DD}.webp`
  - Images are compressed to max 1MB before upload

## Key Features Explained

### Streak Calculation

Streaks are computed on-the-fly, not stored in the database. A day counts as "successful" if it has at least one praise entry. When you backfill past dates, the streak automatically updates.

### Sticker State

Stickers are stored with normalized positions (0-1) for responsive display:

```json
{
  "emoji": "✨",
  "x": 0.72,
  "y": 0.18,
  "scale": 1.2,
  "rotate": 12,
  "z": 2
}
```

### Photo Compression

Photos are automatically compressed client-side before upload:
- Max dimension: 1200px
- Target size: ~1MB
- Output format: WebP

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Docker

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
