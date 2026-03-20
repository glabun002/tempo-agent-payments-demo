import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { createPublicClient, http, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { Mppx, tempo } from 'mppx/express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import type { DashboardEvent, ServiceInfo } from './shared/types.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT ?? 3000)
const RECIPIENT_KEY = process.env.RECIPIENT_KEY as `0x${string}`
if (!RECIPIENT_KEY) {
  console.error('Missing RECIPIENT_KEY in .env — run: npx mppx account create')
  process.exit(1)
}

const PATH_USD = '0x20c0000000000000000000000000000000000000' as const
const TEMPO_RPC = 'https://rpc.moderato.tempo.xyz'
const EXPLORER = 'https://explore.testnet.tempo.xyz'

const recipientAccount = privateKeyToAccount(RECIPIENT_KEY)
console.log(`🏦 Service Agent wallet: ${recipientAccount.address}`)

// ---------------------------------------------------------------------------
// Viem public client for balance queries
// ---------------------------------------------------------------------------

const publicClient = createPublicClient({ transport: http(TEMPO_RPC) })

const erc20Abi = [
  {
    name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

async function getBalance(address: `0x${string}`): Promise<string> {
  try {
    const raw = await publicClient.readContract({
      address: PATH_USD, abi: erc20Abi, functionName: 'balanceOf', args: [address],
    })
    return formatUnits(raw, 6)
  } catch { return '–' }
}

// ---------------------------------------------------------------------------
// MPPX setup
// ---------------------------------------------------------------------------

const mppx = Mppx.create({
  methods: [tempo({ currency: PATH_USD, recipient: recipientAccount.address, testnet: true })],
})

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express()
app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
app.use(express.static(join(__dirname, 'dashboard')))

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

let eventCounter = 0
function broadcast(event: Omit<DashboardEvent, 'id' | 'timestamp'>) {
  const full: DashboardEvent = { id: String(++eventCounter), timestamp: new Date().toISOString(), ...event }
  const msg = JSON.stringify(full)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg)
  }
}

// ---------------------------------------------------------------------------
// Stats & Helpers
// ---------------------------------------------------------------------------

let totalRequests = 0
let totalRevenue = 0
const timings: number[] = []

function mockTxHash(): string {
  const c = '0123456789abcdef'
  let h = '0x'
  for (let i = 0; i < 64; i++) h += c[Math.floor(Math.random() * 16)]
  return h
}

// ---------------------------------------------------------------------------
// Placeholder AI responses
// ---------------------------------------------------------------------------

// Headline analysis responses — like a research analyst
const headlineInsights: Record<string, { signal: string; confidence: number; insight: string }> = {
  bullish: { signal: 'bullish', confidence: 0.92, insight: 'Strong positive momentum. This signals growing institutional confidence and market expansion.' },
  bearish: { signal: 'bearish', confidence: 0.85, insight: 'Caution warranted. This suggests headwinds for the sector with potential regulatory friction.' },
  neutral: { signal: 'neutral', confidence: 0.60, insight: 'Mixed signals. The market is digesting this news — watch for follow-on developments in 24-48h.' },
}

function analyzeHeadline(text: string) {
  const lower = text.toLowerCase()
  if (/launch|partner|raise|grow|record|adopt|expand|billion|approve/.test(lower)) return headlineInsights.bullish
  if (/crash|hack|ban|fine|sue|fraud|collapse|warning|risk/.test(lower)) return headlineInsights.bearish
  return headlineInsights.neutral
}

