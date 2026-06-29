import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto'

const SECRET = process.env.SERVER_SECRET || 'dev-secret-change-me'

/** 4자리 PIN 해싱 (scrypt). */
export function hashPin(pin) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(pin), salt, 32).toString('hex')
  return { salt, hash }
}

export function verifyPin(pin, salt, hash) {
  const cand = scryptSync(String(pin), salt, 32)
  const real = Buffer.from(hash, 'hex')
  return cand.length === real.length && timingSafeEqual(cand, real)
}

/** 간단한 서명 토큰: "<userId>.<hmac>" */
export function makeToken(userId) {
  const sig = createHmac('sha256', SECRET).update(String(userId)).digest('hex')
  return `${userId}.${sig}`
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null
  const [id, sig] = token.split('.')
  const expect = createHmac('sha256', SECRET).update(String(id)).digest('hex')
  if (sig.length === expect.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) {
    return Number(id)
  }
  return null
}

/** Express 미들웨어: Authorization: Bearer <token> → req.userId */
export function authMiddleware(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  const userId = verifyToken(token)
  if (!userId) return res.status(401).json({ error: 'unauthorized' })
  req.userId = userId
  next()
}
