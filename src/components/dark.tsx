// import React, { useState, useEffect } from "react";

// const DarkModeToggle: React.FC = () => {
//   const [darkMode, setDarkMode] = useState<boolean>(
//     () => localStorage.getItem("darkMode") === "true"
//   );

//   useEffect(() => {
//     const root = window.document.documentElement;
//     if (darkMode) root.classList.add("dark");
//     else root.classList.remove("dark");
//   }, [darkMode]);

//   const toggleDarkMode = () => {
//     setDarkMode((prev) => {
//       localStorage.setItem("darkMode", String(!prev));
//       return !prev;
//     });
//   };

//   return (
//     <button
//       onClick={toggleDarkMode}
//       className="absolute top-4 right-4 bg-gray-200 dark:bg-gray-700 
//                  text-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg shadow">
//       {darkMode ? "🌞 Light" : "🌙 Dark"}
//     </button>
//   );
// };

// export default DarkModeToggle;

import React from "react";
import { Sun, Moon } from "lucide-react";

interface DarkModeToggleProps {
  position?: "left" | "right";
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = () => {
  const [darkMode, setDarkMode] = React.useState(
    () => localStorage.getItem("theme") === "dark"
  );

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 
                 text-gray-800 dark:text-white shadow-md 
                 hover:scale-110 transition-transform flex items-center justify-center"
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {darkMode ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

export default DarkModeToggle;