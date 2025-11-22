// import React, { useState, useEffect, useRef } from "react";
// import DarkModeToggle from "./components/dark";
// import Tesseract from "tesseract.js";
// // import { db } from "./firebase";
// // import { collection, addDoc, serverTimestamp } from "firebase/firestore";
// import { useAuthState } from "react-firebase-hooks/auth";
// import { auth } from "./firebase";
// // import OpenAI from "openai";

// interface Reminder {
//   id: number;
//   time: string;
//   medicine: string;
//   dosage: string;
//   tone: string;
//   days: string[];
//   isEditing?: boolean;
// }

// const tones = [
//   { label: "Chime", file: "/Alarm-chosic.com_.mp3" },
//   { label: "Beep", file: "/Alarm-Clock-Short-chosic.com_.mp3" },
//   { label: "Alert", file: "/alexander-nakarada-silly-intro(chosic.com).mp3" },
//   { label: "Bell", file: "/Burglar-Alarm-chosic.com_.mp3" },
//   { label: "Digital", file: "/mixkit-classic-alarm-995.wav" },
// ];

// const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// interface Props {
//   onLogout: () => void;
// }

// const Dashboard: React.FC<Props> = ({ onLogout }) => {
//   const [selectedImage, setSelectedImage] = useState<string | null>(null);
//   const [reminders, setReminders] = useState<Reminder[]>([]);
//   const [newTime, setNewTime] = useState<string>("");
//   const [newMedicine, setNewMedicine] = useState<string>("");
//   const [newDosage, setNewDosage] = useState<string>("");
//   const [newTone, setNewTone] = useState<string>(tones[0].file);
//   const [selectedDays, setSelectedDays] = useState<string[]>([]);
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const [ocrText, setOcrText] = useState<string>("");
//   const [eli5Text, setEli5Text] = useState<string>("");
//   // const [history, setHistory] = useState<any[]>([]);
//   const [user] = useAuthState(auth);

  

//   // Upload handler
//   const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file) setSelectedImage(URL.createObjectURL(file));
//   };

  

//   // Toggle day selection
//   const toggleDay = (day: string) => {
//     setSelectedDays((prev) =>
//       prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
//     );
//   };

//   // Add new reminder
//   const addReminder = () => {
//     if (newTime && newMedicine && newDosage && selectedDays.length > 0) {
//       setReminders([
//         ...reminders,
//         {
//           id: Date.now(),
//           time: newTime,
//           medicine: newMedicine,
//           dosage: newDosage,
//           tone: newTone,
//           days: selectedDays,
//         },
//       ]);
//       setNewTime("");
//       setNewMedicine("");
//       setNewDosage("");
//       setNewTone(tones[0].file);
//       setSelectedDays([]);
//     } else {
//       alert("Please fill all fields and select at least one day.");
//     }
//   };

//   const deleteReminder = (id: number) => {
//     setReminders(reminders.filter((rem) => rem.id !== id));
//   };

//   const toggleEdit = (id: number) => {
//     setReminders(
//       reminders.map((rem) =>
//         rem.id === id ? { ...rem, isEditing: !rem.isEditing } : rem
//       )
//     );
//   };

//   const updateReminder = (
//     id: number,
//     newTime: string,
//     newMedicine: string,
//     newDosage: string,
//     newTone: string,
//     newDays: string[]
//   ) => {
//     setReminders(
//       reminders.map((rem) =>
//         rem.id === id
//           ? {
//               ...rem,
//               time: newTime,
//               medicine: newMedicine,
//               dosage: newDosage,
//               tone: newTone,
//               days: newDays,
//               isEditing: false,
//             }
//           : rem
//       )
//     );
//   };

//   // Alarm trigger
//   useEffect(() => {
//     const interval = setInterval(() => {
//       const now = new Date();
//       const currentTime = now.toTimeString().slice(0, 5); // HH:MM
//       const today = now.toLocaleString("en-US", { weekday: "short" });

