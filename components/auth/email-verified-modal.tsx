// "use client"

// import { useRouter } from "next/navigation"
// import Image from "next/image"
// import { useAuth } from "@/hooks/use-auth"
// import { useState } from "react"

// interface EmailVerifiedModalProps {
//   isOpen: boolean
//   onClose: () => void
// }

// export function EmailVerifiedModal({ isOpen, onClose }: EmailVerifiedModalProps) {
//   const router = useRouter()
//   const { user } = useAuth()
//   const [isRedirecting, setIsRedirecting] = useState(false)

//   console.log("EmailVerifiedModal render - isOpen:", isOpen)

//   if (!isOpen) return null

//   const handleContinue = async () => {
//     if (!user) {
//       // If no user, redirect to login
//       onClose()
//       router.push("/login")
//       return
//     }

//     setIsRedirecting(true)
    
//     try {
//       // Check user's onboarding status
//       const { getFirebaseFirestore } = await import("@/lib/firebase")
//       const { doc, getDoc } = await import("firebase/firestore")
      
//       const db = await getFirebaseFirestore()
//       if (!db) {
//         console.error("Firestore not available")
//         onClose()
//         router.push("/dashboard")
//         return
//       }
      
//       console.log("Checking onboarding status for user:", user.uid)
//       const userDoc = await getDoc(doc(db, "users", user.uid))
      
//       if (userDoc.exists()) {
//         const userData = userDoc.data()
//         console.log("User document found:", userData)
//         if (userData?.onboardingCompleted) {
//           console.log("User onboarding completed, redirecting to dashboard")
//           onClose()
//           router.push('/dashboard')
//         } else {
//           console.log("User onboarding not completed, redirecting to onboarding")
//           onClose()
//           router.push('/onboarding')
//         }
//       } else {
//         console.log("User document does not exist, creating new user and redirecting to onboarding")
        
//         // Create user document for new users
//         const { setDoc } = await import("firebase/firestore")
//         await setDoc(doc(db, "users", user.uid), {
//           email: user.email,
//           displayName: user.displayName,
//           emailVerified: user.emailVerified,
//           onboardingCompleted: false,
//           createdAt: new Date().toISOString(),
//           updatedAt: new Date().toISOString()
//         })
        
//         onClose()
//         router.push('/onboarding')
//       }
//     } catch (error) {
//       console.error("Error checking user onboarding status:", error)
//       // Default to onboarding on error for new email verification
//       onClose()
//       router.push('/onboarding')
//     }
//   }

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//       <div className="bg-[#F4F7FF] rounded-xl shadow-lg border-2 border-[#3771FE80] p-8 max-w-md w-full relative">
//         <div className="text-center flex flex-col items-center">
//           <Image 
//             src="/login-logo.svg" 
//             alt="DR. INFO Logo" 
//             width={200} 
//             height={57} 
//             className="mx-auto mb-4" 
//           />
          
//           <div className="flex items-center justify-center mx-auto mb-4">
//             <Image
//               src="/password-success.svg"
//               alt="Success"
//               width={64}
//               height={64}
//             />
//           </div>
          
//           <h3 className="text-xl font-bold text-gray-900 mb-2 font-['DM_Sans']">
//             Email Verified Successfully!
//           </h3>
          
//           <p className="text-gray-600 mb-2 font-['DM_Sans']">
//             Your email has been successfully verified.
//           </p>
          
//           <p className="text-gray-600 mb-6 font-['DM_Sans']">
//             You can now access all features of your account.
//           </p>
          
//           <button
//             onClick={handleContinue}
//             disabled={isRedirecting}
//             className="w-full bg-[#C6D7FF]/50 text-[#3771FE] border border-[#3771FE]/50 py-3 px-4 rounded-[10px] font-medium font-['DM_Sans'] transition duration-200 hover:bg-[#C6D7FF] disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {isRedirecting ? "Loading..." : "Continue to Onboarding"}
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// } 