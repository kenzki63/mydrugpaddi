import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
}

class RxNormService {
  constructor() {
    this.baseUrl = 'https://rxnav.nlm.nih.gov/REST';
  }

  async searchDrug(drugName) {
    try {
      const response = await axios.get(`${this.baseUrl}/drugs.json?name=${encodeURIComponent(drugName)}`);
      if (response.data?.drugGroup?.conceptGroup) {
        const concepts = response.data.drugGroup.conceptGroup;
        for (const concept of concepts) {
          if (concept.conceptProperties?.length > 0) {
            return {
              rxcui: concept.conceptProperties[0].rxcui,
              name: concept.conceptProperties[0].name,
              synonym: concept.conceptProperties[0].synonym
            };
          }
        }
      }
      return null;
    } catch (error) {
      console.log('RxNorm search failed:', drugName, error.message);
      return null;
    }
  }

  async getDrugInteractions(rxcuis) {
    try {
      const response = await axios.get(`${this.baseUrl}/interaction/list.json?rxcuis=${rxcuis.join('+')}`);
      return response.data?.fullInteractionTypeGroup || null;
    } catch (error) {
      console.log('RxNorm interactions failed:', error.message);
      return null;
    }
  }

  async getDrugProperties(rxcui) {
    try {
      const response = await axios.get(`${this.baseUrl}/rxcui/${rxcui}/allproperties.json?prop=Names,Route,Strength,DoseForm`);
      return response.data?.propConceptGroup?.propConcept || null;
    } catch (error) {
      console.log('RxNorm properties failed:', error.message);
      return null;
    }
  }
}

class GeminiMedicalService {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async callGeminiAPI(prompt) {
    if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');

