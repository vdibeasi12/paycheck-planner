import { NextRequest, NextResponse } from 'next/server'
import { sendConfirmationEmail } from '@/lib/services/emailService'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, userId } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Create confirmation link
    const confirmationLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?code=confirmation&email=${encodeURIComponent(email)}`

    // Send confirmation email
    const result = await sendConfirmationEmail(email, confirmationLink)

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent',
      result,
    })
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send confirmation email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
