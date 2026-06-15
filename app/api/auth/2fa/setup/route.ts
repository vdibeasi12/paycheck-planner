import { NextRequest, NextResponse } from 'next/server'

// Note: In production, use actual library like 'speakeasy' or 'totp-generator'
// For now, we'll provide a template

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // In production, use speakeasy:
    // const speakeasy = require('speakeasy');
    // const QRCode = require('qrcode');
    
    // For demonstration:
    const secret = generateRandomString(32)
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=otpauth://totp/PaycheckPlanner:${userId}?secret=${secret}&issuer=PaycheckPlanner`

    return NextResponse.json({
      secret,
      qrCode,
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    )
  }
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
