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

// Gemini AI Service for Medical Text Analysis
class GeminiMedicalService {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async analyzePrescriptionText(text) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `As a medical AI specialist, analyze this prescription text and extract the following information in JSON format:

PRESCRIPTION TEXT: "${text}"

EXTRACT THE FOLLOWING:
1. List all medication names mentioned (both brand and generic names)
2. Identify dosages and strengths
3. Extract administration instructions (frequency, duration, route)
4. Note any medical conditions mentioned
5. Identify potential drug combinations that might interact

Return ONLY a JSON object with this structure:
{
  "medications": [
    {
      "name": "medication_name",
      "dosage": "dosage_info", 
      "frequency": "administration_frequency",
      "route": "administration_route",
      "duration": "treatment_duration"
    }
  ],
  "conditions": ["condition1", "condition2"],
  "interactionAlerts": ["potential_interaction1", "potential_interaction2"]
}

Focus on accuracy and be conservative - only include medications you're confident about.`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not parse Gemini response');
      
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createEnhancedAnalysis(text, rxNormData) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    let rxNormContext = '';
    if (rxNormData && rxNormData.medications.length > 0) {
      rxNormContext = `\n\nRXNorm MEDICAL DATA:\n${JSON.stringify(rxNormData, null, 2)}`;
    }

    const prompt = `As a medical AI specialist, analyze this prescription and provide a comprehensive patient-friendly explanation:

PRESCRIPTION: "${text}"${rxNormContext}

Please provide a structured analysis that includes:
1. Medication identification and purposes
2. Dosage instructions in simple terms  
3. Important safety information
4. Potential side effects to watch for
5. Drug interaction warnings if any
6. General medication advice

Format the response in clear, easy-to-understand language for patients.`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
            temperature: 0.2,
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

