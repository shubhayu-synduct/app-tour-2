"use client"

import { ContentLayout } from '../shared/content-layout'
import { ExternalLink as ExternalLinkIcon } from 'lucide-react'

interface ExternalLinkProps {
  user: any;
}

const EXTERNAL_RESOURCES = [
  {
    id: 1,
    title: "PubMed",
    description: "Access medical research, journals, and scientific papers from the world's largest medical library.",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    category: "Research"
  },
  {
    id: 2,
    title: "UpToDate",
    description: "Evidence-based clinical decision support resource used by physicians to make point-of-care decisions.",
    url: "https://www.uptodate.com/",
    category: "Clinical Decision Support"
  },
  {
    id: 3,
    title: "Medscape",
    description: "Medical news, clinical reference, and education for healthcare professionals.",
    url: "https://www.medscape.com/",
    category: "Medical News"
  },
  {
    id: 4,
    title: "CDC",
    description: "Centers for Disease Control and Prevention - Leading national public health institute.",
    url: "https://www.cdc.gov/",
    category: "Public Health"
  },
  {
    id: 5,
    title: "WHO",
    description: "World Health Organization - Directing and coordinating authority on international health.",
    url: "https://www.who.int/",
    category: "Global Health"
  },
  {
    id: 6,
    title: "ClinicalTrials.gov",
    description: "A database of privately and publicly funded clinical studies conducted worldwide.",
    url: "https://clinicaltrials.gov/",
    category: "Research"
  },
  {
    id: 7,
    title: "FDA",
    description: "U.S. Food and Drug Administration - Federal agency responsible for food and drug safety.",
    url: "https://www.fda.gov/",
    category: "Regulatory"
  },
  {
    id: 8,
    title: "Cleveland Clinic",
    description: "One of the world's premier academic medical centers with educational resources for healthcare professionals.",
    url: "https://my.clevelandclinic.org/",
    category: "Medical Education"
  }
];

export function ExternalLink({ user }: ExternalLinkProps) {
  // Group resources by category
  const groupedResources = EXTERNAL_RESOURCES.reduce((acc, resource) => {
    if (!acc[resource.category]) {
      acc[resource.category] = [];
    }
    acc[resource.category].push(resource);
    return acc;
  }, {} as Record<string, typeof EXTERNAL_RESOURCES>);

  // Get categories
  const categories = Object.keys(groupedResources);

  return (
    <ContentLayout 
      title="External Resources" 
      description="Access trusted external medical resources and references"
      user={user}
    >
      <div className="space-y-8">
        {categories.map(category => (
          <div key={category}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedResources[category].map(resource => (
                <div key={resource.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium text-blue-600 mb-2">
                      {resource.title}
                    </h3>
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <ExternalLinkIcon size={18} />
                    </a>
                  </div>
                  <p className="text-gray-600 mb-4">{resource.description}</p>
                  <a 
                    href={resource.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    Visit resource <ExternalLinkIcon size={16} className="ml-1" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ContentLayout>
  )
} 