// Article content — what the writing service "generates"
const articles = [
  'The rise of machine-to-machine payments is reshaping how digital services are bought and sold. Traditional APIs require signup flows, credit cards, and monthly subscriptions — creating friction that makes micropayments impractical. But when AI agents carry their own wallets, a new model emerges: pay-per-use at the speed of software. A research bot can query a data service for a penny per call. A content agent can commission articles at a fraction of a cent per word. No contracts, no invoices, no accounts receivable. Just value exchanged at the speed of the internet.',
  'Stablecoins are becoming the native currency of the autonomous web. Unlike volatile cryptocurrencies, stablecoins maintain a predictable value — making them ideal for automated payments where agents need to budget and transact without human oversight. When settlement happens in under a second and fees are fractions of a cent, entirely new business models become viable. Any service, any API, any piece of compute can be monetized at the granularity of a single function call. The subscription model starts to look as outdated as the phone book.',
  'The next generation of AI applications will not operate in isolation. They will collaborate, negotiate, and transact with each other autonomously. A travel planning agent might pay a flight search agent for real-time pricing, then pay a hotel review agent for curated recommendations, then pay a booking agent to finalize the reservation. Each interaction is a microtransaction — a few cents here, a fraction of a cent there — settled instantly on a blockchain purpose-built for payments.',
]

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Discovery (free)
app.get('/api/services', (_req, res) => {
  const services: ServiceInfo[] = [
    { endpoint: '/api/analyze', method: 'POST', description: 'Headline analysis — AI-powered market insight on any headline', price: '0.01', unit: 'pathUSD per analysis' },
    { endpoint: '/api/stream', method: 'POST', description: 'Article generator — AI writes a full article, streamed word-by-word', price: '0.001', unit: 'pathUSD per word' },
  ]
  broadcast({ type: 'discovery', source: 'server', data: { services } })
  broadcast({ type: 'discovery', source: 'client', data: { found: services.length, endpoints: services.map(s => s.endpoint) } })
  res.json({ services })
})

// Paid sentiment analysis — with full event broadcasting + timing
app.post('/api/analyze', (req, res, next) => {
  const text = (req.body as { text?: string })?.text ?? ''
  ;(req as any)._startTime = Date.now()
  ;(req as any)._text = text

  broadcast({ type: 'request', source: 'client', data: { endpoint: '/api/analyze', text: text.slice(0, 60) } })

  // Simulate the 402 challenge/payment dance with timing
  setTimeout(() => {
    broadcast({ type: 'challenge', source: 'server', data: { endpoint: '/api/analyze', amount: '0.01', currency: 'pathUSD' } })
  }, 30)
  setTimeout(() => {
    broadcast({ type: 'challenge', source: 'client', data: { amount: '0.01', status: '402 Payment Required' } })
  }, 60)
  setTimeout(() => {
    broadcast({ type: 'payment', source: 'client', data: { amount: '0.01', status: 'Signing stablecoin transfer...' } })
  }, 90)

  next()
}, mppx.charge({ amount: '0.01' }), (req, res) => {
  const startTime = (req as any)._startTime as number
  const text = (req as any)._text as string
  const result = analyzeHeadline(text)
  const txHash = mockTxHash()
  const elapsed = Date.now() - startTime

  totalRequests++
  totalRevenue += 0.01
  timings.push(elapsed)

  broadcast({ type: 'receipt', source: 'server', data: { endpoint: '/api/analyze', amount: '0.01', txHash, explorerUrl: `${EXPLORER}/tx/${txHash}`, elapsed: `${elapsed}ms` } })
  broadcast({ type: 'response', source: 'server', data: { endpoint: '/api/analyze', result, elapsed: `${elapsed}ms` } })
  broadcast({ type: 'response', source: 'client', data: { signal: result.signal, confidence: result.confidence, elapsed: `${elapsed}ms` } })

  res.json({ result, meta: { charged: '0.01 pathUSD', txHash, elapsed } })
})

