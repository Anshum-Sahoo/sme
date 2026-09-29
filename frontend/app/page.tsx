// Landing / role selection page
'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">SME Trade Finance Platform</h1>
        <p className="text-gray-600 mb-12">Select your role to continue</p>
        
        <div className="flex gap-6">
          <Link 
            href="/bank/dashboard"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Bank Login
          </Link>
          <Link 
            href="/sme/dashboard"
            className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            SME Login
          </Link>
        </div>
      </div>
    </main>
  );
}
