export default function Step2Accounts({ next }: { next: () => void }) {
  return (
    <div className="max-w-xl text-center">

      <h1 className="text-3xl font-bold mb-6">
        What accounts do you want to track?
      </h1>

      <div className="grid gap-4 mb-8">
        <button className="p-4 rounded bg-white/10 hover:bg-white/20">Checking</button>
        <button className="p-4 rounded bg-white/10 hover:bg-white/20">Credit Cards</button>
        <button className="p-4 rounded bg-white/10 hover:bg-white/20">Loans / Debt</button>
      </div>

      <button
        onClick={next}
        className="bg-green-500 px-6 py-3 rounded"
      >
        Continue
      </button>
    </div>
  )
}