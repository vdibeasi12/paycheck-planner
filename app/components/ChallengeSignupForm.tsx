"use client"

import { Flag } from "lucide-react"
import EmailCaptureForm from "./EmailCaptureForm"

export default function ChallengeSignupForm() {
  return (
    <EmailCaptureForm
      idPrefix="challenge"
      endpoint="/api/challenge/subscribe"
      icon={Flag}
      heading="Start the 30-Day Challenge"
      description="One short task a day -- know where your money goes, build a paycheck budget, pay down debt, and start saving. Day 1 lands in your inbox the moment you join."
      buttonText="Start Day 1"
      successHeading="You're in -- Day 1 is on its way"
      successBody="Check your inbox now, then one short email a day for the next 30 days."
    />
  )
}
