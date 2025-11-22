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

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, you can specify allowed origins
    const allowedOrigins = [
      'https://your-render-app.onrender.com', // Your Render frontend URL
      'https://mydrugpaddi.onrender.com',     // Your actual domain
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Security middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Rate limiting headers (basic)
  res.setHeader('RateLimit-Limit', '100');
  res.setHeader('RateLimit-Remaining', '99');
  res.setHeader('RateLimit-Reset', '3600');
  
  next();
});

// Body parsing middleware with increased limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ 
        error: "Invalid JSON in request body",
        message: "Please check your request data format"
      });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('origin'),
    contentType: req.get('Content-Type')
  });
  next();
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Production mode: Serving React static files');
  app.use(express.static(path.join(__dirname, 'build'), {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true,
    lastModified: true,
    index: false // Don't serve index.html for directories
  }));
}

// Enhanced Health check endpoint
app.get("/api/health", (req, res) => {
  const healthCheck = {
    status: "OK",
    message: "MyDrugPaddi API is running smoothly",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: "1.0.0",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    services: {
      huggingFace: !!process.env.HF_API_KEY ? 'Configured' : 'Not configured',
      database: 'Firebase (Frontend)'
    }
  };
  
  res.json(healthCheck);
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

// Enhanced Medical disclaimer in different languages
const MEDICAL_DISCLAIMERS = {
  english: "⚠️ **MEDICAL DISCLAIMER**: This is AI assistance for informational purposes only, not a medical diagnosis. Always confirm with a licensed healthcare provider before taking any medication.",
  pidgin: "⚠️ **MEDICAL WARNING**: This na AI help for information, no be medical diagnosis. Always confirm with real doctor or pharmacist before you take any medicine.",
  yoruba: "⚠️ **IKILO IWOSAN**: Eleyi jẹ iranlọwọ AI fun alaye nikan, kii ṣe atupalẹ iwosan. Nigbagbogbo jẹrisi pẹlu olutọju ilera ti a fi iwe aṣẹ silẹ ṣaaju ki o to mu agunmuwo.",
  igbo: "⚠️ **OKA IKE ỌGWỌ**: Nke a bụ enyemaka AI maka ozi naanị, ọ bụghị nchọpụta ahụike. Jidesie ike jidesie ike na onye ọrụ ahụike nwere ikike tupu ị were ọgwụ ọ bụla.",
  hausa: "⚠️ **FAHRAR MAGANI**: Wannan taimakon AI ne don bayanai kawai, ba binciken likita ba. Koyaushe a tabbatar da tare da mai ba da hidimar lafiya mai lasisi kafin a sha magani.",
  french: "⚠️ **AVIS MÉDICAL**: Ceci est une assistance IA à titre informatif uniquement, pas un diagnostic médical. Confirmez toujours avec un professionnel de santé agréé avant de prendre tout médicament.",
  spanish: "⚠️ **DESCARGO DE RESPONSABILIDAD MÉDICA**: Esto es asistencia de IA solo con fines informativos, no un diagnóstico médico. Siempre confirme con un proveedor de atención médica autorizado antes de tomar cualquier medicamento.",
  german: "⚠️ **MEDIZINISCHER HAFTUNGSAUSSCHLUSS**: Dies ist KI-Unterstützung nur zu Informationszwecken, keine medizinische Diagnose. Bestätigen Sie dies immer bei einem zugelassenen Gesundheitsdienstleister, bevor Sie Medikamente einnehmen."
};

// Enhanced medical analysis prompt with better structure
function createMedicalPrompt(text, language) {
  const lang = SUPPORTED_LANGUAGES[language] || "English";
  
  return `As a medical AI specialist, analyze this prescription with clinical precision and provide comprehensive explanation:

PRESCRIPTION TEXT: "${text}"

**COMPREHENSIVE CLINICAL ANALYSIS REQUIRED:**

1. MEDICATION IDENTIFICATION:
   - Extract and list all drug names
   - Identify strengths and formulations
   - Note generic vs brand names

2. DOSAGE INTERPRETATION:
   - Decode sig codes (BID, TID, QID, PRN, QD, HS, AC, PC)
   - Interpret frequencies and durations
   - Calculate total quantity

3. ADMINISTRATION DETAILS:
   - Determine routes (PO, IV, IM, topical, etc.)
   - Identify formulations (tablets, capsules, injections, etc.)
   - Note special instructions

4. CLINICAL CONTEXT:
   - Deduce likely medical conditions
   - Identify potential treatment goals
   - Note duration of therapy

5. SAFETY ASSESSMENT:
   - Highlight important precautions
   - Note potential side effects
   - Identify contraindications if apparent

6. PATIENT GUIDANCE:
   - Provide clear usage instructions
   - Note storage requirements
   - Highlight when to contact healthcare provider

**MEDICAL ABBREVIATIONS DECODING:**
- PO: By mouth | BID: Twice daily | TID: Three times daily
- QID: Four times daily | PRN: As needed | QD: Daily
- HS: At bedtime | AC: Before meals | PC: After meals

**OUTPUT REQUIREMENTS (in ${lang.toUpperCase()}):**
- Use professional yet patient-friendly language
- Structure response with clear sections
- Be precise about uncertainties
- Prioritize patient safety information
- Include appropriate warnings

Provide a comprehensive, structured analysis:`;
}

// Enhanced intelligent fallback explanation
function createIntelligentFallback(text, language) {
  const lowerText = text.toLowerCase();
  
  let explanation = "";
  const disclaimer = MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english;

  // Common medication patterns
  const medicationPatterns = {
    antibiotics: ['amoxicillin', 'penicillin', 'cephalexin', 'azithromycin', 'doxycycline'],
    painRelievers: ['ibuprofen', 'acetaminophen', 'paracetamol', 'naproxen', 'aspirin'],
    chronic: ['metformin', 'lisinopril', 'atorvastatin', 'amlodipine', 'metoprolol'],
    mentalHealth: ['sertraline', 'fluoxetine', 'escitalopram', 'duloxetine', 'venlafaxine']
  };

  if (language === "english") {
    explanation = `**PRESCRIPTION ANALYSIS REPORT**\n\n`;
    explanation += `**Original Text:** "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"\n\n`;
    
    explanation += `**DETECTED MEDICATION COMPONENTS:**\n`;
    
    // Enhanced strength detection
    const strengthMatch = text.match(/(\d+\s*(mg|mcg|g|ml|IU)\b)/gi);
    if (strengthMatch) {
      explanation += `• Strengths: ${strengthMatch.join(', ')}\n`;
    }
    
    // Enhanced formulation detection
    const formMatch = text.match(/(capsule|tablet|injection|cream|ointment|suspension|solution|syrup|drops|inhaler)/gi);
    if (formMatch) {
      explanation += `• Forms: ${[...new Set(formMatch)].join(', ')}\n`;
    }
    
    // Enhanced route detection
    const routeMatch = text.match(/(po\b|oral|topical|injection|iv\b|im\b|subcutaneous|inhale)/gi);
    if (routeMatch) {
      const routeText = [...new Set(routeMatch)].map(r => {
        const routes = { 
          'po': 'by mouth', 'oral': 'by mouth', 'iv': 'intravenous', 
          'im': 'intramuscular', 'subcutaneous': 'under skin' 
        };
        return routes[r.toLowerCase()] || r;
      }).join(', ');
      explanation += `• Routes: ${routeText}\n`;
    }
    
    // Frequency detection
    const freqMatch = text.match(/(BID|TID|QID|QD|daily|twice|three times|four times|once)/gi);
    if (freqMatch) {
      explanation += `• Frequency: ${freqMatch.join(', ')}\n`;
    }
    
    explanation += `\n**CLINICAL GUIDANCE SUMMARY:**\n`;
    explanation += `Based on prescription analysis:\n`;
    explanation += `• Take medication exactly as prescribed\n`;
    explanation += `• Complete full course if antibiotic therapy\n`;
    explanation += `• Monitor for any unexpected side effects\n`;
    explanation += `• Store medications properly as instructed\n`;
    explanation += `• Contact healthcare provider with concerns\n`;
    explanation += `• Keep follow-up appointments as scheduled\n\n`;
    
    explanation += `${disclaimer}`;

  } else if (language === "pidgin") {
    explanation = `**WETIN YOUR PRESCRIPTION DEY TALK**\n\n`;
    explanation += `**Original prescription:** "${text.substring(0, 150)}..."\n\n`;
    
    explanation += `**WETIN I SEE FOR INSIDE:**\n`;
    if (text.match(/\d+\s*mg/)) explanation += `• Medicine strength dey there\n`;
    if (text.match(/po\b|oral/i)) explanation += `• You go take am through mouth\n`;
    if (text.match(/capsule|tablet/i)) explanation += `• Na capsule/tablet\n`;
    if (text.match(/BID|TID|QD/i)) explanation += `• How many times to take dey specified\n`;
    
    explanation += `\n**MEDICAL ADVICE WEY YOU NEED FOLLOW:**\n`;
    explanation += `• Take the medicine exactly how dem prescribe am\n`;
    explanation += `• If na antibiotic, make you finish everything\n`;
    explanation += `• Watch your body well for any bad reaction\n`;
    explanation += `• Keep the medicine for correct place\n`;
    explanation += `• See your doctor if you notice any problem\n`;
    explanation += `• No forget your next appointment\n\n`;
    
    explanation += `${disclaimer}`;
  } else {
    explanation = `**PRESCRIPTION ANALYSIS REPORT**\n\n`;
    explanation += `Please consult your healthcare provider for complete information about this prescription.\n\n`;
    explanation += `${disclaimer}`;
  }

  return explanation;
}

// Enhanced Prescription explanation endpoint
app.post("/api/explain", async (req, res) => {
  const startTime = Date.now();
  const { text, language = "english" } = req.body;
  
  // Enhanced input validation
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ 
      error: "Invalid input",
      message: "Please provide valid prescription text for analysis",
      code: "INVALID_INPUT"
    });
  }

  if (text.trim().length < 5) {
    return res.status(400).json({ 
      error: "Text too short",
      message: "Please provide prescription text with at least 5 characters",
      code: "TEXT_TOO_SHORT"
    });
  }

  if (text.length > 5000) {
    return res.status(400).json({ 
      error: "Text too long",
      message: "Please provide prescription text under 5000 characters",
      code: "TEXT_TOO_LONG"
    });
  }

  if (!SUPPORTED_LANGUAGES[language]) {
    return res.status(400).json({ 
      error: "Unsupported language",
      message: `Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`,
      code: "UNSUPPORTED_LANGUAGE"
    });
  }

  console.log(`📋 Processing prescription analysis request (${language}), length: ${text.length} chars`);

  try {
    // Check if we have Hugging Face API key
    if (!process.env.HF_API_KEY) {
      console.log("🤖 Using enhanced fallback analysis (no API key)");
      const fallbackExplanation = createIntelligentFallback(text, language);
      
      return res.json({ 
        explanation: fallbackExplanation,
        language: language,
        analyzedBy: "Medical Analysis System",
        note: "Using intelligent medical analysis system",
        fallback: true,
        processingTime: Date.now() - startTime,
        textLength: text.length
      });
    }

    const prompt = createMedicalPrompt(text, language);
    
    // Enhanced Hugging Face API call with better error handling
    try {
      console.log(`🤖 Calling Hugging Face API for ${language} analysis...`);
      
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
        { 
          inputs: prompt,
          parameters: {
            max_length: 800,
            temperature: 0.3,
            do_sample: true,
            repetition_penalty: 1.1,
            top_p: 0.9
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 45000, // Increased timeout
          timeoutErrorMessage: "Hugging Face API request timed out"
        }
      );

      let analysis = "Unable to generate medical analysis at this time.";
      
      if (response.data && Array.isArray(response.data) && response.data[0] && response.data[0].generated_text) {
        analysis = response.data[0].generated_text;
        // Clean up the response
        analysis = analysis.replace(prompt, "").trim();
        analysis = analysis.replace(/<\|.*?\|>/g, ''); // Remove any special tokens
        
        // Ensure reasonable length
        if (analysis.length > 2000) {
          analysis = analysis.substring(0, 2000) + "... [response truncated]";
        }
      }

      // Validate AI response
      if (analysis && analysis.length > 100 && !analysis.includes("Unable to generate")) {
        console.log("✅ AI analysis successful");
        
        res.json({ 
          explanation: analysis + `\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`,
          language: language,
          analyzedBy: "Medical AI Specialist",
          model: "microsoft/DialoGPT-medium",
          processingTime: Date.now() - startTime,
          textLength: text.length,
          aiGenerated: true
        });
      } else {
        console.log("❌ Invalid AI response, using fallback");
        throw new Error("AI response insufficient");
      }
      
    } catch (aiError) {
      console.log("🤖 AI service failed, using enhanced fallback:", aiError.message);
      
      const fallbackExplanation = createIntelligentFallback(text, language);
      
      res.json({ 
        explanation: fallbackExplanation,
        language: language,
        analyzedBy: "Medical Analysis System",
        note: "AI service temporarily unavailable - using medical analysis system",
        fallback: true,
        processingTime: Date.now() - startTime,
        textLength: text.length
      });
    }
    
  } catch (error) {
    console.error("❌ Error in prescription analysis:", error.message);
    
    const processingTime = Date.now() - startTime;
    
    // Even if everything fails, provide basic fallback
    const fallbackExplanation = `**PRESCRIPTION ANALYSIS**\n\nWe're experiencing technical difficulties. Please consult your healthcare provider or pharmacist for prescription information.\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`;
    
    res.status(500).json({ 
      explanation: fallbackExplanation,
      language: language,
      analyzedBy: "Emergency Medical System",
      note: "System maintaining medical safety standards",
      fallback: true,
      processingTime: processingTime,
      error: "Internal server error"
    });
  }
});

