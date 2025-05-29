"use client"

import { useState } from 'react'
import { ContentLayout } from '../shared/content-layout'
import { Search, Filter, ExternalLink, FileText } from 'lucide-react'

interface ClinicalTrialsProps {
  user: any;
}

interface ClinicalTrial {
  id: string;
  title: string;
  condition: string;
  phase: string;
  status: string;
  location: string;
  lastUpdated: string;
  sponsor: string;
  description: string;
}

const SAMPLE_TRIALS: ClinicalTrial[] = [
  {
    id: "NCT04283461",
    title: "Adaptive COVID-19 Treatment Trial (ACTT)",
    condition: "COVID-19",
    phase: "Phase 3",
    status: "Recruiting",
    location: "Multiple Locations",
    lastUpdated: "2023-05-15",
    sponsor: "National Institute of Allergy and Infectious Diseases (NIAID)",
    description: "This study is an adaptive, randomized, double-blind, placebo-controlled trial to evaluate the safety and efficacy of novel therapeutic agents in hospitalized adults diagnosed with COVID-19."
  },
  {
    id: "NCT03658772",
    title: "Novel Combination Therapy for Metastatic Melanoma",
    condition: "Melanoma",
    phase: "Phase 2",
    status: "Active, not recruiting",
    location: "University Medical Center",
    lastUpdated: "2023-04-20",
    sponsor: "National Cancer Institute (NCI)",
    description: "This trial studies how well combination immunotherapy works in treating patients with melanoma that has spread to other places in the body."
  },
  {
    id: "NCT04645732",
    title: "SGLT2 Inhibitors in Heart Failure Patients",
    condition: "Heart Failure",
    phase: "Phase 4",
    status: "Recruiting",
    location: "Multiple Locations",
    lastUpdated: "2023-06-05",
    sponsor: "Cardiovascular Research Foundation",
    description: "A randomized trial to evaluate the effectiveness of SGLT2 inhibitors in reducing hospitalization and mortality in patients with heart failure with preserved ejection fraction."
  },
  {
    id: "NCT03897127",
    title: "Neurostimulation for Treatment-Resistant Depression",
    condition: "Depression",
    phase: "Phase 2",
    status: "Completed",
    location: "National Institute of Mental Health",
    lastUpdated: "2022-12-10",
    sponsor: "National Institute of Mental Health (NIMH)",
    description: "This study evaluates the efficacy of transcranial magnetic stimulation (TMS) in patients with treatment-resistant depression who have failed to respond to at least two antidepressant medications."
  },
  {
    id: "NCT04327206",
    title: "Antibiotics vs. Appendectomy for Acute Appendicitis",
    condition: "Appendicitis",
    phase: "Phase 3",
    status: "Active, not recruiting",
    location: "Multiple Locations",
    lastUpdated: "2023-03-12",
    sponsor: "American College of Surgeons",
    description: "A pragmatic randomized controlled trial comparing antibiotic therapy to appendectomy for the treatment of acute uncomplicated appendicitis."
  }
];

