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
        // Convert country value to match dropdown format if needed
        const country = docSnap.data().country || docSnap.data().profile?.country || 'united-states';
        const formattedCountry = country.toLowerCase().replace(/\s+/g, '-');
        
        setProfile({
          ...docSnap.data().profile || {},
          email: docSnap.data().email || user.email,
          country: formattedCountry
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
    const auth = await getFirebaseAuth();
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
        "country": country // Also update the top-level country field
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
                  <select
                    name="country"
                    value={profile?.country || 'united-states'}
                    onChange={handleSelectChange}
                    className="w-full border border-[#B5C9FC] rounded-[8px] px-4 py-2 bg-white text-[#223258] font-medium outline-none focus:ring-2 focus:ring-[#B5C9FC]"
                  >
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