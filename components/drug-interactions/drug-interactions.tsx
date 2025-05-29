"use client"

import { useState } from 'react'
import { ContentLayout } from '../shared/content-layout'
import { Plus, X, AlertTriangle, AlertCircle, CheckCircle, Search } from 'lucide-react'

interface DrugInteractionsProps {
  user: any;
}

interface Medication {
  id: number;
  name: string;
}

interface Interaction {
  severity: 'high' | 'moderate' | 'mild' | 'none';
  description: string;
  recommendation: string;
}

const MEDICATIONS_LIST: Medication[] = [
  { id: 1, name: "Lisinopril" },
  { id: 2, name: "Atorvastatin" },
  { id: 3, name: "Metformin" },
  { id: 4, name: "Aspirin" },
  { id: 5, name: "Warfarin" },
  { id: 6, name: "Levothyroxine" },
  { id: 7, name: "Ibuprofen" },
  { id: 8, name: "Amoxicillin" },
  { id: 9, name: "Amlodipine" },
  { id: 10, name: "Prednisone" },
  { id: 11, name: "Fluoxetine" },
  { id: 12, name: "Lorazepam" }
];

// Predefined interactions for the demo
const INTERACTIONS: Record<string, Interaction> = {
  "1-5": { // Lisinopril-Warfarin
    severity: 'moderate',
    description: "Concurrent use of ACE inhibitors and warfarin may increase the risk of bleeding.",
    recommendation: "Monitor INR closely when initiating, changing dose, or discontinuing either medication."
  },
  "5-7": { // Warfarin-Ibuprofen
    severity: 'high',
    description: "NSAIDs like ibuprofen can increase the risk of bleeding when used with warfarin.",
    recommendation: "Avoid concurrent use if possible. If necessary, monitor for signs of bleeding and check INR more frequently."
  },
  "2-5": { // Atorvastatin-Warfarin
    severity: 'moderate',
    description: "Statins may enhance the anticoagulant effect of warfarin.",
    recommendation: "Monitor INR when starting or changing statin dose."
  },
  "7-11": { // Ibuprofen-Fluoxetine
    severity: 'moderate',
    description: "Concurrent use increases the risk of gastrointestinal bleeding.",
    recommendation: "Consider alternative pain management or add gastroprotection."
  },
  "11-12": { // Fluoxetine-Lorazepam
    severity: 'mild',
    description: "May enhance the CNS depressant effect of benzodiazepines.",
    recommendation: "Monitor for increased sedation."
  }
};

export function DrugInteractions({ user }: DrugInteractionsProps) {
  const [selectedMedications, setSelectedMedications] = useState<Medication[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const addMedication = (medication: Medication) => {
    if (!selectedMedications.find(med => med.id === medication.id)) {
      setSelectedMedications([...selectedMedications, medication])
      setSearchTerm('')
    }
  }

  const removeMedication = (id: number) => {
    setSelectedMedications(selectedMedications.filter(med => med.id !== id))
  }

  const filteredMedications = MEDICATIONS_LIST.filter(
    med => med.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get all possible pairs of medications
  const getMedicationPairs = () => {
    const pairs: [Medication, Medication, Interaction | null][] = [];
    
    for (let i = 0; i < selectedMedications.length; i++) {
      for (let j = i + 1; j < selectedMedications.length; j++) {
        const med1 = selectedMedications[i];
        const med2 = selectedMedications[j];
        
        // Check if there's an interaction
        const key1 = `${med1.id}-${med2.id}`;
        const key2 = `${med2.id}-${med1.id}`;
        const interaction = INTERACTIONS[key1] || INTERACTIONS[key2] || null;
        
        pairs.push([med1, med2, interaction]);
      }
    }
    
    return pairs;
  }

  const medicationPairs = getMedicationPairs();

  return (
    <ContentLayout 
      title="Drug-Drug Interactions" 
      description="Check for potential interactions between medications"
      user={user}
    >
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-800 mb-2">Selected Medications</h2>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedMedications.map(med => (
            <div key={med.id} className="bg-blue-50 border border-blue-200 rounded-full px-4 py-2 flex items-center">
              <span className="mr-2">{med.name}</span>
              <button 
                onClick={() => removeMedication(med.id)}
                className="text-red-500 hover:text-red-700"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          
          {selectedMedications.length === 0 && (
            <p className="text-gray-500 italic">No medications selected</p>
          )}
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Add a medication..."
            className="w-full py-2 px-4 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          
          {searchTerm && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredMedications.length > 0 ? (
                filteredMedications.map(med => (
                  <div 
                    key={med.id}
                    onClick={() => addMedication(med)}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center"
                  >
                    <Plus size={18} className="text-blue-500 mr-2" />
                    {med.name}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500">No medications found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedMedications.length > 1 ? (
        <div>
          <h2 className="text-lg font-medium text-gray-800 mb-4">Potential Interactions</h2>
          
          <div className="space-y-4">
            {medicationPairs.map(([med1, med2, interaction], index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 ${
                  interaction?.severity === 'high' ? 'border-red-200 bg-red-50' :
                  interaction?.severity === 'moderate' ? 'border-orange-200 bg-orange-50' :
                  interaction?.severity === 'mild' ? 'border-yellow-200 bg-yellow-50' :
                  'border-green-200 bg-green-50'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    {interaction?.severity === 'high' && <AlertTriangle className="text-red-500 mr-2" size={20} />}
                    {interaction?.severity === 'moderate' && <AlertCircle className="text-orange-500 mr-2" size={20} />}
                    {interaction?.severity === 'mild' && <AlertCircle className="text-yellow-500 mr-2" size={20} />}
                    {!interaction && <CheckCircle className="text-green-500 mr-2" size={20} />}
                    
                    <h3 className="font-medium">
                      {med1.name} + {med2.name}
                    </h3>
                  </div>
                  
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    interaction?.severity === 'high' ? 'bg-red-200 text-red-800' :
                    interaction?.severity === 'moderate' ? 'bg-orange-200 text-orange-800' :
                    interaction?.severity === 'mild' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {interaction?.severity === 'high' ? 'High Risk' :
                     interaction?.severity === 'moderate' ? 'Moderate Risk' :
                     interaction?.severity === 'mild' ? 'Mild Risk' :
                     'No Known Risk'}
                  </span>
                </div>
                
                {interaction ? (
                  <>
                    <p className="text-gray-700 mb-2">{interaction.description}</p>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <span className="font-medium">Recommendation: </span>
                      {interaction.recommendation}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-700">No known significant interactions between these medications.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : selectedMedications.length === 1 ? (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto text-blue-300 mb-2" size={48} />
          <p className="text-gray-600">Please add at least one more medication to check for interactions</p>
        </div>
      ) : (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto text-blue-300 mb-2" size={48} />
          <p className="text-gray-600">Add medications to check for potential interactions</p>
        </div>
      )}
    </ContentLayout>
  )
} 