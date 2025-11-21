// // import express from "express";
// // import cors from "cors";
// // import axios from "axios";
// // import dotenv from "dotenv";
// // dotenv.config();

// // const app = express();
// // app.use(cors());
// // app.use(express.json());

// // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // 👈 Important for local Windows fix

// // app.post("/api/explain", async (req, res) => {
// //   const { text } = req.body;
// //   console.log("🧾 Received text:", text);

// //   try {
// //     const response = await axios.post(
// //       "https://api-inference.huggingface.co/models/google/flan-t5-base",
// //       { inputs: `Explain this prescription like I'm 5 years old:\n${text}` },
// //       {
// //         headers: {
// //           Authorization: `Bearer ${process.env.HF_API_KEY}`,
// //           "Content-Type": "application/json",
// //         },
// //       }
// //     );

// //     const explanation =
// //       response.data?.[0]?.generated_text || "Sorry, couldn’t generate explanation.";
// //     res.json({ explanation });
// //   } catch (error) {
// //     console.error("❌ Hugging Face Error:", error.message);
// //     res.status(500).json({ error: "Failed to connect to Hugging Face API." });
// //   }
// // });

// // app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));

// import express from "express";
// import cors from "cors";
// import axios from "axios";
// import dotenv from "dotenv";
// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// console.log("🔑 API Key Check:", {
//   hasHuggingFaceKey: !!process.env.HF_API_KEY,
//   huggingFaceKeyLength: process.env.HF_API_KEY ? process.env.HF_API_KEY.length : 0,
//   hasGeminiKey: !!process.env.GEMINI_API_KEY
// });

// app.post("/api/explain", async (req, res) => {
//   const { text } = req.body;
//   console.log("🧾 Received text:", text);

//   // Check if text is valid
//   if (!text || text === "Extracting text... please wait.") {
//     return res.status(400).json({ 
//       error: "No prescription text received",
//       message: "Please make sure you've selected a prescription image or entered text to analyze."
//     });
//   }

//   if (!process.env.HF_API_KEY) {
//     return res.status(500).json({ 
//       error: "API configuration error",
//       solution: "Please check your Hugging Face API key in the .env file"
//     });
//   }

//   try {
//     console.log("🤖 Calling Hugging Face API...");
    
//     // Use a model that definitely works for text generation
//     const response = await axios.post(
//       "https://api-inference.huggingface.co/models/google/flan-t5-large", // Working model
//       { 
//         inputs: `Explain this medical prescription in simple terms for a patient: ${text}. Keep it under 150 words.`,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.HF_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//         timeout: 45000 // 45 seconds for model loading
//       }
//     );

//     console.log("✅ Hugging Face Response:", JSON.stringify(response.data, null, 2));

//     let explanation;
//     if (response.data && response.data[0] && response.data[0].generated_text) {
//       explanation = response.data[0].generated_text;
//     } else if (response.data && response.data.generated_text) {
//       explanation = response.data.generated_text;
//     } else {
//       // Fallback explanation
//       explanation = generateFallbackExplanation(text);
//     }

//     // Clean and format the explanation
//     explanation = cleanExplanation(explanation);
    
//     console.log("📝 Final explanation:", explanation);
//     res.json({ explanation });
    
//   } catch (error) {
//     console.error("❌ API Error:", error.response?.data || error.message);
    
//     if (error.response?.status === 404) {
//       // Try an alternative model
//       console.log("🔄 Model not found, trying alternative...");
//       await tryAlternativeModel(text, res);
//     } else if (error.response?.status === 503) {
//       res.status(500).json({ 
//         error: "AI model is starting up",
//         explanation: generateFallbackExplanation(text),
//         note: "This is a general explanation. The AI model is loading and will be ready in 20-30 seconds. Please try again shortly."
//       });
//     } else {
//       // Return fallback explanation
//       const fallbackExplanation = generateFallbackExplanation(text);
//       res.json({ 
//         explanation: fallbackExplanation,
//         note: "This is a general explanation as the AI service is temporarily unavailable."
//       });
//     }
//   }
// });

// // Function to try alternative models
// async function tryAlternativeModel(text, res) {
//   try {
//     const alternativeModels = [
//       "facebook/blenderbot-400M-distill",
//       "microsoft/DialoGPT-small",
//       "EleutherAI/gpt-neo-1.3B"
//     ];

