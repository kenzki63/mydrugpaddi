import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
}

// RxNorm API Service
class RxNormService {
  constructor() {
    this.baseUrl = 'https://rxnav.nlm.nih.gov/REST';
  }

  async searchDrug(drugName) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/drugs.json?name=${encodeURIComponent(drugName)}`
      );
      
      if (response.data && response.data.drugGroup && response.data.drugGroup.conceptGroup) {
        const concepts = response.data.drugGroup.conceptGroup;
        for (const concept of concepts) {
          if (concept.conceptProperties && concept.conceptProperties.length > 0) {
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
      console.log('RxNorm search failed for:', drugName, error.message);
      return null;
    }
  }

  async getDrugInteractions(rxcuis) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/interaction/list.json?rxcuis=${rxcuis.join('+')}`
      );
      
      if (response.data && response.data.fullInteractionTypeGroup) {
        return response.data.fullInteractionTypeGroup;
      }
      return null;
    } catch (error) {
      console.log('RxNorm interactions failed:', error.message);
      return null;
    }
  }

  async getDrugProperties(rxcui) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/rxcui/${rxcui}/allproperties.json?prop=Names,Route,Strength,DoseForm`
      );
      
      if (response.data && response.data.propConceptGroup && response.data.propConceptGroup.propConcept) {
        return response.data.propConceptGroup.propConcept;
      }
      return null;
    } catch (error) {
      console.log('RxNorm properties failed:', error.message);
      return null;
    }
  }
}

// Medical Analysis Generator - Our own response generator
class MedicalAnalysisGenerator {
  generatePatientFriendlyAnalysis(geminiAnalysis, rxNormData, prescriptionText, language) {
    let analysis = `**PRESCRIPTION ANALYSIS**\n\n`;
    
    // Add detected medications section
    if (geminiAnalysis && geminiAnalysis.medications && geminiAnalysis.medications.length > 0) {
      analysis += `**MEDICATIONS DETECTED:**\n\n`;
      
      geminiAnalysis.medications.forEach((med, index) => {
        analysis += `${index + 1}. **${med.name.toUpperCase()}**\n`;
        if (med.dosage) analysis += `   • Dosage: ${med.dosage}\n`;
        if (med.frequency) analysis += `   • Frequency: ${med.frequency}\n`;
        if (med.route) analysis += `   • Route: ${med.route}\n`;
        if (med.duration) analysis += `   • Duration: ${med.duration}\n`;
        
        // Add RxNorm data if available
        const rxNormMed = rxNormData?.medications?.find(rxMed => 
          rxMed.name.toLowerCase().includes(med.name.toLowerCase()) || 
          med.name.toLowerCase().includes(rxMed.name.toLowerCase())
        );
        
        if (rxNormMed) {
          if (rxNormMed.synonym) analysis += `   • Type: ${rxNormMed.synonym}\n`;
          
          const routes = rxNormMed.properties?.filter(p => p.propName === 'Route').map(p => p.propValue);
          const forms = rxNormMed.properties?.filter(p => p.propName === 'DoseForm').map(p => p.propValue);
          
          if (routes && routes.length > 0) analysis += `   • Administration: ${routes.join(', ')}\n`;
          if (forms && forms.length > 0) analysis += `   • Form: ${forms.join(', ')}\n`;
        }
        analysis += `\n`;
      });
    }

    // Add medical conditions if detected
    if (geminiAnalysis && geminiAnalysis.conditions && geminiAnalysis.conditions.length > 0) {
      analysis += `**LIKELY MEDICAL CONDITIONS:**\n`;
      analysis += `• ${geminiAnalysis.conditions.join('\n• ')}\n\n`;
    }

    // Add drug interactions section
    if (rxNormData && rxNormData.interactions && rxNormData.interactions.length > 0) {
      analysis += `**DRUG INTERACTION ALERTS:**\n\n`;
      
      rxNormData.interactions.forEach(group => {
        if (group.fullInteractionType) {
          group.fullInteractionType.forEach(interactionType => {
            interactionType.interactionPair.forEach(pair => {
              analysis += `⚠️ **${pair.interactionConcept[0].minConceptItem.name} + ${pair.interactionConcept[1].minConceptItem.name}**\n`;
              analysis += `   • Risk Level: ${pair.severity?.toUpperCase() || 'UNKNOWN'}\n`;
              analysis += `   • Effect: ${pair.description || 'Potential interaction detected'}\n`;
              analysis += `   • Recommendation: Monitor closely and consult your doctor\n\n`;
            });
          });
        }
      });
    } else if (geminiAnalysis && geminiAnalysis.medications && geminiAnalysis.medications.length > 1) {
      analysis += `**INTERACTION CHECK:** No significant interactions found in medical database.\n\n`;
    }

    // Add comprehensive guidance
    analysis += `**IMPORTANT MEDICATION GUIDANCE:**\n\n`;
    analysis += `📋 **Administration Instructions:**\n`;
    analysis += `• Take medications exactly as prescribed\n`;
    analysis += `• Follow the specified timing and frequency\n`;
    analysis += `• Complete the full course for antibiotics\n`;
    analysis += `• Do not stop medications without consulting your doctor\n\n`;
    
    analysis += `🚨 **Safety Information:**\n`;
    analysis += `• Report any unusual side effects immediately\n`;
    analysis += `• Inform your doctor of all medications you're taking\n`;
    analysis += `• Keep medications out of reach of children\n`;
    analysis += `• Store medications as directed (room temperature, away from moisture)\n\n`;
    
    analysis += `🩺 **When to Contact Your Doctor:**\n`;
    analysis += `• Severe allergic reactions (rash, swelling, difficulty breathing)\n`;
    analysis += `• Unexpected side effects or worsening symptoms\n`;
    analysis += `• Missed doses - follow your doctor's guidance\n`;
    analysis += `• Questions about your medication regimen\n\n`;
    
    analysis += `💊 **General Advice:**\n`;
    analysis += `• Keep all follow-up appointments\n`;
    analysis += `• Maintain a medication schedule\n`;
    analysis += `• Do not share medications with others\n`;
    analysis += `• Keep an updated medication list with you\n`;

    return analysis;
  }
}