    try {
      const response = await axios.post(
        `${this.baseUrl}/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw error;
    }
  }

  async extractMedications(text) {
    const prompt = `Extract prescription information as JSON from: "${text}"

Return JSON format:
{
  "medications": [
    {
      "name": "medication_name", 
      "dosage": "strength",
      "frequency": "how_often",
      "route": "administration", 
      "duration": "treatment_length"
    }
  ],
  "conditions": ["condition1"],
  "instructions": "key_instructions"
}

Only real medication names. No placeholders.`;

    const result = await this.callGeminiAPI(prompt);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (data.medications) {
        data.medications = data.medications.filter(med => 
          !med.name.match(/abc|example|sample|test|placeholder/i) && med.name.length > 2
        );
      }
      return data;
    }
    throw new Error('Could not parse Gemini response');
  }

  async generateExplanation(text, medications, rxNormData, language) {
    let medicalContext = '';
    
    if (rxNormData?.medications?.length > 0) {
      medicalContext = '\nMEDICAL DATA:\n';
      rxNormData.medications.forEach(med => {
        medicalContext += `- ${med.name}: ${med.synonym || 'Medication'}\n`;
        const routes = med.properties?.filter(p => p.propName === 'Route').map(p => p.propValue);
        const forms = med.properties?.filter(p => p.propName === 'DoseForm').map(p => p.propValue);
        if (routes?.length > 0) medicalContext += `  Route: ${routes.join(', ')}\n`;
        if (forms?.length > 0) medicalContext += `  Form: ${forms.join(', ')}\n`;
      });
    }

    if (rxNormData?.interactions?.length > 0) {
      medicalContext += '\nINTERACTIONS:\n';
      rxNormData.interactions.forEach(group => {
        group.fullInteractionType?.forEach(interactionType => {
          interactionType.interactionPair.forEach(pair => {
            medicalContext += `- ${pair.interactionConcept[0].minConceptItem.name} + ${pair.interactionConcept[1].minConceptItem.name}: ${pair.description}\n`;
          });
        });
      });
    }

    const prompt = `Create a clear, organized prescription explanation in ${language}.

PRESCRIPTION: "${text}"
${medicalContext}

Structure it clearly with these sections:

MEDICATIONS FOUND
[List each medication with purpose]

HOW TO TAKE
[Simple dosage instructions]

SAFETY INFORMATION  
[Important warnings and precautions]

INTERACTIONS TO WATCH FOR
[Any drug interaction alerts]

WHEN TO CALL YOUR DOCTOR
[Specific warning signs]

Keep it simple, organized, and easy to understand. No markdown.`;

    return await this.callGeminiAPI(prompt);
  }
}

const rxNormService = new RxNormService();
const geminiService = new GeminiMedicalService();

const SUPPORTED_LANGUAGES = {
  english: "English", 
  pidgin: "Nigerian Pidgin", 
  yoruba: "Yoruba", 
  igbo: "Igbo", 
  hausa: "Hausa", 
  french: "French", 
  spanish: "Spanish", 
  german: "German"
};

const MEDICAL_DISCLAIMERS = {
  english: "Important: For informational purposes only. Consult healthcare providers for medical decisions.",
  pidgin: "Important: Na for information only. Always confirm with real doctor.",
  yoruba: "Important: Fun alaye nikan. Berisọ pẹlu dokita fun awọn ipinnu itọju.",
  igbo: "Important: Maka ozi naanị. Kpọtụrụ ndị dọkịta maka mkpebi ahụike.",
  hausa: "Important: Don bayanai kawai. Tuntubi likita don yanke shawara na kiwon lafiya.",
  french: "Important: À titre informatif seulement. Consultez les professionnels de santé pour les décisions médicales.",
  spanish: "Important: Solo para fines informativos. Consulte a los proveedores de atención médica para decisiones médicas.",
  german: "Important: Nur zu Informationszwecken. Konsultieren Sie medizinisches Fachpersonal für medizinische Entscheidungen."
};

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "MyDrugPaddi API running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.post("/api/explain", async (req, res) => {
  const startTime = Date.now();
  const { text, language = "english" } = req.body;
  
  if (!text || text.trim().length < 5) {
    return res.status(400).json({ 
      error: "Invalid input",
      message: "Provide prescription text (minimum 5 characters)"
    });
  }

  if (!SUPPORTED_LANGUAGES[language]) {
    return res.status(400).json({ 
      error: "Unsupported language",
      message: `Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`
    });
  }

  console.log(`Processing prescription analysis (${language}), length: ${text.length} chars`);

  try {
    let geminiAnalysis = null;
    let rxNormData = null;

    if (process.env.GEMINI_API_KEY) {
      try {
        console.log("Gemini: Extracting medications...");
        geminiAnalysis = await geminiService.extractMedications(text);
        console.log("Medications found:", geminiAnalysis?.medications);
        
        if (geminiAnalysis?.medications?.length > 0) {
          console.log("RxNorm: Fetching medical data...");
          rxNormData = { medications: [], interactions: [] };

          for (const med of geminiAnalysis.medications) {
            const drugInfo = await rxNormService.searchDrug(med.name);
            if (drugInfo) {
              const properties = await rxNormService.getDrugProperties(drugInfo.rxcui);
              rxNormData.medications.push({ ...drugInfo, properties: properties || [] });
            }
          }

          if (rxNormData.medications.length > 1) {
            const rxcuis = rxNormData.medications.map(m => m.rxcui);
            const interactions = await rxNormService.getDrugInteractions(rxcuis);
            rxNormData.interactions = interactions || [];
          }
        }
      } catch (error) {
        console.log("Gemini extraction failed:", error.message);
      }
    }

    let finalExplanation = '';
    
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log("Gemini: Generating explanation...");
        finalExplanation = await geminiService.generateExplanation(text, geminiAnalysis?.medications, rxNormData, language);
        console.log("Explanation generated");
      } catch (error) {
        console.log("Gemini explanation failed:", error.message);
      }
    }

    if (!finalExplanation) {
      finalExplanation = `PRESCRIPTION ANALYSIS

Medications Detected:
${geminiAnalysis?.medications ? geminiAnalysis.medications.map(med => `- ${med.name}${med.dosage ? ` (${med.dosage})` : ''}${med.frequency ? ` - ${med.frequency}` : ''}`).join('\n') : 'No specific medications identified'}

Important Instructions:
• Take exactly as prescribed
• Complete full antibiotic courses
• Follow timing instructions carefully
• Do not stop without doctor consultation

Safety:
• Report unusual side effects
• Inform doctor of all medications
• Keep away from children

Contact Doctor If:
• Severe side effects occur
• Symptoms worsen
• Questions about medications`;
    }

    finalExplanation += `\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`;
    
    return res.json({ 
      explanation: finalExplanation,
      language: language,
      analyzedBy: "Medical AI System",
      detectedMedications: geminiAnalysis?.medications?.length || 0,
      processingTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error("Analysis error:", error.message);
    
    const emergencyFallback = `System temporarily unavailable. Please consult your healthcare provider.\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`;
    
    res.status(500).json({ 
      explanation: emergencyFallback,
      language: language,
      analyzedBy: "Emergency System"
    });
  }
});

app.get("/api/languages", (req, res) => {
  res.json({
    supportedLanguages: SUPPORTED_LANGUAGES,
    status: "API running",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV === 'production') {
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ 
      message: "MyDrugPaddi API - Development Mode",
      environment: "development"
    });
  });
}

app.use(/\/api\//, (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: `API endpoint ${req.method} ${req.path} does not exist.`
  });
});

app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong. Please try again later."
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
MyDrugPaddi Server Started
Port: ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
Gemini: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}
RxNorm: Enabled
Languages: ${Object.keys(SUPPORTED_LANGUAGES).length}
  `);
});

export default app;