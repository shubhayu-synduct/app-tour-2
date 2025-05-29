'use client'

import dynamic from "next/dynamic"

const FirebaseTest = dynamic(() => import("@/components/firebase-test-client").then((mod) => mod.FirebaseTest), {
  ssr: false,
})

export function FirebaseTestWrapper() {
  return <FirebaseTest />
} 