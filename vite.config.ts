import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

type AnyRecord = Record<string, any>

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ä]/g, 'ae')
    .replace(/[ö]/g, 'oe')
    .replace(/[ü]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `id_${Date.now()}`
}

function parseJsonBody(req: import('node:http').IncomingMessage) {
  return new Promise<any>((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', chunk => {
      body += chunk
      if (body.length > 50 * 1024 * 1024) reject(new Error('Payload zu gross'))
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : null)
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function cleanVerificationPayload(payload: AnyRecord, chaptersByNorm: Record<string, AnyRecord[]>) {
  const verification = { ...(payload.verification || payload) }
  const norm = verification.norm_id || payload.norm_id || 'sia265'
  const id = verification.id || payload.id || slugify(verification.title || 'nachweis')
  verification.id = id
  verification.norm_id = norm

  const graph = payload.graph || (typeof verification.graph_json === 'string' ? JSON.parse(verification.graph_json || 'null') : verification.graph_json) || null
  verification.graph_json = graph ? JSON.stringify(graph) : (verification.graph_json || null)

  const chapter = (chaptersByNorm[norm] || []).find(ch => ch.id === verification.chapter_id)

  return {
    version: payload.version || 1,
    exported_at: payload.exported_at || new Date().toISOString(),
    verification,
    ...(chapter ? { chapter } : {}),
    variables: payload.variables || [],
    tables: payload.tables || [],
    graph,
  }
}

function jsonWriterPlugin(): Plugin {
  return {
    name: 'statik-rechner-json-writer',
    handleHotUpdate(ctx) {
      const normalized = ctx.file.split(path.sep).join('/')
      if (normalized.includes('/nachweise/') || normalized.includes('/data/')) {
        return []
      }
    },
    configureServer(server) {
      server.middlewares.use('/__statik-rechner/write-json', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
          return
        }

        try {
          const state = await parseJsonBody(req)
          const root = server.config.root
          const pretty = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

          await writeFile(path.join(root, 'data/norms.json'), pretty(state.norms || []), 'utf8')
          await writeFile(path.join(root, 'data/units.json'), pretty(state.units || []), 'utf8')
          await writeFile(path.join(root, 'data/wood.json'), pretty({
            wood_types: state.woodTypes || [],
            wood_classes: state.woodClasses || [],
          }), 'utf8')

          for (const [norm, chapters] of Object.entries(state.chaptersByNorm || {})) {
            await writeFile(path.join(root, 'data/chapters', `${norm}.json`), pretty(chapters), 'utf8')
          }

          for (const [norm, tables] of Object.entries(state.tablesByNorm || {})) {
            await writeFile(path.join(root, 'data/tables', `${norm}.json`), pretty(tables), 'utf8')
          }

          const byNorm = new Map<string, AnyRecord[]>()
          for (const payload of state.verifications || []) {
            const normalized = cleanVerificationPayload(payload, state.chaptersByNorm || {})
            const norm = normalized.verification.norm_id || 'sia265'
            if (!byNorm.has(norm)) byNorm.set(norm, [])
            byNorm.get(norm)!.push(normalized)
          }

          for (const [norm, verifications] of byNorm.entries()) {
            const dir = path.join(root, 'nachweise', norm)
            await mkdir(dir, { recursive: true })
            const desiredFiles = new Set<string>()

            for (const payload of verifications) {
              const fileName = `${slugify(payload.verification.id)}.json`
              desiredFiles.add(fileName)
              await writeFile(path.join(dir, fileName), pretty(payload), 'utf8')
            }

            for (const file of await readdir(dir)) {
              if (file.endsWith('.json') && !desiredFiles.has(file)) {
                await rm(path.join(dir, file))
              }
            }
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (error: any) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }))
        }
      })

      // Dynamisches Laden aller Verifikationen (ohne Dev-Server Restart)
      server.middlewares.use('/__statik-rechner/load-verifications', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
          return
        }

        try {
          const root = server.config.root
          const verifications: AnyRecord[] = []
          const nachweiseDir = path.join(root, 'nachweise')

          // Alle Norm-Ordner lesen
          const norms = await readdir(nachweiseDir, { withFileTypes: true })
          for (const normDir of norms) {
            if (!normDir.isDirectory()) continue
            const normPath = path.join(nachweiseDir, normDir.name)
            const files = await readdir(normPath)

            // Alle JSON-Dateien in diesem Norm-Ordner lesen
            for (const file of files) {
              if (!file.endsWith('.json')) continue
              const filePath = path.join(normPath, file)
              const content = await readFile(filePath, 'utf-8')
              const parsed = JSON.parse(content)
              verifications.push(parsed)
            }
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, verifications }))
        } catch (error: any) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), jsonWriterPlugin()],
  server: {
    watch: {
      ignored: ['**/nachweise/**', '**/data/**'],
    },
  },
})
