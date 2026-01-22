import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Home, AlertCircle } from 'lucide-react';

const NotFound: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className={`w-20 h-20 mb-6 rounded-2xl flex items-center justify-center ${
        theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'
      }`}>
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      <h1 className={`text-4xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
        404
      </h1>
      <p className={`text-xl mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
        Page not found
      </p>
      <Link 
        to="/"
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
      >
        <Home className="w-5 h-5" />
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound;