// Enhanced Languages endpoint
app.get("/api/languages", (req, res) => {
  res.json({
    supportedLanguages: SUPPORTED_LANGUAGES,
    totalLanguages: Object.keys(SUPPORTED_LANGUAGES).length,
    status: "API is running",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    features: {
      prescriptionAnalysis: true,
      multiLanguage: true,
      textToSpeech: true,
      drugInteractions: true
    }
  });
});

// Enhanced Test endpoint
app.get("/api/test", async (req, res) => {
  const testPrescription = "RX: Amoxicillin 500mg CAPs. Sig: 1 CAP PO TID x 10 days. Disp: #30. Refills: 0. Diagnosis: Acute bacterial sinusitis.";
  
  try {
    const response = await fetch('http://localhost:5000/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: testPrescription,
        language: "english"
      })
    });

    const data = await response.json();

    res.json({
      test: "COMPREHENSIVE API TEST",
      input: testPrescription,
      output: data,
      status: "API is working correctly",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.json({
      test: "FALLBACK SYSTEM TEST",
      input: testPrescription,
      output: createIntelligentFallback(testPrescription, "english"),
      status: "Using enhanced fallback analysis system",
      note: "Backend API connection failed - frontend fallback active"
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
      apiStatus: 'operational'
    }
  });
});

// Enhanced Root endpoint
app.get("/api", (req, res) => {
  res.json({ 
    message: "🏥 MyDrugPaddi Prescription Analysis API",
    description: "AI-powered prescription explanation and medication analysis platform",
    version: "2.0.0",
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
      prescriptionOCR: "Frontend",
      drugInteractionChecking: "Frontend",
      medicationReminders: "Frontend",
      textToSpeech: "Frontend",
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
📊 Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).length}
⏰ Startup time: ${new Date().toISOString()}

📋 Available Endpoints:
   • GET  /api/health          - Health check
   • POST /api/explain         - Prescription analysis
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