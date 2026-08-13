"use client"

import { Mail } from "lucide-react"
import EmailCaptureForm from "./EmailCaptureForm"

export default function BlogSubscribeForm() {
  return (
    <EmailCaptureForm
      idPrefix="blog"
      endpoint="/api/blog/subscribe"
      icon={Mail}
      heading="Get new posts by email"
      description="A quick note whenever a new Financial Hub guide publishes. No spam, unsubscribe anytime."
      buttonText="Subscribe"
      successHeading="You're subscribed"
      successBody="We'll email you when a new Financial Hub post goes up."
      extraBody={{ source: "public_blog" }}
    />
  )
}