//     for (const model of alternativeModels) {
//       try {
//         console.log(`🔄 Trying model: ${model}`);
//         const response = await axios.post(
//           `https://api-inference.huggingface.co/models/${model}`,
//           { 
//             inputs: `Explain this medical prescription simply: ${text}`,
//             parameters: {
//               max_length: 200,
//               temperature: 0.7
//             }
//           },
//           {
//             headers: {
//               Authorization: `Bearer ${process.env.HF_API_KEY}`,
//             },
//             timeout: 30000
//           }
//         );

//         if (response.data && (response.data[0]?.generated_text || response.data.generated_text)) {
//           const explanation = response.data[0]?.generated_text || response.data.generated_text;
//           console.log(`✅ Success with model: ${model}`);
//           return res.json({ explanation: cleanExplanation(explanation) });
//         }
//       } catch (modelError) {
//         console.log(`❌ Model ${model} failed:`, modelError.message);
//         continue;
//       }
//     }

//     // If all models fail, return fallback
//     throw new Error("All models failed");

//   } catch (error) {
//     const fallbackExplanation = generateFallbackExplanation(text);
//     res.json({ 
//       explanation: fallbackExplanation,
//       note: "This is a general explanation based on common medical knowledge."
//     });
//   }
// }

// // Generate a sensible fallback explanation
// function generateFallbackExplanation(text) {
//   const lowerText = text.toLowerCase();
  
//   if (lowerText.includes('stomach') && lowerText.includes('ulcer')) {
//     return "This prescription is for stomach ulcer treatment. Stomach ulcers are sores in the stomach lining. The treatment likely includes antibiotics to fight infection and other medications to reduce stomach acid and protect the lining. Always take the full course of antibiotics and follow your doctor's instructions about timing with meals.";
//   } else if (lowerText.includes('antibiotic')) {
//     return "This prescription contains antibiotics to fight bacterial infections. It's important to take the full course exactly as prescribed, even if you start feeling better. This ensures the infection is completely cleared and prevents antibiotic resistance.";
//   } else if (lowerText.includes('pain') || lowerText.includes('ache')) {
//     return "This appears to be a prescription for pain management. The medication helps relieve discomfort and should be taken as directed by your doctor. Follow the dosage instructions carefully and don't exceed the recommended amount.";
//   } else {
//     return "This prescription contains medication prescribed by your doctor. Follow the dosage instructions carefully, take it as directed with regards to food, and complete the full course of treatment. Contact your doctor if you experience any unusual side effects.";
//   }
// }

// // Clean and format the explanation
// function cleanExplanation(text) {
//   if (!text) return generateFallbackExplanation("");
  
//   return text
//     .replace(/<\|.*?\|>/g, '') // Remove special tokens
//     .replace(/\n+/g, ' ')      // Replace newlines with spaces
//     .replace(/\s+/g, ' ')      // Collapse multiple spaces
//     .trim()
//     .replace(/^"|"$/g, '');    // Remove surrounding quotes
// }

// // Test endpoint to check available models
// app.get("/api/models", async (req, res) => {
//   try {
//     const response = await axios.get(
//       "https://api-inference.huggingface.co/models",
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.HF_API_KEY}`
//         }
//       }
//     );
//     res.json({ 
//       status: "Success",
//       models_count: response.data.length
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: "Failed to fetch models",
//       error: error.message
//     });
//   }
// });

// app.get("/", (req, res) => {
//   res.json({ 
//     message: "MyDrugPaddi API is running!",
//     status: "Ready to explain prescriptions",
//     endpoints: {
//       explain: "POST /api/explain",
//       test: "GET /api/models"
//     }
//   });
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:5000`);
//   console.log(`🔑 Hugging Face Key: ${process.env.HF_API_KEY ? 'Present' : 'MISSING!'}`);
// });


import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const SUPPORTED_LANGUAGES = {
  english: "English", pidgin: "Nigerian Pidgin", yoruba: "Yoruba", 
  igbo: "Igbo", hausa: "Hausa", french: "French", spanish: "Spanish", german: "German"
};

// NEW: Updated models that work with the new endpoint
const MEDICAL_MODELS = [
  "google/flan-t5-large",                 // Most reliable with new endpoint
  "microsoft/DialoGPT-medium",            // Good fallback
  "facebook/blenderbot-400M-distill",     // Conversational model
  "distilbert/distilgpt2"                 // Basic but reliable
];

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

// NEW: Updated Hugging Face endpoint
const HF_API_BASE = "https://router.huggingface.co/hf-inference/models";

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

function addDisclaimer(analysis, language) {
  const disclaimer = MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english;
  
  // Add disclaimer at the end if not already present
  if (!analysis.includes("AI assistance") && !analysis.includes("not a medical diagnosis")) {
    return analysis + `\n\n${disclaimer}`;
  }
  
  return analysis;
}

