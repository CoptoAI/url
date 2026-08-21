/**
 * Edge-native password hashing using Web Crypto PBKDF2
 */

const ITERATIONS = 100000
const KEY_LEN = 32
const ALGO = 'SHA-256'

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const encoder = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: ALGO,
    },
    passwordKey,
    KEY_LEN * 8,
  )

  const saltHex = Array.from(salt, b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(new Uint8Array(derivedBits), b => b.toString(16).padStart(2, '0')).join('')

  return `pbkdf2$${ITERATIONS}$${saltHex}$${hashHex}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split('$')
    if (parts.length !== 4 || parts[0] !== 'pbkdf2')
      return false

    const iterations = Number.parseInt(parts[1]!, 10)
    const saltHex = parts[2]!
    const expectedHashHex = parts[3]!

    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => Number.parseInt(byte, 16)))
    const encoder = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    )

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: ALGO,
      },
      passwordKey,
      KEY_LEN * 8,
    )

    const computedHashHex = Array.from(new Uint8Array(derivedBits), b => b.toString(16).padStart(2, '0')).join('')
    return computedHashHex === expectedHashHex
  }
  catch {
    return false
  }
}
