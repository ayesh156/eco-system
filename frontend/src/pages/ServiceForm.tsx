import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  mockServices, 
  serviceCategories, 
  generateServiceId,
  type Service,
  type ServiceCategory,
  type ServiceStatus 
} from '../data/mockData';
import { SearchableSelect } from '../components/ui/searchable-select';
import {
  ArrowLeft,
  Save,
  Clock,
  DollarSign,
  Star,
  Shield,
  FileText,
  Tag,
  Info,
} from 'lucide-react';

interface ServiceFormData {
  name: string;
  category: ServiceCategory;
  description: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  priceType: 'fixed' | 'variable' | 'hourly' | 'quote';
  hourlyRate: number;
  estimatedDuration: string;
  turnaroundTime: string;
  status: ServiceStatus;
  isPopular: boolean;
  warranty: string;
  requirements: string;
  notes: string;
}

const initialFormData: ServiceFormData = {
  name: '',
  category: 'repair',
  description: '',
  basePrice: 0,
  minPrice: 0,
  maxPrice: 0,
  priceType: 'fixed',
  hourlyRate: 0,
  estimatedDuration: '',
  turnaroundTime: '',
  status: 'active',
  isPopular: false,
  warranty: '',
  requirements: '',
  notes: '',
};

export const ServiceForm: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load service data for editing
  useEffect(() => {
    if (isEditing && id) {
      const service = mockServices.find(s => s.id === id);
      if (service) {
        setFormData({
          name: service.name,
          category: service.category,
          description: service.description,
          basePrice: service.basePrice,
          minPrice: service.minPrice || 0,
          maxPrice: service.maxPrice || 0,
          priceType: service.priceType,
          hourlyRate: service.hourlyRate || 0,
          estimatedDuration: service.estimatedDuration,
          turnaroundTime: service.turnaroundTime || '',
          status: service.status,
          isPopular: service.isPopular,
          warranty: service.warranty || '',
          requirements: service.requirements || '',
          notes: service.notes || '',
        });
      }
    }
  }, [id, isEditing]);

  // Category options
  const categoryOptions = serviceCategories.map(cat => ({
    value: cat.value,
    label: `${cat.icon} ${cat.label}`,
  }));

  // Status options
  const statusOptions = [
    { value: 'active', label: '✅ Active' },
    { value: 'inactive', label: '⏸️ Inactive' },
    { value: 'discontinued', label: '❌ Discontinued' },
  ];

  // Price type options
  const priceTypeOptions = [
    { value: 'fixed', label: '💰 Fixed Price' },
    { value: 'variable', label: '📊 Variable (Range)' },
    { value: 'hourly', label: '⏱️ Hourly Rate' },
    { value: 'quote', label: '📝 Quote Based' },
  ];

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let parsedValue: string | number | boolean = value;

    if (type === 'number') {
      parsedValue = parseFloat(value) || 0;
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }

    setFormData(prev => ({ ...prev, [name]: parsedValue }));
    if (errors[name as keyof ServiceFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ServiceFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.priceType === 'fixed' && formData.basePrice < 0) {
      newErrors.basePrice = 'Price cannot be negative';
    }

    if (formData.priceType === 'variable') {
      if (formData.minPrice < 0) {
        newErrors.minPrice = 'Min price cannot be negative';
      }
      if (formData.maxPrice < formData.minPrice) {
        newErrors.maxPrice = 'Max price must be greater than min price';
      }
    }

    if (formData.priceType === 'hourly' && formData.hourlyRate <= 0) {
      newErrors.hourlyRate = 'Hourly rate must be greater than 0';
    }

    if (!formData.estimatedDuration.trim()) {
      newErrors.estimatedDuration = 'Duration is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const serviceData: Service = {
        id: isEditing ? id! : generateServiceId(),
        name: formData.name,
        category: formData.category,
        description: formData.description,
        basePrice: formData.basePrice,
        minPrice: formData.priceType === 'variable' ? formData.minPrice : undefined,
        maxPrice: formData.priceType === 'variable' ? formData.maxPrice : undefined,
        priceType: formData.priceType,
        hourlyRate: formData.priceType === 'hourly' ? formData.hourlyRate : undefined,
        estimatedDuration: formData.estimatedDuration,
        turnaroundTime: formData.turnaroundTime || undefined,
        status: formData.status,
        isPopular: formData.isPopular,
        warranty: formData.warranty || undefined,
        requirements: formData.requirements || undefined,
        notes: formData.notes || undefined,
        totalCompleted: isEditing ? (mockServices.find(s => s.id === id)?.totalCompleted || 0) : 0,
        totalRevenue: isEditing ? (mockServices.find(s => s.id === id)?.totalRevenue || 0) : 0,
        createdAt: isEditing ? (mockServices.find(s => s.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('Service saved:', serviceData);
      navigate('/services');
    } catch (error) {
      console.error('Error saving service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Input class helper
  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all ${
    theme === 'dark'
      ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
  } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`;

  const labelClass = `block text-sm font-medium mb-2 ${
    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
  }`;

  const errorClass = 'text-red-500 text-xs mt-1';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/services')}
            className={`p-2 rounded-xl transition-colors ${
              theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-400'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent`}>
              {isEditing ? 'Edit Service' : 'Add New Service'}
            </h1>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {isEditing ? 'Update service details' : 'Create a new service for your shop'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <div className={`p-6 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Basic Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Service Name */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                Service Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Laptop Screen Replacement"
                className={`${inputClass} ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            {/* Category */}
            <div>
              <label className={labelClass}>
                Category <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={categoryOptions}
                value={formData.category}
                onValueChange={(val) => setFormData(prev => ({ ...prev, category: val as ServiceCategory }))}
                placeholder="Select category"
                theme={theme}
              />
            </div>

            {/* Status */}
            <div>
              <label className={labelClass}>
                Status <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={statusOptions}
                value={formData.status}
                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val as ServiceStatus }))}
                placeholder="Select status"
                theme={theme}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe the service in detail..."
                className={`${inputClass} resize-none ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && <p className={errorClass}>{errors.description}</p>}
            </div>

            {/* Popular Toggle */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPopular"
                  checked={formData.isPopular}
                  onChange={handleChange}
                  className="w-5 h-5 rounded-md border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Star className="w-4 h-4 text-amber-500" />
                  Mark as Popular Service
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <div className={`p-6 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <DollarSign className="w-5 h-5" />
            </div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Pricing
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Price Type */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                Price Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {priceTypeOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priceType: option.value as any }))}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                      formData.priceType === option.value
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-500'
                        : theme === 'dark'
                          ? 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-emerald-500/50'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Price Fields based on Price Type */}
            {formData.priceType === 'fixed' && (
              <div className="md:col-span-2">
                <label className={labelClass}>
                  Fixed Price (Rs.) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-medium ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Rs.</span>
                  <input
                    type="number"
                    name="basePrice"
                    value={formData.basePrice}
                    onChange={handleChange}
                    min="0"
                    step="100"
                    placeholder="0"
                    className={`${inputClass} pl-12 ${errors.basePrice ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.basePrice && <p className={errorClass}>{errors.basePrice}</p>}
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Set to 0 for free services
                </p>
              </div>
            )}

            {formData.priceType === 'variable' && (
              <>
                <div>
                  <label className={labelClass}>
                    Minimum Price (Rs.) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-medium ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>Rs.</span>
                    <input
                      type="number"
                      name="minPrice"
                      value={formData.minPrice}
                      onChange={handleChange}
                      min="0"
                      step="100"
                      placeholder="0"
                      className={`${inputClass} pl-12 ${errors.minPrice ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.minPrice && <p className={errorClass}>{errors.minPrice}</p>}
                </div>
                <div>
                  <label className={labelClass}>
                    Maximum Price (Rs.) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-medium ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>Rs.</span>
                    <input
                      type="number"
                      name="maxPrice"
                      value={formData.maxPrice}
                      onChange={handleChange}
                      min="0"
                      step="100"
                      placeholder="0"
                      className={`${inputClass} pl-12 ${errors.maxPrice ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.maxPrice && <p className={errorClass}>{errors.maxPrice}</p>}
                </div>
              </>
            )}

            {formData.priceType === 'hourly' && (
              <div className="md:col-span-2">
                <label className={labelClass}>
                  Hourly Rate (Rs.) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-medium ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Rs.</span>
                  <input
                    type="number"
                    name="hourlyRate"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    min="0"
                    step="50"
                    placeholder="0"
                    className={`${inputClass} pl-12 ${errors.hourlyRate ? 'border-red-500' : ''}`}
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 font-medium ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>/hour</span>
                </div>
                {errors.hourlyRate && <p className={errorClass}>{errors.hourlyRate}</p>}
              </div>
            )}

            {formData.priceType === 'quote' && (
              <div className={`md:col-span-2 p-4 rounded-xl ${
                theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  <p className={`text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                    Price will be quoted based on customer requirements
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Time & Warranty Card */}
        <div className={`p-6 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Time & Warranty
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estimated Duration */}
            <div>
              <label className={labelClass}>
                Estimated Duration <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleChange}
                placeholder="e.g., 1-2 hours"
                className={`${inputClass} ${errors.estimatedDuration ? 'border-red-500' : ''}`}
              />
              {errors.estimatedDuration && <p className={errorClass}>{errors.estimatedDuration}</p>}
            </div>

            {/* Turnaround Time */}
            <div>
              <label className={labelClass}>Turnaround Time</label>
              <input
                type="text"
                name="turnaroundTime"
                value={formData.turnaroundTime}
                onChange={handleChange}
                placeholder="e.g., Same day, 2-3 days"
                className={inputClass}
              />
            </div>

            {/* Warranty */}
            <div className="md:col-span-2">
              <label className={labelClass}>Service Warranty</label>
              <div className="relative">
                <Shield className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="text"
                  name="warranty"
                  value={formData.warranty}
                  onChange={handleChange}
                  placeholder="e.g., 30 days service warranty"
                  className={`${inputClass} pl-11`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Card */}
        <div className={`p-6 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <Tag className="w-5 h-5" />
            </div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Additional Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Requirements */}
            <div>
              <label className={labelClass}>Requirements</label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={2}
                placeholder="What customers need to provide or know..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>Internal Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Any internal notes about this service..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/services')}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEditing ? 'Update Service' : 'Create Service'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
