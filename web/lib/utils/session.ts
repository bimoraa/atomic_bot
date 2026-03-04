import { SignJWT, jwtVerify } from 'jose'

const secret_key = process.env.JWT_SECRET || 'default_secret_key_for_development_only'
const key = new TextEncoder().encode(secret_key)

export async function encrypt_session(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function decrypt_session(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    return null
  }
}
