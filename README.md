# PowerWatch Nigeria

A multi-user power outage tracker for Nigerian electricity consumers under the NERC Service-Based Tariff (SBT) framework. Track your outages, monitor compliance with your band's supply commitments, and generate formal complaint letters backed by NERC regulatory citations.

## Setup & Deployment

1. Clone the repo:
   ```
   git clone <your-repo-url>
   cd powerwatch-nigeria
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a free Supabase project at [supabase.com](https://supabase.com).

4. Open the Supabase SQL editor and run the contents of `supabase/schema.sql`.

5. Go to Supabase Project Settings → API and copy the **Project URL** and **anon public** key.

6. Create a `.env` file from the example and paste in those two values:
   ```
   cp .env.example .env
   # Edit .env and add your values
   ```

7. Run the dev server and confirm auth and outage logging work locally:
   ```
   npm run dev
   ```

8. Push to a GitHub repository.

9. Go to [vercel.com](https://vercel.com), import the GitHub repo, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables, and deploy.

10. Your live URL will be something like `powerwatch-nigeria.vercel.app`.

## Features

- **Quick-tap outage logging** — one tap to start, one tap to end
- **Manual past-outage entry** with date, time, and notes
- **Live timer** during active outages, persistent across page reloads
- **Dashboard** showing today's supply vs band minimum with status badges
- **Monthly analytics** with regulatory breach detection
- **Bar and line charts** with Recharts showing supply trends
- **Automated complaint letters** citing NERC SBT Order, May 2024 Order, and MYTO 2024 Supplementary Order
- **CSV export** of all logged outages
- **Multi-user** via Supabase Auth with row-level security

## Tech Stack

- Vite + React 18
- Supabase (Auth + PostgreSQL with RLS)
- Tailwind CSS (CDN)
- Recharts
- Lucide React
- Vercel (deployment)

## Regulatory Framework

This app is built around the NERC Service-Based Tariff (SBT) framework:

| Band | Min Supply/Day | Compensation Threshold |
|------|---------------|----------------------|
| A    | 20 hours      | 18 hrs/day avg       |
| B    | 16 hours      | 14.4 hrs/day avg     |
| C    | 12 hours      | 10.8 hrs/day avg     |
| D    | 8 hours       | 7.2 hrs/day avg      |
| E    | 4 hours       | 3.6 hrs/day avg      |

Key regulatory triggers detected automatically:
- **2 consecutive days** below minimum → DisCo must publish explanation
- **7 consecutive days** below minimum → Mandatory feeder downgrade
- **Monthly average below 90%** of band minimum → Compensation entitlement
