"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Check } from "lucide-react"
import Image from "next/image"

export default function Onboarding() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [ndaAgreed, setNdaAgreed] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    occupation: "",
    otherOccupation: "",
    placeOfWork: "",
    experience: "",
    institution: "",
    specialties: "",
    otherSpecialty: ""
  })

  const [ndaData, setNdaData] = useState({
    digitalSignature: "",
    address: ""
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login"
    }
  }, [user, authLoading])

  // Check email verification
  useEffect(() => {
    if (!authLoading && user) {
      if (!user.emailVerified) {
        window.location.href = "/login?error=email-not-verified"
        return
      }
    }
  }, [user, authLoading])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateRequiredFields = () => {
    const requiredFields = {
      firstName: "First Name",
      lastName: "Last Name",
      age: "Age",
      gender: "Gender",
      occupation: "Occupation"
    }

    const errors: Record<string, string> = {}
    let hasErrors = false

    Object.entries(requiredFields).forEach(([key, label]) => {
      if (!formData[key as keyof typeof formData]) {
        errors[key] = `${label} is required`
        hasErrors = true
      }
    })

    // Additional validation for "other" fields
    if (formData.occupation === "other" && !formData.otherOccupation) {
      errors.otherOccupation = "Please specify your occupation"
      hasErrors = true
    }

    if (formData.specialties === "other" && !formData.otherSpecialty) {
      errors.otherSpecialty = "Please specify your specialty"
      hasErrors = true
    }

    setFieldErrors(errors)
    return !hasErrors
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateRequiredFields()) {
        return
      }
      setCurrentStep(2)
    }
  }

  const handleCompleteRegistration = async () => {
    if (!ndaAgreed || !termsAgreed || !ndaData.digitalSignature || !ndaData.address || !user) {
      setError("Please agree to the NDA and Terms of Use, provide your digital signature and address to continue")
      return
    }

    setLoading(true)
    setError("")

    try {
      const { getFirebaseFirestore } = await import("@/lib/firebase")
      const { doc, updateDoc } = await import("firebase/firestore")

      const db = await getFirebaseFirestore()
      if (!db) {
        throw new Error("Firestore not initialized")
      }

      // Create user profile data
      const userProfileData = {
        ...formData,
        email: user.email,
        onboardingCompleted: true,
        ndaAgreed: true,
        digitalSignature: ndaData.digitalSignature,
        address: ndaData.address,
        updatedAt: new Date().toISOString(),
        // Add additional profile fields
        displayName: `${formData.firstName} ${formData.lastName}`,
        profile: {
          age: formData.age,
          gender: formData.gender,
          occupation: formData.occupation,
          placeOfWork: formData.placeOfWork,
          experience: formData.experience,
          institution: formData.institution,
          specialties: formData.specialties
        }
      }

      // Update user document
      await updateDoc(doc(db, "users", user.uid), userProfileData)

      // Generate and send NDA PDF
      const ndaHtml = `
        <div style="font-family: Arial, sans-serif; padding: 40px;">
          <div style="text-align: right; margin-bottom: 40px;">
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUxIiBoZWlnaHQ9IjczIiB2aWV3Qm94PSIwIDAgMjUxIDczIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik00LjA4ODg3IDE5LjAwNzhWNjcuNzM4M0g0Mi4zOTM2VjcyLjUwMjlIMC4zMzg4NjdWMTkuMDA3OEg0LjA4ODg3Wk00Ni4xNDM2IDYyLjk3MjdWNjcuNzM4M0g0Mi4zOTM2VjYyLjk3MjdINDYuMTQzNlpNMTEuNTg4OSAxOS4wMDc4VjU4LjIyMjdINDIuMzkzNlY2Mi45NzI3SDcuODM4ODdWMTkuMDA3OEgxMS41ODg5Wk00OS44OTM2IDYyLjk3MjdINDYuMTQzNlY1OC4yMjI3SDQ5Ljg5MzZWNjIuOTcyN1pNNTMuNjQzNiA1OC4yMjI3SDQ5Ljg5MzZWNTMuNDU3SDUzLjY0MzZWNTguMjIyN1pNNDYuMTQzNiA1My40NTdWNTguMjIyN0g0Mi4zOTM2VjUzLjQ1N0g0Ni4xNDM2Wk00Mi4zOTM2IDE5LjAwNzhWNTMuNDU3SDE1LjM0NjdWMTkuMDA3OEg0Mi4zOTM2Wk00OS44OTM2IDUzLjQ1N0g0Ni4xNDM2VjE0LjI4OTFIMTUuMzQ2N1Y5LjUyMzQ0SDQ5Ljg5MzZWNTMuNDU3Wk01Ny40MDE0IDUzLjQ1N0g1My42NDM2VjQuNzczNDRIMTUuMzQ2N1YwLjAwNzgxMjVINTcuNDAxNFY1My40NTdaTTE1LjM0NjcgMTkuMDA3OEgxMS41ODg5VjE0LjI4OTFIMTUuMzQ2N1YxOS4wMDc4Wk03LjgzODg3IDE5LjAwNzhINC4wODg4N1YxNC4yODkxSDcuODM4ODdWMTkuMDA3OFpNMTEuNTg4OSAxNC4yODkxSDcuODM4ODdWOS41MjM0NEgxMS41ODg5VjE0LjI4OTFaTTE1LjM0NjcgOS41MjM0NEgxMS41ODg5VjQuNzczNDRIMTUuMzQ2N1Y5LjUyMzQ0WiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzI1NDNfMzEyNzApIi8+PHBhdGggZD0iTTEzNS4yNjcgNDYuNjk1M0MxMzcuMzcgNDYuNjk1MyAxMzkuMDg2IDQ4LjM2ODggMTM5LjA4NiA1MC40NzE1QzEzOS4wODYgNTIuNTc0MSAxMzcuMzcgNTQuMzMzNSAxMzUuMjY3IDU0LjMzMzVDMTMzLjE2NSA1NC4zMzM1IDEzMS40NDggNTIuNTc0MSAxMzEuNDQ4IDUwLjQ3MTVDMTMxLjQ0OCA0OC4zNjg4IDEzMy4xNjUgNDYuNjk1MyAxMzUuMjY3IDQ2LjY5NTNaIiBmaWxsPSIjMjE0NDk4Ii8+PHBhdGggZD0iTTEyMC4xNjkgMzkuODI2NEwxMjkuMzA5IDUzLjQ3MkgxMjEuNjcxTDEwMy44MTkgNDAuNDI3MUgxMDMuNzMzVjUzLjQ3Mkg5Ny40MjVWMjEuMTE3MkgxMTUuOTY0QzEyMi4zNTggMjEuMTE3MiAxMjYuNzc4IDIzLjk0OTMgMTI2Ljc3OCAzMC44NThDMTI2Ljc3OCAzNC45Nzc0IDEyNC41MDMgMzkuMDk2OSAxMjAuMTY5IDM5LjgyNjRaTTExMy43MzMgMjYuMjY2NVYzNi4wMDczSDExNC41NDhDMTE4LjAyNCAzNi4wMDczIDEyMC40NyAzNC45Nzc0IDEyMC40NyAzMS4wMjk2QzEyMC40NyAyNy4wMzg5IDExNy45MzggMjYuMjY2NSAxMTQuNTkxIDI2LjI2NjVIMTEzLjczM1oiIGZpbGw9IiMyMTQ0OTgiLz48cGF0aCBkPSJNNzkuNjkwNCA1My40NzJWMjEuMTE3Mkg4OC43MDE3Qzk4LjA1NjMgMjEuMTE3MiAxMDQuMzIxIDI4LjExMTcgMTA0LjMyMSAzNy4zMzc1QzEwNC4zMjEgNDYuNDM0NyA5Ny44ODQ3IDUzLjQ3MiA4OC42NTg4IDUzLjQ3Mkg3OS42OTA0Wk04NS45OTgzIDI2LjYwOThWNDcuOTc5NEg4Ny4wMjgyQzk0Ljc5NTEgNDcuOTc5NCA5Ny43OTg5IDQzLjY4ODQgOTcuNzk4OSAzNy4yOTQ2Qzk3Ljc5ODkgMzAuMjU3MiA5NC4xOTQzIDI2LjYwOTggODcuMDI4MiAyNi42MDk4SDg1Ljk5ODNaIiBmaWxsPSIjMjE0NDk4Ii8+PHBhdGggZD0iTTI0NC45NTIgMzcuMjM0OUMyNDQuOTUyIDQ2Ljc2MTIgMjM4LjgxNiA1NC4zMTM1IDIyOC45NDYgNTQuMzEzNUMyMTkuMDc3IDU0LjMxMzUgMjEyLjk0IDQ2Ljc2MTIgMjEyLjk0IDM3LjIzNDlDMjEyLjk0IDI3LjYyMjkgMjE5LjI5MSAyMC4yNDIyIDIyOC45NDYgMjAuMjQyMkMyMzguNjAxIDIwLjI0MjIgMjQ0Ljk1MiAyNy42MjI5IDI0NC45NTIgMzcuMjM0OVpNMjM4LjQzIDM2Ljk3NzVDMjM4LjQzIDMxLjc0MjMgMjM0LjkxMSAyNi40NjQzIDIyOC45NDYgMjYuNDY0M0MyMjIuOTgyIDI2LjQ2NDMgMjE5LjQ2MyAzMS43NDIzIDIxOS40NjMgMzYuOTc3NUMyMTkuNDYzIDQxLjk1NTEgMjIxLjk1MiA0OC4wOTE0IDIyOC45NDYgNDguMDkxNEMyMzUuOTQxIDQ4LjA5MTQgMjM4LjQzIDQxLjk1NTEgMjM4LjQzIDM2Ljk3NzVaIiBmaWxsPSIjMjE0NDk4Ii8+PHBhdGggZD0iTTIxMC42NzcgMjYuNjAySDIwMC45MzZWMzMuNzI1MkgyMTAuMDc2VjM5LjIxNzhIMjAwLjkzNlY1My40NjQySDE5NC42MjhWMjEuMTA5NEgyMTAuNjc3VjI2LjYwMloiIGZpbGw9IiMyMTQ0OTgiLz48cGF0aCBkPSJNMTYyLjA2NSA1My40NTUzVjIwLjI0MjJIMTY2LjYxNEwxODMuNjUgNDIuODU2M0gxODMuNzM1VjIxLjEwMDRIMTkwLjA0M1Y1NC4wOTg5SDE4NS40OTVMMTY4LjQ1OSAzMS40ODQ5SDE2OC4zNzNWNTMuNDU1M0gxNjIuMDY1WiIgZmlsbD0iIzIxNDQ5OCIvPjxwYXRoIGQ9Ik0xNTcuNDgzIDIxLjEwOTRWNTMuNDY0MkgxNTEuMTc1VjIxLjEwOTRIMTU3LjQ4M1oiIGZpbGw9IiMyMTQ0OTgiLz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfMjU0M18zMTI3MCIgeDE9IjU1Ljg5MTMiIHkxPSItMC42MzI5MjUiIHgyPSIxLjc4OTciIHkyPSI3My4wNDkyIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agc3RvcC1jb2xvcj0iIzlCQjhGRiIvPjxzdG9wIG9mZnNldD0iMC40NTA5OCIgc3RvcC1jb2xvcj0iIzM3NzFGRSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzIxNDQ5OCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==" alt="DR. INFO Logo" style="width: 251px; height: 73px;" />
          </div>
          
          <h1 style="text-align: center; color: #1e40af;">Non-Disclosure Agreement</h1>
          
          <div style="margin-top: 40px;">
            <h2 style="color: #1e40af;">1. Parties</h2>
            <p>
              Disclosing Party: Synduct GmbH, Bergmannstrasse 58, 80339 Munich, Germany, represented by Managing Director Valentine Emmanuel.<br>
              Receiving Party: ${formData.firstName} ${formData.lastName} ("you").
            </p>
          </div>

          <div style="margin-top: 40px;">
            <h2 style="color: #1e40af;">2. Purpose</h2>
            <p>
              Synduct GmbH will disclose confidential information so you can evaluate and, where applicable, test its AI-enabled content-management platform for the pharmaceutical, biotechnology and medical-technology sectors.
            </p>
          </div>

          <div style="margin-top: 40px;">
            <h2 style="color: #1e40af;">3. Confidential Information</h2>
            <p>
              "Confidential Information" includes, without limitation:<br>
              • business plans, financial data, forecasts, marketing strategies;<br>
              • product or service roadmaps, customer or supplier details;<br>
              • technical data, software code, algorithms, designs, processes and trade secrets;<br>
              • any materials derived from, or that reference, the above.<br><br>
              Exclusions: information that (a) you already lawfully possessed, (b) becomes public not through your fault, (c) is received from a third party with no duty of confidence, (d) is independently developed without access to the Confidential Information, or (e) must be disclosed by law (provided you give prompt written notice).
            </p>
          </div>

          <div style="margin-top: 40px;">
            <h2 style="color: #1e40af;">4. Your Obligations</h2>
            <p>
              • Keep all Confidential Information strictly confidential and apply at least reasonable security measures.<br>
              • Share it only with staff or advisers bound by equivalent confidentiality and only as needed for the purpose above.<br>
              • Use it exclusively to evaluate or perform the potential collaboration; no other use is permitted.<br>
              • Return or securely destroy all Confidential Information (including copies and notes) at Synduct GmbH's request.
            </p>
          </div>

          <div style="margin-top: 40px;">
            <h2 style="color: #1e40af;">5. Breach & Penalties</h2>
            <p>
              Unauthorised use or disclosure triggers a liquidated penalty of €100 000, plus compensation for any additional proven loss. Synduct GmbH may also seek injunctive relief. Compliance with all applicable data-protection laws (including GDPR) is mandatory.
            </p>
          </div>

          <div style="margin-top: 40px;">
            <h2 style="color: #1e40af;">6. Term</h2>
            <p>
              This Agreement is effective for 10 years from the first disclosure; confidentiality obligations survive indefinitely.
            </p>
          </div>

          <div style="margin-top: 40px;">
            <h2 style="color: #1e40af;">7. Governing Law & Jurisdiction</h2>
            <p>
              German law governs. Exclusive venue: Munich, Germany.
            </p>
          </div>

          <div style="margin-top: 40px;">
            <h2 style="color: #1e40af;">8. Online Acceptance</h2>
            <p>
              By ticking the checkbox labelled "I agree to the NDA" inside the app, you confirm that you have read, understood and agree to be bound by this Agreement. This electronic acceptance is legally binding and equivalent to a handwritten signature.
            </p>
          </div>

          <div style="margin-top: 60px; border-top: 1px solid #ccc; padding-top: 20px;">
            <p><strong>Digital Signature:</strong> ${ndaData.digitalSignature}</p>
            <p><strong>Address:</strong> ${ndaData.address}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      `

      // Send NDA PDF via email
      const response = await fetch("/api/send-nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: `${formData.firstName} ${formData.lastName}`,
          userEmail: user.email,
          digitalSignature: ndaData.digitalSignature,
          address: ndaData.address
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to send NDA PDF")
      }

      router.push("/dashboard")
    } catch (err: any) {
      console.error("Error during onboarding:", err)
      setError(err.message || "An error occurred during onboarding")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-2">
            <Image
              src="/full-icon.svg"
              alt="DR. INFO Logo"
              width={251}
              height={73}
              className="text-white"
            />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Complete Registration</h2>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
            }`}>
              {currentStep === 1 ? '1' : <Check size={14} />}
            </div>
            <div className="w-10 h-0.5 bg-gray-300"></div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-indigo-50 shadow-lg border-2 border-indigo-300 px-8 py-5">
          {currentStep === 1 ? (
            // Step 1: Customer Information Form
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`px-3 py-2 border ${fieldErrors.firstName ? 'border-red-500' : 'border-indigo-300'} rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full`}
                  />
                  {fieldErrors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`px-3 py-2 border ${fieldErrors.lastName ? 'border-red-500' : 'border-indigo-300'} rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full`}
                  />
                  {fieldErrors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    name="age"
                    placeholder="Age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className={`px-3 py-2 border ${fieldErrors.age ? 'border-red-500' : 'border-indigo-300'} rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full`}
                  />
                  {fieldErrors.age && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.age}</p>
                  )}
                </div>
                <div>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={`px-3 py-2 border ${fieldErrors.gender ? 'border-red-500' : 'border-indigo-300'} rounded-lg text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm w-full`}
                  >
                    <option value="" disabled>Select Sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {fieldErrors.gender && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.gender}</p>
                  )}
                </div>
              </div>

              <div>
                <select
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${fieldErrors.occupation ? 'border-red-500' : 'border-indigo-300'} rounded-lg text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm`}
                >
                  <option value="" disabled>Select Occupation</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="researcher">Researcher</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="other">Other</option>
                </select>
                {fieldErrors.occupation && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.occupation}</p>
                )}
              </div>

              {formData.occupation === "other" && (
                <input
                  type="text"
                  name="otherOccupation"
                  placeholder="Please specify your occupation"
                  value={formData.otherOccupation || ""}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${fieldErrors.otherOccupation ? 'border-red-500' : 'border-indigo-300'} rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                />
              )}
              {fieldErrors.otherOccupation && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.otherOccupation}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  name="placeOfWork"
                  placeholder="Place of work (Optional)"
                  value={formData.placeOfWork}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-indigo-300 rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  name="experience"
                  placeholder="Experience (Optional)"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-indigo-300 rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <input
                type="text"
                name="institution"
                placeholder="Institution"
                value={formData.institution}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border ${fieldErrors.institution ? 'border-red-500' : 'border-indigo-300'} rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
              />
              {fieldErrors.institution && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.institution}</p>
              )}

              <select
                name="specialties"
                value={formData.specialties}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border ${fieldErrors.specialties ? 'border-red-500' : 'border-indigo-300'} rounded-lg text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm`}
              >
                <option value="" disabled>Select Specialties</option>
                <option value="allergy-immunology">Allergy & Immunology</option>
                <option value="anesthesiology">Anesthesiology</option>
                <option value="cardiology">Cardiology</option>
                <option value="critical-care">Critical Care</option>
                <option value="dermatology">Dermatology</option>
                <option value="emergency-medicine">Emergency Medicine</option>
                <option value="endocrinology">Endocrinology</option>
                <option value="family-medicine">Family Medicine</option>
                <option value="gastroenterology">Gastroenterology</option>
                <option value="geriatrics">Geriatrics</option>
                <option value="hematology">Hematology</option>
                <option value="infectious-disease">Infectious Disease</option>
                <option value="internal-medicine">Internal Medicine</option>
                <option value="microbiology">Microbiology</option>
                <option value="nephrology">Nephrology</option>
                <option value="neurology">Neurology</option>
                <option value="nuclear-medicine">Nuclear Medicine</option>
                <option value="obstetrics-gynecology">Obstetrics and Gynecology</option>
                <option value="oncology">Oncology</option>
                <option value="ophthalmology">Ophthalmology</option>
                <option value="orthopedics">Orthopedics</option>
                <option value="otolaryngology">Otolaryngology</option>
                <option value="palliative-care">Palliative Care Medicine</option>
                <option value="pathology">Pathology</option>
                <option value="pediatrics">Pediatrics</option>
                <option value="psychiatry">Psychiatry</option>
                <option value="pulmonology">Pulmonology</option>
                <option value="radiology">Radiology</option>
                <option value="reproductive-endocrinology">Reproductive Endocrinology & Infertility</option>
                <option value="rheumatology">Rheumatology</option>
                <option value="sports-medicine">Sports Medicine</option>
                <option value="surgery">Surgery</option>
                <option value="urology">Urology</option>
                <option value="other">Other</option>
              </select>
              {fieldErrors.specialties && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.specialties}</p>
              )}

              {formData.specialties === "other" && (
                <input
                  type="text"
                  name="otherSpecialty"
                  placeholder="Please specify your specialty"
                  value={formData.otherSpecialty || ""}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${fieldErrors.otherSpecialty ? 'border-red-500' : 'border-indigo-300'} rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                />
              )}
              {fieldErrors.otherSpecialty && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.otherSpecialty}</p>
              )}

              {error && <div className="bg-red-50 text-red-600 p-2 rounded-lg text-sm">{error}</div>}

              <button
                onClick={handleNext}
                className="w-full bg-indigo-200 text-indigo-700 py-2 px-4 border border-indigo-400 rounded-lg font-medium hover:bg-indigo-300 transition-colors duration-200 mt-4 text-sm"
              >
                Next
              </button>
            </div>
          ) : (
            // Step 2: NDA Agreement
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Non-Disclosure Agreement (Online)</h3>
              </div>

              <div className="text-left space-y-3">
                <div>
                  <h4 className="font-bold text-gray-800 mb-1 text-sm">1. Parties</h4>
                  <p className="text-xs text-gray-700 mb-3">
                    Disclosing Party: Synduct GmbH, Bergmannstrasse 58, 80339<br />
                    Munich, Germany, represented by Managing Director Valentine<br />
                    Emmanuel.<br />
                    Receiving Party: {formData.firstName} {formData.lastName} ("you").
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-1 text-sm">2. Purpose</h4>
                  <p className="text-xs text-gray-700 mb-3">
                    Synduct GmbH will disclose confidential information so you<br />
                    can evaluate and, where applicable, test its AI-enabled<br />
                    content-management platform for the pharmaceutical,<br />
                    biotechnology and medical-technology sectors.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-1 text-sm">3. Confidential Information</h4>
                  <p className="text-xs text-gray-700 mb-3">
                    "Confidential Information" includes, without limitation:<br />
                    • business plans, financial data, forecasts, marketing strategies;<br />
                    • product or service roadmaps, customer or supplier details;<br />
                    • technical data, software code, algorithms, designs, processes and trade secrets;<br />
                    • any materials derived from, or that reference, the above.<br /><br />
                    Exclusions: information that (a) you already lawfully possessed, (b) becomes public not through your fault, (c) is received from a third party with no duty of confidence, (d) is independently developed without access to the Confidential Information, or (e) must be disclosed by law (provided you give prompt written notice).
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-1 text-sm">4. Your Obligations</h4>
                  <p className="text-xs text-gray-700 mb-3">
                    • Keep all Confidential Information strictly confidential and apply at least reasonable security measures.<br />
                    • Share it only with staff or advisers bound by equivalent confidentiality and only as needed for the purpose above.<br />
                    • Use it exclusively to evaluate or perform the potential collaboration; no other use is permitted.<br />
                    • Return or securely destroy all Confidential Information (including copies and notes) at Synduct GmbH's request.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-1 text-sm">5. Breach & Penalties</h4>
                  <p className="text-xs text-gray-700 mb-3">
                    Unauthorised use or disclosure triggers a liquidated penalty of €100 000, plus compensation for any additional proven loss. Synduct GmbH may also seek injunctive relief. Compliance with all applicable data-protection laws (including GDPR) is mandatory.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-1 text-sm">6. Term</h4>
                  <p className="text-xs text-gray-700 mb-3">
                    This Agreement is effective for 10 years from the first disclosure; confidentiality obligations survive indefinitely.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-1 text-sm">7. Governing Law & Jurisdiction</h4>
                  <p className="text-xs text-gray-700 mb-3">
                    German law governs. Exclusive venue: Munich, Germany.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-1 text-sm">8. Online Acceptance</h4>
                  <p className="text-xs text-gray-700 mb-3">
                    By ticking the checkbox labelled "I agree to the NDA" inside the app, you confirm that you have read, understood and agree to be bound by this Agreement. This electronic acceptance is legally binding and equivalent to a handwritten signature.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="nda-agreement"
                  checked={ndaAgreed}
                  onChange={(e) => setNdaAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="nda-agreement" className="text-xs text-gray-700 cursor-pointer">
                  I have read and agree to the terms of the Non-Disclosure Agreement
                </label>
              </div>

              <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="terms-agreement"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="terms-agreement" className="text-xs text-gray-700 cursor-pointer">
                  I agree to the Terms of Use and Privacy Policy
                </label>
              </div>

              <div className="mt-4">
                <label htmlFor="digital-signature" className="block text-xs text-gray-700 mb-2">
                  Digital Signature (Type your full name)
                </label>
                <input
                  type="text"
                  id="digital-signature"
                  value={ndaData.digitalSignature}
                  onChange={(e) => setNdaData(prev => ({ ...prev, digitalSignature: e.target.value }))}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="address" className="block text-xs text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  value={ndaData.address}
                  onChange={(e) => setNdaData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter your address"
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {error && <div className="bg-red-50 text-red-600 p-2 rounded-lg text-sm">{error}</div>}

              <button
                onClick={handleCompleteRegistration}
                disabled={!ndaAgreed || !termsAgreed || !ndaData.digitalSignature || !ndaData.address || loading}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 text-sm ${
                  ndaAgreed && termsAgreed && ndaData.digitalSignature && ndaData.address && !loading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? "Completing Registration..." : "Complete Registration"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
