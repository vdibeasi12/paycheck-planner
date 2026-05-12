export default function Step1Goals({ next }: { next: () => void }) {
  return (
    <div className="max-w-xl text-center">

      <h1 className="text-3xl font-bold mb-6">
        What do you want to improve?
      </h1>

      <div className="grid gap-4 mb-8">
        <button className="p-4 rounded bg-white/10 hover:bg-white/20">Pay off debt faster</button>
        <button className="p-4 rounded bg-white/10 hover:bg-white/20">Track spending</button>
        <button className="p-4 rounded bg-white/10 hover:bg-white/20">Build a budget</button>
        <button className="p-4 rounded bg-white/10 hover:bg-white/20">Increase savings</button>
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