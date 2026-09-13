import crypto from 'node:crypto'

const SALT_BYTES = 16
const KEY_BYTES = 64
const TOKEN_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'finance-copilot-dev-secret-key-change-in-prod'
const DEFAULT_EXPIRES_IN_MS = 24 * 60 * 60 * 1000 // 24 hours

function base64UrlEncode(data) {
  return Buffer.from(typeof data === 'string' ? data : JSON.stringify(data))
    .toString('base64url')
}

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8')
}

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string')
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, KEY_BYTES)
  return `${salt}:${derivedKey.toString('hex')}`
}

export function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') {
    return false
  }
  const [salt, key] = storedHash.split(':')
  if (!salt || !key || salt.length !== SALT_BYTES * 2 || key.length !== KEY_BYTES * 2) {
    return false
  }
  try {
    const keyBuffer = Buffer.from(key, 'hex')
    if (keyBuffer.length !== KEY_BYTES) {
      return false
    }
    const derivedKey = crypto.scryptSync(password, salt, KEY_BYTES)
    return crypto.timingSafeEqual(keyBuffer, derivedKey)
  } catch {
    return false
  }
}

export function createToken(payload, expiresInMs = DEFAULT_EXPIRES_IN_MS, secret = TOKEN_SECRET) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be an object')
  }

  let finalExpiresInMs = DEFAULT_EXPIRES_IN_MS
  let finalSecret = secret

  if (typeof expiresInMs === 'object' && expiresInMs !== null) {
    if (expiresInMs.expiresIn !== undefined) {
      finalExpiresInMs = typeof expiresInMs.expiresIn === 'number' ? expiresInMs.expiresIn * 1000 : Number(expiresInMs.expiresIn)
    } else if (expiresInMs.expiresInMs !== undefined) {
      finalExpiresInMs = Number(expiresInMs.expiresInMs)
    }
    if (expiresInMs.secret) {
      finalSecret = expiresInMs.secret
    }
  } else if (expiresInMs !== undefined) {
    finalExpiresInMs = Number(expiresInMs)
  }

  const now = Date.now()
  const exp = now + finalExpiresInMs
  const fullPayload = {
    ...payload,
    iat: Math.floor(now / 1000),
    exp: Math.floor(exp / 1000),
  }

  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64UrlEncode(header)
  const encodedPayload = base64UrlEncode(fullPayload)

  const signature = crypto
    .createHmac('sha256', finalSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export function verifyToken(token, secret = TOKEN_SECRET) {
  if (typeof token !== 'string' || !token) {
    const error = new Error('Token must be a non-empty string')
    error.statusCode = 401
    throw error
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    const error = new Error('Invalid token structure')
    error.statusCode = 401
    throw error
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  const sigBuffer = Buffer.from(signature)
  const expBuffer = Buffer.from(expectedSignature)

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    const error = new Error('Invalid token signature')
    error.statusCode = 401
    throw error
  }

  let payload
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload))
  } catch {
    const error = new Error('Invalid token payload')
    error.statusCode = 401
    throw error
  }

  if (typeof payload.exp === 'number') {
    const nowSec = Math.floor(Date.now() / 1000)
    if (nowSec >= payload.exp) {
      const error = new Error('Token has expired')
      error.statusCode = 401
      throw error
    }
  }

  return payload
}
