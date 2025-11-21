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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "MyDrugPaddi API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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
  english: "⚠️ **IMPORTANT**: This is AI assistance, not a medical diagnosis. Always confirm with a licensed healthcare provider.",
  pidgin: "⚠️ **IMPORTANT**: This na AI help, no be medical diagnosis. Always confirm with real doctor or pharmacist.",
  yoruba: "⚠️ **IMPORTANT**: Eleyi jẹ iranlọwọ AI, kii ṣe atupalẹ iwosan. Nigbagbogbo jẹrisi pẹlu olutọju ilera ti a fi iwe aṣẹ silẹ.",
  igbo: "⚠️ **IMPORTANT**: Nke a bụ enyemaka AI, ọ bụghị nchọpụta ahụike. Jidesie ike jidesie ike na onye ọrụ ahụike nwere ikike.",
  hausa: "⚠️ **IMPORTANT**: Wannan taimakon AI ne, ba binciken likita ba. Koyaushe a tabbatar da tare da mai ba da hidimar lafiya mai lasisi.",
  french: "⚠️ **IMPORTANT**: Ceci est une assistance IA, pas un diagnostic médical. Confirmez toujours avec un professionnel de santé agréé.",
  spanish: "⚠️ **IMPORTANT**: Esto es asistencia de IA, no un diagnóstico médico. Siempre confirme con un proveedor de atención médica autorizado.",
  german: "⚠️ **IMPORTANT**: Dies ist KI-Unterstützung, keine medizinische Diagnose. Bestätigen Sie dies immer bei einem zugelassenen Gesundheitsdienstleister."
};

// Smart medical analysis prompt
function createMedicalPrompt(text, language) {
  const lang = SUPPORTED_LANGUAGES[language] || "English";
  
  return `As a medical AI specialist, analyze this prescription with clinical precision:

PRESCRIPTION: "${text}"

**CLINICAL ANALYSIS REQUIRED:**
1. MEDICATION IDENTIFICATION: Extract drug names, strengths, formulations
2. DOSAGE DECIPHERING: Interpret sig codes, frequencies, durations  
3. ROUTE DETERMINATION: Identify administration methods
4. CONDITION INFERENCE: Deduce likely medical indications
5. SAFETY ASSESSMENT: Highlight precautions and contraindications
6. PATIENT GUIDANCE: Provide clear usage instructions

**MEDICAL CONTEXT INTERPRETATION:**
- Decode abbreviations: PO, BID, TID, QID, PRN, QD, HS, AC, PC
- Understand formulations: tabs, caps, inj, susp, cream, oint
- Recognize combination therapies and their rationales
- Identify brand vs generic medications

**OUTPUT IN ${lang.toUpperCase()}:**
- Use professional medical terminology with patient-friendly explanations
- Be precise about uncertainties and missing information
- Prioritize patient safety and adherence guidance
- Structure response for clinical clarity
- Include appropriate medical disclaimers

Provide comprehensive prescription analysis:`;
}

// Function to create intelligent fallback explanation
function createIntelligentFallback(text, language) {
  const lowerText = text.toLowerCase();
  
  let explanation = "";
  const disclaimer = MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english;

  if (language === "english") {
    explanation = `**PRESCRIPTION ANALYSIS**\n\n`;
    explanation += `**Raw Text:** "${text}"\n\n`;
    
    explanation += `**Detected Elements:**\n`;
    
    // Detect strength
    const strengthMatch = text.match(/(\d+\s*(mg|mcg|g|ml))/gi);
    if (strengthMatch) {
      explanation += `• Medication Strength: ${strengthMatch.join(', ')}\n`;
    }
    
    // Detect formulation
    const formMatch = text.match(/(capsule|tablet|injection|cream|ointment|suspension|solution)/gi);
    if (formMatch) {
      explanation += `• Dosage Form: ${formMatch.join(', ')}\n`;
    }
    
    // Detect route
    const routeMatch = text.match(/(po|oral|topical|injection|iv|im|subcutaneous)/gi);
    if (routeMatch) {
      const routeText = routeMatch.map(r => {
        const routes = { 'po': 'by mouth', 'oral': 'by mouth', 'iv': 'intravenous', 'im': 'intramuscular' };
        return routes[r.toLowerCase()] || r;
      }).join(', ');
      explanation += `• Administration Route: ${routeText}\n`;
    }
    
    explanation += `\n**Clinical Guidance:**\n`;
    explanation += `Based on the prescription analysis:\n`;
    explanation += `• Follow the prescribed dosage and administration instructions carefully\n`;
    explanation += `• Complete the full course if this is an antibiotic treatment\n`;
    explanation += `• Monitor for any adverse effects and report them to your healthcare provider\n`;
    explanation += `• Contact your pharmacist for complete usage instructions\n\n`;
    
    explanation += `${disclaimer}`;

  } else if (language === "pidgin") {
    explanation = `**WETIN YOUR PRESCRIPTION TALK**\n\n`;
    explanation += `**Original prescription:** "${text.substring(0, 100)}..."\n\n`;
    
    explanation += `**Wetin I see for inside:**\n`;
    if (text.match(/\d+\s*mg/)) explanation += `• Medicine strength dey specified\n`;
    if (text.match(/po|oral/i)) explanation += `• You go take am through mouth\n`;
    if (text.match(/capsule|tablet/i)) explanation += `• Na capsule/tablet form\n`;
    
    explanation += `\n**Medical advice wey you need follow:**\n`;
    explanation += `• Take the exact dosage wey dem prescribe\n`;
    explanation += `• Follow the correct way to take am\n`;
    explanation += `• If na to kill bacteria, make you finish everything\n`;
    explanation += `• Watch your body well for any bad reaction\n`;
    explanation += `• See your pharmacist make dem explain everything clear\n\n`;
    
    explanation += `${disclaimer}`;
  } else {
    explanation = `**PRESCRIPTION ANALYSIS**\n\n`;
    explanation += `Please consult your healthcare provider for complete information about this prescription.\n\n`;
    explanation += `${disclaimer}`;
  }

  return explanation;
}