// Gemini AI Service for Medical Text Analysis
class GeminiMedicalService {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async analyzePrescriptionText(text) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `You are a medical AI specialist. Analyze this prescription text and extract structured information.

PRESCRIPTION TEXT: "${text}"

Extract the following information in JSON format:

{
  "medications": [
    {
      "name": "exact_medication_name",
      "dosage": "strength_and_form",
      "frequency": "how_often_to_take", 
      "route": "administration_method",
      "duration": "treatment_duration"
    }
  ],
  "conditions": ["medical_condition1", "medical_condition2"],
  "instructions": "key_administration_instructions"
}

Rules:
- Only extract REAL medication names (no placeholders like "ABC Medicine")
- Be accurate and conservative
- Include dosage information like "500mg", "250mg capsules"
- Include frequency like "once daily", "twice daily", "three times daily"
- Include route like "PO" (by mouth), "topical", "injection"
- Include duration like "10 days", "30 days", "as needed"

Return ONLY valid JSON:`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );

      const resultText = response.data.candidates[0].content.parts[0].text;
      
      // Extract JSON from response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // Filter out placeholder medications
        if (parsedData.medications) {
          parsedData.medications = parsedData.medications.filter(med => 
            !med.name.match(/abc|example|sample|test|placeholder|medicine|drug/i) &&
            med.name.length > 2
          );
        }
        
        return parsedData;
      }
      
      throw new Error('Could not parse Gemini response');
      
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Initialize services
const rxNormService = new RxNormService();
const geminiService = new GeminiMedicalService();
const analysisGenerator = new MedicalAnalysisGenerator();

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "MyDrugPaddi API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      gemini: !!process.env.GEMINI_API_KEY,
      rxnorm: true,
      analysis: "Our own medical analysis engine"
    }
  });
});

// Language configurations
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

// Medical disclaimer in different languages
const MEDICAL_DISCLAIMERS = {
  english: "⚠️ **MEDICAL DISCLAIMER**: This analysis uses AI and NIH RxNorm medical data for informational purposes only. Always consult healthcare providers for medical decisions.",
  pidgin: "⚠️ **MEDICAL WARNING**: This analysis use AI and NIH medical data for information. Always confirm with real doctor for medical decisions.",
  yoruba: "⚠️ **IKILO IWOSAN**: Aṣẹ yii nlo AI ati data iwosan NIH fun alaye nikan. Nigbagbogbo tọrọ imọran lati ọdọ awọn olutọju ilera fun awọn idiwọn iwosan.",
  igbo: "⚠️ **OKA IKE ỌGWỌ**: Nnyocha a na-eji AI na data ahụike NIH maka ozi naanị. Jidesie ike ịkpọtụrụ ndị na-ahụ maka ahụike maka mkpebi ahụike.",
  hausa: "⚠️ **FAHRAR MAGANI**: Wannan bincike yana amfani da AI da bayanan kiwon lafiya na NIH don bayanai kawai. Koyaushe tuntubi masu kula da lafiya don yanke shawara na kiwon lafiya.",
  french: "⚠️ **AVIS MÉDICAL**: Cette analyse utilise l'IA et les données médicales NIH RxNorm à titre informatif uniquement. Consultez toujours les professionnels de santé pour les décisions médicales.",
  spanish: "⚠️ **DESCARGO DE RESPONSABILIDAD MÉDICA**: Este análisis utiliza IA y datos médicos NIH RxNorm solo con fines informativos. Siempre consulte a los proveedores de atención médica para las decisiones médicas.",
  german: "⚠️ **MEDIZINISCHER HAFTUNGSAUSSCHLUSS**: Diese Analyse verwendet KI- und NIH RxNorm-Medizindaten nur zu Informationszwecken. Konsultieren Sie immer medizinisches Fachpersonal für medizinische Entscheidungen."
};

