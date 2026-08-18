import type { Metadata } from "next"
import MoneyScoreQuizClient from "./quiz-client"

export const metadata: Metadata = {
  title: "The Money Quiz -- Free 2-Minute Quiz",
  description:
    "Answer 10 quick questions about your budgeting, savings, debt, and spending. Get an instant score out of 100 and see exactly where to focus first.",
  alternates: {
    canonical: "/money-score",
  },
  openGraph: {
    title: "The Money Quiz",
    description:
      "Answer 10 quick questions and get an instant score out of 100, plus a personalized plan to improve it.",
    url: "https://paycheckplanner.ai/money-score",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "The Money Quiz",
    description:
      "Answer 10 quick questions and get an instant score out of 100, plus a personalized plan to improve it.",
  },
}

export default function MoneyScorePage() {
  return <MoneyScoreQuizClient />
}
