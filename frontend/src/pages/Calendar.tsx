import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { EventCalendar } from '../components/EventCalendar';

export const Calendar: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Event Calendar
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Schedule and manage your important events and appointments
          </p>
        </div>
      </div>

      {/* Calendar Component */}
      <EventCalendar />
    </div>
  );
};

export default Calendar;