//       reminders.forEach((reminder) => {
//         if (reminder.time === currentTime && reminder.days.includes(today)) {
//           alert(
//             `⏰ Time to take your medication!\n${reminder.medicine} - ${reminder.dosage}`
//           );
//           if (audioRef.current) {
//             audioRef.current.src = reminder.tone;
//             audioRef.current.play().catch(() => console.log("Playback blocked"));
//           }
//         }
//       });
//     }, 30000);
//     return () => clearInterval(interval);
//   }, [reminders]);

//   const previewTone = () => {
//     if (audioRef.current) {
//       audioRef.current.src = newTone;
//       audioRef.current.play().catch(() => console.log("Preview blocked"));
//     }
//   };

//   const handleOCR = async () => {
//   if (!selectedImage) return;
//   setOcrText("Extracting text... please wait.");

//   try {
//     const result = await Tesseract.recognize(selectedImage, "eng", {
//       logger: (m) => console.log(m),
//     });

//     const extracted = result.data.text.trim();
//     setOcrText(extracted || "No text found. Please try another image.");
//   } catch (error) {
//     console.error("OCR error:", error);
//     setOcrText("Error reading image. Please try again.");
//   }
// };

//   const handleExplain = async () => {
//   if (!ocrText) return;
//   setEli5Text("Thinking...");

//   try {
//     const response = await fetch("http://localhost:5000/api/explain", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ text: ocrText }),
//     });

//     const data = await response.json();

//     if (data.explanation) {
//       setEli5Text(data.explanation);
//     } else {
//       setEli5Text("Couldn't get explanation. Try again later.");
//     }
//   } catch (error) {
//     console.error("AI fetch error:", error);
//     setEli5Text("Server connection failed. Please try again later.");
//   }
// };

//   const simplifyText = async (text) => {
//   try {
//     const response = await fetch(
//       "https://api-inference.huggingface.co/models/your-username/your-model-name",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": `Bearer ${import.meta.env.VITE_HUGGINGFACE_API_KEY}`
//         },
//         body: JSON.stringify({ inputs: text })
//       }
//     );

//     const data = await response.json();

//     if (data.error) {
//       console.error("API Error:", data.error);
//       alert("Server busy. Try again in 10–20 seconds.");
//       return;
//     }

//     setEli5Text(data[0].generated_text);
//   } catch (error) {
//     console.error("Network Error:", error);
//     alert("Connection failed. Check your internet / API key setup.");
//   }
// };



//   return (
//     <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 relative">
//       {/* 🌙 Reusable Dark Mode Toggle */}
//       <DarkModeToggle />

//       {/* Navbar */}
//       <nav className="bg-purple-600 dark:bg-gray-800 text-white p-4 shadow-md flex justify-between items-center">
//         <h1 className="text-2xl font-bold">💊 MyDrugPaddi</h1>
//         <button
//           onClick={onLogout}
//           className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
//         >
//           Logout
//         </button>
//       </nav>

//       <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* Upload Section */}
//         <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-center">
//           <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
//             Upload Prescription
//           </h2>

//           <label className="cursor-pointer bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
//             Select File
//             <input
//               type="file"
//               accept="image/*"
//               onChange={handleImageUpload}
//               className="hidden"
//             />
//           </label>

//           {selectedImage && (
//             <div className="mt-4 w-full">
//               <p className="text-gray-600 dark:text-gray-300 mb-2">Preview:</p>
//               <img
//                 src={selectedImage}
//                 alt="Prescription Preview"
//                 className="w-full rounded-lg shadow-md mb-4"
//               />

//               {/* OCR + Explanation */}
//               <button
//                 onClick={handleOCR}
//                 className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition w-full"
//               >
//                 🧠 Extract Text
//               </button>

//               {ocrText && (
//                 <div className="mt-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-sm text-gray-900 dark:text-gray-100">
//                   <h3 className="font-semibold mb-2">Extracted Text:</h3>
//                   <p>{ocrText}</p>

//                   <button
//                     onClick={handleExplain}
//                     className="mt-3 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition"
//                   >
//                     🩺 Simplify
//                   </button>
//                 </div>
//               )}

          
//             </div>
//           )}
//         </section>


