import Link from "next/link";

export default function DeleteAccountInfoPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-2">Delete Your Account</h1>
        <p className="text-gray-500 text-sm mb-8">
          How to request deletion of your Paycheck Planner account and data
        </p>

        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <p>
              Paycheck Planner (operated by DiBeasi Global Investments LLC) lets you
              permanently delete your account and all associated data at any time,
              directly within the app. This page explains how, and exactly what is
              deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">How to delete your account</h2>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>Log in to Paycheck Planner (web or mobile app).</li>
              <li>Go to the <strong>Account</strong> page.</li>
              <li>Scroll to the <strong>Delete account</strong> section.</li>
              <li>Type your account email address exactly to confirm.</li>
              <li>
                Select <strong>Permanently delete</strong>. Your account is deleted
                immediately -- there is no waiting period and no way to undo this.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">What is deleted</h2>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Your profile, login credentials, and MFA enrollment</li>
              <li>Income, bills, debts, goals, and payoff plan history</li>
              <li>Uploaded documents and notification settings</li>
              <li>
                Any connected bank accounts: access is revoked directly with Plaid
                before your data is removed, so the connection is fully severed, not
                just hidden
              </li>
              <li>Your Paycheck Planner login itself, which also signs you out everywhere</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">What may be retained</h2>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                Billing records that Stripe (our payment processor) or Apple/Google
                (for in-app purchases) are legally required to retain for tax,
                accounting, and fraud-prevention purposes, independent of Paycheck
                Planner
              </li>
              <li>
                Server logs and backups containing minimal technical data, which are
                retained for a limited period under our{" "}
                <Link href="/privacy" className="text-blue-400 underline">
                  Privacy Policy
                </Link>{" "}
                before automatic expiration
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Can't log in?</h2>
            <p>
              If you can no longer access your account (for example, you lost your
              authenticator device), contact{" "}
              <a href="mailto:support@paycheckplanner.ai" className="text-blue-400 underline">
                support@paycheckplanner.ai
              </a>{" "}
              from the email address on your account and we will verify your identity
              and process the deletion manually.
            </p>
          </section>

          <section>
            <p className="text-gray-500">
              See our{" "}
              <Link href="/privacy" className="text-blue-400 underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="text-blue-400 underline">
                Terms of Service
              </Link>{" "}
              for more detail on how we handle data.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}