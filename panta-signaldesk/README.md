# Panta SignalDesk

**Prediction-market intelligence, without the noise.**

Panta SignalDesk is an explainable intelligence cockpit built on the Panta API for the 2026 Crypto World’s Fair Panta API Sidetrack.

Live demo: https://panta-signaldesk-production.vercel.app/

Demo video: https://github.com/irfaandevajee/stompstart-startup-list/raw/refs/heads/main/panta-signaldesk/assets/signaldesk-demo.webm

## What it does

SignalDesk converts live Panta market data into a decision-support layer:

- Live market discovery and search
- Category filtering and signal-aware sorting
- YES probability context
- Transparent **Conviction**, **Attention**, **Data Quality**, and composite signal scores
- Risk/data-quality flags instead of fabricated missing values
- Related-market comparison
- Local browser watchlist
- Read-only wallet position lookup when supported by the connected Panta environment
- One-click handoff to Panta for execution

SignalDesk does **not** invent fallback markets and does **not** custody funds or sign transactions.

## Panta API integration

The production deployment uses a server-side Vercel function as a strict read-only proxy to the Panta API.

Allowed upstream surfaces:

- `markets`
- `categories`
- `positions`
- `wallets`

The Panta API key is stored only as the encrypted/sensitive `PANTA_API_KEY` environment variable in Vercel. It is never shipped to the browser.

## Explainable scoring

The scoring layer is intentionally deterministic:

- **Conviction** — distance of current YES probability from 50%.
- **Attention** — percentile rank from the live set using only available volume, liquidity and activity fields.
- **Data Quality** — coverage of probability, volume, liquidity, activity, status and resolution fields.
- **Composite Signal** — 50% attention, 30% conviction, 20% data quality.

Scores describe market state; they are not price forecasts or trading recommendations.

## Local development

Serve the folder through Vercel so `/api/panta` runs as a serverless function.

```bash
vercel dev
```

Set:

```bash
PANTA_API_KEY=...
```

Never commit API keys.

## Hackathon

Built for:

- Colosseum Crypto World’s Fair 2026
- Panta API Sidetrack

See `SUBMISSION.md` and `DEMO_SCRIPT.md` for the prepared submission copy and video flow.