export function ClinicalTrials({ user }: ClinicalTrialsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)
  const [selectedTrial, setSelectedTrial] = useState<ClinicalTrial | null>(null)

  // Filter trials based on search term and filters
  const filteredTrials = SAMPLE_TRIALS.filter(trial => {
    const matchesSearch = 
      trial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.condition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.sponsor.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = selectedStatus ? trial.status === selectedStatus : true
    const matchesPhase = selectedPhase ? trial.phase === selectedPhase : true
    
    return matchesSearch && matchesStatus && matchesPhase
  })

  // Get unique statuses and phases for filters
  const statuses = Array.from(new Set(SAMPLE_TRIALS.map(trial => trial.status)))
  const phases = Array.from(new Set(SAMPLE_TRIALS.map(trial => trial.phase)))

  return (
    <ContentLayout 
      title="Clinical Trials" 
      description="Access information about ongoing clinical trials and research studies"
      user={user}
    >
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar with filters */}
        <div className="md:w-72">
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search trials..."
                className="w-full py-2 px-4 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="flex items-center font-medium text-gray-700 mb-2">
              <Filter size={18} className="mr-2" /> Status
            </h3>
            <div className="space-y-1">
              <div className="flex items-center">
                <input
                  id="status-all"
                  type="radio"
                  checked={selectedStatus === null}
                  onChange={() => setSelectedStatus(null)}
                  className="mr-2"
                />
                <label htmlFor="status-all">All</label>
              </div>
              {statuses.map(status => (
                <div key={status} className="flex items-center">
                  <input
                    id={`status-${status}`}
                    type="radio"
                    checked={selectedStatus === status}
                    onChange={() => setSelectedStatus(status)}
                    className="mr-2"
                  />
                  <label htmlFor={`status-${status}`}>{status}</label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="flex items-center font-medium text-gray-700 mb-2">
              <Filter size={18} className="mr-2" /> Phase
            </h3>
            <div className="space-y-1">
              <div className="flex items-center">
                <input
                  id="phase-all"
                  type="radio"
                  checked={selectedPhase === null}
                  onChange={() => setSelectedPhase(null)}
                  className="mr-2"
                />
                <label htmlFor="phase-all">All</label>
              </div>
              {phases.map(phase => (
                <div key={phase} className="flex items-center">
                  <input
                    id={`phase-${phase}`}
                    type="radio"
                    checked={selectedPhase === phase}
                    onChange={() => setSelectedPhase(phase)}
                    className="mr-2"
                  />
                  <label htmlFor={`phase-${phase}`}>{phase}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1">
          {selectedTrial ? (
            <div>
              <button 
                onClick={() => setSelectedTrial(null)}
                className="mb-4 text-blue-600 flex items-center hover:underline"
              >
                ← Back to trials
              </button>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="mb-4">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
                    {selectedTrial.phase}
                  </span>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                    selectedTrial.status === 'Recruiting' ? 'bg-green-100 text-green-800' :
                    selectedTrial.status === 'Active, not recruiting' ? 'bg-yellow-100 text-yellow-800' :
                    selectedTrial.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedTrial.status}
                  </span>
                </div>
                
                <h2 className="text-xl font-bold text-gray-800 mb-2">{selectedTrial.title}</h2>
                <p className="text-sm text-gray-500 mb-4">ID: {selectedTrial.id}</p>
                
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="font-medium text-gray-700">Condition</h3>
                    <p>{selectedTrial.condition}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700">Sponsor</h3>
                    <p>{selectedTrial.sponsor}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700">Location</h3>
                    <p>{selectedTrial.location}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700">Last Updated</h3>
                    <p>{selectedTrial.lastUpdated}</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600">{selectedTrial.description}</p>
                </div>
                
                <div className="flex gap-2">
                  <a 
                    href={`https://clinicaltrials.gov/study/${selectedTrial.id}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <ExternalLink size={16} className="mr-1" /> View on ClinicalTrials.gov
                  </a>
                  
                  <a 
                    href="#" 
                    className="flex items-center text-blue-600 hover:underline ml-4"
                  >
                    <FileText size={16} className="mr-1" /> Download PDF
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-800">
                  {filteredTrials.length} Clinical Trials Found
                </h2>
              </div>
              
              <div className="space-y-4">
                {filteredTrials.map(trial => (
                  <div 
                    key={trial.id}
                    onClick={() => setSelectedTrial(trial)}
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-blue-600">{trial.title}</h3>
                      <div className="flex gap-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {trial.phase}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          trial.status === 'Recruiting' ? 'bg-green-100 text-green-800' :
                          trial.status === 'Active, not recruiting' ? 'bg-yellow-100 text-yellow-800' :
                          trial.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {trial.status}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-1">ID: {trial.id}</p>
                    <p className="text-gray-700 mb-2">{trial.condition}</p>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{trial.sponsor}</span>
                      <span className="text-gray-500">Last Updated: {trial.lastUpdated}</span>
                    </div>
                  </div>
                ))}
                
                {filteredTrials.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No clinical trials found matching your criteria.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ContentLayout>
  )
} 