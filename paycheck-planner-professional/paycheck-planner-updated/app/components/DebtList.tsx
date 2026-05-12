"use client";

type Debt = {
  id: string;
  name?: string;
  balance?: number;
};

export default function DebtList({
  debts,
}: {
  debts: Debt[] | null | undefined;
}) {
  const safeDebts = Array.isArray(debts) ? debts : [];

  return (
    <div>
      {safeDebts.length === 0 ? (
        <p>No debts found</p>
      ) : (
        safeDebts.map((debt) => (
          <div key={debt.id}>
            <p>{debt.name || "Unnamed Debt"}</p>
            <p>${debt.balance || 0}</p>
          </div>
        ))
      )}
    </div>
  );
}