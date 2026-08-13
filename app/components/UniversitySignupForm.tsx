"use client"

import { GraduationCap } from "lucide-react"
import EmailCaptureForm from "./EmailCaptureForm"

export default function UniversitySignupForm({ source }: { source?: string }) {
  return (
    <EmailCaptureForm
      idPrefix="university"
      endpoint="/api/university/subscribe"
      icon={GraduationCap}
      heading="Get notified when it launches"
      description="Free, practical lessons on budgeting, debt payoff, and building real financial habits -- no fluff. Be the first to know when Course 1 drops."
      buttonText="Notify Me"
      successHeading="You're on the list"
      successBody="We'll email you the moment Course 1 launches."
      extraBody={{ source }}
    />
  )
}
