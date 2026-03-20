# Tempo Agent-to-Agent Payment Demo

## Overview
Build a demo showcasing autonomous agent-to-agent payments on the Tempo blockchain using the Machine Payments Protocol (MPP). Two agents: one offers AI services for stablecoin micropayments, the other discovers and pays for them autonomously. A live dashboard visualizes the entire flow.

## Architecture

### 1. Service Agent (server/) — "Oracle Agent"
An Express server offering two paid endpoints:
- `POST /api/analyze` — Sentiment analysis (one-time charge, $0.01/request)
- `POST /api/stream` — Streamed text generation word-by-word (session-based, $0.001/word via SSE)

Uses `mppx/server` middleware with Tempo testnet.

### 2. Client Agent (client/) — "Consumer Agent"  
A Node.js script that acts as an autonomous agent:
1. Discovers available services (hits a `/api/services` discovery endpoint)
2. Previews cost via `--dry-run` style check
3. Makes paid requests automatically (mppx/client handles 402 flow)
4. Logs all transactions and results

Uses `mppx/client` with fetch polyfill.

### 3. Live Dashboard (dashboard/)
A single `index.html` page served by the Service Agent that shows:
- Real-time event log (WebSocket from server)
- Payment flow visualization: Discovery → Challenge (402) → Payment → Receipt → Response
- Running totals: requests served, revenue earned, tokens spent
- Both agents' wallet balances

## Technical Details

### Tempo Testnet
- Chain ID: 42431
- RPC: https://rpc.moderato.tempo.xyz
- Explorer: https://explore.testnet.tempo.xyz
- pathUSD token: `0x20c0000000000000000000000000000000000000`

### Stack
- TypeScript (ESM)
- Express for server
- mppx SDK (`npm install mppx viem`)
- WebSocket (ws) for dashboard live updates
- Single `package.json` at root with workspaces or just flat structure

### Key mppx Patterns

**Server setup:**
```typescript
import { Mppx, tempo } from 'mppx/server'

const mppx = Mppx.create({
  methods: [tempo({
    currency: '0x20c0000000000000000000000000000000000000',
    recipient: RECIPIENT_ADDRESS,
  })],
})

// One-time charge middleware
app.post('/api/analyze', async (req, res) => {
  const response = await mppx.charge({ amount: '0.01' })(req)
  if (response.status === 402) return res.status(402).set(response.headers).end()
  // ... handle request
})
```

**Client setup:**
```typescript
import { Mppx, tempo } from 'mppx/client'
import { privateKeyToAccount } from 'viem/accounts'

Mppx.create({
  methods: [tempo({ account: privateKeyToAccount(PRIVATE_KEY) })],
})

// Fetch is now polyfilled — 402 handled automatically
const res = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ text: 'I love this product!' }),
})
```

### Account Setup
- Use `npx mppx account create` to generate testnet-funded accounts
- Or generate viem accounts with `generatePrivateKey()` and fund via faucet
- Need TWO accounts: one for service agent (recipient), one for client agent (payer)

## File Structure
```
tempo-demo/
├── package.json
├── tsconfig.json
├── .env.example          # RECIPIENT_KEY, CLIENT_KEY
├── src/
│   ├── server.ts         # Express + mppx server + WebSocket
│   ├── client.ts         # Autonomous client agent script
│   ├── shared/
│   │   └── types.ts      # Shared types for events
│   └── dashboard/
│       └── index.html    # Live dashboard (served static)
├── README.md             # Setup instructions + demo walkthrough
└── BRIEF.md              # This file
```

## Dashboard Design
Clean, dark theme. Three columns:
1. **Service Agent** — shows incoming requests, payment verification, responses sent
2. **Payment Flow** — animated arrows/steps showing the 402 → pay → receipt flow
3. **Client Agent** — shows discovery, payment decisions, results received

Bottom bar: wallet balances, total transactions, total revenue

## Running the Demo
```bash
# Terminal 1: Start service agent
npm run server

# Terminal 2: Run client agent (makes 5 sequential paid requests)
npm run client

# Browser: Open http://localhost:3000 for dashboard
```

## What Makes This Impressive
- **Zero signup, zero API keys** — agents pay per request with stablecoins
- **Sub-second settlement** — Tempo's ~500ms finality makes inline payments viable
- **Autonomous** — client agent discovers, evaluates cost, and pays without human intervention
- **Real money rails** — same code works on mainnet with real stablecoins
- **Streamed payments** — per-word charging via SSE shows the future of metered AI services

## Notes for Builder
- Keep it simple and working > feature-rich and broken
- The dashboard should be visually impressive but the code should be clean
- Use placeholder AI responses (hardcoded interesting text) rather than calling real AI APIs — keeps the demo focused on payments
- Make sure the README has clear setup instructions
- Generate test accounts automatically if possible (npx mppx account create)
- If mppx has issues on testnet, fall back to simulating the 402 flow with mock payments but keep the real mppx code commented and ready
