// import React, { useState } from "react";
// import { Link } from "react-router-dom";
// import DarkModeToggle from "../components/dark";

// const Login: React.FC = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const handleLogin = (e: React.FormEvent) => {
//     e.preventDefault();
//     console.log("Logging in with:", { email, password });
//     // TODO: Firebase auth login
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 relative">
//       {/* ✅ Dark mode toggle (top-right) */}
//       <div className="absolute top-4 right-4">
//         <DarkModeToggle />
//       </div>

//       <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
//         <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-6">
//           🔑 Login to MyDrugPaddi
//         </h2>

//         <form onSubmit={handleLogin} className="space-y-4">
//           <input
//             type="email"
//             placeholder="Email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//             className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
//               bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
//           />
//           <input
//             type="password"
//             placeholder="Password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required
//             className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
//               bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
//           />

//           <button
//             type="submit"
//             className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition"
//           >
//             Login
//           </button>
//         </form>

//         {/* Forgot password link */}
//         <p className="text-right text-sm text-purple-600 hover:underline mt-2">
//           <Link to="/forgot-password">Forgot password?</Link>
//         </p>

//         <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
//           Don’t have an account?{" "}
//           <Link to="/signup" className="text-purple-600 hover:underline">
//             Sign up
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// };

// export default Login;

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import DarkModeToggle from "../components/dark";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // App.tsx will auto-redirect to dashboard
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 relative">
      {/* Dark mode toggle top-right */}
      <div className="absolute top-4 left-4">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-6">
          🔑 Login to MyDrugPaddi
        </h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition"
          >
            Login
          </button>
        </form>

        {/* Forgot password */}
        <p className="text-right text-sm text-purple-600 hover:underline mt-2">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-purple-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