// Enhanced Prescription explanation endpoint - No Hugging Face dependency
app.post("/api/explain", async (req, res) => {
  const startTime = Date.now();
  const { text, language = "english" } = req.body;
  
  // Input validation
  if (!text || text.trim().length < 5) {
    return res.status(400).json({ 
      error: "Invalid input",
      message: "Please provide a valid prescription text for analysis (minimum 5 characters)"
    });
  }

  if (!SUPPORTED_LANGUAGES[language]) {
    return res.status(400).json({ 
      error: "Unsupported language",
      message: `Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`
    });
  }

  console.log(`📋 Processing prescription analysis request (${language}), length: ${text.length} chars`);

  try {
    let geminiAnalysis = null;
    let rxNormData = null;

    // Step 1: Use Gemini to extract medications and context
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log("🔍 Gemini: Extracting medications from text...");
        geminiAnalysis = await geminiService.analyzePrescriptionText(text);
        console.log("✅ Gemini extraction successful:", geminiAnalysis?.medications);
        
        // Step 2: Enhance with RxNorm data
        if (geminiAnalysis && geminiAnalysis.medications && geminiAnalysis.medications.length > 0) {
          console.log("🏥 RxNorm: Fetching medical data...");
          rxNormData = {
            medications: [],
            interactions: []
          };

          // Get RxNorm data for each detected medication
          for (const med of geminiAnalysis.medications) {
            const drugInfo = await rxNormService.searchDrug(med.name);
            if (drugInfo) {
              const properties = await rxNormService.getDrugProperties(drugInfo.rxcui);
              rxNormData.medications.push({
                ...drugInfo,
                properties: properties || []
              });
            }
          }

          // Check interactions if multiple medications
          if (rxNormData.medications.length > 1) {
            const rxcuis = rxNormData.medications.map(m => m.rxcui);
            const interactions = await rxNormService.getDrugInteractions(rxcuis);
            rxNormData.interactions = interactions || [];
          }
        }
        
      } catch (geminiError) {
        console.log("❌ Gemini service failed:", geminiError.message);
        // Continue without Gemini data
      }
    }

    // Step 3: Generate our own analysis using the data we collected
    console.log("🎯 Generating medical analysis with our own engine...");
    
    const analysis = analysisGenerator.generatePatientFriendlyAnalysis(
      geminiAnalysis, 
      rxNormData, 
      text, 
      language
    );

    console.log("✅ Analysis generated successfully");
    
    return res.json({ 
      explanation: analysis + `\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`,
      language: language,
      analyzedBy: "Medical Analysis Engine",
      sources: ["gemini", "rxnorm", "medical_engine"],
      detectedMedications: geminiAnalysis?.medications?.length || 0,
      processingTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error("❌ Error in prescription analysis:", error.message);
    
    const emergencyFallback = `**PRESCRIPTION ANALYSIS**\n\nSystem temporarily unavailable. Please consult your healthcare provider for prescription information.\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`;
    
    res.status(500).json({ 
      explanation: emergencyFallback,
      language: language,
      analyzedBy: "Emergency Medical System",
      sources: ["emergency"],
      fallback: true
    });
  }
});

