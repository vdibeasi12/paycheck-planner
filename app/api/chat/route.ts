export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return Response.json({ response: 'Invalid message' }, { status: 400 })
    }

    // AI Response Logic - Currently simulated
    // TODO: Integrate with Claude API, OpenAI, or your preferred AI service
    const response = getAIResponse(message)

    return Response.json({ response })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { response: 'Error processing your request' },
      { status: 500 }
    )
  }
}

function getAIResponse(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Debt-related responses
  if (lowerMessage.includes('debt') && lowerMessage.includes('payoff')) {
    return `Great question about debt payoff! Here's my advice:

1. **Snowball Method**: Pay off smallest balances first for quick wins and motivation
2. **Avalanche Method**: Pay off highest interest rates first to save money on interest
3. **Key Steps**:
   - List all debts with balances and rates
   - Choose your strategy
   - Make minimum payments on all debts
   - Apply extra payments to your target debt
   - Repeat until debt-free

Use our Debt Payoff Calculator to compare strategies for your specific situation!`
  }

  if (lowerMessage.includes('save') || lowerMessage.includes('saving')) {
    return `Great! Here are proven ways to save more money:

1. **Track Your Spending**: Use our Bills tracker to monitor where your money goes
2. **Cut Expenses**: Review subscriptions and reduce non-essential spending
3. **Increase Income**: Look for side gigs or negotiate a raise
4. **Automate Savings**: Set up automatic transfers to savings on payday
5. **Set Goals**: Define what you're saving for (emergency fund, vacation, etc.)
6. **Use the 50/30/20 Rule**: Allocate 50% to needs, 30% to wants, 20% to savings

Start small - even $50/month adds up to $600/year!`
  }

  if (lowerMessage.includes('budget')) {
    return `Budgeting is key to financial success! Here's how to get started:

1. **Calculate Your Income**: Know your monthly take-home pay
2. **List Your Expenses**: Bills, groceries, entertainment, etc.
3. **Categorize Spending**: Needs, wants, and savings
4. **Set Limits**: Allocate amounts to each category
5. **Track Progress**: Review monthly and adjust as needed
6. **Use Tools**: Our Bills tracker and Dashboard help with this

Pro tip: Use the 50/30/20 rule as a starting framework!`
  }

  if (lowerMessage.includes('emergency') || lowerMessage.includes('fund')) {
    return `An emergency fund is crucial! Here's my advice:

**Target Amount**: 3-6 months of living expenses

**How to Build It**:
1. Start with $1,000 for small emergencies
2. Then aim for 1 month of expenses
3. Build to 3-6 months over time
4. Keep it in an accessible savings account

**Priority**: Build your emergency fund BEFORE paying off debt (unless it's high-interest credit card debt)

This prevents you from going back into debt when emergencies happen!`
  }

  if (lowerMessage.includes('financial health') || lowerMessage.includes('improve')) {
    return `Here's how to improve your financial health:

1. **Check Your Credit Score**: Know where you stand
2. **Reduce Debt**: Use our calculator to make a payoff plan
3. **Build Emergency Fund**: 3-6 months of expenses
4. **Live Below Your Means**: Spend less than you earn
5. **Automate Savings**: Make it automatic
6. **Review Regularly**: Check your progress monthly

**Metrics to Track**:
- Debt-to-income ratio
- Net worth
- Savings rate
- Credit score

Start with one goal and build from there!`
  }

  if (lowerMessage.includes('invest') || lowerMessage.includes('investment')) {
    return `About investing:

**Before You Invest**:
1. Have an emergency fund (3-6 months expenses)
2. Pay off high-interest debt
3. Understand your risk tolerance

**Common Options**:
- 401(k) - employer retirement plan
- IRA - individual retirement account
- Index funds - diversified, low-cost
- Stocks - higher risk, higher potential return

**Important**: I provide educational information, not investment advice. Consult a qualified financial advisor before investing.

Our AI recommendations can help you plan!`
  }

  // Default helpful response
  return `I'm here to help with your financial questions! I can assist with:

• **Debt payoff strategies** - Snowball vs Avalanche methods
• **Budgeting tips** - How to create and stick to a budget
• **Saving goals** - Building emergency funds and saving more
• **Financial planning** - Overall financial health improvement
• **Bill management** - Tracking and organizing expenses

Try asking me anything about these topics, or use our quick action buttons below to get started!`
}
