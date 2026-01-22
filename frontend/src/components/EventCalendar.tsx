import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { TimePicker } from './ui/time-picker';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Calendar,
  Clock,
  X,
  Edit2,
  Trash2,
  Check,
  Bell,
  MapPin,
  Tag,
  Star,
  CalendarDays,
  CalendarClock,
  ChevronDown,
  Search,
} from 'lucide-react';

// Event interface
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD format
  time?: string;
  endTime?: string;
  color: string;
  isAllDay: boolean;
  location?: string;
  reminder?: string;
  isStarred: boolean;
  tags: string[];
}

// Event colors
const eventColors = [
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500', light: 'bg-blue-100 text-blue-700', dark: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-500' },
  { name: 'Green', value: 'green', bg: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-500/20 text-emerald-400', dot: 'bg-emerald-500' },
  { name: 'Red', value: 'red', bg: 'bg-red-500', light: 'bg-red-100 text-red-700', dark: 'bg-red-500/20 text-red-400', dot: 'bg-red-500' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500', light: 'bg-purple-100 text-purple-700', dark: 'bg-purple-500/20 text-purple-400', dot: 'bg-purple-500' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500', light: 'bg-orange-100 text-orange-700', dark: 'bg-orange-500/20 text-orange-400', dot: 'bg-orange-500' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500', light: 'bg-pink-100 text-pink-700', dark: 'bg-pink-500/20 text-pink-400', dot: 'bg-pink-500' },
  { name: 'Teal', value: 'teal', bg: 'bg-teal-500', light: 'bg-teal-100 text-teal-700', dark: 'bg-teal-500/20 text-teal-400', dot: 'bg-teal-500' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-500', light: 'bg-amber-100 text-amber-700', dark: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-500' },
];

// Sample events - More for pagination demo
const sampleEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Team Meeting',
    description: 'Weekly team sync to discuss project progress and upcoming deadlines.',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    endTime: '11:00',
    color: 'blue',
    isAllDay: false,
    location: 'Conference Room A',
    reminder: '15min',
    isStarred: true,
    tags: ['meeting', 'team'],
  },
  {
    id: '2',
    title: 'Product Launch',
    description: 'New iPhone accessories launch - prepare display and promotional materials.',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '09:00',
    endTime: '18:00',
    color: 'green',
    isAllDay: true,
    location: 'Store Front',
    isStarred: true,
    tags: ['launch', 'important'],
  },
  {
    id: '3',
    title: 'Supplier Visit',
    description: 'Meeting with ABC Electronics supplier for new inventory discussion.',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '14:00',
    endTime: '15:30',
    color: 'purple',
    isAllDay: false,
    location: 'Main Office',
    reminder: '1hour',
    isStarred: false,
    tags: ['supplier', 'inventory'],
  },
  {
    id: '4',
    title: 'Staff Training',
    description: 'POS system training for new employees.',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '16:00',
    endTime: '18:00',
    color: 'orange',
    isAllDay: false,
    isStarred: false,
    tags: ['training'],
  },
  {
    id: '5',
    title: 'Monthly Inventory Check',
    description: 'Complete inventory audit for the month.',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    color: 'red',
    isAllDay: true,
    isStarred: false,
    tags: ['inventory'],
  },
  {
    id: '6',
    title: 'Customer Appreciation Day',
    description: 'Special discounts and giveaways for loyal customers.',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    color: 'pink',
    isAllDay: true,
    isStarred: true,
    tags: ['event', 'promotion'],
  },
  {
    id: '7',
    title: 'Sales Review Meeting',
    description: 'Monthly sales performance review with the team.',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '11:00',
    endTime: '12:30',
    color: 'blue',
    isAllDay: false,
    location: 'Meeting Room B',
    isStarred: false,
    tags: ['sales', 'review'],
  },
  {
    id: '8',
    title: 'New Product Demo',
    description: 'Samsung Galaxy S24 product demonstration for staff.',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '15:00',
    endTime: '16:00',
    color: 'teal',
    isAllDay: false,
    location: 'Store Floor',
    isStarred: true,
    tags: ['demo', 'training'],
  },
  {
    id: '9',
    title: 'Marketing Campaign Launch',
    description: 'Launch of new social media marketing campaign.',
    date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '09:00',
    color: 'amber',
    isAllDay: false,
    isStarred: true,
    tags: ['marketing'],
  },
  {
    id: '10',
    title: 'Warranty Claims Processing',
    description: 'Process pending warranty claims from the week.',
    date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '10:00',
    endTime: '12:00',
    color: 'red',
    isAllDay: false,
    isStarred: false,
    tags: ['warranty', 'admin'],
  },
  {
    id: '11',
    title: 'Technical Support Training',
    description: 'Advanced troubleshooting techniques for repair team.',
    date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '14:00',
    endTime: '17:00',
    color: 'purple',
    isAllDay: false,
    location: 'Workshop',
    isStarred: false,
    tags: ['training', 'technical'],
  },
  {
    id: '12',
    title: 'Store Renovation Planning',
    description: 'Discuss store layout improvements and renovations.',
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '13:00',
    endTime: '14:30',
    color: 'green',
    isAllDay: false,
    location: 'Office',
    isStarred: true,
    tags: ['planning', 'store'],
  },
  {
    id: '13',
    title: 'Supplier Negotiation',
    description: 'Price negotiation with new accessory supplier.',
    date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '10:00',
    endTime: '11:30',
    color: 'blue',
    isAllDay: false,
    location: 'Meeting Room',
    isStarred: false,
    tags: ['supplier', 'negotiation'],
  },
  {
    id: '14',
    title: 'Weekend Sale Event',
    description: 'Prepare and execute weekend flash sale.',
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    color: 'orange',
    isAllDay: true,
    isStarred: true,
    tags: ['sale', 'event'],
  },
  {
    id: '15',
    title: 'Bank Meeting',
    description: 'Monthly review with bank relationship manager.',
    date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '11:00',
    endTime: '12:00',
    color: 'teal',
    isAllDay: false,
    location: 'Bank HQ',
    isStarred: false,
    tags: ['finance', 'bank'],
  },
];

