import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { mockJobNotes, mockCustomers, generateJobNumber } from '../data/mockData';
import type { JobNote, JobNotePriority, DeviceType, Customer } from '../data/mockData';
import { SearchableSelect } from '../components/ui/searchable-select';
import {
  ArrowLeft, Save, Printer, User, Phone, Mail, MapPin,
  Laptop, Monitor, Smartphone, Tablet, HardDrive, FileText, Package,
  Wrench, Calendar, Clock, DollarSign, UserPlus, Search, X,
  ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';

// Device type options
const deviceTypeOptions = [
  { value: 'laptop', label: 'Laptop', icon: <Laptop className="w-4 h-4" /> },
  { value: 'desktop', label: 'Desktop', icon: <HardDrive className="w-4 h-4" /> },
  { value: 'phone', label: 'Phone', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'tablet', label: 'Tablet', icon: <Tablet className="w-4 h-4" /> },
  { value: 'printer', label: 'Printer', icon: <FileText className="w-4 h-4" /> },
  { value: 'monitor', label: 'Monitor', icon: <Monitor className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <Package className="w-4 h-4" /> },
];

// Priority options
const priorityOptions = [
  { value: 'low', label: 'Low', color: 'slate' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' },
];

// Technicians
const technicians = ['Nuwan Silva', 'Kasun Fernando', 'Amila Perera', 'Sanjaya Mendis'];

interface FormData {
  // Customer Info
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  isNewCustomer: boolean;
  // Device Info
  deviceType: DeviceType;
  deviceBrand: string;
  deviceModel: string;
  serialNumber: string;
  accessories: string;
  // Problem
  reportedIssue: string;
  deviceCondition: string;
  // Job Details
  receivedDate: string;
  expectedCompletionDate: string;
  estimatedCost: number;
  advancePayment: number;
  priority: JobNotePriority;
  assignedTechnician: string;
  internalNotes: string;
}

const getDefaultDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

const getDefaultCompletionDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 3); // Default 3 days for completion
  return date.toISOString().split('T')[0];
};

const initialFormData: FormData = {
  customerId: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress: '',
  isNewCustomer: false,
  deviceType: 'laptop',
  deviceBrand: '',
  deviceModel: '',
  serialNumber: '',
  accessories: '',
  reportedIssue: '',
  deviceCondition: '',
  receivedDate: getDefaultDate(),
  expectedCompletionDate: getDefaultCompletionDate(),
  estimatedCost: 0,
  advancePayment: 0,
  priority: 'normal',
  assignedTechnician: '',
  internalNotes: '',
};

