'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState('')

  const handleUpdate = async () => {
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      alert(error.message)
    } else {
      alert('Password updated')
      router.push('/login')
    }
  }

  return (
    <div className="p-10 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Set New Password</h1>

      <input
        type="password"
        className="w-full border p-2"
        placeholder="New password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleUpdate}
        className="w-full bg-black text-white p-2"
      >
        Update Password
      </button>
    </div>
  )
}