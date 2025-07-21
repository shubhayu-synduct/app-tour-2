"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Check } from "lucide-react"
import Image from "next/image"
import { logger } from "@/lib/logger"

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
    yearOfBirth: "",
    gender: "",
    occupation: "",
    otherOccupation: "",
    placeOfWork: "",
    otherPlaceOfWork: "",
    experience: "",
    institution: "",
    specialties: [] as string[],
    otherSpecialty: "",
    address: "",
    country: ""
  })

  const [ndaData, setNdaData] = useState({
    digitalSignature: "",
    address: ""
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // For scroll indicator
  const ndaScrollRef = useRef<HTMLDivElement>(null)
  const [ndaAtBottom, setNdaAtBottom] = useState(false)

  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  const [showSpecialtiesDropdown, setShowSpecialtiesDropdown] = useState(false)
  const specialtiesRef = useRef<HTMLDivElement>(null)

  const handleNdaScroll = () => {
    const el = ndaScrollRef.current
    if (!el) return
    setNdaAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 2)
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login"
    }
  }, [user, authLoading])

  // Check email verification - be lenient for OAuth providers
  useEffect(() => {
    if (!authLoading && user) {
      // Check if user signed in via OAuth providers (they should be trusted)
      const isOAuthUser = user.providerData.some(provider => 
        provider.providerId === 'google.com' || 
        provider.providerId === 'microsoft.com'
      )
      
      logger.debug("Email verification status:", { 
        emailVerified: user.emailVerified, 
        isOAuthUser,
        providers: user.providerData.map(p => p.providerId)
      })
      
      // Note: We no longer block access for unverified emails
      // Instead, we'll show a reminder within the onboarding flow
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
      occupation: "Occupation",
      experience: "Experience",
      placeOfWork: "Place of Work",
      country: "Country",
      specialties: "Specialties"
    }

    const errors: Record<string, string> = {}
    let hasErrors = false

    Object.entries(requiredFields).forEach(([key, label]) => {
      if (!formData[key as keyof typeof formData]) {
        errors[key] = `${label} is required`
        hasErrors = true
      }
    })

    // Age validation: only if year of birth is provided
    if (formData.yearOfBirth) {
      const dob = new Date(formData.yearOfBirth)
      const today = new Date()
      const age = today.getFullYear() - dob.getFullYear()
      const m = today.getMonth() - dob.getMonth()
      const d = today.getDate() - dob.getDate()
      let is18 = age > 18 || (age === 18 && (m > 0 || (m === 0 && d >= 0)))
      if (!is18) {
        errors.yearOfBirth = "You must be at least 18 years old to register."
        hasErrors = true
      }
    }

    // Additional validation for "other" fields
    if (formData.occupation === "other" && !formData.otherOccupation) {
      errors.otherOccupation = "Please specify your occupation"
      hasErrors = true
    }

    if (formData.specialties.includes("other") && !formData.otherSpecialty) {
      errors.otherSpecialty = "Please specify your specialty"
      hasErrors = true
    }

    if (!formData.specialties.length) {
      errors.specialties = "Please select at least one specialty"
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
        email: user.email,
        onboardingCompleted: true,
        ndaAgreed: true,
        digitalSignature: ndaData.digitalSignature,
        address: ndaData.address,
        updatedAt: new Date().toISOString(),
        // Add additional profile fields
        displayName: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        country: formData.country,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          country: formData.country,
          email: user.email,
          address: formData.address,
          yearOfBirth: formData.yearOfBirth,
          gender: formData.gender,
          occupation: formData.occupation === "other" ? formData.otherOccupation : formData.occupation,
          placeOfWork: formData.placeOfWork === "other" ? formData.otherPlaceOfWork : formData.placeOfWork,
          experience: formData.experience,
          institution: formData.institution,
          specialties: formData.specialties.map(s => s === "other" ? formData.otherSpecialty : s),
          otherOccupation: formData.otherOccupation,
          otherPlaceOfWork: formData.otherPlaceOfWork,
          otherSpecialty: formData.otherSpecialty,
        }
      }

      // Update user document
      await updateDoc(doc(db, "users", user.uid), userProfileData)

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

      setRegistrationSuccess(true)
    } catch (err: any) {
      logger.error("Error during onboarding:", err)
      setError(err.message || "An error occurred during onboarding")
    } finally {
      setLoading(false)
    }
  }

  // Add global styles for placeholder font size
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `input::placeholder, select::placeholder { font-size: 11px !important; }`;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (specialtiesRef.current && event.target instanceof Node && !specialtiesRef.current.contains(event.target)) {
        setShowSpecialtiesDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const specialtiesOptions = [
    { value: "anesthesiology", label: "Anesthesiology" },
    { value: "allergy-immunology", label: "Allergy & Immunology" },
    { value: "cardiology", label: "Cardiology" },
    { value: "critical-care", label: "Critical Care" },
    { value: "dermatology", label: "Dermatology" },
    { value: "emergency-medicine", label: "Emergency Medicine" },
    { value: "endocrinology", label: "Endocrinology" },
    { value: "family-medicine", label: "Family Medicine" },
    { value: "gastroenterology", label: "Gastroenterology" },
    { value: "geriatrics", label: "Geriatrics" },
    { value: "hematology", label: "Hematology" },
    { value: "infectious-disease", label: "Infectious Disease" },
    { value: "internal-medicine", label: "Internal Medicine" },
    { value: "microbiology", label: "Microbiology" },
    { value: "nephrology", label: "Nephrology" },
    { value: "neurology", label: "Neurology" },
    { value: "nuclear-medicine", label: "Nuclear Medicine" },
    { value: "obstetrics-gynecology", label: "Obstetrics and Gynecology" },
    { value: "oncology", label: "Oncology" },
    { value: "ophthalmology", label: "Ophthalmology" },
    { value: "orthopedics", label: "Orthopedics" },
    { value: "otolaryngology", label: "Otolaryngology" },
    { value: "palliative-care", label: "Palliative Care Medicine" },
    { value: "pathology", label: "Pathology" },
    { value: "pediatrics", label: "Pediatrics" },
    { value: "psychiatry", label: "Psychiatry" },
    { value: "pulmonology", label: "Pulmonology" },
    { value: "radiology", label: "Radiology" },
    { value: "reproductive-endocrinology", label: "Reproductive Endocrinology & Infertility" },
    { value: "rheumatology", label: "Rheumatology" },
    { value: "sports-medicine", label: "Sports Medicine" },
    { value: "surgery", label: "Surgery" },
    { value: "urology", label: "Urology" },
    { value: "other", label: "Other" },
  ];

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

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-4 ">
            <div className="flex items-center justify-center mb-2">
              <Image
                src="/full-icon.svg"
                alt="DR. INFO Logo"
                width={200}
                height={57}
                className="text-white"
              />
            </div>
            <h2 className="font-semibold text-[#223258] mt-6 mb-6 text-[20px] sm:text-[20px] font-dm-sans">
              Complete Registration
            </h2>
            {/* Step Indicator with both steps checked */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center">
                <div className="flex items-center justify-center rounded-full font-medium transition-all duration-200 border border-[#3771FE]/50 font-dm-sans bg-[#3771FE] text-white w-8 h-8 text-base">
                  <Check size={20} strokeWidth={3} className="text-white" />
                </div>
                <div className="h-0.5 w-10 bg-[#3771FE]" />
                <div className="flex items-center justify-center rounded-full font-medium transition-all duration-200 border border-[#3771FE]/50 font-dm-sans bg-[#3771FE] text-white w-8 h-8 text-base">
                  <Check size={20} strokeWidth={3} className="text-white" />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#F4F7FF] shadow-lg border border-[#3771FE]/50 px-8 py-8 rounded-[5px] text-center">
            <div className="flex flex-col items-center mb-4">
              <Image
                src="/password-success.svg"
                alt="Success"
                width={40}
                height={40}
                className="mb-2"
              />
              <h3 className="text-xl font-semibold text-[#223258] mb-2" style={{ fontFamily: 'DM Sans', fontSize: 20, fontWeight: 550 }}>
                NDA Signed Successfully!
              </h3>
              <p className="text-[#223258] mb-4" style={{ fontFamily: 'DM Sans', fontWeight: 400 }}>
                A signed copy of your NDA will be sent soon to your registered email address. Please check your inbox for the confirmation.
              </p>
            </div>
            <button
              className="w-full bg-[#C6D7FF]/50 text-[#3771FE] py-2 px-4 border border-[#3771FE]/50 rounded-[5px] font-dm-sans font-medium hover:bg-[#C6D7FF]/70 transition-colors duration-200"
              style={{ fontFamily: 'DM Sans', fontSize: 14 }}
              onClick={() => router.push('/dashboard')}
            >
              Let's Get Started...
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 pb-4 sm:pb-8">
      <div className="w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[600px]">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-2 pt-6 sm:pt-8 md:pt-10 mt-6 sm:mt-8 md:mt-10">
            <Image
              src="/full-icon.svg"
              alt="DR. INFO Logo"
              width={150}
              height={43}
              className="text-white sm:w-[180px] md:w-[200px]"
            />
          </div>
          <h2 className="font-semibold text-[#223258] mt-4 sm:mt-6 mb-4 sm:mb-6 text-[24px] sm:text-[28px] font-dm-sans">
            Complete Registration
          </h2>
          
          {/* Email Verification Reminder
          {user && !user.emailVerified && !user.providerData.some(provider => 
            provider.providerId === 'google.com' || provider.providerId === 'microsoft.com'
          ) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 sm:mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Email Verification Pending
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Please check your email ({user.email}) and verify your account. You can complete onboarding now, but some features may be limited until verified.
                  </p>
                </div>
              </div>
            </div>
          )} */}
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            {/* Step 1 */}
            <div className={`flex items-center`}>
              <div
                className={`flex items-center justify-center rounded-full font-medium transition-all duration-200 border border-[#3771FE]/50 font-dm-sans
                  ${currentStep === 1 ? 'bg-[#4784FD] text-white w-9 h-9 sm:w-11 sm:h-11 text-base sm:text-lg' : currentStep === 2 ? 'bg-[#3771FE] text-white w-7 h-7 sm:w-8 sm:h-8 text-sm sm:text-base' : 'bg-[#F6F9FF] text-[#3771FE] w-7 h-7 sm:w-8 sm:h-8 text-sm sm:text-base'}
                `}
              >
                {currentStep === 1 ? '1' : currentStep === 2 ? <Check size={18} strokeWidth={3} className="text-white" /> : '1'}
              </div>
              {/* Connecting line */}
              <div className="h-0.5 w-8 sm:w-10 bg-[#3771FE]" />
              {/* Step 2 */}
              <div
                className={`flex items-center justify-center rounded-full font-medium transition-all duration-200 border border-[#3771FE]/50 font-dm-sans
                  ${currentStep === 2 ? 'bg-[#4784FD] text-white w-9 h-9 sm:w-11 sm:h-11 text-base sm:text-lg' : 'bg-[#F6F9FF] text-[#3771FE] w-7 h-7 sm:w-8 sm:h-8 text-sm sm:text-base'}
                `}
              >
                2
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-[#F4F7FF] border border-[#3771FE]/50 px-4 sm:px-6 md:px-8 py-4 sm:py-5 rounded-[5px]">
          {currentStep === 1 ? (
            // Step 1: Customer Information Form
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`px-3 py-2 sm:py-2.5 border ${fieldErrors.firstName ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full bg-white`}
                    style={{ fontSize: 14 }}
                  />
                  {fieldErrors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`px-3 py-2 sm:py-2.5 border ${fieldErrors.lastName ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full bg-white`}
                    style={{ fontSize: 14 }}
                  />
                  {fieldErrors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Date of Birth</label>
                  <input
                    type="date"
                    name="yearOfBirth"
                    placeholder="Year of Birth"
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    value={formData.yearOfBirth}
                    onChange={handleInputChange}
                    className={`px-3 py-2 sm:py-2.5 border ${fieldErrors.yearOfBirth ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full bg-white ${!formData.yearOfBirth ? 'text-gray-400' : 'text-[#223258]'}`}
                    style={{ fontSize: formData.yearOfBirth ? 14 : 11 }}
                  />
                  {fieldErrors.yearOfBirth && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.yearOfBirth}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Sex</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={`px-3 py-2 sm:py-2.5 border ${fieldErrors.gender ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm w-full ${!formData.gender ? 'text-gray-400' : 'text-[#223258]'}`}
                    style={{ fontSize: formData.gender ? 14 : 11 }}
                  >
                    <option value="" disabled style={{ color: '#9ca3af' }}>Select Sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {fieldErrors.gender && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.gender}</p>
                  )}
                </div>
              </div>

              {/* Profession and Years of Experience in one row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Profession</label>
                  <select
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.occupation ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm ${!formData.occupation ? 'text-gray-400' : 'text-[#223258]'}`}
                    style={{ fontSize: formData.occupation ? 14 : 11 }}
                  >
                    <option value="" disabled style={{ color: '#9ca3af' }}>Select Profession</option>
                    <option value="physician">Physician</option>
                    <option value="fellow">Fellow</option>
                    <option value="consultant">Consultant</option>
                    <option value="intern-resident">Intern/Resident</option>
                    <option value="student">Student</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="advanced-practice-nurse">Advanced Practice Nurse</option>
                    <option value="dentist">Dentist</option>
                    <option value="medical-librarian">Medical Librarian</option>
                    <option value="other">Other</option>
                  </select>
                  {fieldErrors.occupation && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.occupation}</p>
                  )}
                  {formData.occupation === "other" && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Specify Profession</label>
                      <input
                        type="text"
                        name="otherOccupation"
                        placeholder="Please specify your profession"
                        value={formData.otherOccupation || ""}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.otherOccupation ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white`}
                        style={{ fontSize: 14 }}
                      />
                      {fieldErrors.otherOccupation && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.otherOccupation}</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Years of Experience</label>
                  <select
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.experience ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm ${!formData.experience ? 'text-gray-400' : 'text-[#223258]'}`}
                    style={{ fontSize: formData.experience ? 14 : 11 }}
                  >
                    <option value="" disabled style={{ color: '#9ca3af' }}>Select Years of Experience</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-7">3-7 years</option>
                    <option value="7-10">7-10 years</option>
                    <option value="10-15">10-15 years</option>
                    <option value="15+">+15 years</option>
                  </select>
                  {fieldErrors.experience && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.experience}</p>
                  )}
                </div>
              </div>

              {/* Place of Work and Name of your Institution in one row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Place of Work</label>
                  <select
                    name="placeOfWork"
                    value={formData.placeOfWork}
                    onChange={e => {
                      setFormData(prev => ({
                        ...prev,
                        placeOfWork: e.target.value,
                        ...(e.target.value !== "other" ? { otherPlaceOfWork: "" } : {})
                      }));
                    }}
                    className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.placeOfWork ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm ${!formData.placeOfWork ? 'text-gray-400' : 'text-[#223258]'}`}
                    style={{ fontSize: formData.placeOfWork ? 14 : 11 }}
                  >
                    <option value="" disabled style={{ color: '#9ca3af' }}>Select Place of Work</option>
                    <option value="hospital-clinic">Hospital/Clinic</option>
                    <option value="outpatient-clinic">Outpatient Clinic</option>
                    <option value="private-practice">Private Practice</option>
                    <option value="university">University</option>
                    <option value="other">Other</option>
                  </select>
                  {formData.placeOfWork === "other" && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Specify Place of Work</label>
                      <input
                        type="text"
                        name="otherPlaceOfWork"
                        placeholder="Please specify your place of work"
                        value={formData.otherPlaceOfWork || ""}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.otherPlaceOfWork ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white`}
                        style={{ fontSize: 14 }}
                      />
                      {fieldErrors.otherPlaceOfWork && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.otherPlaceOfWork}</p>
                      )}
                    </div>
                  )}
                  {fieldErrors.placeOfWork && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.placeOfWork}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Institution</label>
                  <input
                    type="text"
                    name="institution"
                    placeholder="Name of your Institution"
                    value={formData.institution}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.institution ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white`}
                    style={{ fontSize: 14 }}
                  />
                  {fieldErrors.institution && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.institution}</p>
                  )}
                </div>
              </div>

              {/* Add Specialties field before Address */}
              <div>
                <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Specialties</label>
                <div className="relative">
                  <div
                    className={`w-full min-h-[40px] px-2 py-1 border ${fieldErrors.specialties ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white flex flex-wrap items-center gap-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent`}
                    tabIndex={0}
                    onClick={() => setShowSpecialtiesDropdown(true)}
                    style={{ cursor: 'text', position: 'relative' }}
                  >
                    {formData.specialties.length === 0 && (
                      <span className="text-gray-400 text-sm select-none" style={{ fontSize: 11 }}>Select Specialties</span>
                    )}
                    {formData.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-[#C6D7FF]/50 text-[#223258] border border-[#3771FE]/50 mr-1 mt-1"
                      >
                        {specialty === "other" ? "Other" : specialty.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setFormData(prev => ({
                              ...prev,
                              specialties: prev.specialties.filter(s => s !== specialty)
                            }));
                          }}
                          className="ml-1 text-[#3771FE] hover:text-[#223258]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="flex-1 outline-none border-none bg-transparent text-sm min-w-[40px]"
                      style={{ fontSize: 14, padding: 0, margin: 0, minWidth: 0 }}
                      onFocus={() => setShowSpecialtiesDropdown(true)}
                      readOnly
                    />
                  </div>
                  {showSpecialtiesDropdown && (
                    <div className="absolute z-10 left-0 right-0 bg-white border border-[#3771FE]/50 rounded-b-[5px] shadow-lg max-h-48 overflow-y-auto mt-1">
                      {specialtiesOptions.filter(opt => !formData.specialties.includes(opt.value)).map(opt => (
                        <div
                          key={opt.value}
                          className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer text-sm text-[#223258]"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              specialties: [...prev.specialties, opt.value]
                            }));
                            setShowSpecialtiesDropdown(false);
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {fieldErrors.specialties && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.specialties}</p>
                )}
                {formData.specialties.includes("other") && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Specify Other Specialty</label>
                    <input
                      type="text"
                      name="otherSpecialty"
                      placeholder="Please specify your specialty"
                      value={formData.otherSpecialty || ""}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.otherSpecialty ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white`}
                      style={{ fontSize: 14 }}
                    />
                    {fieldErrors.otherSpecialty && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.otherSpecialty}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Address (Street, City, Postal Code)</label>
                <input
                  type="text"
                  name="address"
                  placeholder="Address (Street, City, Postal Code)"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.address ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white`}
                  style={{ fontSize: 14 }}
                />
                {fieldErrors.address && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>Country</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 sm:py-2.5 border ${fieldErrors.country ? 'border-red-500' : 'border-[#3771FE]/50'} rounded-[5px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm ${!formData.country ? 'text-gray-400' : 'text-[#223258]'}`}
                  style={{ fontSize: formData.country ? 14 : 11 }}
                >
                  <option value="" disabled style={{ color: '#9ca3af' }}>Select Country</option>
                  <option value="afghanistan">Afghanistan</option>
                  <option value="albania">Albania</option>
                  <option value="algeria">Algeria</option>
                  <option value="andorra">Andorra</option>
                  <option value="angola">Angola</option>
                  <option value="antigua-and-barbuda">Antigua and Barbuda</option>
                  <option value="argentina">Argentina</option>
                  <option value="armenia">Armenia</option>
                  <option value="australia">Australia</option>
                  <option value="austria">Austria</option>
                  <option value="azerbaijan">Azerbaijan</option>
                  <option value="bahamas">Bahamas</option>
                  <option value="bahrain">Bahrain</option>
                  <option value="bangladesh">Bangladesh</option>
                  <option value="barbados">Barbados</option>
                  <option value="belarus">Belarus</option>
                  <option value="belgium">Belgium</option>
                  <option value="belize">Belize</option>
                  <option value="benin">Benin</option>
                  <option value="bhutan">Bhutan</option>
                  <option value="bolivia">Bolivia</option>
                  <option value="bosnia-and-herzegovina">Bosnia and Herzegovina</option>
                  <option value="botswana">Botswana</option>
                  <option value="brazil">Brazil</option>
                  <option value="brunei">Brunei</option>
                  <option value="bulgaria">Bulgaria</option>
                  <option value="burkina-faso">Burkina Faso</option>
                  <option value="burundi">Burundi</option>
                  <option value="cabo-verde">Cabo Verde</option>
                  <option value="cambodia">Cambodia</option>
                  <option value="cameroon">Cameroon</option>
                  <option value="canada">Canada</option>
                  <option value="central-african-republic">Central African Republic</option>
                  <option value="chad">Chad</option>
                  <option value="chile">Chile</option>
                  <option value="china">China</option>
                  <option value="colombia">Colombia</option>
                  <option value="comoros">Comoros</option>
                  <option value="congo">Congo</option>
                  <option value="costa-rica">Costa Rica</option>
                  <option value="croatia">Croatia</option>
                  <option value="cuba">Cuba</option>
                  <option value="cyprus">Cyprus</option>
                  <option value="czech-republic">Czech Republic</option>
                  <option value="denmark">Denmark</option>
                  <option value="djibouti">Djibouti</option>
                  <option value="dominica">Dominica</option>
                  <option value="dominican-republic">Dominican Republic</option>
                  <option value="ecuador">Ecuador</option>
                  <option value="egypt">Egypt</option>
                  <option value="el-salvador">El Salvador</option>
                  <option value="equatorial-guinea">Equatorial Guinea</option>
                  <option value="eritrea">Eritrea</option>
                  <option value="estonia">Estonia</option>
                  <option value="eswatini">Eswatini</option>
                  <option value="ethiopia">Ethiopia</option>
                  <option value="fiji">Fiji</option>
                  <option value="finland">Finland</option>
                  <option value="france">France</option>
                  <option value="gabon">Gabon</option>
                  <option value="gambia">Gambia</option>
                  <option value="georgia">Georgia</option>
                  <option value="germany">Germany</option>
                  <option value="ghana">Ghana</option>
                  <option value="greece">Greece</option>
                  <option value="grenada">Grenada</option>
                  <option value="guatemala">Guatemala</option>
                  <option value="guinea">Guinea</option>
                  <option value="guinea-bissau">Guinea-Bissau</option>
                  <option value="guyana">Guyana</option>
                  <option value="haiti">Haiti</option>
                  <option value="honduras">Honduras</option>
                  <option value="hungary">Hungary</option>
                  <option value="iceland">Iceland</option>
                  <option value="india">India</option>
                  <option value="indonesia">Indonesia</option>
                  <option value="iran">Iran</option>
                  <option value="iraq">Iraq</option>
                  <option value="ireland">Ireland</option>
                  <option value="israel">Israel</option>
                  <option value="italy">Italy</option>
                  <option value="jamaica">Jamaica</option>
                  <option value="japan">Japan</option>
                  <option value="jordan">Jordan</option>
                  <option value="kazakhstan">Kazakhstan</option>
                  <option value="kenya">Kenya</option>
                  <option value="kiribati">Kiribati</option>
                  <option value="kuwait">Kuwait</option>
                  <option value="kyrgyzstan">Kyrgyzstan</option>
                  <option value="laos">Laos</option>
                  <option value="latvia">Latvia</option>
                  <option value="lebanon">Lebanon</option>
                  <option value="lesotho">Lesotho</option>
                  <option value="liberia">Liberia</option>
                  <option value="libya">Libya</option>
                  <option value="liechtenstein">Liechtenstein</option>
                  <option value="lithuania">Lithuania</option>
                  <option value="luxembourg">Luxembourg</option>
                  <option value="madagascar">Madagascar</option>
                  <option value="malawi">Malawi</option>
                  <option value="malaysia">Malaysia</option>
                  <option value="maldives">Maldives</option>
                  <option value="mali">Mali</option>
                  <option value="malta">Malta</option>
                  <option value="marshall-islands">Marshall Islands</option>
                  <option value="mauritania">Mauritania</option>
                  <option value="mauritius">Mauritius</option>
                  <option value="mexico">Mexico</option>
                  <option value="micronesia">Micronesia</option>
                  <option value="moldova">Moldova</option>
                  <option value="monaco">Monaco</option>
                  <option value="mongolia">Mongolia</option>
                  <option value="montenegro">Montenegro</option>
                  <option value="morocco">Morocco</option>
                  <option value="mozambique">Mozambique</option>
                  <option value="myanmar">Myanmar</option>
                  <option value="namibia">Namibia</option>
                  <option value="nauru">Nauru</option>
                  <option value="nepal">Nepal</option>
                  <option value="netherlands">Netherlands</option>
                  <option value="new-zealand">New Zealand</option>
                  <option value="nicaragua">Nicaragua</option>
                  <option value="niger">Niger</option>
                  <option value="nigeria">Nigeria</option>
                  <option value="north-korea">North Korea</option>
                  <option value="north-macedonia">North Macedonia</option>
                  <option value="norway">Norway</option>
                  <option value="oman">Oman</option>
                  <option value="pakistan">Pakistan</option>
                  <option value="palau">Palau</option>
                  <option value="palestine">Palestine</option>
                  <option value="panama">Panama</option>
                  <option value="papua-new-guinea">Papua New Guinea</option>
                  <option value="paraguay">Paraguay</option>
                  <option value="peru">Peru</option>
                  <option value="philippines">Philippines</option>
                  <option value="poland">Poland</option>
                  <option value="portugal">Portugal</option>
                  <option value="qatar">Qatar</option>
                  <option value="romania">Romania</option>
                  <option value="russia">Russia</option>
                  <option value="rwanda">Rwanda</option>
                  <option value="saint-kitts-and-nevis">Saint Kitts and Nevis</option>
                  <option value="saint-lucia">Saint Lucia</option>
                  <option value="saint-vincent-and-the-grenadines">Saint Vincent and the Grenadines</option>
                  <option value="samoa">Samoa</option>
                  <option value="san-marino">San Marino</option>
                  <option value="sao-tome-and-principe">Sao Tome and Principe</option>
                  <option value="saudi-arabia">Saudi Arabia</option>
                  <option value="senegal">Senegal</option>
                  <option value="serbia">Serbia</option>
                  <option value="seychelles">Seychelles</option>
                  <option value="sierra-leone">Sierra Leone</option>
                  <option value="singapore">Singapore</option>
                  <option value="slovakia">Slovakia</option>
                  <option value="slovenia">Slovenia</option>
                  <option value="solomon-islands">Solomon Islands</option>
                  <option value="somalia">Somalia</option>
                  <option value="south-africa">South Africa</option>
                  <option value="south-korea">South Korea</option>
                  <option value="south-sudan">South Sudan</option>
                  <option value="spain">Spain</option>
                  <option value="sri-lanka">Sri Lanka</option>
                  <option value="sudan">Sudan</option>
                  <option value="suriname">Suriname</option>
                  <option value="sweden">Sweden</option>
                  <option value="switzerland">Switzerland</option>
                  <option value="syria">Syria</option>
                  <option value="taiwan">Taiwan</option>
                  <option value="tajikistan">Tajikistan</option>
                  <option value="tanzania">Tanzania</option>
                  <option value="thailand">Thailand</option>
                  <option value="timor-leste">Timor-Leste</option>
                  <option value="togo">Togo</option>
                  <option value="tonga">Tonga</option>
                  <option value="trinidad-and-tobago">Trinidad and Tobago</option>
                  <option value="tunisia">Tunisia</option>
                  <option value="turkey">Turkey</option>
                  <option value="turkmenistan">Turkmenistan</option>
                  <option value="tuvalu">Tuvalu</option>
                  <option value="uganda">Uganda</option>
                  <option value="ukraine">Ukraine</option>
                  <option value="united-arab-emirates">United Arab Emirates</option>
                  <option value="united-kingdom">United Kingdom</option>
                  <option value="united-states">United States</option>
                  <option value="uruguay">Uruguay</option>
                  <option value="uzbekistan">Uzbekistan</option>
                  <option value="vanuatu">Vanuatu</option>
                  <option value="vatican-city">Vatican City</option>
                  <option value="venezuela">Venezuela</option>
                  <option value="vietnam">Vietnam</option>
                  <option value="yemen">Yemen</option>
                  <option value="zambia">Zambia</option>
                  <option value="zimbabwe">Zimbabwe</option>
                </select>
                {fieldErrors.country && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.country}</p>
                )}
              </div>

              {error && <div className="bg-red-50 text-red-600 p-2 rounded-[5px] text-sm">{error}</div>}

              <button
                onClick={handleNext}
                className="w-full bg-[#C6D7FF]/50 text-[#3771FE] py-2 sm:py-2.5 px-4 border border-[#3771FE]/50 rounded-[5px] font-medium hover:bg-[#C6D7FF]/70 transition-colors duration-200 mt-4 text-sm"
              >
                Next
              </button>
            </div>
          ) : (
            // Step 2: NDA Agreement
            <div
              className="space-y-4 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-2 scrollbar-hide relative"
              ref={ndaScrollRef}
              onScroll={handleNdaScroll}
            >
              <div className="text-center">
                <p className="text-xs font-dm-sans text-gray-700 mb-3 text-center">
                  As part of our early access program we are giving you access to co-develop the solution with us. Please confirm that you agree to our NDA
                </p>
                <h1 className="text-[18px] sm:text-[20px] font-semibold mb-1" style={{ fontFamily: 'DM Sans', color: '#223258' }}>Non-Disclosure Agreement (Online)</h1>
              </div>

              <div className="text-left space-y-3">
                <div>
                  <h4 className="mb-1" style={{ fontFamily: 'DM Sans', color: '#000000', fontWeight: 550, fontSize: '16px' }}>1. Parties</h4>
                  <p className="mb-3" style={{ fontFamily: 'DM Sans', color: '#000000', fontSize: '12px' }}>
                  <strong>Disclosing Party:</strong> Synduct GmbH, Bergmannstrasse 58, 80339 Munich, Germany, represented by Managing Director Valentine
                    Emmanuel.<br />
                    <strong>Receiving Party:</strong> {formData.firstName} {formData.lastName} ("<strong>you</strong>").
                  </p>
                </div>

                <div>
                  <h4 className="mb-1" style={{ fontFamily: 'DM Sans', color: '#000000', fontWeight: 550, fontSize: '16px' }}>2. Purpose</h4>
                  <p className="mb-3" style={{ fontFamily: 'DM Sans', color: '#000000', fontSize: '12px' }}>
                  Synduct will share non-public product ideas, prototype features, medical content and
                  usage data so that you can test DrInfo.ai, give feedback and co-develop new clinical
                  functions. The information is provided solely for that purpose.
                  </p>
                </div>

                <div>
                  <h4 className="mb-1" style={{ fontFamily: 'DM Sans', color: '#000000', fontWeight: 550, fontSize: '16px' }}>3. What Counts as "Confidential Information"</h4>
                  <p className="mb-3" style={{ fontFamily: 'DM Sans', color: '#000000', fontSize: '12px' }}>
                    "Confidential Information" includes, without limitation:<br />
                    • Screens, source code, algorithms, model prompts, datasets, evaluation results;<br />
                    • Product roadmaps, pricing, commercial or go-to-market plans;<br />
                    • Any feedback you provide that references internal workings of DrInfo.ai;<br />
                    • All other non-public materials or knowledge disclosed in the course of this early-access programme until its completion.<br /><br />
                  </p>
                </div>

                <div>
                  <h4 className="mb-1" style={{ fontFamily: 'DM Sans', color: '#000000', fontWeight: 550, fontSize: '16px' }}>4. Your Commitments</h4>
                  <p className="mb-3" style={{ fontFamily: 'DM Sans', color: '#000000', fontSize: '12px' }}>
                    • Keep it private. You must not publish screenshots, share files or discuss details outside the closed test group consisting solely of Synduct-employees or expressly authorised and identified testers.<br />
                    • Use only for evaluation. No reverse engineering, no independent commercial exploitation, and no development of competing products.<br />
                    • Limit sharing. Should you wish to involve a colleague, that person must first complete the same NDA process and receive an individual test account from Synduct.<br />
                    • Delete on request. Within seven (7) days of Synduct's written request—or upon termination of the testing period—you must delete or return all Confidential Information, including notes and copies.
                  </p>
                </div>

                <div>
                  <h4 className="mb-1" style={{ fontFamily: 'DM Sans', color: '#000000', fontWeight: 600, fontSize: '16px' }}>5. Data Protection & Patient Safety</h4>
                  <p className="mb-3" style={{ fontFamily: 'DM Sans', color: '#000000', fontSize: '12px' }}>
                  You will not upload identifiable patient data. If you share de-identified cases, you confirm they comply with GDPR and local medical-confidentiality rules. 
                  </p>
                </div>

                <div>
                  <h4 className="mb-1" style={{ fontFamily: 'DM Sans', color: '#000000', fontWeight: 550, fontSize: '16px' }}>6. Term & Survival</h4>
                  <p className="mb-3" style={{ fontFamily: 'DM Sans', color: '#000000', fontSize: '12px' }}>
                  The agreement starts when you click "Accept NDA" and lasts 3 years after the beta ends. Key confidentiality obligations survive as long as the information is not public.
                  </p>
                </div>

                <div>
                  <h4 className="mb-1" style={{ fontFamily: 'DM Sans', color: '#000000', fontWeight: 550, fontSize: '16px' }}>7. In case of Breach</h4>
                  <p className="mb-3" style={{ fontFamily: 'DM Sans', color: '#000000', fontSize: '12px' }}>
                  Unauthorised use or disclosure triggers a liquidated penalty of EUR 500 plus compensation for any further proven losses. Synduct GmbH may seek injunctive relief in addition to monetary damages. Full compliance with all applicable data-protection laws, including the GDPR, is mandatory.
                  </p>
                </div>

                <div>
                  <h4 className="mb-1" style={{ fontFamily: 'DM Sans', color: '#000000', fontWeight: 550, fontSize: '16px' }}>8. Governing Law & Venue</h4>
                  <p className="mb-3" style={{ fontFamily: 'DM Sans', color: '#000000', fontSize: '12px' }}>
                    German law applies. Exclusive venue: Munich, Germany.
                  </p>
                </div>

                <div>
                  <h4 className="mb-1" style={{ fontFamily: 'DM Sans', color: '#000000', fontWeight: 550, fontSize: '16px' }}>9. Online Acceptance</h4>
                  <div className="flex items-start space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="nda-agreement"
                      checked={ndaAgreed}
                      onChange={(e) => setNdaAgreed(e.target.checked)}
                      className="mt-0.5 w-2 h-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      style={{ backgroundColor: !ndaAgreed ? '#DEE8FF' : undefined, minWidth: '20px', minHeight: '20px' }}
                    />
                    <label htmlFor="nda-agreement" className="cursor-pointer" style={{ fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 400, color: '#000' }}>
                     "I agree to the NDA" inside the app, you confirm that you have read, understood and agree to be bound by this Agreement. This electronic acceptance is legally binding and equivalent to a handwritten signature.
                    </label>
                  </div>
                  <div className="flex items-start space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="terms-agreement"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="mt-0.5 w-2 h-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      style={{ backgroundColor: !termsAgreed ? '#DEE8FF' : undefined, minWidth: '20px', minHeight: '20px' }}
                    />
                    <label htmlFor="terms-agreement" className="cursor-pointer" style={{ fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 400, color: '#000' }}>
                      I agree to the <a href="https://synduct.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-[#3771FE] transition-colors duration-200">Terms of Use</a> and <a href="https://synduct.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-[#3771FE] transition-colors duration-200">Privacy Policy</a>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="digital-signature" className="block text-xs text-black-700 mb-2" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>
                  Digital Signature (e.g. Thomas Müller)
                </label>
                <input
                  type="text"
                  id="digital-signature"
                  value={ndaData.digitalSignature}
                  onChange={(e) => setNdaData(prev => ({ ...prev, digitalSignature: e.target.value }))}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 sm:py-2.5 border border-[#3771FE]/50 rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none text-sm"
                  style={{ fontSize: 14 }}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="address" className="block text-xs text-black-700 mb-2" style={{ fontFamily: 'DM Sans', fontWeight: 200 }}>
                  Place (e.g. Munich, Germany)
                </label>
                <input
                  type="text"
                  id="address"
                  value={ndaData.address}
                  onChange={(e) => setNdaData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter your current location (city, country)"
                  className="w-full px-3 py-2 sm:py-2.5 border border-[#3771FE]/50 rounded-[5px] text-[#223258] placeholder-gray-400 focus:outline-none text-sm"
                  style={{ fontSize: 14 }}
                />
              </div>

              {error && <div className="bg-red-50 text-red-600 p-2 rounded-[5px] text-sm">{error}</div>}

              <button
                onClick={handleCompleteRegistration}
                disabled={!ndaAgreed || !termsAgreed || !ndaData.digitalSignature || !ndaData.address || loading}
                className={`w-full py-2 sm:py-2.5 px-4 rounded-[5px] font-dm-sans font-medium transition-colors duration-200 text-sm ${
                  ndaAgreed && termsAgreed && ndaData.digitalSignature && ndaData.address && !loading
                    ? 'bg-[#C6D7FF]/50 text-[#3771FE] border border-[#3771FE]/50 hover:bg-[#C6D7FF]/60'
                    : 'bg-[#C6D7FF]/50 text-[#3771FE] border border-[#3771FE]/50 cursor-not-allowed opacity-50'
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
