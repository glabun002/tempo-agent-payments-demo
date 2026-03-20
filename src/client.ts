import 'dotenv/config'
import { Mppx, tempo } from 'mppx/client'
import { privateKeyToAccount } from 'viem/accounts'
import type { ServiceInfo } from './shared/types.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3000'
const CLIENT_KEY = process.env.CLIENT_KEY as `0x${string}`
if (!CLIENT_KEY) {
  console.error('Missing CLIENT_KEY in .env — run: npx mppx account create')
  process.exit(1)
}

const clientAccount = privateKeyToAccount(CLIENT_KEY)
console.log(`🤖 DailyBrief Bot wallet: ${clientAccount.address}`)

// ---------------------------------------------------------------------------
// MPPX client — polyfills global fetch to handle 402 automatically
// ---------------------------------------------------------------------------

Mppx.create({
  methods: [tempo({ account: clientAccount })],
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(emoji: string, msg: string) {
  const ts = new Date().toISOString().slice(11, 23)
  console.log(`  [${ts}] ${emoji} ${msg}`)
}

function separator(title: string) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log(`${'─'.repeat(60)}`)
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Phase 1: Discovery
// ---------------------------------------------------------------------------

async function discoverServices(baseUrl: string): Promise<ServiceInfo[]> {
  separator('Phase 1: Browsing the ContentAI Service Menu')
  log('🔍', `Querying ${baseUrl}/api/services ...`)

  const res = await globalThis.fetch(`${baseUrl}/api/services`)
  const data = (await res.json()) as { services: ServiceInfo[] }

  for (const svc of data.services) {
    log('📋', `Found: ${svc.endpoint} — ${svc.description}`)
    log('💲', `  Price: ${svc.price} ${svc.unit}`)
  }

  log('✅', `Discovered ${data.services.length} paid services`)
  return data.services
}

// ---------------------------------------------------------------------------
// Phase 2: Headline Analysis — paying $0.01 per insight
// ---------------------------------------------------------------------------

const headlines = [
  'Stripe launches stablecoin payments in 46 countries, partnering with Bridge and Tempo',
  'SEC warns DeFi platforms face enforcement action over unregistered securities',
  'Federal Reserve holds interest rates steady amid mixed economic signals',
  'AI agent startup raises $200M Series B to expand autonomous commerce platform',
  'Crypto exchange suffers $40M hack as security concerns mount across the industry',
]

async function analyzeHeadline(baseUrl: string, headline: string, index: number) {
  separator(`Phase 2: Headline Analysis (${index + 1}/5)`)
  log('📰', `Headline: "${headline.slice(0, 65)}..."`)
  log('💳', 'Paying for analysis (0.01 pathUSD) ...')
  log('🔄', 'If 402 received → mppx auto-signs payment → retries')

  const start = Date.now()
  const res = await fetch(`${baseUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: headline }),
  })
  const elapsed = Date.now() - start

  const receipt = res.headers.get('Payment-Receipt')
  if (receipt) {
    log('🧾', `Payment receipt: ${receipt.slice(0, 80)}...`)
  }

  const data = (await res.json()) as {
    result: { signal: string; confidence: number; insight: string }
    meta: { charged: string; txHash?: string; elapsed?: number }
  }

  log('📊', `Signal: ${data.result.signal} (confidence: ${data.result.confidence})`)
  log('💡', `Insight: ${data.result.insight}`)
  log('💰', `Charged: ${data.meta.charged}`)
  log('⏱️', `Round-trip: ${elapsed}ms`)
  if (data.meta.txHash) {
    log('🔗', `Tx: https://explore.testnet.tempo.xyz/tx/${data.meta.txHash}`)
  }
}

// ---------------------------------------------------------------------------
// Phase 3: Article Generation — paying $0.001 per word, streamed
// ---------------------------------------------------------------------------

async function streamArticle(baseUrl: string) {
  separator('Phase 3: Commissioning an Article (pay-per-word)')
  log('📝', 'Requesting article on "The Future of Agent Commerce" ...')
  log('💳', 'Opening payment channel (0.001 pathUSD/word) ...')
  log('🔄', 'If 402 received → mppx auto-signs payment → retries')

  const start = Date.now()
  const res = await fetch(`${baseUrl}/api/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'The Future of Agent Commerce' }),
  })
  const elapsed = Date.now() - start

  const receipt = res.headers.get('Payment-Receipt')
  if (receipt) {
    log('🧾', `Payment receipt: ${receipt.slice(0, 80)}...`)
  }

  log('📡', `Channel opened (${elapsed}ms). Article streaming:`)
  process.stdout.write('  ')

  const reader = res.body
  if (!reader) {
    log('❌', 'No response body')
    return
  }

  const decoder = new TextDecoder()
  let wordCount = 0

  for await (const chunk of reader as AsyncIterable<Uint8Array>) {
    const text = decoder.decode(chunk, { stream: true })
    const lines = text.split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') {
        const totalElapsed = Date.now() - start
        process.stdout.write('\n')
        log('✅', `Article complete — ${wordCount} words`)
        log('⏱️', `Total time: ${totalElapsed}ms`)
        log('💰', `Article cost: ~${(wordCount * 0.001).toFixed(4)} pathUSD`)
        return
      }
      try {
        const { word } = JSON.parse(payload) as { word: string }
        process.stdout.write(word + ' ')
        wordCount++
      } catch {
        // skip malformed lines
      }
    }
  }
  process.stdout.write('\n')
  log('✅', `Article complete — ${wordCount} words`)
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

async function showSummary(baseUrl: string) {
  separator('Summary')

  const statsRes = await globalThis.fetch(`${baseUrl}/api/stats`)
  const stats = (await statsRes.json()) as {
    totalRequests: number
    totalRevenue: string
    recipientAddress: string
    recipientBalance: string
    avgTiming: number
  }

  log('📈', `Total requests served: ${stats.totalRequests}`)
  log('💰', `Total revenue earned: ${stats.totalRevenue} pathUSD`)
  log('🏦', `ContentAI balance: ${stats.recipientBalance} pathUSD`)
  log('⏱️', `Avg round-trip: ${stats.avgTiming}ms`)
  log('🤖', `DailyBrief Bot: ${clientAccount.address}`)
  console.log(`\n${'─'.repeat(60)}\n`)
}

// ---------------------------------------------------------------------------
// Exported runDemo for server-side triggering
// ---------------------------------------------------------------------------

export async function runDemo(baseUrl?: string) {
  const url = baseUrl ?? SERVER_URL

  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║    DailyBrief Bot — Buying content from ContentAI      ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log(`\n  ContentAI:     ${url}`)
  console.log(`  Bot wallet:    ${clientAccount.address}`)

  // 1. Browse services
  await discoverServices(url)
  await sleep(1000)

  // 2. Buy headline analysis for 5 headlines
  for (let i = 0; i < headlines.length; i++) {
    await analyzeHeadline(url, headlines[i], i)
    await sleep(500)
  }

  // 3. Commission an article (streamed, pay-per-word)
  await sleep(500)
  await streamArticle(url)

  // 4. Summary
  await sleep(500)
  await showSummary(url)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const isDirectRun = process.argv[1]?.includes('client')
if (isDirectRun) {
  runDemo().catch((err) => {
    console.error('\n❌ Error:', err)
    process.exit(1)
  })
}
