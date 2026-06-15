'use client'

import { useState } from 'react'
import { Shield, Copy, Check } from 'lucide-react'

interface TwoFactorAuthProps {
  userId: string
  onSetupComplete?: (backupCodes: string[]) => void
}

export default function TwoFactorAuth({ userId, onSetupComplete }: TwoFactorAuthProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup')
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Initiate 2FA setup
  const handleSetupClick = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Setup failed')

      setSecret(data.secret)
      setQrCode(data.qrCode)
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Verify the 2FA code
  const handleVerify = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          secret,
          token: verificationCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Verification failed')

      setBackupCodes(data.backupCodes)
      setStep('complete')
      onSetupComplete?.(data.backupCodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Step: Setup */}
      {step === 'setup' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-green-500" size={24} />
            <h2 className="text-2xl font-bold">Enable 2FA Security</h2>
          </div>
          
          <p className="text-gray-300">
            Two-factor authentication adds an extra layer of security to your account. You'll need an authenticator app like Google Authenticator or Authy.
          </p>

          <button
            onClick={handleSetupClick}
            disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg disabled:opacity-50 transition"
          >
            {isLoading ? 'Setting up...' : 'Get Started'}
          </button>

          {error && <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded">{error}</div>}
        </div>
      )}

      {/* Step: Verify */}
      {step === 'verify' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Scan QR Code</h2>

          {qrCode && (
            <div className="bg-white p-4 rounded-lg w-64 mx-auto">
              <img src={qrCode} alt="2FA QR Code" className="w-full" />
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500 p-3 rounded text-sm text-blue-300">
            <p>Can't scan? Enter this code manually:</p>
            <code className="font-mono bg-black p-2 rounded mt-2 block text-center break-all">{secret}</code>
          </div>

          <p className="text-gray-300 text-sm">
            Enter the 6-digit code from your authenticator app:
          </p>

          <input
            type="text"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full bg-[#0f172a] border border-gray-700 rounded px-4 py-2 text-center text-2xl tracking-widest text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />

          <button
            onClick={handleVerify}
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg disabled:opacity-50 transition"
          >
            {isLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
          </button>

          {error && <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded">{error}</div>}
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500 p-4 rounded">
            <h2 className="text-2xl font-bold text-green-400 mb-2">✓ 2FA Enabled!</h2>
            <p className="text-gray-300">Your account is now protected with two-factor authentication.</p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500 p-4 rounded">
            <h3 className="font-bold text-yellow-400 mb-2">⚠️ Save Backup Codes</h3>
            <p className="text-sm text-gray-300 mb-3">
              If you lose access to your authenticator, use these codes to regain access. Keep them safe!
            </p>

            <div className="bg-black p-3 rounded space-y-2 max-h-48 overflow-y-auto mb-3">
              {backupCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-2 bg-[#0f172a] rounded text-sm"
                >
                  <code className="font-mono">{code}</code>
                  <button
                    onClick={() => copyToClipboard(code)}
                    className="text-gray-500 hover:text-green-400 transition"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => copyToClipboard(backupCodes.join('\n'))}
              className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg text-sm transition"
            >
              Copy All Codes
            </button>
          </div>

          <button
            onClick={() => setStep('setup')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
