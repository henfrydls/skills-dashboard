import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataFilePath = path.resolve(__dirname, 'data', 'database.json')

const defaultData = {
  categories: [],
  skills: [],
  collaborators: [],
  allowResetFromDemo: true
}

const ensureDataFile = () => {
  if (!fs.existsSync(dataFilePath)) {
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true })
    fs.writeFileSync(dataFilePath, JSON.stringify(defaultData, null, 2), 'utf8')
  }
}

const readData = () => {
  ensureDataFile()
  const raw = fs.readFileSync(dataFilePath, 'utf8')
  if (!raw) return { ...defaultData }

  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed.categories)) parsed.categories = []
  if (!Array.isArray(parsed.skills)) parsed.skills = []
  if (!Array.isArray(parsed.collaborators)) parsed.collaborators = []
  if (typeof parsed.allowResetFromDemo !== 'boolean') parsed.allowResetFromDemo = true

  return parsed
}

const writeData = (data) => {
  ensureDataFile()
  const payload = {
    ...defaultData,
    ...data,
    collaborators: Array.isArray(data.collaborators) ? data.collaborators : []
  }
  fs.writeFileSync(dataFilePath, JSON.stringify(payload, null, 2), 'utf8')
}

const dataApiPlugin = () => ({
  name: 'local-data-api',
  configureServer(server) {
    server.middlewares.use('/api/data', (req, res, next) => {
      if (req.method !== 'GET') return next()
      try {
        const data = readData()
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(data))
      } catch (error) {
        console.error('[data-api] GET /api/data failed', error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ message: 'Error reading data file' }))
      }
    })

    server.middlewares.use('/api/collaborators', (req, res, next) => {
      if (req.method !== 'POST') return next()

      let body = ''
      req.on('data', chunk => {
        body += chunk
      })

      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}')
          if (!payload || typeof payload !== 'object') {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ message: 'Colaborador inválido' }))
            return
          }

          const data = readData()
          if (!Array.isArray(data.collaborators)) data.collaborators = []

          const collaboratorToStore = {
            ...payload,
            esDemo: Boolean(payload.esDemo)
          }

          data.collaborators.push(collaboratorToStore)
          writeData(data)

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(collaboratorToStore))
        } catch (error) {
          console.error('[data-api] POST /api/collaborators failed', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'Error saving collaborator' }))
        }
      })
    })

    server.middlewares.use('/api/reset-demo', (req, res, next) => {
      if (req.method !== 'POST') return next()

      try {
        const data = readData()
        if (!data.allowResetFromDemo) {
          res.statusCode = 409
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: 'La demo ya fue inicializada. No es posible reiniciarla nuevamente.' }))
          return
        }

        const updatedData = {
          ...data,
          collaborators: [],
          allowResetFromDemo: false
        }
        writeData(updatedData)

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          collaborators: updatedData.collaborators,
          allowResetFromDemo: updatedData.allowResetFromDemo
        }))
      } catch (error) {
        console.error('[data-api] POST /api/reset-demo failed', error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ message: 'Error reiniciando los datos demo' }))
      }
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dataApiPlugin()],
})

