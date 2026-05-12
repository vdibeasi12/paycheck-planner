"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function PaycheckAllocator() {

  const [paycheck, setPaycheck] = useState("")
  const [bills, setBills] = useState<any[]>([])
  const [debts, setDebts] = useState<any[]>([])

  const totalBills = bills.reduce(
    (sum, bill) => sum + Number(bill.amount || 0),
    0
  )

  const totalDebtPayments = debts.reduce(
    (sum, debt) => sum + Number(debt.minimum_payment || 0),
    0
  )

  const remaining =
    Number(paycheck || 0) - totalBills - totalDebtPayments

  async function loadData() {

    const { data: billData } = await supabase
      .from("bills")
      .select("*")

    const { data: debtData } = await supabase
      .from("debts")
      .select("*")

    if (billData) setBills(billData)
    if (debtData) setDebts(debtData)

  }

  useEffect(() => {
    loadData()
  }, [])

  return (

    <div style={{marginTop:40}}>

      <h2>Paycheck Allocation</h2>

      <input
        placeholder="Paycheck Amount"
        value={paycheck}
        onChange={(e)=>setPaycheck(e.target.value)}
        style={{
          border:"1px solid #ccc",
          padding:8,
          marginBottom:20,
          width:200
        }}
      />

      <div>

        <div>
          Total Bills: ${totalBills}
        </div>

        <div>
          Total Debt Payments: ${totalDebtPayments}
        </div>

        <div style={{fontWeight:"bold", marginTop:10}}>
          Remaining: ${remaining}
        </div>

      </div>

    </div>

  )
}