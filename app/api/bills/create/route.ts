import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { name, amount, dueDate, description } = await req.json()

    // Validate input
    if (!name || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, amount, dueDate' },
        { status: 400 }
      )
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract due date (day of month)
    const dueDay = new Date(dueDate).getDate()

    // Insert bill into database
    const { data, error } = await supabase
      .from('bills')
      .insert([
        {
          user_id: user.id,
          name: name,
          amount: parseFloat(amount),
          due_date: dueDay,
          frequency: 'monthly',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save bill to database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Bill saved successfully',
      data: data?.[0],
    })
  } catch (error) {
    console.error('Error saving bill:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