//         {/* Reminders */}
//         <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
//           <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
//             Medication Reminders
//           </h2>

//           {/* Inputs */}
//           <div className="space-y-2 mb-4">
//             <input
//               type="time"
//               value={newTime}
//               onChange={(e) => setNewTime(e.target.value)}
//               className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
//             />
//             <input
//               type="text"
//               placeholder="Medicine Name"
//               value={newMedicine}
//               onChange={(e) => setNewMedicine(e.target.value)}
//               className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
//             />
//             <input
//               type="text"
//               placeholder="Dosage (e.g. 2 pieces)"
//               value={newDosage}
//               onChange={(e) => setNewDosage(e.target.value)}
//               className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
//             />

//             {/* Days selection */}
//             <div className="flex flex-wrap gap-2">
//               {daysOfWeek.map((day) => (
//                 <button
//                   key={day}
//                   onClick={() => toggleDay(day)}
//                   className={`px-2 py-1 rounded-lg border ${
//                     selectedDays.includes(day)
//                       ? "bg-green-600 text-white border-green-600"
//                       : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
//                   }`}
//                 >
//                   {day}
//                 </button>
//               ))}
//             </div>

//             {/* Tone selector + preview */}
//             <div className="flex gap-2">
//               <select
//                 value={newTone}
//                 onChange={(e) => setNewTone(e.target.value)}
//                 className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
//               >
//                 {tones.map((tone, idx) => (
//                   <option key={idx} value={tone.file}>
//                     {tone.label}
//                   </option>
//                 ))}
//               </select>
//               <button
//                 onClick={previewTone}
//                 className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition"
//               >
//                 Preview
//               </button>
//             </div>

//             <button
//               onClick={addReminder}
//               className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition w-full"
//             >
//               Add Reminder
//             </button>
//           </div>

//           {/* Reminder List */}
//           {reminders.length === 0 ? (
//             <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center text-gray-500 dark:text-gray-300">
//               ⏰ No reminders set yet
//             </div>
//           ) : (
//             <ul className="space-y-2">
//               {reminders.map((rem) => (
//                 <li
//                   key={rem.id}
//                   className="p-3 bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg flex flex-col gap-2"
//                 >
//                   {rem.isEditing ? (
//                     <div className="space-y-2">
//                       <input
//                         type="time"
//                         value={rem.time}
//                         onChange={(e) =>
//                           updateReminder(
//                             rem.id,
//                             e.target.value,
//                             rem.medicine,
//                             rem.dosage,
//                             rem.tone,
//                             rem.days
//                           )
//                         }
//                         className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
//                       />
//                       <input
//                         type="text"
//                         value={rem.medicine}
//                         onChange={(e) =>
//                           updateReminder(
//                             rem.id,
//                             rem.time,
//                             e.target.value,
//                             rem.dosage,
//                             rem.tone,
//                             rem.days
//                           )
//                         }
//                         className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
//                       />
//                       <input
//                         type="text"
//                         value={rem.dosage}
//                         onChange={(e) =>
//                           updateReminder(
//                             rem.id,
//                             rem.time,
//                             rem.medicine,
//                             e.target.value,
//                             rem.tone,
//                             rem.days
//                           )
//                         }
//                         className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
//                       />
//                       <select
//                         value={rem.tone}
//                         onChange={(e) =>
//                           updateReminder(
//                             rem.id,
//                             rem.time,
//                             rem.medicine,
//                             rem.dosage,
//                             e.target.value,
//                             rem.days
//                           )
//                         }
//                         className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
//                       >
//                         {tones.map((tone, idx) => (
//                           <option key={idx} value={tone.file}>
//                             {tone.label}
//                           </option>
//                         ))}
//                       </select>
//                       <div className="flex flex-wrap gap-2">
//                         {daysOfWeek.map((day) => (
//                           <button
//                             key={day}
//                             onClick={() =>
//                               updateReminder(
//                                 rem.id,
//                                 rem.time,
//                                 rem.medicine,
//                                 rem.dosage,
//                                 rem.tone,
//                                 rem.days.includes(day)
//                                   ? rem.days.filter((d) => d !== day)
//                                   : [...rem.days, day]
//                               )
//                             }
//                             className={`px-2 py-1 rounded-lg border ${
//                               rem.days.includes(day)
//                                 ? "bg-green-600 text-white border-green-600"
//                                 : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
//                             }`}
//                           >
//                             {day}
//                           </button>
//                         ))}
//                       </div>
//                     </div>
//                   ) : (
//                     <div>
//                       <p className="font-medium">
//                         {rem.time} - {rem.medicine} ({rem.dosage})
//                       </p>
//                       <p>Days: {rem.days.join(", ")}</p>
//                       <p>
//                         Tone: {tones.find((t) => t.file === rem.tone)?.label}
//                       </p>
//                     </div>
//                   )}
//                   <div className="flex gap-2 mt-2">
//                     <button
//                       onClick={() => toggleEdit(rem.id)}
//                       className="px-3 py-1 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition"
//                     >
//                       {rem.isEditing ? "Save" : "Edit"}
//                     </button>
//                     <button
//                       onClick={() => deleteReminder(rem.id)}
//                       className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           )}

