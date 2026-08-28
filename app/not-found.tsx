import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#020617] text-white px-6 py-24">
      <div className="text-center max-w-md">
        <p className="text-green-400 font-bold text-sm tracking-widest uppercase mb-4">
          404
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Page not found</h1>
        <p className="text-gray-300 mb-10">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-green-500 hover:bg-green-600 text-black font-semibold py-2 px-6 rounded transition"
          >
            Back to home
          </Link>
          <Link
            href="/contact"
            className="border border-gray-700 hover:bg-[#1a233a] text-white font-semibold py-2 px-6 rounded transition"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  )
}