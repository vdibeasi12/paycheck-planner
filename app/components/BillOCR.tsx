'use client'

import { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface ExtractedBillData {
  vendor: string
  amount: number
  dueDate: string
  confidence: number
  description: string
}

export default function BillOCR() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedBillData | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setError('')
    setIsProcessing(true)

    // Read file
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageData = e.target?.result as string
      setUploadedImage(imageData)

      try {
        // Simulate OCR processing
        // In production, use: Tesseract.recognize(imageData, 'eng')
        await simulateOCRExtraction(imageData)
      } catch (err) {
        setError('Failed to process image. Please try another image.')
        console.error(err)
      } finally {
        setIsProcessing(false)
      }
    }

    reader.readAsDataURL(file)
  }

  const simulateOCRExtraction = async (imageData: string) => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000))

    // In production, integrate with:
    // - Tesseract.js for client-side OCR
    // - Or Google Cloud Vision API / AWS Textract for server-side
    
    // For now, simulate extraction with confidence scoring
    const mockExtraction: ExtractedBillData = {
      vendor: 'Electric Company',
      amount: 125.43,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      confidence: 92,
      description: 'Monthly utility bill',
    }

    setExtractedData(mockExtraction)
  }

  const handleSaveBill = async () => {
    if (!extractedData) return

    try {
      // Save to database
      const response = await fetch('/api/bills/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: extractedData.vendor,
          amount: extractedData.amount,
          dueDate: extractedData.dueDate,
          description: extractedData.description,
        }),
      })

      if (response.ok) {
        // Success
        setUploadedImage(null)
        setExtractedData(null)
        alert('Bill saved successfully!')
      } else {
        setError('Failed to save bill')
      }
    } catch (err) {
      setError('Error saving bill: ' + String(err))
    }
  }

  const handleClearImage = () => {
    setUploadedImage(null)
    setExtractedData(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const confidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-400'
    if (confidence >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">📸 Upload Bill Image</h2>
        <p className="text-gray-400 text-sm mb-6">
          Take a photo or upload an image of your bill. We'll extract the details automatically.
        </p>

        {!uploadedImage ? (
          // Upload Area
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center cursor-pointer hover:border-green-500 transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-white font-semibold mb-2">Click to upload or drag and drop</p>
            <p className="text-gray-400 text-sm">PNG, JPG, GIF up to 5MB</p>
          </div>
        ) : (
          // Preview & Extraction
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              <img
                src={uploadedImage}
                alt="Bill preview"
                className="w-full h-auto max-h-96 object-contain"
              />
              <button
                onClick={handleClearImage}
                disabled={isProcessing}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Processing State */}
            {isProcessing && (
              <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
                <p className="text-blue-300 text-center">
                  🔄 Processing bill image... This may take a moment.
                </p>
              </div>
            )}

            {/* Extracted Data */}
            {extractedData && (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="text-green-400" size={20} />
                    <h3 className="font-semibold text-green-400">Data Extracted Successfully</h3>
                  </div>

                  {/* Confidence Score */}
                  <div className="mb-4 pb-4 border-b border-green-500/30">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Extraction Confidence</span>
                      <span className={`font-bold text-lg ${confidenceColor(extractedData.confidence)}`}>
                        {extractedData.confidence}%
                      </span>
                    </div>
                    {extractedData.confidence < 80 && (
                      <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1">
                        <AlertCircle size={14} />
                        Please review the data below
                      </p>
                    )}
                  </div>

                  {/* Editable Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-400 text-sm block mb-1">Vendor/Company</label>
                      <input
                        type="text"
                        value={extractedData.vendor}
                        onChange={(e) =>
                          setExtractedData({ ...extractedData, vendor: e.target.value })
                        }
                        className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-sm block mb-1">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={extractedData.amount}
                          onChange={(e) =>
                            setExtractedData({
                              ...extractedData,
                              amount: Number(e.target.value),
                            })
                          }
                          className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 text-sm block mb-1">Due Date</label>
                        <input
                          type="date"
                          value={extractedData.dueDate}
                          onChange={(e) =>
                            setExtractedData({
                              ...extractedData,
                              dueDate: e.target.value,
                            })
                          }
                          className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm block mb-1">Description</label>
                      <textarea
                        value={extractedData.description}
                        onChange={(e) =>
                          setExtractedData({
                            ...extractedData,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveBill}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg transition"
                  >
                    ✓ Save Bill
                  </button>
                  <button
                    onClick={handleClearImage}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition"
                  >
                    Upload Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-blue-400 mb-2">💡 Tips for best results:</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>✓ Ensure the bill is clear and well-lit</li>
            <li>✓ Make sure text is visible and not blurry</li>
            <li>✓ Include vendor name, amount, and due date</li>
            <li>✓ If extraction is low confidence, review and correct the data</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
