import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Missing ANTHROPIC_API_KEY')
      return NextResponse.json(
        { 
          response: 'AI support is temporarily unavailable. Please email support@paycheckplanner.ai for help!' 
        },
        { status: 200 }
      )
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: `You are a helpful and friendly AI assistant for Paycheck Planner, a personal finance app that helps users pay off debt faster.

PAYCHECK PLANNER FEATURES:
- Free Plan: Up to 3 debts, manual tracking, basic dashboard
- Starter Plan ($3/month or $33/year): Up to 10 debts, charts, visual analytics, basic email support
- Premium Plan ($6/month or $66/year): Unlimited debts, advanced debt payoff strategies (Snowball & Avalanche), AI insights, 24/7 AI assistant

KEY INFORMATION:
- Support Email: support@paycheckplanner.ai
- App URL: https://paycheckplanner-snowy.vercel.app
- We help users with debt management, financial planning, and smart money decisions

YOUR TONE:
- Friendly and encouraging (people are stressed about debt!)
- Clear and concise
- Provide actionable advice
- Recommend appropriate plans based on user needs
- Always mention the support email for complex issues

DEBT STRATEGIES YOU CAN EXPLAIN:
- Snowball Method: Pay smallest debts first (psychological wins)
- Avalanche Method: Pay highest interest debts first (saves money)
- Consolidation strategies
- Budget optimization

If someone asks about features you're unsure about, recommend they email support@paycheckplanner.ai for detailed help.

Keep responses under 150 words for chat brevity.`,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Anthropic API error:', error)
      return NextResponse.json(
        { 
          response: 'I encountered a temporary issue. Please email support@paycheckplanner.ai!' 
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    const aiMessage = data.content[0]?.text || 'Sorry, I couldn\'t generate a response.'

    return NextResponse.json({ response: aiMessage })
  } catch (error) {
    console.error('AI Support Error:', error)
    return NextResponse.json(
      { 
        response: 'Something went wrong. Please email support@paycheckplanner.ai for help!' 
      },
      { status: 200 }
    )
  }
}
