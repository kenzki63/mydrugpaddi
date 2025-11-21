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

// Middleware - SIMPLE
app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "MyDrugPaddi API is running",
    timestamp: new Date().toISOString()
  });
});

// Languages endpoint
app.get("/api/languages", (req, res) => {
  res.json({
    supportedLanguages: {
      english: "English", 
      pidgin: "Nigerian Pidgin", 
      yoruba: "Yoruba", 
      igbo: "Igbo", 
      hausa: "Hausa"
    },
    status: "API is running"
  });
});

// Simple prescription explanation
app.post("/api/explain", async (req, res) => {
  const { text, language = "english" } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    // Simple fallback response
    const explanation = `**PRESCRIPTION ANALYSIS**\n\n**Prescription:** "${text}"\n\n**Analysis:** This appears to be a medical prescription. Please consult your healthcare provider or pharmacist for complete information about this medication, including proper usage instructions, potential side effects, and any necessary precautions.\n\n⚠️ **IMPORTANT**: This is AI assistance, not a medical diagnosis. Always confirm with a licensed healthcare provider.`;
    
    res.json({ 
      explanation,
      language,
      analyzedBy: "Medical Analysis System"
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: "Analysis failed",
      message: "Please try again later"
    });
  }
});

// API info
app.get("/api", (req, res) => {
  res.json({ 
    message: "MyDrugPaddi API",
    endpoints: {
      health: "GET /api/health",
      explain: "POST /api/explain", 
      languages: "GET /api/languages"
    }
  });
});

// SIMPLE CATCH-ALL - Only serve React app for root and non-API routes
if (process.env.NODE_ENV === 'production') {
  // Define all specific routes first
  const apiRoutes = ['/api', '/api/health', '/api/languages', '/api/explain'];
  
  // Then handle non-API routes
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
  
  // For any other non-API route, serve React app
  app.get('*', (req, res) => {
    // If it's an API route that we haven't defined, return 404
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    // Otherwise serve React app
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
} else {
  // Development
  app.get('/', (req, res) => {
    res.json({ message: "MyDrugPaddi API - Development Mode" });
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
