import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import http from 'http'

const PAYMENTS_URL  = 'https://script.google.com/macros/s/AKfycbzBnMr_D9Cm_9SbJuPg4fEoyquyBBRpOg9CppshQF0ErSi4rKsLsAEgNcIc7_Wfoq9R/exec'
const NBKZ_URL      = 'https://nationalbank.kz/rss/rates_all.xml'
const RATE_CURRENCIES = ['USD', 'EUR', 'CNY', 'RUB']
let   ratesCache    = null
let   ratesCacheTs  = 0

function paymentsProxy() {
  return {
    name: 'payments-proxy',
    configureServer(server) {
      server.middlewares.use('/api/payments', (req, res) => {
        const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
        const target = PAYMENTS_URL + qs

        function get(url) {
          const lib = url.startsWith('https') ? https : http
          lib.get(url, r => {
            if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
              get(r.headers.location)
              return
            }
            let body = ''
            r.on('data', c => body += c)
            r.on('end', () => {
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              try { JSON.parse(body); res.end(body) }
              catch { res.end(JSON.stringify({ ok: true })) }
            })
          }).on('error', () => res.end(JSON.stringify({ ok: true })))
        }

        get(target)
      })
    }
  }
}

function ratesProxy() {
  return {
    name: 'rates-proxy',
    configureServer(server) {
      server.middlewares.use('/api/rates', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')

        if (ratesCache && Date.now() - ratesCacheTs < 60 * 60 * 1000) {
          return res.end(JSON.stringify(ratesCache))
        }

        https.get(NBKZ_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
          let body = ''
          r.on('data', c => body += c)
          r.on('end', () => {
            try {
              const items = [...body.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1])
              const rates = {}
              for (const item of items) {
                const code   = (item.match(/<title>(.*?)<\/title>/)              || [])[1]?.trim()
                const value  = parseFloat((item.match(/<description>(.*?)<\/description>/) || [])[1])
                const quant  = parseInt((item.match(/<quant>(.*?)<\/quant>/)     || [])[1]) || 1
                const change = parseFloat((item.match(/<change>(.*?)<\/change>/) || [])[1] || '0')
                if (code && RATE_CURRENCIES.includes(code) && !isNaN(value)) {
                  rates[code] = { rate: +(value / quant).toFixed(2), change: +change.toFixed(2) }
                }
              }
              const result = { rates, updated: new Date().toISOString() }
              ratesCache   = result
              ratesCacheTs = Date.now()
              res.end(JSON.stringify(result))
            } catch (e) {
              res.end(JSON.stringify({ rates: {}, error: e.message }))
            }
          })
        }).on('error', e => res.end(JSON.stringify({ rates: {}, error: e.message })))
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), paymentsProxy(), ratesProxy()],
})