// Paid streaming — simulated session-based per-word charging
app.post('/api/stream', (req, res, next) => {
  ;(req as any)._startTime = Date.now()

  broadcast({ type: 'request', source: 'client', data: { endpoint: '/api/stream', mode: 'session streaming' } })

  setTimeout(() => {
    broadcast({ type: 'challenge', source: 'server', data: { endpoint: '/api/stream', rate: '$0.001/word', mode: 'session' } })
  }, 30)
  setTimeout(() => {
    broadcast({ type: 'challenge', source: 'client', data: { status: '402 Session Required', rate: '$0.001/word' } })
  }, 60)

  next()
}, mppx.charge({ amount: '0.05' }), (req, res) => {
  const startTime = (req as any)._startTime as number
  const channelId = mockTxHash().slice(0, 18)
  const openTxHash = mockTxHash()

  broadcast({ type: 'session_open', source: 'client', data: { channelId, deposit: '1.00 pathUSD', txHash: openTxHash, explorerUrl: `${EXPLORER}/tx/${openTxHash}` } })
  broadcast({ type: 'payment', source: 'client', data: { status: 'Payment channel opened, 1.00 pathUSD deposited' } })

  const paymentTxHash = mockTxHash()
  broadcast({ type: 'receipt', source: 'server', data: { endpoint: '/api/stream', mode: 'session', txHash: paymentTxHash, explorerUrl: `${EXPLORER}/tx/${paymentTxHash}`, elapsed: `${Date.now() - startTime}ms` } })

  totalRequests++

  // SSE streaming
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const text = articles[Math.floor(Math.random() * articles.length)]
  const words = text.split(' ')
  let i = 0
  let sessionCost = 0

  const interval = setInterval(() => {
    if (i >= words.length) {
      const elapsed = Date.now() - startTime
      timings.push(elapsed)
      totalRevenue += sessionCost

      res.write(`data: [DONE]\n\n`)

      const closeTxHash = mockTxHash()
      broadcast({ type: 'session_close', source: 'client', data: { channelId, totalCharged: `${sessionCost.toFixed(3)} pathUSD`, words: words.length, txHash: closeTxHash, explorerUrl: `${EXPLORER}/tx/${closeTxHash}` } })
      broadcast({ type: 'stream_end', source: 'server', data: { words: words.length, cost: `${sessionCost.toFixed(3)} pathUSD`, elapsed: `${elapsed}ms` } })
      broadcast({ type: 'stream_end', source: 'client', data: { words: words.length, cost: `${sessionCost.toFixed(3)} pathUSD`, elapsed: `${elapsed}ms` } })

      clearInterval(interval)
      res.end()
      return
    }

    const word = words[i++]
    sessionCost += 0.001
    res.write(`data: ${JSON.stringify({ word, index: i, total: words.length })}\n\n`)

    // Broadcast word for live dashboard visualization
    broadcast({ type: 'stream_data', source: 'client', data: { word } })

    // Simulate voucher signing every 5 words
    if (i % 5 === 0) {
      broadcast({ type: 'session_voucher', source: 'client', data: { channelId, words: i, amount: `${sessionCost.toFixed(3)}` } })
    }
    if (i % 10 === 0) {
      broadcast({ type: 'stream_word', source: 'server', data: { progress: i, total: words.length } })
    }
  }, 80)

  req.on('close', () => clearInterval(interval))
})

// Stats (free)
app.get('/api/stats', async (_req, res) => {
  const balance = await getBalance(recipientAccount.address)
  const avgTiming = timings.length > 0 ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : 0
  res.json({ totalRequests, totalRevenue: totalRevenue.toFixed(4), recipientAddress: recipientAccount.address, recipientBalance: balance, avgTiming })
})

// Balance check (free)
app.get('/api/balance/:address', async (req, res) => {
  const balance = await getBalance(req.params.address as `0x${string}`)
  res.json({ address: req.params.address, balance })
})

// Run Demo from dashboard
app.post('/api/run-demo', (_req, res) => {
  res.json({ status: 'started', message: 'Run npm run client in a terminal' })
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

server.listen(PORT, () => {
  console.log(`\n🚀 Service Agent running on http://localhost:${PORT}`)
  console.log(`📊 Dashboard:  http://localhost:${PORT}`)
  console.log(`🔌 WebSocket:  ws://localhost:${PORT}/ws`)
  console.log(`💰 Recipient:  ${recipientAccount.address}`)
  console.log(`\nEndpoints:`)
  console.log(`  GET  /api/services   — discover available services (free)`)
  console.log(`  POST /api/analyze    — sentiment analysis (0.01 pathUSD)`)
  console.log(`  POST /api/stream     — text generation stream (0.001 pathUSD/word session)`)
  console.log(`  GET  /api/stats      — server statistics (free)`)
  console.log()
})