// Month names
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Years range for selector
const YEARS = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

// Day names
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Reminder options
const REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '5min', label: '5 minutes before' },
  { value: '15min', label: '15 minutes before' },
  { value: '30min', label: '30 minutes before' },
  { value: '1hour', label: '1 hour before' },
  { value: '1day', label: '1 day before' },
];

interface EventCalendarProps {
  onClose?: () => void;
}

export const EventCalendar: React.FC<EventCalendarProps> = () => {
  const { theme } = useTheme();
  const today = new Date();
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  
  // Selector dropdown states
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const monthSelectorRef = useRef<HTMLDivElement>(null);
  const yearSelectorRef = useRef<HTMLDivElement>(null);
  
  // Modal states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDayEvents, setShowDayEvents] = useState(false);
  
  // Events list pagination
  const [eventsSearchQuery, setEventsSearchQuery] = useState('');
  const [eventsCurrentPage, setEventsCurrentPage] = useState(1);
  const eventsPerPage = 5;
  
  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthSelectorRef.current && !monthSelectorRef.current.contains(e.target as Node)) {
        setShowMonthSelector(false);
      }
      if (yearSelectorRef.current && !yearSelectorRef.current.contains(e.target as Node)) {
        setShowYearSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Get first day of month (0-6)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth - 1);
    
    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, daysInPrevMonth - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const isToday = date.toDateString() === today.toDateString();
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
      });
    }
    
    return days;
  }, [currentYear, currentMonth]);
  
  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };
  
  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => event.date === selectedDate)
      .sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      });
  }, [selectedDate, events]);
  
  // Navigation functions
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  
  const goToPrevYear = () => {
    setCurrentDate(new Date(currentYear - 1, currentMonth, 1));
  };
  
  const goToNextYear = () => {
    setCurrentDate(new Date(currentYear + 1, currentMonth, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(today.toISOString().split('T')[0]);
  };
  
  const selectMonth = (monthIndex: number) => {
    setCurrentDate(new Date(currentYear, monthIndex, 1));
    setViewMode('month');
    setShowMonthSelector(false);
  };
  
  const selectYear = (year: number) => {
    setCurrentDate(new Date(year, currentMonth, 1));
    setShowYearSelector(false);
  };
  
  // Handle date click
  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setShowDayEvents(true);
  };
  
  // Event handlers
  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsEditing(true);
    setIsEventModalOpen(true);
  };
  
  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditing(true);
    setIsEventModalOpen(true);
  };
  
  const handleViewEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditing(false);
    setIsEventModalOpen(true);
  };
  
  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setIsEventModalOpen(false);
  };
  
  const handleSaveEvent = (eventData: Partial<CalendarEvent>) => {
    if (selectedEvent) {
      // Update existing event
      setEvents(prev => prev.map(e => 
        e.id === selectedEvent.id ? { ...e, ...eventData } : e
      ));
    } else {
      // Create new event
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventData.title || 'Untitled Event',
        description: eventData.description || '',
        date: eventData.date || selectedDate || today.toISOString().split('T')[0],
        time: eventData.time,
        endTime: eventData.endTime,
        color: eventData.color || 'blue',
        isAllDay: eventData.isAllDay || false,
        location: eventData.location,
        reminder: eventData.reminder,
        isStarred: eventData.isStarred || false,
        tags: eventData.tags || [],
      };
      setEvents(prev => [...prev, newEvent]);
    }
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  };
  
  const handleToggleStar = (eventId: string) => {
    setEvents(prev => prev.map(e => 
      e.id === eventId ? { ...e, isStarred: !e.isStarred } : e
    ));
  };
  
  // Get color dot for calendar indicators
  const getColorDot = (colorValue: string) => {
    const color = eventColors.find(c => c.value === colorValue) || eventColors[0];
    return color.dot;
  };
  
  // Format time
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };
  
  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Upcoming events with filtering and pagination
  const filteredUpcomingEvents = useMemo(() => {
    const todayStr = today.toISOString().split('T')[0];
    let filtered = events.filter(e => e.date >= todayStr);
    
    // Apply search filter
    if (eventsSearchQuery) {
      const query = eventsSearchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  }, [events, eventsSearchQuery]);
  
  // Pagination calculations
  const totalEventsPages = Math.ceil(filteredUpcomingEvents.length / eventsPerPage);
  const paginatedEvents = useMemo(() => {
    const start = (eventsCurrentPage - 1) * eventsPerPage;
    return filteredUpcomingEvents.slice(start, start + eventsPerPage);
  }, [filteredUpcomingEvents, eventsCurrentPage]);
  
  // Reset pagination when search changes
  useEffect(() => {
    setEventsCurrentPage(1);
  }, [eventsSearchQuery]);
  
  // Generate page numbers for pagination
  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalEventsPages <= maxVisible) {
      for (let i = 1; i <= totalEventsPages; i++) pages.push(i);
    } else {
      if (eventsCurrentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalEventsPages);
      } else if (eventsCurrentPage >= totalEventsPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalEventsPages - 3; i <= totalEventsPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = eventsCurrentPage - 1; i <= eventsCurrentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalEventsPages);
      }
    }
    return pages;
  }, [eventsCurrentPage, totalEventsPages]);
  
  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-500/10'
            }`}>
              <CalendarDays className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className={`text-xl lg:text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                Event Calendar
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Schedule and track your important events
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={goToToday}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Today
            </button>
            <button
              onClick={handleCreateEvent}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Event
            </button>
          </div>
        </div>
        
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={viewMode === 'month' ? goToPrevMonth : goToPrevYear}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-700/50 text-slate-400'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {/* Modern Month Selector Dropdown */}
            <div className="relative" ref={monthSelectorRef}>
              <button
                onClick={() => {
                  setShowMonthSelector(!showMonthSelector);
                  setShowYearSelector(false);
                }}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl font-semibold text-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-slate-700/50 text-white'
                    : 'hover:bg-slate-100 text-slate-900'
                }`}
              >
                {MONTHS[currentMonth]}
                <ChevronDown className={`w-4 h-4 transition-transform ${showMonthSelector ? 'rotate-180' : ''}`} />
              </button>
              
              {showMonthSelector && (
                <div className={`absolute top-full left-0 mt-2 p-3 rounded-2xl border shadow-2xl z-50 min-w-[280px] ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-xl'
                }`}>
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-3 px-1 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Select Month
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {MONTHS_SHORT.map((month, index) => (
                      <button
                        key={month}
                        onClick={() => selectMonth(index)}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          currentMonth === index
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                            : theme === 'dark'
                              ? 'hover:bg-slate-700 text-slate-300 hover:text-white'
                              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modern Year Selector Dropdown */}
            <div className="relative" ref={yearSelectorRef}>
              <button
                onClick={() => {
                  setShowYearSelector(!showYearSelector);
                  setShowMonthSelector(false);
                }}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl font-semibold text-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-slate-700/50 text-white'
                    : 'hover:bg-slate-100 text-slate-900'
                }`}
              >
                {currentYear}
                <ChevronDown className={`w-4 h-4 transition-transform ${showYearSelector ? 'rotate-180' : ''}`} />
              </button>
              
              {showYearSelector && (
                <div className={`absolute top-full left-0 mt-2 p-2 rounded-xl border shadow-2xl z-50 max-h-64 overflow-y-auto ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  {YEARS.map((year) => (
                    <button
                      key={year}
                      onClick={() => selectYear(year)}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                        currentYear === year
                          ? 'bg-emerald-500 text-white'
                          : theme === 'dark'
                            ? 'hover:bg-slate-700 text-slate-300'
                            : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={viewMode === 'month' ? goToNextMonth : goToNextYear}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-700/50 text-slate-400'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* View toggle */}
          <div className={`hidden sm:flex items-center rounded-xl p-1 ${
            theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'
          }`}>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'year'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Year
            </button>
          </div>
        </div>
        
        {viewMode === 'month' ? (
          /* Month View */
          <div className="select-none">
            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((day, i) => (
                <div 
                  key={day}
                  className={`py-3 text-center text-sm font-semibold ${
                    i === 0 || i === 6
                      ? theme === 'dark' ? 'text-rose-400/70' : 'text-rose-500/70'
                      : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, index) => {
                const dateStr = day.date.toISOString().split('T')[0];
                const dayEvents = getEventsForDate(day.date);
                const isSelected = selectedDate === dateStr;
                const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(day.date, day.isCurrentMonth)}
                    className={`group relative min-h-[80px] lg:min-h-[100px] p-1.5 lg:p-2 rounded-xl border transition-all duration-200 ${
                      day.isCurrentMonth
                        ? isSelected
                          ? theme === 'dark'
                            ? 'bg-gradient-to-br from-emerald-500/20 to-blue-500/10 border-emerald-500/50 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                            : 'bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                          : day.isToday
                            ? theme === 'dark'
                              ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border-blue-500/50 shadow-md shadow-blue-500/10'
                              : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400 shadow-md shadow-blue-500/10'
                            : theme === 'dark'
                              ? 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-700/40 hover:border-slate-600 hover:shadow-md'
                              : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md'
                        : theme === 'dark'
                          ? 'bg-slate-900/20 border-slate-800/20 opacity-40 hover:opacity-60'
                          : 'bg-slate-50/30 border-slate-100 opacity-40 hover:opacity-60'
                    }`}
                  >
                    {/* Date Number */}
                    <span className={`absolute top-1.5 left-2 lg:top-2 lg:left-2.5 flex items-center justify-center ${
                      day.isToday
                        ? 'w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-bold shadow-md'
                        : `text-sm lg:text-base font-semibold ${
                            !day.isCurrentMonth
                              ? theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                              : isWeekend
                                ? theme === 'dark' ? 'text-rose-400/70' : 'text-rose-500/70'
                                : theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`
                    }`}>
                      {day.date.getDate()}
                    </span>
                    
                    {/* Selected indicator */}
                    {isSelected && !day.isToday && (
                      <span className="absolute top-1.5 right-1.5 lg:top-2 lg:right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    
                    {/* Event indicators */}
                    {dayEvents.length > 0 && day.isCurrentMonth && (
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 lg:bottom-2 lg:left-2 lg:right-2 flex flex-wrap gap-0.5 items-center">
                        {dayEvents.slice(0, 3).map((event, i) => (
                          <span 
                            key={i}
                            className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${getColorDot(event.color)} transition-transform group-hover:scale-125`}
                            title={event.title}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className={`text-[10px] lg:text-xs font-bold ml-0.5 ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Year View - Month Grid */
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {MONTHS.map((month, index) => {
              const monthEvents = events.filter(e => {
                const eventDate = new Date(e.date);
                return eventDate.getMonth() === index && eventDate.getFullYear() === currentYear;
              });
              const isCurrentMonth = index === today.getMonth() && currentYear === today.getFullYear();
              
              return (
                <button
                  key={month}
                  onClick={() => selectMonth(index)}
                  className={`group relative p-4 rounded-xl border transition-all duration-200 overflow-hidden ${
                    isCurrentMonth
                      ? theme === 'dark'
                        ? 'bg-gradient-to-br from-emerald-500/20 to-blue-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-400 shadow-lg shadow-emerald-500/10'
                      : theme === 'dark'
                        ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/40 hover:border-slate-600 hover:shadow-md'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:shadow-md'
                  }`}
                >
                  {/* Decorative gradient overlay on hover */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    theme === 'dark' ? 'bg-gradient-to-br from-emerald-500/5 to-transparent' : 'bg-gradient-to-br from-emerald-500/5 to-transparent'
                  }`} />
                  
                  <div className="relative">
                    <div className={`font-bold text-lg mb-1 ${
                      isCurrentMonth
                        ? 'text-emerald-500'
                        : theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {month.slice(0, 3)}
                    </div>
                    {monthEvents.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1">
                          {monthEvents.slice(0, 3).map((e, i) => (
                            <span key={i} className={`w-2 h-2 rounded-full ${getColorDot(e.color)} ring-1 ${theme === 'dark' ? 'ring-slate-800' : 'ring-white'}`} />
                          ))}
                        </div>
                        <span className={`text-xs font-medium ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {monthEvents.length} event{monthEvents.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                        No events
                      </span>
                    )}
                  </div>
                  
                  {/* Current month badge */}
                  {isCurrentMonth && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-md">
                      NOW
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Day Events Panel */}
      {showDayEvents && selectedDate && (
        <div className={`rounded-2xl border p-4 lg:p-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {formatDateDisplay(selectedDate)}
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setIsEditing(true);
                  setIsEventModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-xl text-sm font-medium transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button
                onClick={() => setShowDayEvents(false)}
                className={`p-2 rounded-xl transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-700/50 text-slate-400' 
                    : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {selectedDateEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDateEvents.map((event, idx) => (
                <div
                  key={event.id}
                  onClick={() => handleViewEvent(event)}
                  className={`group relative flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-slate-800/50 to-slate-800/30 border-slate-700/50 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50'
                      : 'bg-gradient-to-r from-white to-slate-50/50 border-slate-200 hover:border-slate-300 hover:shadow-lg'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Left color accent bar with gradient */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getColorDot(event.color)}`} />
                  
                  {/* Event number badge */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-700/50 text-slate-300' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0 pl-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {event.title}
                      </h4>
                      {event.isStarred && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500">
                          <Star className="w-3 h-3 fill-current" />
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-4 text-sm ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {event.isAllDay ? (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${
                          theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <CalendarDays className="w-3.5 h-3.5" />
                          All day
                        </span>
                      ) : event.time && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-medium">{formatTime(event.time)}</span>
                          {event.endTime && <span>- {formatTime(event.endTime)}</span>}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons with better styling */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-0 translate-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditEvent(event);
                      }}
                      className={`p-2.5 rounded-xl transition-all ${
                        theme === 'dark' 
                          ? 'hover:bg-slate-600/80 text-slate-400 hover:text-white' 
                          : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(event.id);
                      }}
                      className={`p-2.5 rounded-xl transition-all ${
                        event.isStarred
                          ? 'text-amber-500 hover:bg-amber-500/10'
                          : theme === 'dark' 
                            ? 'hover:bg-slate-600/80 text-slate-400 hover:text-amber-400' 
                            : 'hover:bg-amber-50 text-slate-500 hover:text-amber-500'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${event.isStarred ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 rounded-xl border-2 border-dashed ${
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
            }`}>
              <Calendar className={`w-10 h-10 mx-auto mb-3 ${
                theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
              }`} />
              <p className={`font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                No events scheduled
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Click "Add" to create an event for this day
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Upcoming Events with Search & Pagination */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100'
            }`}>
              <CalendarClock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Upcoming Events
              </h3>
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {filteredUpcomingEvents.length} total
              </span>
            </div>
          </div>
          
          {/* Search Box */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <Search className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search events..."
              value={eventsSearchQuery}
              onChange={(e) => setEventsSearchQuery(e.target.value)}
              className={`flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] ${
                theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {eventsSearchQuery && (
              <button 
                onClick={() => setEventsSearchQuery('')} 
                className={`p-1 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-600 text-slate-400 hover:text-white' 
                    : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        
        {paginatedEvents.length > 0 ? (
          <div className="space-y-3">
            {paginatedEvents.map((event) => {
              const eventDate = new Date(event.date);
              const isToday = eventDate.toDateString() === new Date().toDateString();
              const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
              
              return (
                <div
                  key={event.id}
                  onClick={() => handleViewEvent(event)}
                  className={`group relative flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-slate-800/50 to-slate-800/30 border-slate-700/50 hover:border-slate-600 hover:shadow-lg'
                      : 'bg-gradient-to-r from-white to-slate-50/50 border-slate-200 hover:border-slate-300 hover:shadow-lg'
                  }`}
                >
                  {/* Left color bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getColorDot(event.color)}`} />
                  
                  {/* Date badge */}
                  <div className={`flex-shrink-0 text-center px-3 py-2 rounded-xl ${
                    isToday
                      ? 'bg-gradient-to-br from-emerald-500 to-blue-500 text-white'
                      : isTomorrow
                        ? theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'
                        : theme === 'dark' ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <div className="text-xs font-medium uppercase">
                      {isToday ? 'Today' : isTomorrow ? 'Tmrw' : eventDate.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-lg font-bold leading-tight">
                      {eventDate.getDate()}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 pl-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {event.title}
                      </h4>
                      {event.isStarred && (
                        <Star className="w-4 h-4 text-amber-500 fill-current flex-shrink-0" />
                      )}
                    </div>
                    <div className={`flex items-center gap-3 text-sm ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {event.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          {formatTime(event.time)}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span className="truncate">{event.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Hover arrow indicator */}
                  <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-all duration-200 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-0 -translate-x-2 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className={`text-center py-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            {eventsSearchQuery ? 'No events match your search' : 'No upcoming events'}
          </p>
        )}
        
        {/* Pagination */}
        {totalEventsPages > 1 && (
          <div className={`flex items-center justify-between mt-4 pt-4 border-t ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
          }`}>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              Page {eventsCurrentPage} of {totalEventsPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEventsCurrentPage(1)}
                disabled={eventsCurrentPage === 1}
                className={`p-1.5 rounded-lg transition-colors ${
                  eventsCurrentPage === 1
                    ? 'opacity-30 cursor-not-allowed'
                    : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEventsCurrentPage(p => Math.max(1, p - 1))}
                disabled={eventsCurrentPage === 1}
                className={`p-1.5 rounded-lg transition-colors ${
                  eventsCurrentPage === 1
                    ? 'opacity-30 cursor-not-allowed'
                    : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {getPageNumbers.map((page, i) => (
                page === '...' ? (
                  <span key={`ellipsis-${i}`} className={`px-1 text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setEventsCurrentPage(page as number)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                      eventsCurrentPage === page
                        ? 'bg-emerald-500 text-white shadow'
                        : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
              
              <button
                onClick={() => setEventsCurrentPage(p => Math.min(totalEventsPages, p + 1))}
                disabled={eventsCurrentPage === totalEventsPages}
                className={`p-1.5 rounded-lg transition-colors ${
                  eventsCurrentPage === totalEventsPages
                    ? 'opacity-30 cursor-not-allowed'
                    : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEventsCurrentPage(totalEventsPages)}
                disabled={eventsCurrentPage === totalEventsPages}
                className={`p-1.5 rounded-lg transition-colors ${
                  eventsCurrentPage === totalEventsPages
                    ? 'opacity-30 cursor-not-allowed'
                    : theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Event Modal */}
      {isEventModalOpen && (
        <EventFormModal
          isOpen={isEventModalOpen}
          onClose={() => {
            setIsEventModalOpen(false);
            setSelectedEvent(null);
            setIsEditing(false);
          }}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          event={selectedEvent}
          defaultDate={selectedDate || today.toISOString().split('T')[0]}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
        />
      )}
    </div>
  );
};

// Event Form Modal Component
interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete: (eventId: string) => void;
  event: CalendarEvent | null;
  defaultDate: string;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
}

const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event,
  defaultDate,
  isEditing,
  setIsEditing,
}) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState('blue');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [reminder, setReminder] = useState('none');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  // Reminder dropdown state
  const [showReminderDropdown, setShowReminderDropdown] = useState(false);
  const reminderDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
      if (reminderDropdownRef.current && !reminderDropdownRef.current.contains(e.target as Node)) {
        setShowReminderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get reminder label
  const getReminderLabel = (value: string) => {
    const option = REMINDER_OPTIONS.find(opt => opt.value === value);
    return option ? option.label : 'No reminder';
  };
  
  // Initialize form
  React.useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setDate(event.date);
      setTime(event.time || '');
      setEndTime(event.endTime || '');
      setColor(event.color);
      setIsAllDay(event.isAllDay);
      setLocation(event.location || '');
      setReminder(event.reminder || 'none');
      setTags(event.tags || []);
      // Set picker to event date
      const d = new Date(event.date);
      setPickerMonth(d.getMonth());
      setPickerYear(d.getFullYear());
    } else {
      setTitle('');
      setDescription('');
      setDate(defaultDate);
      setTime('09:00');
      setEndTime('10:00');
      setColor('blue');
      setIsAllDay(false);
      setLocation('');
      setReminder('none');
      setTags([]);
      // Set picker to default date
      const d = new Date(defaultDate);
      setPickerMonth(d.getMonth());
      setPickerYear(d.getFullYear());
    }
  }, [event, defaultDate, isOpen]);
  
  // Generate calendar days for date picker
  const getPickerDays = () => {
    const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
    const daysInPrevMonth = new Date(pickerYear, pickerMonth, 0).getDate();
    const today = new Date();
    
    const days: { day: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; dateStr: string }[] = [];
    
    // Previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateStr = new Date(pickerYear, pickerMonth - 1, d).toISOString().split('T')[0];
      days.push({ day: d, isCurrentMonth: false, isToday: false, isSelected: dateStr === date, dateStr });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(pickerYear, pickerMonth, i);
      const dateStr = dateObj.toISOString().split('T')[0];
      const isToday = dateObj.toDateString() === today.toDateString();
      days.push({ day: i, isCurrentMonth: true, isToday, isSelected: dateStr === date, dateStr });
    }
    
    // Next month
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const dateStr = new Date(pickerYear, pickerMonth + 1, i).toISOString().split('T')[0];
      days.push({ day: i, isCurrentMonth: false, isToday: false, isSelected: dateStr === date, dateStr });
    }
    
    return days;
  };
  
  // Format display date
  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleSubmit = () => {
    if (!title.trim()) return;
    
    onSave({
      title,
      description,
      date,
      time: isAllDay ? undefined : time,
      endTime: isAllDay ? undefined : endTime,
      color,
      isAllDay,
      location,
      reminder: reminder === 'none' ? undefined : reminder,
      tags,
    });
  };
  
  // Format time for display
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] flex flex-col ${
        theme === 'dark' ? 'bg-slate-900 border border-slate-700/50' : 'bg-white shadow-xl'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-500/10'
            }`}>
              <Calendar className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {event ? (isEditing ? 'Edit Event' : 'View Event') : 'New Event'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {event && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-800 text-slate-400'
                  : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Event Title {isEditing && <span className="text-red-500">*</span>}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event title..."
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
            ) : (
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </h3>
            )}
          </div>
          
          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Date
              </label>
              {isEditing ? (
                <div className="relative" ref={datePickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50'
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    } ${showDatePicker ? (theme === 'dark' ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : 'border-emerald-500 ring-2 ring-emerald-500/20') : ''}`}
                  >
                    <span>{formatDisplayDate(date)}</span>
                    <CalendarDays className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                  </button>
                  
                  {/* Custom Date Picker Dropdown */}
                  {showDatePicker && (
                    <div className={`absolute top-full left-0 mt-2 p-3 rounded-xl border shadow-2xl z-50 w-72 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      {/* Month/Year Navigation */}
                      <div className="flex items-center justify-between mb-3">
                        <button type="button" onClick={() => setPickerYear(y => y - 1)} className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setPickerMonth(m => m === 0 ? 11 : m - 1)} className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {MONTHS_SHORT[pickerMonth]} {pickerYear}
                        </span>
                        <button type="button" onClick={() => setPickerMonth(m => m === 11 ? 0 : m + 1)} className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setPickerYear(y => y + 1)} className={`p-1.5 rounded-lg ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                          <div key={d} className={`text-center text-xs font-medium py-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{d}</div>
                        ))}
                      </div>
                      
                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {getPickerDays().map((day, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setDate(day.dateStr); setShowDatePicker(false); }}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                              day.isSelected
                                ? 'bg-emerald-500 text-white'
                                : day.isToday
                                  ? theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                  : day.isCurrentMonth
                                    ? theme === 'dark' ? 'text-white hover:bg-slate-700' : 'text-slate-900 hover:bg-slate-100'
                                    : theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                            }`}
                          >
                            {day.day}
                          </button>
                        ))}
                      </div>
                      
                      {/* Quick Actions */}
                      <div className={`flex justify-between mt-3 pt-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                        <button
                          type="button"
                          onClick={() => { setDate(new Date().toISOString().split('T')[0]); setShowDatePicker(false); }}
                          className="text-sm font-medium text-emerald-500 hover:text-emerald-400"
                        >
                          Today
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
            
            {isEditing && (
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${isAllDay ? 'bg-emerald-500' : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isAllDay ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    All day event
                  </span>
                </label>
              </div>
            )}
          </div>
          
          {/* Time inputs - only show if not all day */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Start Time
                </label>
                {isEditing ? (
                  <TimePicker
                    value={time}
                    onChange={setTime}
                    theme={theme}
                    placeholder="Select start time"
                  />
                ) : (
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                    {time ? formatTime(time) : '-'}
                  </p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  End Time
                </label>
                {isEditing ? (
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    theme={theme}
                    placeholder="Select end time"
                  />
                ) : (
                  <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                    {endTime ? formatTime(endTime) : '-'}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Location */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Location
            </label>
            {isEditing ? (
              <div className="relative">
                <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location..."
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                  }`}
                />
              </div>
            ) : location ? (
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{location}</span>
              </div>
            ) : (
              <p className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>No location</p>
            )}
          </div>
          
          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Description
            </label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description..."
                rows={3}
                className={`w-full px-4 py-3 rounded-xl border transition-all resize-none ${
                  theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50'
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                }`}
              />
            ) : description ? (
              <p className={`whitespace-pre-wrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {description}
              </p>
            ) : (
              <p className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>No description</p>
            )}
          </div>
          
          {/* Color Picker - Edit Mode Only */}
          {isEditing && (
            <div>
              <label className={`block text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Event Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {eventColors.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      color === c.value
                        ? theme === 'dark'
                          ? 'bg-slate-700/50 border-emerald-500 ring-1 ring-emerald-500/50'
                          : 'bg-slate-50 border-emerald-500 ring-1 ring-emerald-500/50'
                        : theme === 'dark'
                          ? 'border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600'
                          : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                    title={c.name}
                  >
                    <span className={`w-4 h-4 rounded-full ${c.bg} flex-shrink-0`}>
                      {color === c.value && <Check className="w-4 h-4 text-white" />}
                    </span>
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Reminder - Edit Mode Only */}
          {isEditing && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Reminder
              </label>
              <div className="relative" ref={reminderDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowReminderDropdown(!showReminderDropdown)}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50'
                      : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                  } ${showReminderDropdown ? (theme === 'dark' ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : 'border-emerald-500 ring-2 ring-emerald-500/20') : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                    <span>{getReminderLabel(reminder)}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showReminderDropdown ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                </button>
                
                {showReminderDropdown && (
                  <div className={`absolute top-full left-0 right-0 mt-2 p-1 rounded-xl border shadow-2xl z-50 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    {REMINDER_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => { setReminder(option.value); setShowReminderDropdown(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          reminder === option.value
                            ? 'bg-emerald-500 text-white'
                            : theme === 'dark'
                              ? 'hover:bg-slate-700 text-slate-300'
                              : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {reminder === option.value && <Check className="w-4 h-4" />}
                        <span className={reminder === option.value ? '' : 'ml-7'}>{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Tags */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              Tags
            </label>
            {isEditing ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    }`} />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add a tag..."
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  <button
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    className="px-3 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                          theme === 'dark'
                            ? 'bg-slate-700/50 text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className={`ml-0.5 p-0.5 rounded-full transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-600' : 'hover:bg-slate-200'
                          }`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                      theme === 'dark'
                        ? 'bg-slate-700/50 text-slate-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>No tags</p>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-4 border-t flex-shrink-0 ${
          theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'
        }`}>
          {event && !showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                theme === 'dark'
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-red-500 hover:bg-red-50'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          ) : event && showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Delete this event?
              </span>
              <button
                onClick={() => {
                  onDelete(event.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                No
              </button>
            </div>
          ) : (
            <div />
          )}
          
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    if (event) {
                      setIsEditing(false);
                    } else {
                      onClose();
                    }
                  }}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!title.trim()}
                  className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {event ? 'Save Changes' : 'Create Event'}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCalendar;
