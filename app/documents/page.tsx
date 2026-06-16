import DocumentCapture from "@/components/DocumentCapture";

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-white">Capture documents</h1>
        <p className="mt-1 text-sm text-gray-400">
          Snap a photo of a bill or paycheck, or upload an image or PDF. Everything is
          stored privately to your account.
        </p>
        <div className="mt-6">
          <DocumentCapture />
        </div>
      </div>
    </div>
  );
}
