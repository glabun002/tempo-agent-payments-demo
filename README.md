# Tempo Agent-to-Agent Payment Demo

Autonomous AI agents paying each other for services with stablecoin micropayments on the [Tempo blockchain](https://tempo.xyz), powered by the [Machine Payments Protocol (MPP)](https://www.mppx.dev/).

**Two agents. Zero API keys. Real stablecoin payments. Sub-second settlement.**

## Demo Video

https://github.com/glabun002/tempo-agent-payments-demo/blob/main/demo.mp4

A newsletter bot ("DailyBrief") pays an AI writing service ("ContentAI") for headline analysis at $0.01 each and a streamed article at $0.001/word — all with real stablecoin payments on Tempo testnet.

## What This Demo Shows

- **Service Agent** — an Express server offering paid AI endpoints (sentiment analysis + streamed text generation)
- **Client Agent** — an autonomous Node.js agent that discovers services, evaluates costs, and pays for them automatically
- **Live Dashboard** — a real-time visualization of the entire payment flow in the browser

The payment flow: Client requests a paid endpoint → Server returns **HTTP 402** with a payment challenge → Client automatically signs a stablecoin transfer → Server verifies on-chain payment → Server delivers the response with a receipt.

All of this happens in under a second thanks to Tempo's ~500ms finality.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create funded testnet accounts

```bash
# Create two accounts (they come pre-funded on Tempo testnet)
npx mppx account create   # → Service Agent (recipient)
npx mppx account create   # → Client Agent (payer)
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and paste the private keys from step 2:

```env
RECIPIENT_KEY=0xabc123...   # Service Agent key
CLIENT_KEY=0xdef456...      # Client Agent key
```

### 4. Start the Service Agent

```bash
npm run server
```

This starts:
- Express server on http://localhost:3000
- WebSocket for live dashboard updates
- Paid endpoints gated by mppx middleware

### 5. Open the Dashboard

Open http://localhost:3000 in your browser. You'll see the three-column live dashboard.

### 6. Run the Client Agent

In a second terminal:

```bash
npm run client
```

The client agent will:
1. Discover available services
2. Run 5 sentiment analysis requests ($0.01 each)
3. Run 1 streamed text generation ($0.05)
4. Print a summary of all transactions

Watch the dashboard update in real-time as payments flow.

## Architecture

```
┌──────────────────┐         HTTP + 402 Flow         ┌──────────────────┐
│   Client Agent   │ ◄──────────────────────────────► │  Service Agent   │
│   (mppx/client)  │    fetch → 402 → pay → retry    │  (mppx/express)  │
│                  │                                   │                  │
│  Wallet: payer   │    ← pathUSD on Tempo chain →    │  Wallet: payee   │
└──────────────────┘                                   └──────────────────┘
                                                              │
                                                         WebSocket
                                                              │
                                                       ┌──────┴──────┐
                                                       │  Dashboard   │
                                                       │  (browser)   │
                                                       └─────────────┘
```

## Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/services` | GET | Free | Service discovery |
| `/api/analyze` | POST | 0.01 pathUSD | Sentiment analysis |
| `/api/stream` | POST | 0.05 pathUSD | Streamed text generation (SSE) |
| `/api/stats` | GET | Free | Server statistics |
| `/api/balance/:address` | GET | Free | Check pathUSD balance |

## Tech Stack

- **TypeScript** (ESM) with tsx for execution
- **Express 5** for the HTTP server
- **mppx** SDK for Machine Payments Protocol
- **viem** for Ethereum/Tempo wallet operations
- **ws** for WebSocket (dashboard live updates)

## Tempo Testnet

| Property | Value |
|----------|-------|
| Chain ID | 42431 |
| RPC | https://rpc.moderato.tempo.xyz |
| Explorer | https://explore.testnet.tempo.xyz |
| Stablecoin | pathUSD (`0x20c0...0000`) |

## Why This Matters

- **Zero signup** — agents pay per request with stablecoins, no API keys needed
- **Sub-second settlement** — Tempo's ~500ms finality makes inline payments viable
- **Autonomous** — client discovers, evaluates, and pays without human intervention
- **Real money rails** — same code works on mainnet with real USD stablecoins
- **Open standard** — MPP (HTTP 402) works with any HTTP client/server
