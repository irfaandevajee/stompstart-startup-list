# SignalDesk — Hackathon Submission Draft

## Product name
Panta SignalDesk

## One-line description
An explainable prediction-market intelligence cockpit that turns live Panta data into attention, conviction and data-quality signals without inventing missing information.

## Problem
Prediction markets are information-dense, but raw market lists force users to manually scan probabilities, activity and liquidity one market at a time. That makes it hard to quickly see which markets are actually moving, attracting attention, or worth investigating.

## Solution
SignalDesk adds an intelligence layer on top of Panta. It continuously organizes live Panta markets, ranks them using transparent deterministic signals, explains why a market is surfacing, compares related markets and provides read-only wallet context. Users can then jump back to Panta for execution.

## Why Panta
Panta is not a decorative data source in SignalDesk; it is the core infrastructure. SignalDesk uses Panta for market discovery, live market data, category context and read-only position data when available. The product deliberately avoids fabricated fallback markets so the demo always reflects the connected Panta environment.

## Technical implementation
- Static responsive frontend
- Vercel serverless read-only Panta proxy
- Sensitive `PANTA_API_KEY` stored server-side only
- Deterministic signal scoring in-browser
- Local watchlist persisted in browser storage
- Graceful missing-field handling and explicit data-quality scoring
- Execution handoff to Panta instead of custody or transaction signing inside SignalDesk

## Explainable signal model
- Conviction: distance from 50% YES probability
- Attention: relative percentile using returned volume/liquidity/activity
- Data Quality: source-field completeness
- Composite Signal: 50% attention + 30% conviction + 20% data quality

## Current demo state
A working production deployment is live and the Panta API integration has been verified end-to-end. The currently configured test API environment may expose sandbox/test markets; SignalDesk labels that honestly rather than substituting fake production data.

## Target users
- Crypto traders who use prediction markets as an information signal
- Research teams and analysts
- Newsrooms and creator communities
- AI agents that need structured market belief/context
- Existing products that want an intelligence layer before sending users to a prediction-market venue

## Go-to-market
1. Launch as a free public market-intelligence dashboard.
2. Share high-signal market snapshots with crypto research/trading communities.
3. Add shareable public signal pages to create organic distribution.
4. Offer embeddable SignalDesk widgets/API outputs to newsletters, communities and research tools.
5. Expand from individual analysts to teams with saved dashboards, alerts and collaborative watchlists.

## Demand validation / traction
Current evidence is a working production prototype and verified Panta integration. No external-user or revenue claims are included until they are actually measured.

## Business model
Freemium:
- Free public live dashboard
- Pro alerts, saved workspaces, advanced comparison and export
- Team/creator embeds and API access
- Enterprise intelligence integrations

## Repository
https://github.com/irfaandevajee/stompstart-startup-list/tree/main/panta-signaldesk

## Live demo
https://panta-signaldesk-production.vercel.app/

## Disclosure
This project uses pre-existing open-source/web platform tooling and Panta infrastructure. SignalDesk-specific implementation and product work should be described accurately in the Colosseum development-history disclosure.