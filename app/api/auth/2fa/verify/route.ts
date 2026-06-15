import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, secret, token } = await req.json()

    if (!userId || !secret || !token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the token (in production, use speakeasy.totp.verify())
    // For now, accept any 6-digit code as valid in development
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      )
    }

    // In production:
    // const speakeasy = require('speakeasy');
    // const verified = speakeasy.totp.verify({
    //   secret: secret,
    //   token: token,
    //   window: 2
    // });

    // Generate backup codes
    const backupCodes = generateBackupCodes(10)

    // TODO: Save to database
    // await supabase
    //   .from('profiles')
    //   .update({
    //     two_factor_enabled: true,
    //     two_factor_secret: secret,
    //     backup_codes: backupCodes,
    //   })
    //   .eq('id', userId)

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes,
    })
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    )
  }
}

function generateBackupCodes(count: number): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = `${Math.random().toString(36).substr(2, 5)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase()
    codes.push(code)
  }
  return codes
}
