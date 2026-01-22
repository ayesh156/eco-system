import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string; // Format: "HH:mm" (24-hour)
  onChange: (value: string) => void;
  theme?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  theme = 'dark',
  disabled = false,
  placeholder = 'Select time',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse time value
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: 12, minute: 0, period: 'AM' };
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return { hour: hour12, minute: minutes || 0, period };
  };

  const { hour, minute, period } = parseTime(value);

  // Format display time
  const formatDisplayTime = () => {
    if (!value) return placeholder;
    return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // Set time from components
  const setTime = (h: number, m: number, p: string) => {
    let hour24 = h;
    if (p === 'PM' && h !== 12) hour24 = h + 12;
    if (p === 'AM' && h === 12) hour24 = 0;
    const timeStr = `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    onChange(timeStr);
  };

  // Handlers
  const adjustHour = (delta: number) => {
    let newHour = hour + delta;
    if (newHour > 12) newHour = 1;
    if (newHour < 1) newHour = 12;
    setTime(newHour, minute, period);
  };

  const adjustMinute = (delta: number) => {
    let newMinute = minute + delta;
    if (newMinute > 59) newMinute = 0;
    if (newMinute < 0) newMinute = 59;
    setTime(hour, newMinute, period);
  };

  const handleHourInput = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      setTime(num, minute, period);
    }
  };

  const handleMinuteInput = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0 && num <= 59) {
      setTime(hour, num, period);
    } else if (val === '') {
      setTime(hour, 0, period);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick time presets
  const presets = [
    { label: 'Now', action: () => {
      const now = new Date();
      setTime(
        now.getHours() % 12 || 12,
        now.getMinutes(),
        now.getHours() >= 12 ? 'PM' : 'AM'
      );
    }},
    { label: '9 AM', action: () => setTime(9, 0, 'AM') },
    { label: '12 PM', action: () => setTime(12, 0, 'PM') },
    { label: '5 PM', action: () => setTime(5, 0, 'PM') },
  ];

  const isDark = theme === 'dark';

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
          isDark
            ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50 hover:border-slate-600'
            : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
          isOpen ? (isDark ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : 'border-emerald-500 ring-2 ring-emerald-500/20') : ''
        }`}
      >
        <span className={!value ? (isDark ? 'text-slate-500' : 'text-slate-400') : ''}>
          {formatDisplayTime()}
        </span>
        <Clock className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute top-full right-0 mt-2 p-3 rounded-xl border shadow-2xl z-50 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          {/* Time Controls */}
          <div className="flex items-center justify-center gap-1">
            {/* Hour */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => adjustHour(1)}
                className={`w-12 h-7 flex items-center justify-center rounded-t-lg transition-colors ${
                  isDark
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-emerald-400'
                    : 'hover:bg-slate-100 text-slate-400 hover:text-emerald-600'
                }`}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={hour.toString().padStart(2, '0')}
                onChange={(e) => handleHourInput(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className={`w-12 h-11 text-center text-xl font-bold rounded-lg border-2 outline-none transition-colors ${
                  isDark
                    ? 'bg-slate-900 border-slate-600 text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => adjustHour(-1)}
                className={`w-12 h-7 flex items-center justify-center rounded-b-lg transition-colors ${
                  isDark
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-emerald-400'
                    : 'hover:bg-slate-100 text-slate-400 hover:text-emerald-600'
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Separator */}
            <span className={`text-2xl font-bold ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>:</span>

            {/* Minute */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => adjustMinute(1)}
                className={`w-12 h-7 flex items-center justify-center rounded-t-lg transition-colors ${
                  isDark
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-emerald-400'
                    : 'hover:bg-slate-100 text-slate-400 hover:text-emerald-600'
                }`}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={minute.toString().padStart(2, '0')}
                onChange={(e) => handleMinuteInput(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className={`w-12 h-11 text-center text-xl font-bold rounded-lg border-2 outline-none transition-colors ${
                  isDark
                    ? 'bg-slate-900 border-slate-600 text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => adjustMinute(-1)}
                className={`w-12 h-7 flex items-center justify-center rounded-b-lg transition-colors ${
                  isDark
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-emerald-400'
                    : 'hover:bg-slate-100 text-slate-400 hover:text-emerald-600'
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* AM/PM */}
            <div className="flex flex-col ml-1">
              <button
                type="button"
                onClick={() => setTime(hour, minute, 'AM')}
                className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border transition-all ${
                  period === 'AM'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : isDark
                    ? 'bg-slate-900 border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setTime(hour, minute, 'PM')}
                className={`px-3 py-1.5 text-xs font-bold rounded-b-lg border border-t-0 transition-all ${
                  period === 'PM'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : isDark
                    ? 'bg-slate-900 border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className={`flex gap-1 mt-2 pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  preset.action();
                }}
                className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                  isDark
                    ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-emerald-400'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Done Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full mt-2 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};
