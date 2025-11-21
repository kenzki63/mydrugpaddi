import React, { useState } from 'react';
import { 
  Pill, 
  AlertTriangle, 
  Info, 
  Trash2, 
  Plus,
  Check,
  Skull,
  AlertCircle,
  Shield
} from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
}

interface Interaction {
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

// Define proper TypeScript interfaces for the interactions
interface DrugInteractions {
  [key: string]: {
    [key: string]: Interaction;
  };
}

const COMMON_INTERACTIONS: DrugInteractions = {
  // Pain & Inflammation
  'ibuprofen': {
    'warfarin': {
      severity: 'high',
      description: 'Increased risk of bleeding',
      recommendation: 'Monitor for bleeding signs, avoid combination if possible'
    },
    'aspirin': {
      severity: 'medium', 
      description: 'Increased risk of stomach bleeding',
      recommendation: 'Take with food, monitor for stomach pain'
    },
    'alcohol': {
      severity: 'medium',
      description: 'Increased risk of stomach bleeding and liver damage',
      recommendation: 'Avoid alcohol while taking this medication'
    }
  },
  
  // Antibiotics
  'amoxicillin': {
    'warfarin': {
      severity: 'medium',
      description: 'May increase warfarin effect',
      recommendation: 'Monitor INR levels closely'
    },
    'birth control': {
      severity: 'medium',
      description: 'May reduce effectiveness of oral contraceptives',
      recommendation: 'Use backup contraception during treatment'
    }
  },
  
  // Heart & Blood Pressure
  'lisinopril': {
    'ibuprofen': {
      severity: 'medium',
      description: 'Reduced blood pressure control',
      recommendation: 'Monitor blood pressure, adjust dosage if needed'
    }
  },
  
  // Diabetes
  'metformin': {
    'alcohol': {
      severity: 'high',
      description: 'Risk of lactic acidosis',
      recommendation: 'Avoid alcohol consumption'
    }
  },
  
  // Mental Health
  'sertraline': {
    'ibuprofen': {
      severity: 'medium',
      description: 'Increased bleeding risk',
      recommendation: 'Use caution, monitor for bruising'
    },
    'alcohol': {
      severity: 'medium',
      description: 'Increased drowsiness and impairment',
      recommendation: 'Avoid alcohol while taking this medication'
    }
  },
  
  // Blood Thinners
  'warfarin': {
    'aspirin': {
      severity: 'high',
      description: 'Severely increased bleeding risk',
      recommendation: 'Avoid combination, use alternative pain relief'
    },
    'vitamin k': {
      severity: 'medium',
      description: 'Reduced warfarin effectiveness',
      recommendation: 'Maintain consistent vitamin K intake'
    }
  }
};

const DrugInteractionChecker: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [currentMed, setCurrentMed] = useState('');
  const [currentDosage, setCurrentDosage] = useState('');
  const [currentFrequency, setCurrentFrequency] = useState('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  const addMedication = () => {
    if (currentMed.trim()) {
      const newMed: Medication = {
        id: Date.now().toString(),
        name: currentMed.toLowerCase(),
        dosage: currentDosage,
        frequency: currentFrequency
      };
      
      const updatedMeds = [...medications, newMed];
      setMedications(updatedMeds);
      checkInteractions(updatedMeds);
      
      setCurrentMed('');
      setCurrentDosage('');
      setCurrentFrequency('');
    }
  };

  const removeMedication = (id: string) => {
    const updatedMeds = medications.filter(med => med.id !== id);
    setMedications(updatedMeds);
    checkInteractions(updatedMeds);
  };

  const checkInteractions = (meds: Medication[]) => {
    const foundInteractions: Interaction[] = [];
    
    // Check each combination of medications
    for (let i = 0; i < meds.length; i++) {
      for (let j = i + 1; j < meds.length; j++) {
        const med1 = meds[i].name;
        const med2 = meds[j].name;
        
        // Check both directions with proper type safety
        const interaction = 
          COMMON_INTERACTIONS[med1]?.[med2] || 
          COMMON_INTERACTIONS[med2]?.[med1];
        
        if (interaction) {
          foundInteractions.push({
            ...interaction,
            description: `${med1} + ${med2}: ${interaction.description}`
          });
        }
      }
    }
    
    setInteractions(foundInteractions);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200';
      case 'low': return 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200';
      default: return 'bg-gray-100 border-gray-500 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <Skull className="inline w-4 h-4 mr-2" />;
      case 'medium': return <AlertTriangle className="inline w-4 h-4 mr-2" />;
      case 'low': return <AlertCircle className="inline w-4 h-4 mr-2" />;
      default: return <Info className="inline w-4 h-4 mr-2" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center">
        <Pill className="w-5 h-5 mr-2 text-purple-600" />
        Drug Interaction Checker
      </h2>

      {/* Add Medication Form */}
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Medication name"
            value={currentMed}
            onChange={(e) => setCurrentMed(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            placeholder="Dosage (e.g., 500mg)"
            value={currentDosage}
            onChange={(e) => setCurrentDosage(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            placeholder="Frequency (e.g., 2x daily)"
            value={currentFrequency}
            onChange={(e) => setCurrentFrequency(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          onClick={addMedication}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition w-full flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Medication
        </button>
      </div>

      {/* Current Medications */}
      {medications.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100 flex items-center">
            <Pill className="w-4 h-4 mr-2 text-blue-600" />
            Your Medications:
          </h3>
          <div className="space-y-2">
            {medications.map((med) => (
              <div
                key={med.id}
                className="flex justify-between items-center p-3 bg-blue-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center">
                  <Pill className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium capitalize">{med.name}</span>
                  {med.dosage && <span> - {med.dosage}</span>}
                  {med.frequency && <span> ({med.frequency})</span>}
                </div>
                <button
                  onClick={() => removeMedication(med.id)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interaction Results */}
      {interactions.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
            Potential Interactions Found:
          </h3>
          <div className="space-y-3">
            {interactions.map((interaction, index) => (
              <div
                key={index}
                className={`p-4 border-l-4 rounded-r-lg ${getSeverityColor(interaction.severity)}`}
              >
                <div className="font-semibold capitalize">
                  {getSeverityIcon(interaction.severity)} {interaction.severity.toUpperCase()} RISK
                </div>
                <p className="mt-1">{interaction.description}</p>
                <p className="mt-2 text-sm font-medium flex items-start">
                  <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Recommendation: {interaction.recommendation}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {medications.length >= 2 && interactions.length === 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg flex items-center">
          <Check className="w-5 h-5 mr-3 text-green-600 dark:text-green-400" />
          <p className="text-green-800 dark:text-green-200">
            No significant interactions detected between your medications.
            Always consult your pharmacist for complete interaction checking.
          </p>
        </div>
      )}

      {medications.length === 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg text-center flex items-center justify-center">
          <Pill className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
          <p className="text-blue-800 dark:text-blue-200">
            Add your medications above to check for potential interactions.
          </p>
        </div>
      )}

      {/* Safety Disclaimer */}
      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 flex items-start">
        <Shield className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
        <p>
          <strong>Important:</strong> This checker uses common interaction data. 
          Always consult your healthcare provider or pharmacist for complete medication safety review.
        </p>
      </div>
    </div>
  );
};

export default DrugInteractionChecker;