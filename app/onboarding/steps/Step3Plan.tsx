export default function Step3Plan({ next }: { next: () => void }) {
  return (
    <div className="max-w-4xl">

      <h1 className="text-3xl font-bold text-center mb-10">
        Choose Your Plan
      </h1>

      <div className="grid md:grid-cols-3 gap-6">

        {/* FREE */}
        <div className="border border-white/10 p-6 rounded">
          <h2 className="text-xl mb-2">Free</h2>
          <p className="text-2xl mb-4">$0</p>
          <ul className="text-sm space-y-2">
            <li>✔ Up to 3 debts</li>
            <li>✔ Basic dashboard</li>
            <li>✖ Charts</li>
            <li>✖ AI insights</li>
          </ul>
        </div>

        {/* STARTER */}
        <div className="border border-white/10 p-6 rounded">
          <h2 className="text-xl mb-2">Starter</h2>
          <p className="text-2xl mb-4">$3/mo</p>
          <ul className="text-sm space-y-2">
            <li>✔ Up to 10 debts</li>
            <li>✔ Charts</li>
            <li>✔ Snowball</li>
            <li>✖ AI insights</li>
          </ul>
        </div>

        {/* PREMIUM */}
        <div className="border border-green-500 p-6 rounded">
          <h2 className="text-xl mb-2">Premium</h2>
          <p className="text-2xl mb-4">$6/mo</p>
          <ul className="text-sm space-y-2">
            <li>✔ Unlimited debts</li>
            <li>✔ Charts</li>
            <li>✔ AI insights</li>
            <li>✔ Advanced analytics</li>
          </ul>
        </div>

      </div>

      <div className="text-center mt-8">
        <button
          onClick={next}
          className="bg-green-500 px-6 py-3 rounded"
        >
          Continue
        </button>
      </div>

    </div>
  )
}