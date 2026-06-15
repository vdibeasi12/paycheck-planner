export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-gray-300 mb-12">Get in touch with our team</p>
        
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-green-400 font-bold mb-2">Email</h3>
                <p className="text-gray-300">support@paycheckplanner.ai</p>
              </div>
              <div>
                <h3 className="text-green-400 font-bold mb-2">Response Time</h3>
                <p className="text-gray-300">We typically respond within 24-48 hours</p>
              </div>
              <div>
                <h3 className="text-green-400 font-bold mb-2">Support Hours</h3>
                <p className="text-gray-300">Monday - Friday, 9 AM - 5 PM EST</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Send a Message</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Name</label>
                <input 
                  type="text" 
                  className="w-full bg-[#1a233a] border border-gray-700 rounded px-4 py-2 text-white"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full bg-[#1a233a] border border-gray-700 rounded px-4 py-2 text-white"
                  placeholder="Your email"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Message</label>
                <textarea 
                  className="w-full bg-[#1a233a] border border-gray-700 rounded px-4 py-2 text-white"
                  rows={4}
                  placeholder="Your message"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded transition"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