export const JobNoteForm: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showReceivedCalendar, setShowReceivedCalendar] = useState(false);
  const [showCompletionCalendar, setShowCompletionCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const receivedCalendarRef = useRef<HTMLDivElement>(null);
  const completionCalendarRef = useRef<HTMLDivElement>(null);

  // Find existing job if editing
  const existingJob = isEditing ? mockJobNotes.find(j => j.id === id) : undefined;

  useEffect(() => {
    if (existingJob) {
      setFormData({
        customerId: existingJob.customerId || '',
        customerName: existingJob.customerName,
        customerPhone: existingJob.customerPhone,
        customerEmail: existingJob.customerEmail || '',
        customerAddress: existingJob.customerAddress || '',
        isNewCustomer: false,
        deviceType: existingJob.deviceType,
        deviceBrand: existingJob.deviceBrand,
        deviceModel: existingJob.deviceModel,
        serialNumber: existingJob.serialNumber || '',
        accessories: existingJob.accessories.join(', '),
        reportedIssue: existingJob.reportedIssue,
        deviceCondition: existingJob.deviceCondition || '',
        receivedDate: existingJob.receivedDate.split('T')[0],
        expectedCompletionDate: existingJob.expectedCompletionDate?.split('T')[0] || getDefaultCompletionDate(),
        estimatedCost: existingJob.estimatedCost || 0,
        advancePayment: existingJob.advancePayment || 0,
        priority: existingJob.priority,
        assignedTechnician: existingJob.assignedTechnician || '',
        internalNotes: existingJob.internalNotes || '',
      });
    }
  }, [existingJob]);

  // Close calendars when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (receivedCalendarRef.current && !receivedCalendarRef.current.contains(event.target as Node)) {
        setShowReceivedCalendar(false);
      }
      if (completionCalendarRef.current && !completionCalendarRef.current.contains(event.target as Node)) {
        setShowCompletionCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    const search = customerSearch.toLowerCase();
    return mockCustomers.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.phone.includes(search) ||
      c.email?.toLowerCase().includes(search)
    ).slice(0, 5);
  }, [customerSearch]);

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      customerAddress: customer.address || '',
      isNewCustomer: false,
    }));
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const handleNewCustomer = () => {
    setFormData(prev => ({
      ...prev,
      customerId: '',
      customerName: customerSearch,
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      isNewCustomer: true,
    }));
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setFormData(prev => ({
      ...prev,
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      isNewCustomer: false,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone number is required';
    if (!formData.deviceBrand.trim()) newErrors.deviceBrand = 'Device brand is required';
    if (!formData.deviceModel.trim()) newErrors.deviceModel = 'Device model is required';
    if (!formData.reportedIssue.trim()) newErrors.reportedIssue = 'Issue description is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const jobNote: JobNote = {
      id: isEditing && existingJob ? existingJob.id : Date.now().toString(),
      jobNumber: isEditing && existingJob ? existingJob.jobNumber : generateJobNumber(),
      customerId: formData.customerId || undefined,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || undefined,
      customerAddress: formData.customerAddress || undefined,
      deviceType: formData.deviceType,
      deviceBrand: formData.deviceBrand,
      deviceModel: formData.deviceModel,
      serialNumber: formData.serialNumber || undefined,
      accessories: formData.accessories ? formData.accessories.split(',').map(a => a.trim()).filter(Boolean) : [],
      deviceCondition: formData.deviceCondition || '',
      reportedIssue: formData.reportedIssue,
      internalNotes: formData.internalNotes || undefined,
      estimatedCost: formData.estimatedCost || undefined,
      advancePayment: formData.advancePayment || undefined,
      status: isEditing && existingJob ? existingJob.status : 'received',
      priority: formData.priority,
      receivedDate: new Date(formData.receivedDate).toISOString(),
      expectedCompletionDate: formData.expectedCompletionDate ? new Date(formData.expectedCompletionDate).toISOString() : undefined,
      assignedTechnician: formData.assignedTechnician || undefined,
      statusHistory: isEditing && existingJob ? existingJob.statusHistory : [{ status: 'received', date: new Date().toISOString() }],
      customerNotified: false,
      createdAt: isEditing && existingJob ? existingJob.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('Saving Job Note:', jobNote);
    navigate('/job-notes');
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Calendar helper
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDay: firstDay.getDay() };
  };

  const renderCalendar = (
    selectedDate: string,
    setSelectedDate: (date: string) => void,
    setShowCalendar: (show: boolean) => void
  ) => {
    const { daysInMonth, startingDay } = getDaysInMonth(calendarMonth);
    const days = [];
    const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const isSelected = selectedDateObj &&
        currentDate.getDate() === selectedDateObj.getDate() &&
        currentDate.getMonth() === selectedDateObj.getMonth() &&
        currentDate.getFullYear() === selectedDateObj.getFullYear();
      const isToday = new Date().toDateString() === currentDate.toDateString();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => {
            const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            setSelectedDate(dateStr);
            setShowCalendar(false);
          }}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${isSelected
            ? 'bg-emerald-500 text-white'
            : isToday
              ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              : theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div className={`absolute top-full left-0 mt-2 p-3 rounded-xl border shadow-xl z-50 min-w-[280px] ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
            className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className={`w-8 h-8 flex items-center justify-center text-xs font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  const cardClass = `rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`;
  const inputClass = `w-full px-4 py-2.5 rounded-xl border transition-all text-sm ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'} focus:outline-none focus:ring-2 focus:ring-emerald-500/20`;
  const labelClass = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`;
  const errorClass = 'text-red-500 text-xs mt-1 flex items-center gap-1';

  const technicianSelectOptions = [
    { value: '', label: 'Select Technician' },
    ...technicians.map(t => ({ value: t, label: t }))
  ];

  const deviceTypeSelectOptions = deviceTypeOptions.map(d => ({ value: d.value, label: d.label }));

  const prioritySelectOptions = priorityOptions.map(p => ({ value: p.value, label: p.label }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/job-notes')}
            className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {isEditing ? 'Edit Job Note' : 'Create Job Note'}
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {isEditing ? `Editing ${existingJob?.jobNumber}` : 'Add new service job order'}
            </p>
          </div>
        </div>
        {isEditing && existingJob && (
          <div className={`px-4 py-2 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
            <span className="font-mono font-bold">{existingJob.jobNumber}</span>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Customer Details */}
            <div className={cardClass}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/30">
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                    <User className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Customer Details
                  </h2>
                </div>

                {/* Customer Search */}
                <div className="relative mb-4">
                  <div className="relative">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder="Search existing customer..."
                      value={formData.customerId ? formData.customerName : customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                        if (formData.customerId) clearCustomer();
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className={`${inputClass} pl-12`}
                    />
                    {formData.customerId && (
                      <button
                        type="button"
                        onClick={clearCustomer}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                      >
                        <X className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`} />
                      </button>
                    )}
                  </div>

                  {/* Customer Dropdown */}
                  {showCustomerDropdown && customerSearch && !formData.customerId && (
                    <div className={`absolute z-10 w-full mt-2 rounded-xl border shadow-xl overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleCustomerSelect(customer)}
                          className={`w-full px-4 py-3 flex items-center gap-3 text-left ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            <User className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{customer.name}</p>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{customer.phone}</p>
                          </div>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleNewCustomer}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left border-t ${theme === 'dark' ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 border-slate-200'}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Add New Customer</p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>"{customerSearch}"</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Customer Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Name *
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      className={`${inputClass} ${errors.customerName ? 'border-red-500' : ''}`}
                      placeholder="Customer name"
                    />
                    {errors.customerName && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.customerName}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Phone *
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                      className={`${inputClass} ${errors.customerPhone ? 'border-red-500' : ''}`}
                      placeholder="07X-XXXXXXX"
                    />
                    {errors.customerPhone && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.customerPhone}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </span>
                    </label>
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                      className={inputClass}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Address
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerAddress}
                      onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                      className={inputClass}
                      placeholder="Address"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Device Details */}
            <div className={cardClass}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/30">
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                    <Laptop className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Device Details
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Device Type</label>
                    <SearchableSelect
                      options={deviceTypeSelectOptions}
                      value={formData.deviceType}
                      onValueChange={(val) => handleInputChange('deviceType', val as DeviceType)}
                      placeholder="Select type"
                      theme={theme}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Brand *</label>
                    <input
                      type="text"
                      value={formData.deviceBrand}
                      onChange={(e) => handleInputChange('deviceBrand', e.target.value)}
                      className={`${inputClass} ${errors.deviceBrand ? 'border-red-500' : ''}`}
                      placeholder="e.g., Dell, HP, Samsung"
                    />
                    {errors.deviceBrand && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.deviceBrand}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Model *</label>
                    <input
                      type="text"
                      value={formData.deviceModel}
                      onChange={(e) => handleInputChange('deviceModel', e.target.value)}
                      className={`${inputClass} ${errors.deviceModel ? 'border-red-500' : ''}`}
                      placeholder="e.g., Inspiron 15, iPhone 13"
                    />
                    {errors.deviceModel && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.deviceModel}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Serial Number</label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                      className={inputClass}
                      placeholder="Serial / IMEI"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Accessories (comma separated)</label>
                    <input
                      type="text"
                      value={formData.accessories}
                      onChange={(e) => handleInputChange('accessories', e.target.value)}
                      className={inputClass}
                      placeholder="e.g., Charger, Battery, Bag"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Issue Description */}
            <div className={cardClass}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/30">
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                    <Wrench className={`w-5 h-5 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Issue Details
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Reported Issue *</label>
                    <textarea
                      value={formData.reportedIssue}
                      onChange={(e) => handleInputChange('reportedIssue', e.target.value)}
                      rows={4}
                      className={`${inputClass} resize-none ${errors.reportedIssue ? 'border-red-500' : ''}`}
                      placeholder="Describe the problem reported by the customer..."
                    />
                    {errors.reportedIssue && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.reportedIssue}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Device Condition</label>
                    <textarea
                      value={formData.deviceCondition}
                      onChange={(e) => handleInputChange('deviceCondition', e.target.value)}
                      rows={2}
                      className={`${inputClass} resize-none`}
                      placeholder="Physical condition notes (scratches, dents, etc.)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className={cardClass}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/30">
                  <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                    <Calendar className={`w-5 h-5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Job Details
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Received Date */}
                  <div className="relative" ref={receivedCalendarRef}>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Received Date
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReceivedCalendar(!showReceivedCalendar);
                        setShowCompletionCalendar(false);
                        setCalendarMonth(formData.receivedDate ? new Date(formData.receivedDate) : new Date());
                      }}
                      className={`${inputClass} text-left flex items-center justify-between`}
                    >
                      <span>{formatDateDisplay(formData.receivedDate) || 'Select date'}</span>
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </button>
                    {showReceivedCalendar && renderCalendar(
                      formData.receivedDate,
                      (date) => handleInputChange('receivedDate', date),
                      setShowReceivedCalendar
                    )}
                  </div>

                  {/* Expected Completion Date */}
                  <div className="relative" ref={completionCalendarRef}>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Expected Completion
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCompletionCalendar(!showCompletionCalendar);
                        setShowReceivedCalendar(false);
                        setCalendarMonth(formData.expectedCompletionDate ? new Date(formData.expectedCompletionDate) : new Date());
                      }}
                      className={`${inputClass} text-left flex items-center justify-between`}
                    >
                      <span>{formatDateDisplay(formData.expectedCompletionDate) || 'Select date'}</span>
                      <Clock className="w-4 h-4 text-slate-400" />
                    </button>
                    {showCompletionCalendar && renderCalendar(
                      formData.expectedCompletionDate,
                      (date) => handleInputChange('expectedCompletionDate', date),
                      setShowCompletionCalendar
                    )}
                  </div>

                  {/* Estimated Cost */}
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Estimated Cost
                      </span>
                    </label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Rs.</span>
                      <input
                        type="number"
                        value={formData.estimatedCost || ''}
                        onChange={(e) => handleInputChange('estimatedCost', parseFloat(e.target.value) || 0)}
                        className={`${inputClass} pl-12`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Advance Payment */}
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Advance Payment
                      </span>
                    </label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Rs.</span>
                      <input
                        type="number"
                        value={formData.advancePayment || ''}
                        onChange={(e) => handleInputChange('advancePayment', parseFloat(e.target.value) || 0)}
                        className={`${inputClass} pl-12`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className={labelClass}>Priority</label>
                    <SearchableSelect
                      options={prioritySelectOptions}
                      value={formData.priority}
                      onValueChange={(val) => handleInputChange('priority', val as JobNotePriority)}
                      placeholder="Select priority"
                      theme={theme}
                    />
                  </div>

                  {/* Assigned Technician */}
                  <div>
                    <label className={labelClass}>Assigned Technician</label>
                    <SearchableSelect
                      options={technicianSelectOptions}
                      value={formData.assignedTechnician}
                      onValueChange={(val) => handleInputChange('assignedTechnician', val)}
                      placeholder="Select technician"
                      theme={theme}
                    />
                  </div>

                  {/* Internal Notes */}
                  <div className="col-span-2">
                    <label className={labelClass}>Internal Notes</label>
                    <textarea
                      value={formData.internalNotes}
                      onChange={(e) => handleInputChange('internalNotes', e.target.value)}
                      rows={2}
                      className={`${inputClass} resize-none`}
                      placeholder="Notes for technicians (not visible to customer)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Bar */}
        {(formData.estimatedCost > 0 || formData.advancePayment > 0) && (
          <div className={`mt-6 p-4 rounded-2xl ${theme === 'dark' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Estimated Cost</p>
                  <p className={`text-xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(formData.estimatedCost)}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Advance</p>
                  <p className={`text-xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{formatCurrency(formData.advancePayment)}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Balance</p>
                  <p className={`text-xl font-bold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>{formatCurrency(formData.estimatedCost - formData.advancePayment)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'}`}>
          <button
            type="button"
            onClick={() => navigate('/job-notes')}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </button>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-medium whitespace-nowrap bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Job Note' : 'Create Job Note'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default JobNoteForm;
