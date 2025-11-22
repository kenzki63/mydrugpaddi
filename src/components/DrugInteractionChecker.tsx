import React, { useState } from 'react'; 
import { 
  Pill, 
  AlertTriangle, 
  CheckCircle,
  Search,
  FileText,
  X,
  Sparkles,
  Shield
} from 'lucide-react';

interface Interaction {
  severity: 'high' | 'medium' | 'low';
  description: string;
  medications: string[];
}

interface DrugInteractionCheckerProps {}

const DrugInteractionChecker: React.FC<DrugInteractionCheckerProps> = () => {
  const [prescriptionText, setPrescriptionText] = useState('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');

  const analyzeInteractions = async () => {
    if (!prescriptionText.trim()) return;
    
    setIsAnalyzing(true);
    setInteractions([]);
    setAnalysisResult('');

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: prescriptionText,
          language: 'english'
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setAnalysisResult(data.explanation);
      
      // Extract interactions from the analysis
      extractInteractionsFromAnalysis(data.explanation);
      
    } catch (error) {
      console.error('Interaction analysis failed:', error);
      setAnalysisResult('Unable to analyze drug interactions at this time. Please try again later.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const extractInteractionsFromAnalysis = (analysis: string) => {
    const foundInteractions: Interaction[] = [];
    
    // Look for interaction patterns in the analysis
    if (analysis.includes('interaction') || analysis.includes('Interaction')) {
      const lines = analysis.split('\n');
      
      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        // High severity patterns
        if (lowerLine.includes('severe') || lowerLine.includes('high risk') || lowerLine.includes('dangerous')) {
          const meds = extractMedicationsFromLine(line);
          if (meds.length >= 2) {
            foundInteractions.push({
              severity: 'high',
              description: line.trim(),
              medications: meds
            });
          }
        }
        // Medium severity patterns
        else if (lowerLine.includes('moderate') || lowerLine.includes('medium risk') || lowerLine.includes('caution')) {
          const meds = extractMedicationsFromLine(line);
          if (meds.length >= 2) {
            foundInteractions.push({
              severity: 'medium',
              description: line.trim(),
              medications: meds
            });
          }
        }
        // Low severity patterns
        else if (lowerLine.includes('interaction') && (lowerLine.includes('minor') || lowerLine.includes('low risk'))) {
          const meds = extractMedicationsFromLine(line);
          if (meds.length >= 2) {
            foundInteractions.push({
              severity: 'low',
              description: line.trim(),
              medications: meds
            });
          }
        }
      });
    }

    setInteractions(foundInteractions);
  };

  const extractMedicationsFromLine = (line: string): string[] => {
    const commonMeds = [
      'paracetamol', 'ibuprofen', 'amoxicillin', 'warfarin', 'metformin',
      'lisinopril', 'aspirin', 'sertraline', 'atorvastatin', 'omeprazole',
      'levothyroxine', 'metoprolol', 'simvastatin', 'losartan', 'amlodipine'
    ];
    
    const found: string[] = [];
    const lowerLine = line.toLowerCase();
    
    commonMeds.forEach(med => {
      if (lowerLine.includes(med)) {
        found.push(med.charAt(0).toUpperCase() + med.slice(1));
      }
    });
    
    return found;
  };

  const clearAnalysis = () => {
    setPrescriptionText('');
    setInteractions([]);
    setAnalysisResult('');
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
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'medium': return <Shield className="w-5 h-5" />;
      case 'low': return <CheckCircle className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const formatAnalysisResult = (text: string) => {
    if (!text) return null;

    const sections = text.split(/\n(?=[A-Z][A-Za-z\s]+:)/);
    
    return sections.map((section, index) => {
      const [header, ...content] = section.split('\n');
      const cleanContent = content.filter(line => line.trim()).join('\n');
      
      return (
        <div key={index} className="mb-4">
          <div className="flex items-center mb-2">
            {header.includes('INTERACTIONS') && <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />}
            {header.includes('SAFETY') && <Shield className="w-4 h-4 mr-2 text-yellow-600" />}
            {header.includes('MEDICATIONS') && <Pill className="w-4 h-4 mr-2 text-blue-600" />}
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {header.replace(':', '')}
            </h3>
          </div>
          <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {cleanContent.split('\n').map((line, lineIndex) => (
              <div key={lineIndex} className="flex items-start mb-1">
                {line.trim().startsWith('-') || line.trim().startsWith('•') ? (
                  <>
                    <span className="text-gray-400 mr-2">•</span>
                    <span>{line.replace(/^[-•]\s*/, '')}</span>
                  </>
                ) : (
                  <span>{line}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Pill className="w-5 h-5 mr-2 text-purple-600" />
          Drug Interaction Checker
        </h2>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">
            Gemini 2.5 Flash
          </span>
        </div>
      </div>

      {/* Prescription Input */}
      <div className="space-y-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
          <FileText className="w-4 h-4 inline mr-2" />
          Paste Prescription to Check Interactions:
        </label>
        <textarea
          value={prescriptionText}
          onChange={(e) => setPrescriptionText(e.target.value)}
          placeholder="Paste your prescription text here to check for drug interactions...

Example: 
RX: Amoxicillin 500mg capsules
RX: Ibuprofen 400mg tablets
Sig: Take 1 capsule three times daily
Disp: #30
Refills: 0"
          rows={6}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
        />
        
        <div className="flex gap-3">
          <button
            onClick={analyzeInteractions}
            disabled={!prescriptionText.trim() || isAnalyzing}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center justify-center font-medium shadow-lg hover:shadow-xl"
          >
            <Search className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Check Interactions'}
          </button>
          
          <button
            onClick={clearAnalysis}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interaction Alerts */}
      {interactions.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
            Interaction Alerts
          </h3>
          <div className="space-y-3">
            {interactions.map((interaction, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 ${getSeverityColor(interaction.severity)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getSeverityIcon(interaction.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">
                        {interaction.severity} Risk Interaction
                      </span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-white dark:bg-gray-800">
                        {interaction.medications.join(' + ')}
                      </span>
                    </div>
                    <p className="text-sm">{interaction.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {analysisResult && (
        <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-blue-800 dark:text-blue-200">
                Safety Analysis
              </h3>
            </div>
            <span className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
              AI Powered
            </span>
          </div>
          
          <div className="space-y-3 text-sm leading-relaxed">
            {formatAnalysisResult(analysisResult)}
          </div>

          {interactions.length === 0 && !analysisResult.includes('interaction') && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-green-800 dark:text-green-200 text-sm font-medium">
                  No significant drug interactions detected
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results State */}
      {!analysisResult && !isAnalyzing && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Pill className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">Enter prescription text to check for drug interactions</p>
        </div>
      )}
    </div>
  );
};

export default DrugInteractionChecker;