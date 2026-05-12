"use client"

import { useState } from "react"
import Step1Goals from "./steps/Step1Goals"
import Step2Accounts from "./steps/Step2Accounts"
import Step3Plan from "./steps/Step3Plan"
import Step4Auth from "./steps/Step4Auth"

export default function Onboarding() {
  const [step, setStep] = useState(1)

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">

      {step === 1 && <Step1Goals next={() => setStep(2)} />}
      {step === 2 && <Step2Accounts next={() => setStep(3)} />}
      {step === 3 && <Step3Plan next={() => setStep(4)} />}
      {step === 4 && <Step4Auth />}

    </div>
  )
}