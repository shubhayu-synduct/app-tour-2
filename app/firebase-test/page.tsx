import { FirebaseAuthTest } from "@/components/firebase-auth-test"

export default function FirebaseTestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-8">Firebase Test Page</h1>
      
      <div className="w-full max-w-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Client-Side Firebase Test</h2>
        <FirebaseAuthTest />
      </div>
      
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Server-Side Firebase Admin SDK Test</h2>
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <p className="mb-4">Click the button below to test the Firebase Admin SDK:</p>
          <form action="/api/firebase-test" method="get">
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Test Firebase Admin SDK
            </button>
          </form>
        </div>
      </div>
    </main>
  )
} 