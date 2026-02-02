import React from 'react';
import { useShopSections } from '../contexts/ShopSectionsContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ShieldOff, Home, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface SectionGuardProps {
  path: string;
  children: React.ReactNode;
}

/**
 * SectionGuard - Protects routes from access when section is hidden
 * 
 * Wraps a route component and shows "Page Not Found" if the section is hidden.
 * This prevents direct URL access to hidden sections.
 * 
 * EXCEPTION: SUPER_ADMIN can always access all sections (even when hidden).
 */
export const SectionGuard: React.FC<SectionGuardProps> = ({ path, children }) => {
  const { isSectionHidden, isLoading } = useShopSections();
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Show loading while checking sections
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className={`animate-spin rounded-full h-8 w-8 border-2 ${
          theme === 'dark' ? 'border-emerald-500 border-t-transparent' : 'border-emerald-600 border-t-transparent'
        }`} />
      </div>
    );
  }

  // SUPER_ADMIN and Shop ADMIN bypass: Can access all sections even when hidden
  // Shop ADMIN needs access to manage sections for their users
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isShopAdmin = user?.role === 'ADMIN';
  const canBypassHiddenSections = isSuperAdmin || isShopAdmin;
  
  // If section is hidden AND user cannot bypass, show "Page Not Found" style message
  if (isSectionHidden(path) && !canBypassHiddenSections) {
    return (
      <div className={`flex items-center justify-center min-h-[70vh] px-4 ${
        theme === 'dark' ? 'text-white' : 'text-slate-900'
      }`}>
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-500/30' 
              : 'bg-gradient-to-br from-red-100 to-rose-50 border border-red-200'
          }`}>
            <ShieldOff className={`w-10 h-10 ${
              theme === 'dark' ? 'text-red-400' : 'text-red-500'
            }`} />
          </div>

          {/* Title */}
          <h1 className={`text-3xl font-bold mb-3 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Page Not Found
          </h1>

          {/* Description */}
          <p className={`text-base mb-8 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            The page you're looking for doesn't exist or you don't have access to view it.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>

            <Link
              to="/"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Section is visible, render children
  return <>{children}</>;
};