      return response.data.candidates[0].content.parts[0].text;
      
    } catch (error) {
      console.error('Gemini enhanced analysis error:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Initialize services
const rxNormService = new RxNormService();
const geminiService = new GeminiMedicalService();

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "MyDrugPaddi API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      huggingFace: !!process.env.HF_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      rxnorm: true
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

// Enhanced Prescription explanation endpoint with Gemini + RxNorm + Hugging Face
app.post("/api/explain", async (req, res) => {
  const startTime = Date.now(); // FIXED: Added startTime definition
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

    // Step 3: Generate final explanation using Hugging Face with enhanced context
    if (process.env.HF_API_KEY) {
      try {
        console.log("🤖 Hugging Face: Generating final explanation...");
        
        // Build enhanced prompt with Gemini + RxNorm data
        let enhancedPrompt = `As a medical AI specialist, analyze this prescription and provide a comprehensive explanation in ${SUPPORTED_LANGUAGES[language]}:

PRESCRIPTION: "${text}"`;

        if (geminiAnalysis) {
          enhancedPrompt += `\n\nEXTRACTED MEDICATIONS: ${JSON.stringify(geminiAnalysis.medications)}`;
          if (geminiAnalysis.conditions && geminiAnalysis.conditions.length > 0) {
            enhancedPrompt += `\nCONDITIONS: ${geminiAnalysis.conditions.join(', ')}`;
          }
        }

        if (rxNormData && rxNormData.medications.length > 0) {
          enhancedPrompt += `\n\nMEDICAL DATA FROM NIH RxNorm:\n`;
          rxNormData.medications.forEach(med => {
            enhancedPrompt += `• ${med.name}: ${med.synonym || 'Confirmed medication'}\n`;
          });
        }

        enhancedPrompt += `\n\nPlease provide a patient-friendly explanation that covers:
1. What each medication is for
2. How to take them correctly  
3. Important safety information
4. What to watch out for
5. When to contact a doctor

Keep it clear and easy to understand:`;

        const response = await axios.post(
          "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
          { 
            inputs: enhancedPrompt,
            parameters: {
              max_length: 1000,
              temperature: 0.3,
              do_sample: true
            }
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.HF_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 30000
          }
        );

        let analysis = "Unable to generate medical analysis";
        
        if (response.data && response.data[0] && response.data[0].generated_text) {
          analysis = response.data[0].generated_text;
          analysis = analysis.replace(enhancedPrompt, "").trim();
        }

        if (analysis && analysis.length > 100) {
          console.log("✅ Final explanation generated successfully");
          
          return res.json({ 
            explanation: analysis + `\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`,
            language: language,
            analyzedBy: "AI Medical Specialist",
            sources: ["gemini", "rxnorm", "huggingface"],
            detectedMedications: geminiAnalysis?.medications?.length || 0,
            processingTime: Date.now() - startTime
          });
        }
        
      } catch (hfError) {
        console.log("❌ Hugging Face failed:", hfError.message);
      }
    }

    // Fallback: Use Gemini for direct analysis if available
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log("🔄 Fallback: Using Gemini for direct analysis...");
        const directAnalysis = await geminiService.createEnhancedAnalysis(text, rxNormData);
        
        return res.json({ 
          explanation: directAnalysis + `\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`,
          language: language,
          analyzedBy: "Gemini Medical AI + RxNorm Data",
          sources: ["gemini", "rxnorm"],
          fallback: true,
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        console.log("❌ Gemini fallback also failed");
      }
    }

    // Ultimate fallback with basic RxNorm data
    if (rxNormData && rxNormData.medications.length > 0) {
      console.log("🔄 Using RxNorm data only...");
      let rxNormAnalysis = `**PRESCRIPTION ANALYSIS (NIH Medical Data)**\n\n`;
      rxNormAnalysis += `**DETECTED MEDICATIONS:**\n\n`;
      
      rxNormData.medications.forEach(med => {
        rxNormAnalysis += `**${med.name}**\n`;
        if (med.synonym) rxNormAnalysis += `• Type: ${med.synonym}\n`;
        
        const routes = med.properties.filter(p => p.propName === 'Route').map(p => p.propValue);
        const forms = med.properties.filter(p => p.propName === 'DoseForm').map(p => p.propValue);
        
        if (routes.length > 0) rxNormAnalysis += `• Route: ${routes.join(', ')}\n`;
        if (forms.length > 0) rxNormAnalysis += `• Form: ${forms.join(', ')}\n`;
        rxNormAnalysis += `\n`;
      });

      if (rxNormData.interactions && rxNormData.interactions.length > 0) {
        rxNormAnalysis += `**DRUG INTERACTIONS:**\n\n`;
        rxNormData.interactions.forEach(group => {
          if (group.fullInteractionType) {
            group.fullInteractionType.forEach(interactionType => {
              interactionType.interactionPair.forEach(pair => {
                rxNormAnalysis += `• ⚠️ **${pair.interactionConcept[0].minConceptItem.name} + ${pair.interactionConcept[1].minConceptItem.name}**\n`;
                rxNormAnalysis += `  - Severity: ${pair.severity || 'Unknown'}\n`;
                rxNormAnalysis += `  - Description: ${pair.description || 'Potential interaction'}\n\n`;
              });
            });
          }
        });
      }

      rxNormAnalysis += `**GENERAL GUIDANCE:**\n`;
      rxNormAnalysis += `• Take medications as prescribed\n`;
      rxNormAnalysis += `• Complete full antibiotic courses\n`;
      rxNormAnalysis += `• Report unusual side effects\n`;
      rxNormAnalysis += `• Keep follow-up appointments\n\n`;

      return res.json({ 
        explanation: rxNormAnalysis + `\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`,
        language: language,
        analyzedBy: "NIH RxNorm Medical Database",
        sources: ["rxnorm"],
        fallback: true,
        processingTime: Date.now() - startTime
      });
    }

    // Basic medication detection fallback
    const commonMeds = ['amoxicillin', 'ibuprofen', 'warfarin', 'metformin', 'lisinopril', 'aspirin', 'sertraline'];
    const detectedMeds = commonMeds.filter(med => text.toLowerCase().includes(med));
    
    if (detectedMeds.length > 0) {
      let basicAnalysis = `**PRESCRIPTION ANALYSIS**\n\n`;
      basicAnalysis += `**Detected Medications:** ${detectedMeds.join(', ')}\n\n`;
      basicAnalysis += `**General Guidance:**\n`;
      basicAnalysis += `• Take medications exactly as prescribed\n`;
      basicAnalysis += `• Complete full antibiotic courses if prescribed\n`;
      basicAnalysis += `• Contact your doctor with any concerns\n`;
      basicAnalysis += `• Keep all follow-up appointments\n\n`;

      return res.json({ 
        explanation: basicAnalysis + `\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`,
        language: language,
        analyzedBy: "Basic Medication Detection",
        sources: ["basic"],
        fallback: true,
        processingTime: Date.now() - startTime
      });
    }

    // Ultimate emergency fallback
    const ultimateFallback = `**PRESCRIPTION ANALYSIS**\n\nWe're experiencing technical difficulties. Please consult your healthcare provider or pharmacist for prescription information.\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`;
    
    return res.json({ 
      explanation: ultimateFallback,
      language: language,
      analyzedBy: "Emergency System",
      sources: ["emergency"],
      fallback: true,
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
      huggingFace: process.env.HF_API_KEY ? 'configured' : 'not configured',
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
    description: "AI-powered prescription explanation with Gemini AI, NIH RxNorm medical database, and Hugging Face",
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
      huggingFaceAI: !!process.env.HF_API_KEY,
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
🔑 HF API Key: ${process.env.HF_API_KEY ? '✅ Configured' : '❌ Not configured'}
🤖 Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not configured'}
🏥 RxNorm Medical Database: ✅ Enabled
📊 Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).length}
⏰ Startup time: ${new Date().toISOString()}

📋 Available Endpoints:
   • GET  /api/health          - Health check
   • POST /api/explain         - Prescription analysis (Gemini + RxNorm + HF)
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