//           {eli5Text && (
//             <button onClick={() => speakText(eli5Text)} className="btn btn-primary mt-3">
//               🔊 Play Explanation
//             </button>
//           )}
//         </section>
//       </main>

//       <audio ref={audioRef} />

//       <footer className="bg-gray-100 dark:bg-gray-800 text-center p-4 text-sm text-gray-600 dark:text-gray-300">
//         © {new Date().getFullYear()} MyDrugPaddi. All rights reserved.
//       </footer>
//     </div>
//   );
// };

// export default Dashboard;


import React, { useState, useEffect, useRef } from "react";
import DarkModeToggle from "./components/dark";
import Tesseract from "tesseract.js";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";
import DrugInteractionChecker from "./components/DrugInteractionChecker";
import { 
  Pill, 
  Bell, 
  Upload, 
  Brain, 
  Stethoscope, 
  Volume2, 
  VolumeX,
  Play,
  Square,
  Clock,
  Edit,
  Trash2,
  Check,
  AlertTriangle,
  LogOut,
  Globe,
  FileText,
  Plus,
  Calendar
} from 'lucide-react';

interface Reminder {
  id: number;
  time: string;
  medicine: string;
  dosage: string;
  tone: string;
  days: string[];
  isEditing?: boolean;
}

// Language configuration
const LANGUAGES = [
  { code: "english", name: "English", flag: "🇺🇸", voice: "en-US" },
  { code: "pidgin", name: "Nigerian Pidgin", flag: "🇳🇬", voice: "en-GB" },
  { code: "yoruba", name: "Yoruba", flag: "🇳🇬", voice: "yo-NG" },
  { code: "igbo", name: "Igbo", flag: "🇳🇬", voice: "ig-NG" },
  { code: "hausa", name: "Hausa", flag: "🇳🇬", voice: "ha-NG" },
  { code: "tiv", name: "Tiv", flag: "🇳🇬", voice: "en-GB" },
  { code: "french", name: "French", flag: "🇫🇷", voice: "fr-FR" },
  { code: "spanish", name: "Spanish", flag: "🇪🇸", voice: "es-ES" },
  { code: "german", name: "German", flag: "🇩🇪", voice: "de-DE" }
];

const tones = [
  { label: "Chime", file: "/Alarm-chosic.com_.mp3" },
  { label: "Beep", file: "/Alarm-Clock-Short-chosic.com_.mp3" },
  { label: "Alert", file: "/alexander-nakarada-silly-intro(chosic.com).mp3" },
  { label: "Bell", file: "/Burglar-Alarm-chosic.com_.mp3" },
  { label: "Digital", file: "/mixkit-classic-alarm-995.wav" },
];

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  onLogout: () => void;
}