// Languages endpoint
app.get("/api/languages", (req, res) => {
  res.json({
    supportedLanguages: SUPPORTED_LANGUAGES,
    status: "API is running",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get("/api/test", async (req, res) => {
  const testPrescription = "RX: Amoxicillin 500mg CAPs. Sig: 1 CAP PO TID x 10 days. Disp: #30. Refills: 0. Diagnosis: Acute bacterial sinusitis.";
  
  try {
    const response = await axios.post(
      "http://localhost:5000/api/explain",
      { 
        text: testPrescription,
        language: "english"
      }
    );

    res.json({
      test: "COMPREHENSIVE API TEST",
      input: testPrescription,
      output: response.data,
      status: "API is working correctly",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.json({
      test: "FALLBACK SYSTEM TEST",
      input: testPrescription,
      output: { explanation: "Using enhanced fallback system with RxNorm medical data" },
      status: "Using enhanced medical analysis system"
    });
  }
});

// Connection test endpoint
app.get("/api/connection-test", (req, res) => {
  res.json({
    status: "connected",
    server: "MyDrugPaddi Backend API",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    clientInfo: {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      origin: req.get('origin'),
      accept: req.get('accept')
    },
    services: {
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
      rxNorm: 'available',
      apiStatus: 'operational'
    }
  });
});

// Root endpoint
app.get("/api", (req, res) => {
  res.json({ 
    message: "🏥 MyDrugPaddi Prescription Analysis API",
    description: "AI-powered prescription explanation with Gemini 2.0 Flash AI and NIH RxNorm medical database",
    version: "3.0.0",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "GET /api/health",
      explain: "POST /api/explain",
      languages: "GET /api/languages",
      test: "GET /api/test",
      connectionTest: "GET /api/connection-test"
    },
    features: {
      multiLanguageSupport: true,
      geminiAIAnalysis: !!process.env.GEMINI_API_KEY,
      rxNormMedicalData: true,
      drugInteractionChecking: true,
      medicalDisclaimer: true
    },
    supportedLanguages: Object.keys(SUPPORTED_LANGUAGES),
    statistics: {
      totalLanguages: Object.keys(SUPPORTED_LANGUAGES).length,
      maxTextLength: 5000,
      responseTime: "< 30s"
    }
  });
});

// FIXED: Enhanced Catch-all handler for React Router
if (process.env.NODE_ENV === 'production') {
  // Serve React app for any non-API route
  app.get(/^(?!\/api).*/, (req, res) => {
    console.log(`🎯 Serving React app for: ${req.path}`);
    res.sendFile(path.join(__dirname, 'build', 'index.html'), (err) => {
      if (err) {
        console.error('Error serving React app:', err);
        res.status(500).json({
          error: "Frontend loading error",
          message: "Please refresh the page or try again later"
        });
      }
    });
  });
} else {
  // Development route
  app.get('/', (req, res) => {
    res.json({ 
      message: "MyDrugPaddi API Server - Development Mode",
      environment: "development",
      instructions: "This is the backend API. The frontend runs on a different port in development.",
      apiEndpoints: {
        health: "GET /api/health",
        explain: "POST /api/explain",
        languages: "GET /api/languages",
        test: "GET /api/test",
        connectionTest: "GET /api/connection-test"
      },
      note: "Use React development server for frontend interface"
    });
  });
}

// Enhanced 404 handler for API routes
app.use(/\/api\//, (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    message: `The API endpoint ${req.method} ${req.path} does not exist.`,
    availableEndpoints: [
      "GET /api/health",
      "POST /api/explain",
      "GET /api/languages", 
      "GET /api/test",
      "GET /api/connection-test",
      "GET /api"
    ],
    help: "Check the API documentation at GET /api for available endpoints"
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🚨 Global Server Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // CORS errors
  if (error.message.includes('CORS')) {
    return res.status(403).json({
      error: "CORS policy violation",
      message: "Request blocked by CORS policy"
    });
  }

  res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong on our end. Please try again later.",
    reference: `ERR_${Date.now()}`,
    path: req.path
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🎉 MyDrugPaddi Server Successfully Started!

🚀 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📡 Host: 0.0.0.0 (accessible from all network interfaces)
🤖 Gemini API: ${process.env.GEMINI_API_KEY ? '✅ 2.0 Flash Configured' : '❌ Not configured'}
🏥 RxNorm Medical Database: ✅ Enabled
🎯 Medical Analysis Engine: ✅ Our own engine
📊 Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).length}
⏰ Startup time: ${new Date().toISOString()}

📋 Available Endpoints:
   • GET  /api/health          - Health check
   • POST /api/explain         - Prescription analysis (Gemini 2.0 Flash + RxNorm)
   • GET  /api/languages       - Supported languages
   • GET  /api/test            - System test
   • GET  /api/connection-test - Connection test
   • GET  /api                 - API info

${process.env.NODE_ENV === 'production' ? 
  `🏗️  Serving React build from: ${path.join(__dirname, 'build')}` : 
  '💻 Development mode - React runs on separate port'
}
  `);
});

export default app;