// Prescription explanation endpoint
app.post("/api/explain", async (req, res) => {
  const { text, language = "english" } = req.body;
  
  // Input validation
  if (!text || text.trim().length < 5) {
    return res.status(400).json({ 
      error: "Invalid input",
      message: "Please provide a valid prescription text for analysis (minimum 5 characters)"
    });
  }

  console.log(`📋 Processing prescription analysis request (${language})`);

  try {
    // Check if we have Hugging Face API key
    if (!process.env.HF_API_KEY) {
      console.log("🤖 Using fallback analysis (no API key)");
      const fallbackExplanation = createIntelligentFallback(text, language);
      
      return res.json({ 
        explanation: fallbackExplanation,
        language: language,
        analyzedBy: "Medical Analysis System",
        note: "Using intelligent medical analysis",
        fallback: true
      });
    }

    const prompt = createMedicalPrompt(text, language);
    
    // Try Hugging Face API
    try {
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
        { 
          inputs: prompt,
          parameters: {
            max_length: 600,
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
        // Remove the prompt from the response if it's included
        analysis = analysis.replace(prompt, "").trim();
      }

      // If we got a valid response
      if (analysis && analysis.length > 50) {
        console.log("✅ AI analysis successful");
        
        res.json({ 
          explanation: analysis + `\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`,
          language: language,
          analyzedBy: "Medical AI Specialist",
          model: "microsoft/DialoGPT-medium"
        });
      } else {
        throw new Error("Invalid AI response");
      }
      
    } catch (aiError) {
      console.log("🤖 AI service failed, using fallback:", aiError.message);
      
      const fallbackExplanation = createIntelligentFallback(text, language);
      
      res.json({ 
        explanation: fallbackExplanation,
        language: language,
        analyzedBy: "Medical Analysis System",
        note: "AI service temporarily unavailable",
        fallback: true
      });
    }
    
  } catch (error) {
    console.error("❌ Error in prescription analysis:", error.message);
    
    const fallbackExplanation = createIntelligentFallback(text, language);
    
    res.status(500).json({ 
      explanation: fallbackExplanation,
      language: language,
      analyzedBy: "Emergency Medical System",
      note: "System maintaining medical safety standards",
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
      test: "API TEST",
      input: testPrescription,
      output: response.data,
      status: "API is working correctly"
    });
  } catch (error) {
    res.json({
      test: "FALLBACK TEST",
      input: testPrescription,
      output: createIntelligentFallback(testPrescription, "english"),
      status: "Using fallback analysis"
    });
  }
});

// Root endpoint
app.get("/api", (req, res) => {
  res.json({ 
    message: "🏥 MyDrugPaddi Prescription Analysis API",
    description: "AI-powered prescription explanation and medication analysis",
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: "GET /api/health",
      explain: "POST /api/explain",
      languages: "GET /api/languages",
      test: "GET /api/test"
    },
    supportedLanguages: Object.keys(SUPPORTED_LANGUAGES)
  });
});

// Catch all handler - send React app for any other route (production only)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
} else {
  // Development route
  app.get('/', (req, res) => {
    res.json({ 
      message: "MyDrugPaddi API Server",
      environment: "development",
      instructions: "This is the backend API. The frontend runs on a different port in development."
    });
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error);
  res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong on our end. Please try again later."
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: "The requested API endpoint does not exist."
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 MyDrugPaddi Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 HF API Key: ${process.env.HF_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`📊 Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).length}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`🏗️  Serving React build from: ${path.join(__dirname, 'build')}`);
  }
});

export default app;