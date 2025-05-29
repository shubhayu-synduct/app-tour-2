"use client"

import { useState } from 'react'
import { ContentLayout } from '../shared/content-layout'
import { Search, ChevronRight, ShieldAlert, Clock, Pill } from 'lucide-react'

interface DrugInformationProps {
  user: any;
}

const SAMPLE_DRUGS = [
  {
    id: 1,
    name: "Lisinopril",
    class: "ACE Inhibitor",
    uses: ["Hypertension", "Heart Failure", "Post-MI"],
    dosage: "10-40 mg daily",
    sideEffects: ["Dry cough", "Hypotension", "Hyperkalemia", "Angioedema"],
    contraindications: ["Pregnancy", "History of angioedema"],
    img: "https://via.placeholder.com/80"
  },
  {
    id: 2,
    name: "Atorvastatin",
    class: "Statin",
    uses: ["Hyperlipidemia", "Cardiovascular disease prevention"],
    dosage: "10-80 mg daily",
    sideEffects: ["Myalgia", "Elevated liver enzymes", "Rhabdomyolysis (rare)"],
    contraindications: ["Active liver disease", "Pregnancy", "Breastfeeding"],
    img: "https://via.placeholder.com/80"
  },
  {
    id: 3,
    name: "Metformin",
    class: "Biguanide",
    uses: ["Type 2 Diabetes", "Prediabetes", "PCOS"],
    dosage: "500-2000 mg daily",
    sideEffects: ["GI disturbances", "Vitamin B12 deficiency", "Lactic acidosis (rare)"],
    contraindications: ["Renal impairment", "Acute heart failure", "Alcoholism"],
    img: "https://via.placeholder.com/80"
  }
];

export function DrugInformation({ user }: DrugInformationProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDrug, setSelectedDrug] = useState<(typeof SAMPLE_DRUGS)[0] | null>(null)
  
  const filteredDrugs = SAMPLE_DRUGS.filter(drug => 
    drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.uses.some(use => use.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <ContentLayout 
      title="Drug Information" 
      description="Access comprehensive information about medications, dosing, side effects, and more"
      user={user}
    >
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medications..."
            className="w-full py-2 px-4 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Drug list */}
        <div className="md:col-span-1 border-r pr-4">
          <h2 className="font-medium text-gray-800 mb-4">Medications</h2>
          <div className="space-y-2">
            {filteredDrugs.map(drug => (
              <div 
                key={drug.id}
                onClick={() => setSelectedDrug(drug)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${
                  selectedDrug?.id === drug.id 
                    ? 'bg-blue-50 border-blue-200 border' 
                    : 'hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <Pill className="text-blue-500 mr-2" size={20} />
                  <div>
                    <h3 className="font-medium">{drug.name}</h3>
                    <p className="text-sm text-gray-600">{drug.class}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            ))}

            {filteredDrugs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No medications found matching your search criteria.
              </div>
            )}
          </div>
        </div>

        {/* Drug details */}
        <div className="md:col-span-2">
          {selectedDrug ? (
            <div>
              <div className="flex items-start mb-6">
                <img 
                  src={selectedDrug.img} 
                  alt={selectedDrug.name} 
                  className="w-20 h-20 object-cover rounded-lg mr-4"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedDrug.name}</h2>
                  <p className="text-lg text-blue-600">{selectedDrug.class}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Uses</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {selectedDrug.uses.map((use, index) => (
                      <li key={index}>{use}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Dosage</h3>
                  <div className="flex items-center">
                    <Clock className="text-blue-500 mr-2" size={18} />
                    <p className="text-gray-700">{selectedDrug.dosage}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Side Effects</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {selectedDrug.sideEffects.map((effect, index) => (
                      <li key={index}>{effect}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-2">Contraindications</h3>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <div className="flex items-start">
                      <ShieldAlert className="text-red-500 mr-2 mt-0.5" size={18} />
                      <ul className="text-red-700 space-y-1">
                        {selectedDrug.contraindications.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Pill size={48} className="text-gray-300 mb-2" />
              <p>Select a medication to view details</p>
            </div>
          )}
        </div>
      </div>
    </ContentLayout>
  )
} 