"use client"

import { useEffect, useState, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'feedback'>('profile');
  const [showSpecialtiesDropdown, setShowSpecialtiesDropdown] = useState(false);
  const specialtiesRef = useRef<HTMLDivElement>(null);

  // Occupation and Specialties options
  const occupationOptions = [
    { value: "physician", label: "Physician" },
    { value: "fellow", label: "Fellow" },
    { value: "consultant", label: "Consultant" },
    { value: "intern-resident", label: "Intern/Resident" },
    { value: "student", label: "Student" },
    { value: "pharmacist", label: "Pharmacist" },
    { value: "advanced-practice-nurse", label: "Advanced Practice Nurse" },
    { value: "dentist", label: "Dentist" },
    { value: "medical-librarian", label: "Medical Librarian" },
    { value: "other", label: "Other" },
  ];
  const specialtiesOptions = [
    { value: "cardiology", label: "Cardiology" },
    { value: "dermatology", label: "Dermatology" },
    { value: "endocrinology", label: "Endocrinology" },
    { value: "gastroenterology", label: "Gastroenterology" },
    { value: "hematology", label: "Hematology" },
    { value: "infectious-disease", label: "Infectious Disease" },
    { value: "nephrology", label: "Nephrology" },
    { value: "neurology", label: "Neurology" },
    { value: "oncology", label: "Oncology" },
    { value: "pulmonology", label: "Pulmonology" },
    { value: "rheumatology", label: "Rheumatology" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish
    if (!user) return; // Optionally redirect to login here

    const fetchProfile = async () => {
      const db = getFirebaseFirestore();
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile({
          ...docSnap.data().profile || {},
          email: docSnap.data().email || user.email,
          country: docSnap.data().country || 'United States'
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, authLoading]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (specialtiesRef.current && event.target instanceof Node && !specialtiesRef.current.contains(event.target)) {
        setShowSpecialtiesDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSpecialtiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((prev: any) => ({ ...prev, specialties: e.target.value.split(",").map((s) => s.trim()) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (user) {
      const db = getFirebaseFirestore();
      const docRef = doc(db, "users", user.uid);
      // Update only the specified fields inside the 'profile' object using dot notation
      const { firstName, lastName, occupation, institution, specialties, placeOfWork, country } = profile;
      await updateDoc(docRef, {
        "profile.firstName": firstName,
        "profile.lastName": lastName,
        "profile.occupation": occupation,
        "profile.institution": institution,
        "profile.specialties": specialties,
        "profile.placeOfWork": placeOfWork,
        "profile.country": country,
      });
      setSuccess(true);
    }
    setSaving(false);
  };

  if (authLoading || loading) return <div className="flex justify-center items-center h-screen font-['DM_Sans']">Loading...</div>;
  if (!profile) return <div className="flex justify-center items-center h-screen font-['DM_Sans']">Profile not found.</div>;

  // Ensure specialties is always an array
  const specialtiesArray = Array.isArray(profile.specialties)
    ? profile.specialties
    : profile.specialties
      ? [profile.specialties]
      : [];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto mt-10 font-['DM_Sans'] px-4 md:px-8 w-full">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            className={`px-3 py-2 rounded-[8px] border text-base font-medium transition-colors min-w-[100px]
              ${activeTab === 'profile' ? 'border-[#223258] text-[#223258] bg-white' : 'border-[#AEAEAE] text-[#AEAEAE] bg-white'}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`px-3 py-2 rounded-[8px] border text-base font-medium transition-colors min-w-[100px]
              ${activeTab === 'subscription' ? 'border-[#223258] text-[#223258] bg-white' : 'border-[#AEAEAE] text-[#AEAEAE] bg-white'}`}
            onClick={() => setActiveTab('subscription')}
            disabled
          >
            Subscription
          </button>
          <button
            className={`px-3 py-2 rounded-[8px] border text-base font-medium transition-colors min-w-[100px]
              ${activeTab === 'feedback' ? 'border-[#223258] text-[#223258] bg-white' : 'border-[#AEAEAE] text-[#AEAEAE] bg-white'}`}
            onClick={() => setActiveTab('feedback')}
            disabled
          >
            Feedback
          </button>
        </div>

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-xl font-regular text-[#000000] mb-1">Account Settings</h2>
            <p className="text-[#747474] text-sm mb-6">Manage your personal information</p>
            <div className="border border-[#B5C9FC] rounded-[10px] p-4 md:p-8 bg-[#F4F7FF] w-full">
              <form className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-8 gap-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">First Name</label>
                  <input name="firstName" value={profile.firstName || ''} onChange={handleChange} className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC]" />
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Last Name</label>
                  <input name="lastName" value={profile.lastName || ''} onChange={handleChange} className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC]" />
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Email Address</label>
                  <input value={user?.email || ''} disabled className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none cursor-not-allowed opacity-60" />
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Country</label>
                  <input 
                    name="country" 
                    value={profile?.country || 'United States'} 
                    onChange={handleChange}
                    className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC]" 
                  />
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Occupation</label>
                  <select
                    name="occupation"
                    value={profile.occupation || ''}
                    onChange={handleSelectChange}
                    className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC]"
                  >
                    <option value="" disabled>Select Occupation</option>
                    {occupationOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Place of Work</label>
                  <select
                    name="placeOfWork"
                    value={profile.placeOfWork || ''}
                    onChange={handleSelectChange}
                    className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC]"
                  >
                    <option value="" disabled>Select Place of Work</option>
                    <option value="hospital-clinic">Hospital/Clinic</option>
                    <option value="outpatient-clinic">Outpatient Clinic</option>
                    <option value="private-practice">Private Practice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Institution</label>
                  <input name="institution" value={profile.institution || ''} onChange={handleChange} className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC]" />
                </div>
                <div>
                  <label className="block text-[#000000] mb-1 font-medium">Specialties</label>
                  <div className="relative" ref={specialtiesRef}>
                    <div
                      className={`w-full min-h-[40px] px-2 py-1 border border-[#B5C9FC] rounded-[8px] bg-white flex flex-wrap items-center gap-1 focus-within:ring-2 focus-within:ring-[#B5C9FC] focus-within:border-transparent`}
                      tabIndex={0}
                      onClick={() => setShowSpecialtiesDropdown(true)}
                      style={{ cursor: 'text', position: 'relative' }}
                    >
                      {(!specialtiesArray || specialtiesArray.length === 0) && (
                        <span className="text-gray-400 text-sm select-none" style={{ fontSize: 11 }}>Select Specialties</span>
                      )}
                      {specialtiesArray.map((specialty: string) => (
                        <span
                          key={specialty}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-[#C6D7FF]/50 text-[#223258] border border-[#3771FE]/50 mr-1 mt-1"
                        >
                          {specialty === "other" ? "Other" : (specialtiesOptions.find(opt => opt.value === specialty)?.label || specialty)}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setProfile((prev: any) => {
                                const arr = Array.isArray(prev.specialties)
                                  ? prev.specialties
                                  : prev.specialties
                                    ? [prev.specialties]
                                    : [];
                                return { ...prev, specialties: arr.filter((s: string) => s !== specialty) };
                              });
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
                      <div className="absolute z-10 left-0 right-0 bg-white border border-[#B5C9FC] rounded-b-[8px] shadow-lg max-h-48 overflow-y-auto mt-1">
                        {specialtiesOptions.filter(opt => !specialtiesArray.includes(opt.value)).map(opt => (
                          <div
                            key={opt.value}
                            className="px-3 py-2 hover:bg-[#C6D7FF]/30 cursor-pointer text-sm text-[#223258]"
                            onClick={() => {
                              setProfile((prev: any) => {
                                const arr = Array.isArray(prev.specialties)
                                  ? prev.specialties
                                  : prev.specialties
                                    ? [prev.specialties]
                                    : [];
                                return { ...prev, specialties: [...arr, opt.value] };
                              });
                              setShowSpecialtiesDropdown(false);
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {specialtiesArray.includes("other") && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-black mb-1">Specify Other Specialty</label>
                      <input
                        type="text"
                        name="otherSpecialty"
                        placeholder="Please specify your specialty"
                        value={profile.otherSpecialty || ""}
                        onChange={e => setProfile((prev: any) => ({ ...prev, otherSpecialty: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#B5C9FC] rounded-[8px] text-[#223258] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B5C9FC] focus:border-transparent text-sm bg-white"
                        style={{ fontSize: 14 }}
                      />
                    </div>
                  )}
                </div>
                {success && <div className="md:col-span-2 font-medium text-right" style={{ color: '#8991AA' }}>Profile updated successfully!</div>}
              </form>
            </div>
            <div className="flex justify-end mt-6 w-full mb-4 md:mb-0">
              <button
                type="submit"
                disabled={saving}
                onClick={handleSubmit}
                className="bg-[#C6D7FF]/50 border border-[#3771FE]/50 text-[#223258] font-regular px-8 py-2 rounded-[8px] transition-colors text-lg w-48"
              >
                {saving ? 'Saving...' : 'Update profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 