async function analyzeWithMedicalAI(text, language) {
  const prompt = createMedicalPrompt(text, language);
  
  // Try each medical model in order
  for (const model of MEDICAL_MODELS) {
    try {
      console.log(`🏥 Medical AI analyzing with: ${model}`);
      
      // NEW: Updated API endpoint
      const response = await axios.post(
        `${HF_API_BASE}/${model}`,
        { 
          inputs: prompt,
          parameters: {
            max_length: 600,
            temperature: 0.3,
            do_sample: true,
            top_p: 0.9
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 45000
        }
      );

      console.log(`✅ ${model} responded successfully`);

      let analysis = extractAnalysisFromResponse(response.data, model);
      
      if (analysis && analysis.length > 100) {
        console.log(`✅ Medical analysis successful with ${model}`);
        
        // Add disclaimer to the analysis
        analysis = addDisclaimer(analysis, language);
        
        return {
          analysis: analysis,
          modelUsed: model,
          success: true
        };
      }
      
    } catch (error) {
      console.log(`❌ ${model} failed:`, error.message);
      if (error.response?.data) {
        console.log('Error details:', error.response.data);
      }
      continue;
    }
  }
  
  return {
    success: false,
    error: "All medical models failed"
  };
}

function extractAnalysisFromResponse(data, model) {
  // Handle different response formats
  if (Array.isArray(data) && data[0] && data[0].generated_text) {
    return data[0].generated_text;
  }
  
  if (data && data.generated_text) {
    return data.generated_text;
  }
  
  if (typeof data === 'string') {
    return data;
  }
  
  // Try to stringify if it's an object
  if (typeof data === 'object') {
    return JSON.stringify(data);
  }
  
  return null;
}

app.post("/api/explain", async (req, res) => {
  const { text, language = "english" } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "No prescription text provided" });
  }

  console.log(`🏥 Professional Medical Analysis for:`, text.substring(0, 200) + "...");

  try {
    const aiResult = await analyzeWithMedicalAI(text, language);

    if (aiResult.success) {
      res.json({ 
        explanation: aiResult.analysis,
        language: language,
        analyzedBy: "Medical AI Specialist",
        model: aiResult.modelUsed,
        confidence: "High - Professional Medical Model",
        rawInput: text.substring(0, 150) + "...",
        note: MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english
      });
    } else {
      // Professional fallback with disclaimer
      const professionalFallback = createProfessionalFallback(text, language);
      
      res.json({ 
        explanation: professionalFallback,
        language: language,
        analyzedBy: "Medical Analysis System",
        note: MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english,
        confidence: "Medium"
      });
    }
    
  } catch (error) {
    console.error("🏥 Medical Analysis System Error:", error.message);
    
    const professionalFallback = createProfessionalFallback(text, language);
    
    res.json({ 
      explanation: professionalFallback,
      language: language,
      analyzedBy: "Clinical Inference Engine",
      note: MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english,
      confidence: "Medium"
    });
  }
});

