// Event types broadcast over WebSocket to the dashboard

export interface DashboardEvent {
  id: string
  timestamp: string
  type: EventType
  source: 'server' | 'client'
  data: Record<string, unknown>
}

export type EventType =
  | 'discovery'        // Client discovers available services
  | 'request'          // Client sends a request
  | 'challenge'        // Server issues 402 payment challenge
  | 'payment'          // Client signs and sends payment
  | 'receipt'          // Server validates payment, issues receipt
  | 'response'         // Server sends the actual response
  | 'stream_word'      // Individual word in a streamed response
  | 'stream_data'      // Actual streamed word content for visualization
  | 'stream_end'       // Stream completed
  | 'session_open'     // Payment channel opened
  | 'session_voucher'  // Voucher signed for session tick
  | 'session_close'    // Payment channel closed
  | 'error'            // Something went wrong
  | 'balance'          // Wallet balance update

export interface ServiceInfo {
  endpoint: string
  method: string
  description: string
  price: string
  unit: string
}