// Fixed: Proper TypeScript interface for drug interactions
interface DrugInteractions {
  [key: string]: {
    [key: string]: string;
  };
}

// Common drug interactions for reminder system
const COMMON_INTERACTIONS: DrugInteractions = {
  'ibuprofen': {
    'warfarin': 'High risk of bleeding',
    'aspirin': 'Increased stomach bleeding risk',
    'alcohol': 'Increased stomach irritation'
  },
  'amoxicillin': {
    'warfarin': 'May increase bleeding risk',
    'birth control': 'May reduce contraceptive effectiveness'
  },
  'metformin': {
    'alcohol': 'Risk of lactic acidosis'
  },
  'sertraline': {
    'ibuprofen': 'Increased bleeding risk',
    'alcohol': 'Increased drowsiness'
  },
  'warfarin': {
    'aspirin': 'Severely increased bleeding risk',
    'ibuprofen': 'High risk of bleeding'
  }
};

const Dashboard: React.FC<Props> = ({ onLogout }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newTime, setNewTime] = useState<string>("");
  const [newMedicine, setNewMedicine] = useState<string>("");
  const [newDosage, setNewDosage] = useState<string>("");
  const [newTone, setNewTone] = useState<string>(tones[0].file);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [eli5Text, setEli5Text] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("english");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Text-to-Speech State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(0.9);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Enhanced Text-to-Speech Function with Language Support
  const speakText = (text: string, languageCode: string = selectedLanguage) => {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Find the best voice for the selected language
    const targetLanguage = LANGUAGES.find(lang => lang.code === languageCode);
    const targetLangCode = targetLanguage?.voice || 'en-US';
    
    const availableVoice = availableVoices.find(voice => 
      voice.lang === targetLangCode
    ) || availableVoices.find(voice => 
      voice.lang.startsWith(targetLangCode.split('-')[0])
    ) || availableVoices.find(voice => 
      voice.lang.includes('en')
    );

    if (availableVoice) {
      utterance.voice = availableVoice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      console.error("Speech error:", event.error);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Fixed: Check for drug interactions when adding new medication
  const checkDrugInteractions = (newMed: string): string[] => {
    const warnings: string[] = [];
    const newMedLower = newMed.toLowerCase();
    
    reminders.forEach(reminder => {
      const existingMedLower = reminder.medicine.toLowerCase();
      
      // Check both directions with proper type safety
      const interaction1 = COMMON_INTERACTIONS[newMedLower]?.[existingMedLower];
      const interaction2 = COMMON_INTERACTIONS[existingMedLower]?.[newMedLower];
      const interaction = interaction1 || interaction2;
      
      if (interaction) {
        warnings.push(`⚠️ ${newMed} + ${reminder.medicine}: ${interaction}`);
      }
    });
    
    return warnings;
  };

  // Upload handler
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedImage(URL.createObjectURL(file));
  };

  // Toggle day selection
  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Add new reminder with interaction check
  const addReminder = () => {
    if (newTime && newMedicine && newDosage && selectedDays.length > 0) {
      // Check for drug interactions
      const interactionWarnings = checkDrugInteractions(newMedicine);
      
      if (interactionWarnings.length > 0) {
        alert(`DRUG INTERACTION WARNING:\n\n${interactionWarnings.join('\n')}\n\nPlease consult your doctor or pharmacist.`);
      }
      
      setReminders([
        ...reminders,
        {
          id: Date.now(),
          time: newTime,
          medicine: newMedicine,
          dosage: newDosage,
          tone: newTone,
          days: selectedDays,
        },
      ]);
      setNewTime("");
      setNewMedicine("");
      setNewDosage("");
      setNewTone(tones[0].file);
      setSelectedDays([]);
    } else {
      alert("Please fill all fields and select at least one day.");
    }
  };

  const deleteReminder = (id: number) => {
    setReminders(reminders.filter((rem) => rem.id !== id));
  };

  const toggleEdit = (id: number) => {
    setReminders(
      reminders.map((rem) =>
        rem.id === id ? { ...rem, isEditing: !rem.isEditing } : rem
      )
    );
  };

  const updateReminder = (
    id: number,
    newTime: string,
    newMedicine: string,
    newDosage: string,
    newTone: string,
    newDays: string[]
  ) => {
    setReminders(
      reminders.map((rem) =>
        rem.id === id
          ? {
              ...rem,
              time: newTime,
              medicine: newMedicine,
              dosage: newDosage,
              tone: newTone,
              days: newDays,
              isEditing: false,
            }
          : rem
      )
    );
  };

  // Alarm trigger
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      const today = now.toLocaleString("en-US", { weekday: "short" });

      reminders.forEach((reminder) => {
        if (reminder.time === currentTime && reminder.days.includes(today)) {
          alert(
            `⏰ Time to take your medication!\n${reminder.medicine} - ${reminder.dosage}`
          );
          if (audioRef.current) {
            audioRef.current.src = reminder.tone;
            audioRef.current.play().catch(() => console.log("Playback blocked"));
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [reminders]);

  const previewTone = () => {
    if (audioRef.current) {
      audioRef.current.src = newTone;
      audioRef.current.play().catch(() => console.log("Preview blocked"));
    }
  };

  const handleOCR = async () => {
    if (!selectedImage) return;
    setOcrText("Extracting text... please wait.");

    try {
      const result = await Tesseract.recognize(selectedImage, "eng", {
        logger: (m) => console.log(m),
      });

      const extracted = result.data.text.trim();
      setOcrText(extracted || "No text found. Please try another image.");
    } catch (error) {
      console.error("OCR error:", error);
      setOcrText("Error reading image. Please try again.");
    }
  };

  // FIXED: Updated API call to use relative path
  const handleExplain = async () => {
    if (!ocrText) return;
    setIsLoading(true);
    setEli5Text("Thinking...");

    try {
      // Use relative path instead of localhost:5000
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: ocrText,
          language: selectedLanguage 
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      if (data.explanation) {
        setEli5Text(data.explanation);
      } else {
        setEli5Text("Couldn't get explanation. Try again later.");
      }
    } catch (error) {
      console.error("AI fetch error:", error);
      setEli5Text("Server connection failed. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get current language info
  const currentLanguage = LANGUAGES.find(lang => lang.code === selectedLanguage);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 relative">
      {/* Dark Mode Toggle */}
      <DarkModeToggle />

      {/* Navbar */}
      <nav className="bg-purple-600 dark:bg-gray-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Pill className="w-6 h-6 mr-3" />
          MyDrugPaddi
        </h1>
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-white" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500"
            >
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.flag} {language.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onLogout}
            className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition flex items-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </nav>

      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-center">
          <div className="flex justify-between items-center w-full mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-purple-600" />
              Upload Prescription
            </h2>
            <span className="text-sm bg-purple-500 text-white px-2 py-1 rounded-full flex items-center">
              <Globe className="w-3 h-3 mr-1" />
              {currentLanguage?.name}
            </span>
          </div>

          <label className="cursor-pointer border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-2xl p-8 text-center hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors w-full">
            <Upload className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
              Upload Prescription Image
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Click to select or drag and drop
            </p>
            
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>

          {selectedImage && (
            <div className="mt-4 w-full">
              <p className="text-gray-600 dark:text-gray-300 mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Preview:
              </p>
              <img
                src={selectedImage}
                alt="Prescription Preview"
                className="w-full rounded-lg shadow-md mb-4"
              />

              {/* OCR + Explanation */}
              <button
                onClick={handleOCR}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 w-full flex items-center justify-center"
              >
                <Brain className="w-4 h-4 mr-2" />
                Extract Text
              </button>

              {ocrText && (
                <div className="mt-4 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Extracted Text:
                    </h3>
                  </div>
                  <p>{ocrText}</p>

                  <button
                    onClick={handleExplain}
                    disabled={isLoading}
                    className={`mt-3 text-white px-3 py-2 rounded-lg transition w-full flex items-center justify-center ${
                      isLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 mr-2" />
                    {isLoading ? 'Processing...' : `Simplify in ${currentLanguage?.name}`}
                  </button>
                </div>
              )}

              {/* Simplified Explanation with Speech */}
              {eli5Text && eli5Text !== "Thinking..." && (
                <div className="mt-4 bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 flex items-center">
                      <Stethoscope className="w-4 h-4 mr-2" />
                      Simplified Explanation:
                    </h3>
                  </div>
                  <p className="text-green-700 dark:text-green-300 mb-3">
                    {eli5Text}
                  </p>
                  
                  {/* Text-to-Speech Controls */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => isSpeaking ? stopSpeaking() : speakText(eli5Text)}
                        className={`flex-1 px-4 py-2 rounded-lg transition flex items-center justify-center ${
                          isSpeaking 
                            ? "bg-red-600 hover:bg-red-700 text-white" 
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        {isSpeaking ? (
                          <>
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 mr-2" />
                            Listen
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Speech Rate Control */}
                    <div className="flex items-center gap-2 text-sm">
                      <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      <span className="text-gray-600 dark:text-gray-300">Speed:</span>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-gray-600 dark:text-gray-300">{speechRate.toFixed(1)}x</span>
                    </div>

                    {!('speechSynthesis' in window) && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Text-to-speech not supported in your browser
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Reminders Section */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-purple-600" />
            Medication Reminders
          </h2>

          {/* Inputs */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Pill className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Medicine Name"
                value={newMedicine}
                onChange={(e) => setNewMedicine(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <input
              type="text"
              placeholder="Dosage (e.g. 2 pieces)"
              value={newDosage}
              onChange={(e) => setNewDosage(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            {/* Days selection */}
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-2 py-1 rounded-lg border flex items-center ${
                    selectedDays.includes(day)
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {selectedDays.includes(day) && <Check className="w-3 h-3 mr-1" />}
                  {day}
                </button>
              ))}
            </div>

            {/* Tone selector + preview */}
            <div className="flex gap-2">
              <select
                value={newTone}
                onChange={(e) => setNewTone(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {tones.map((tone, idx) => (
                  <option key={idx} value={tone.file}>
                    {tone.label}
                  </option>
                ))}
              </select>
              <button
                onClick={previewTone}
                className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition flex items-center"
              >
                <Volume2 className="w-4 h-4 mr-1" />
                Preview
              </button>
            </div>

            <button
              onClick={addReminder}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition w-full flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
            </button>
          </div>

          {/* Reminder List */}
          {reminders.length === 0 ? (
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center text-gray-500 dark:text-gray-300 flex items-center justify-center">
              <Clock className="w-4 h-4 mr-2" />
              No reminders set yet
            </div>
          ) : (
            <ul className="space-y-2">
              {reminders.map((rem) => (
                <li
                  key={rem.id}
                  className="p-3 bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg flex flex-col gap-2"
                >
                  {rem.isEditing ? (
                    <div className="space-y-2">
                      {/* ... editing inputs ... */}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-green-600" />
                        {rem.time} - {rem.medicine} ({rem.dosage})
                      </p>
                      <p className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                        Days: {rem.days.join(", ")}
                      </p>
                      <p className="flex items-center">
                        <Volume2 className="w-4 h-4 mr-2 text-purple-600" />
                        Tone: {tones.find((t) => t.file === rem.tone)?.label}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => toggleEdit(rem.id)}
                      className="px-3 py-1 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {rem.isEditing ? "Save" : "Edit"}
                    </button>
                    <button
                      onClick={() => deleteReminder(rem.id)}
                      className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Drug Interaction Checker */}
        <DrugInteractionChecker />
      </main>

      <audio ref={audioRef} />

      <footer className="bg-gray-100 dark:bg-gray-800 text-center p-4 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-center">
        <Pill className="w-4 h-4 mr-2" />
        © {new Date().getFullYear()} MyDrugPaddi. 
      </footer>
    </div>
  );
};

export default Dashboard;