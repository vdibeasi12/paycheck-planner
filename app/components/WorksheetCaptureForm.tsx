"use client"

import { Mail } from "lucide-react"
import EmailCaptureForm from "./EmailCaptureForm"

export default function WorksheetCaptureForm() {
  return (
    <EmailCaptureForm
      idPrefix="worksheet"
      endpoint="/api/lead-magnet/subscribe"
      icon={Mail}
      heading="Get the worksheet by email"
      description="Plus a free 6-email mini-course on organizing your paycheck, avoiding common budgeting mistakes, paying off debt, and saving consistently. No spam, unsubscribe anytime."
      buttonText="Send it to me"
      successHeading="Check your inbox"
      successBody="Your worksheet link is on its way, along with a short 6-email series on paycheck budgeting over the next two weeks."
    />
  )
}
