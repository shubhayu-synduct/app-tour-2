"use client"

import { useState } from 'react'
import { ContentLayout } from '../shared/content-layout'
import { Calculator as CalculatorIcon, ChevronDown } from 'lucide-react'

interface CalculatorsProps {
  user: any;
}

// BMI Calculator
const BMICalculator = () => {
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bmi, setBmi] = useState<number | null>(null)
  const [category, setCategory] = useState('')

  const calculateBMI = () => {
    if (!height || !weight) return
    
    const heightInM = parseFloat(height) / 100
    const weightInKg = parseFloat(weight)
    
    if (isNaN(heightInM) || isNaN(weightInKg)) return
    
    const calculatedBMI = weightInKg / (heightInM * heightInM)
    setBmi(calculatedBMI)
    
    // Determine BMI category
    if (calculatedBMI < 18.5) {
      setCategory('Underweight')
    } else if (calculatedBMI >= 18.5 && calculatedBMI < 25) {
      setCategory('Normal weight')
    } else if (calculatedBMI >= 25 && calculatedBMI < 30) {
      setCategory('Overweight')
    } else {
      setCategory('Obese')
    }
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="font-medium text-lg mb-4">BMI Calculator</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1">Height (cm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter height in cm"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">Weight (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter weight in kg"
          />
        </div>
        
        <button
          onClick={calculateBMI}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          Calculate
        </button>
        
        {bmi !== null && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-800">{bmi.toFixed(1)}</p>
              <p className={`font-medium ${
                category === 'Normal weight' ? 'text-green-600' :
                category === 'Underweight' ? 'text-yellow-600' :
                category === 'Overweight' ? 'text-orange-600' : 'text-red-600'
              }`}>{category}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Creatinine Clearance Calculator
const CreatinineClearanceCalculator = () => {
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [creatinine, setCreatinine] = useState('')
  const [gender, setGender] = useState('male')
  const [crcl, setCrcl] = useState<number | null>(null)

  const calculateCrCl = () => {
    if (!age || !weight || !creatinine) return
    
    const ageVal = parseFloat(age)
    const weightVal = parseFloat(weight)
    const creatinineVal = parseFloat(creatinine)
    
    if (isNaN(ageVal) || isNaN(weightVal) || isNaN(creatinineVal)) return
    
    // Cockcroft-Gault equation
    let calculatedCrCl = (140 - ageVal) * weightVal / (72 * creatinineVal)
    
    // Adjustment for females
    if (gender === 'female') {
      calculatedCrCl *= 0.85
    }
    
    setCrcl(calculatedCrCl)
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="font-medium text-lg mb-4">Creatinine Clearance Calculator</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1">Age (years)</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter age in years"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">Weight (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter weight in kg"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">Serum Creatinine (mg/dL)</label>
          <input
            type="number"
            value={creatinine}
            onChange={(e) => setCreatinine(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter serum creatinine"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">Gender</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="male"
                checked={gender === 'male'}
                onChange={() => setGender('male')}
                className="mr-2"
              />
              Male
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="female"
                checked={gender === 'female'}
                onChange={() => setGender('female')}
                className="mr-2"
              />
              Female
            </label>
          </div>
        </div>
        
        <button
          onClick={calculateCrCl}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          Calculate
        </button>
        
        {crcl !== null && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-800">{crcl.toFixed(1)} mL/min</p>
              <p className="text-gray-600 text-sm">Creatinine Clearance (Cockcroft-Gault)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// List of all calculators
const CALCULATORS = [
  {
    id: 'bmi',
    title: 'BMI Calculator',
    description: 'Body Mass Index - Calculate a patient\'s BMI',
    component: BMICalculator
  },
  {
    id: 'crcl',
    title: 'Creatinine Clearance',
    description: 'Calculate creatinine clearance using the Cockcroft-Gault equation',
    component: CreatinineClearanceCalculator
  }
];

export function Calculators({ user }: CalculatorsProps) {
  const [activeCalculator, setActiveCalculator] = useState<string | null>(null)

  return (
    <ContentLayout 
      title="Medical Calculators" 
      description="Tools to help with clinical calculations and assessments"
      user={user}
    >
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Available Calculators</h2>
          <div className="space-y-2">
            {CALCULATORS.map(calc => (
              <div 
                key={calc.id}
                onClick={() => setActiveCalculator(activeCalculator === calc.id ? null : calc.id)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border ${
                  activeCalculator === calc.id 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <CalculatorIcon className="text-blue-500 mr-2" size={20} />
                  <div>
                    <h3 className="font-medium">{calc.title}</h3>
                    <p className="text-sm text-gray-600">{calc.description}</p>
                  </div>
                </div>
                <ChevronDown 
                  className={`text-gray-400 transition-transform ${activeCalculator === calc.id ? 'transform rotate-180' : ''}`} 
                  size={18} 
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-2">
          {activeCalculator ? (
            CALCULATORS.find(calc => calc.id === activeCalculator)?.component()
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <CalculatorIcon size={48} className="text-gray-300 mb-2" />
              <p>Select a calculator from the left panel</p>
            </div>
          )}
        </div>
      </div>
    </ContentLayout>
  )
} 