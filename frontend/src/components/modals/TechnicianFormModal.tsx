import React, { useState, useEffect, useRef } from 'react';
import type { Technician, TechnicianStatus, TechnicianSpecialty } from '../../data/mockData';
import { technicianSpecialties } from '../../data/mockData';
import { useTheme } from '../../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { User, UserPlus, Mail, Phone, MapPin, Save, Briefcase, IdCard, FileText, CheckCircle, Clock, XCircle, ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface TechnicianFormModalProps {
  isOpen: boolean;
  technician?: Technician;
  onClose: () => void;
  onSave: (technician: Partial<Technician>) => void;
}

interface TechnicianFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  nic: string;
  specialty: TechnicianSpecialty[];
  designation: string;
  status: TechnicianStatus;
  joiningDate: string;
  notes: string;
}

// Status options
const statusOptions: { value: TechnicianStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'active', label: 'Active', icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
  { value: 'on-leave', label: 'On Leave', icon: <Clock className="w-4 h-4 text-amber-500" /> },
  { value: 'inactive', label: 'Inactive', icon: <XCircle className="w-4 h-4 text-red-500" /> },
];

export const TechnicianFormModal: React.FC<TechnicianFormModalProps> = ({
  isOpen,
  technician,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  
  const [formData, setFormData] = useState<TechnicianFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    nic: '',
    specialty: ['general'],
    designation: '',
    status: 'active',
    joiningDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const statusRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (technician) {
      setFormData({
        name: technician.name,
        email: technician.email || '',
        phone: technician.phone,
        address: technician.address || '',
        nic: technician.nic || '',
        specialty: technician.specialty || ['general'],
        designation: technician.designation || '',
        status: technician.status || 'active',
        joiningDate: technician.joiningDate || new Date().toISOString().split('T')[0],
        notes: technician.notes || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        nic: '',
        specialty: ['general'],
        designation: '',
        status: 'active',
        joiningDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setErrors({});
  }, [technician, isOpen]);

  // Validate Sri Lankan NIC format
  const validateNIC = (nic: string): boolean => {
    if (!nic) return true;
    const oldFormat = /^[0-9]{9}[vVxX]$/;
    const newFormat = /^[0-9]{12}$/;
    return oldFormat.test(nic) || newFormat.test(nic);
  };

  // Validate Sri Lankan phone format
  const validatePhone = (phone: string): boolean => {
    const mobileFormat = /^(0[0-9]{2}[-\s]?[0-9]{7}|0[0-9]{9}|\+94[0-9]{9})$/;
    return mobileFormat.test(phone.replace(/\s/g, ''));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Technician name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid Sri Lankan phone number';
    }

    if (formData.nic && !validateNIC(formData.nic)) {
      newErrors.nic = 'Invalid NIC format (e.g., 881234567V or 199012345678)';
    }

    if (formData.specialty.length === 0) {
      newErrors.specialty = 'At least one specialty is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    onSave({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      nic: formData.nic.trim(),
      specialty: formData.specialty,
      designation: formData.designation.trim(),
      status: formData.status,
      joiningDate: formData.joiningDate,
      notes: formData.notes.trim(),
    });
  };

  const handleSpecialtyToggle = (value: TechnicianSpecialty) => {
    setFormData(prev => ({
      ...prev,
      specialty: prev.specialty.includes(value)
        ? prev.specialty.filter(s => s !== value)
        : [...prev.specialty, value]
    }));
  };

  const inputClass = `w-full px-4 py-2.5 rounded-xl border transition-all ${
    theme === 'dark'
      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`;

  // Get status display info
  const getStatusInfo = (status: TechnicianStatus) => {
    switch (status) {
      case 'active': return { icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, label: 'Active', color: 'text-emerald-500' };
      case 'on-leave': return { icon: <Clock className="w-4 h-4 text-amber-500" />, label: 'On Leave', color: 'text-amber-500' };
      case 'inactive': return { icon: <XCircle className="w-4 h-4 text-red-500" />, label: 'Inactive', color: 'text-red-500' };
    }
  };

  // Calendar renderer
  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const today = new Date().toISOString().split('T')[0];

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = formData.joiningDate === date;
      const isToday = date === today;

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => {
            setFormData(prev => ({ ...prev, joiningDate: date }));
            setShowCalendar(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'bg-emerald-500 text-white'
              : isToday
                ? theme === 'dark' ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                : theme === 'dark'
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200'
      }`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {technician ? <User className="w-5 h-5 text-emerald-500" /> : <UserPlus className="w-5 h-5 text-emerald-500" />}
            {technician ? 'Edit Technician' : 'Add New Technician'}
          </DialogTitle>
          <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            {technician ? 'Update technician information' : 'Add a new technician to your team'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Info Section */}
          <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
            <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
              <User className="w-4 h-4" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className={labelClass}>Full Name *</Label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label className={labelClass}>Designation</Label>
                <div className="relative">
                  <Briefcase className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <Input
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g., Senior Technician"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div>
                <Label className={labelClass}>Email</Label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label className={labelClass}>Phone *</Label>
                <div className="relative">
                  <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="077XXXXXXX"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <Label className={labelClass}>NIC</Label>
                <div className="relative">
                  <IdCard className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                  <Input
                    value={formData.nic}
                    onChange={(e) => setFormData(prev => ({ ...prev, nic: e.target.value }))}
                    placeholder="e.g., 199512345678"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {errors.nic && <p className="text-red-500 text-xs mt-1">{errors.nic}</p>}
              </div>

              <div>
                <Label className={labelClass}>Status</Label>
                <div className="relative" ref={statusRef}>
                  <button
                    type="button"
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`w-full h-[42px] px-4 rounded-xl border transition-all flex items-center justify-between ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white hover:border-slate-600'
                        : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {getStatusInfo(formData.status).icon}
                      <span>{getStatusInfo(formData.status).label}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                  </button>
                  {showStatusDropdown && (
                    <div className={`absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border shadow-xl ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, status: option.value }));
                            setShowStatusDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 flex items-center gap-2 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                            formData.status === option.value
                              ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                              : theme === 'dark'
                                ? 'text-slate-300 hover:bg-slate-700'
                                : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {option.icon}
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Label className={labelClass}>Address</Label>
              <div className="relative">
                <MapPin className={`absolute left-3 top-3 w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter address"
                  className={`${inputClass} pl-10 min-h-[80px]`}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Specialty Section */}
          <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
            <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
              <Briefcase className="w-4 h-4" /> Specialties
            </h3>
            <div className="flex flex-wrap gap-2">
              {technicianSpecialties.map((spec) => (
                <button
                  key={spec.value}
                  type="button"
                  onClick={() => handleSpecialtyToggle(spec.value)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    formData.specialty.includes(spec.value)
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50'
                      : theme === 'dark'
                        ? 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600/50'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{spec.icon}</span>
                  {spec.label}
                </button>
              ))}
            </div>
            {errors.specialty && <p className="text-red-500 text-xs mt-2">{errors.specialty}</p>}
          </div>

          {/* Employment Section */}
          <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
            <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
              <Briefcase className="w-4 h-4" /> Employment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className={labelClass}>Joining Date</Label>
                <div className="relative" ref={calendarRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCalendar(!showCalendar);
                      if (formData.joiningDate) {
                        setCalendarMonth(new Date(formData.joiningDate));
                      }
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/50 text-white hover:border-slate-600'
                        : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <span className={formData.joiningDate ? '' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>
                      {formData.joiningDate ? formatDisplayDate(formData.joiningDate) : 'Select date'}
                    </span>
                    <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                  </button>
                  {showCalendar && (
                    <div className={`absolute z-50 top-full left-0 mt-1 p-3 rounded-xl border shadow-xl ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                          className={`p-1 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                          className={`p-1 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                          <div key={day} className={`w-8 h-6 flex items-center justify-center text-xs font-medium ${
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {day}
                          </div>
                        ))}
                      </div>
                      {/* Calendar Days */}
                      <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
            <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
              <FileText className="w-4 h-4" /> Notes
            </h3>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this technician..."
              className={`${inputClass} min-h-[100px]`}
              rows={3}
            />
          </div>

          {/* Footer */}
          <div className={`flex justify-end gap-3 pt-4 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              <Save className="w-4 h-4" />
              {technician ? 'Update' : 'Save'} Technician
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