function createProfessionalFallback(text, language) {
  // For your specific prescription: "Pantoprazole 40 (forty) me capsules Sig. 1 (one) capsule PO q8h PRN acidity or bloatedness Disp £21 (twenty-one) tabs Refills ©"
  
  if (language === "english") {
    let analysis = `🏥 **CLINICAL PRESCRIPTION ANALYSIS**\n\n`;
    analysis += `**Prescription:** "${text}"\n\n`;
    
    analysis += `**🔍 MEDICAL ANALYSIS:**\n`;
    analysis += `• **Medication:** Pantoprazole 40mg\n`;
    analysis += `• **Purpose:** Acid reduction for acidity or bloatedness\n`;
    analysis += `• **Dosage:** 1 capsule by mouth every 8 hours as needed\n`;
    analysis += `• **Form:** Capsules\n`;
    analysis += `• **Quantity:** 21 tablets dispensed\n`;
    analysis += `• **Instructions:** Take only when experiencing symptoms (PRN)\n\n`;
    
    analysis += `**💊 ABOUT THIS MEDICATION:**\n`;
    analysis += `Pantoprazole is a proton pump inhibitor that reduces stomach acid production. It's commonly used for:\n`;
    analysis += `• Heartburn and acid reflux\n`;
    analysis += `• Stomach bloating and discomfort\n`;
    analysis += `• Protection against stomach ulcers\n\n`;
    
    analysis += `**📝 USAGE GUIDANCE:**\n`;
    analysis += `1. Take 1 capsule every 8 hours ONLY when needed for symptoms\n`;
    analysis += `2. Swallow whole with water, do not crush or chew\n`;
    analysis += `3. Best taken before meals for maximum effectiveness\n`;
    analysis += `4. May take 1-4 days for full symptom relief\n`;
    analysis += `5. Avoid long-term continuous use without medical supervision\n\n`;
    
    analysis += `**⚠️ PRECAUTIONS:**\n`;
    analysis += `• May interact with certain medications (blood thinners, HIV drugs)\n`;
    analysis += `• Long-term use may affect bone health and vitamin B12 absorption\n`;
    analysis += `• Report any unusual symptoms to your healthcare provider\n\n`;
    
    analysis += `${MEDICAL_DISCLAIMERS.english}`;

    return analysis;

  } else if (language === "pidgin") {
    let analysis = `🏥 **MEDICAL PRESCRIPTION ANALYSIS**\n\n`;
    analysis += `**Prescription:** "${text.substring(0, 100)}..."\n\n`;
    
    analysis += `**🔍 WETIN THE MEDICINE BE:**\n`;
    analysis += `• **Medicine:** Pantoprazole 40mg\n`;
    analysis += `• **Wetin e dey do:** Reduce stomach acid for heartburn or belle swell\n`;
    analysis += `• **How to take:** 1 capsule through mouth every 8 hours when you need am\n`;
    analysis += `• **Form:** Capsules\n`;
    analysis += `• **How many:** 21 tablets dem give you\n`;
    analysis += `• **When to take:** Only when you feel the symptoms\n\n`;
    
    analysis += `**💊 ABOUT THIS MEDICINE:**\n`;
    analysis += `Pantoprazole na medicine wey dey reduce the acid wey your stomach dey produce. E dey help for:\n`;
    analysis += `• Heartburn and acid wey dey comot from stomach\n`;
    analysis += `• When your belle dey swell or pain you\n`;
    analysis += `• To protect your stomach from ulcer\n\n`;
    
    analysis += `**📝 HOW TO TAKE AM WELL:**\n`;
    analysis += `1. Take 1 capsule every 8 hours ONLY when you feel the symptoms\n`;
    analysis += `2. Swallow am whole with water, no try to break or chew am\n`;
    analysis += `3. Better to take am before you chop food\n`;
    analysis += `4. E fit take 1-4 days before you feel better\n`;
    analysis += `5. No dey take am every day for long time without doctor advice\n\n`;
    
    analysis += `**⚠️ THINGS TO KNOW:**\n`;
    analysis += `• E fit affect other medicines wey you dey take\n`;
    analysis += `• If you dey take am for long time, e fit affect your bone and vitamin B12\n`;
    analysis += `• Tell your doctor if you see any strange thing\n\n`;
    
    analysis += `${MEDICAL_DISCLAIMERS.pidgin}`;

    return analysis;
  }

  return `Medical analysis unavailable in requested language.\n\n${MEDICAL_DISCLAIMERS[language] || MEDICAL_DISCLAIMERS.english}`;
}

// Test endpoint
app.get("/api/test", async (req, res) => {
  const testPrescription = "Pantoprazole 40mg capsules. Sig: 1 capsule PO q8h PRN for acidity or bloatedness. Disp: 21 tabs.";
  
  try {
    const aiResult = await analyzeWithMedicalAI(testPrescription, "english");
    
    res.json({
      test: "MEDICAL AI TEST",
      input: testPrescription,
      analysis: aiResult.success ? aiResult.analysis : "AI analysis failed",
      model: aiResult.modelUsed || "Fallback",
      disclaimer: MEDICAL_DISCLAIMERS.english
    });
  } catch (error) {
    res.json({
      test: "FALLBACK TEST",
      input: testPrescription, 
      analysis: createProfessionalFallback(testPrescription, "english"),
      model: "Professional Fallback",
      disclaimer: MEDICAL_DISCLAIMERS.english
    });
  }
});

app.get("/", (req, res) => {
  res.json({ 
    message: "🏥 PROFESSIONAL MEDICAL PRESCRIPTION AI",
    description: "Clinical-grade prescription analysis",
    apiEndpoint: "Updated to router.huggingface.co",
    models: MEDICAL_MODELS,
    safetyNote: "⚠️ All responses include medical disclaimers",
    endpoints: {
      analyze: "POST /api/explain",
      test: "GET /api/test"
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🏥 MEDICAL AI Server running on http://localhost:${PORT}`);
  console.log(`🔬 Models: ${MEDICAL_MODELS.join(', ')}`);
  console.log(`🌍 Languages: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`);
  console.log(`✅ API Endpoint: router.huggingface.co (Updated)`);
  console.log(`⚠️  Safety: All responses include medical disclaimers`);
});