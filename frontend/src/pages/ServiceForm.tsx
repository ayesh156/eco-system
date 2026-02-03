import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  mockServices, 
  serviceCategories, 
  generateServiceId,
  type Service,
  type ServiceCategory,
  type DeviceType
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
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  HardDrive,
  Package,
  Check,
} from 'lucide-react';

// Device type options with icons
const deviceTypeOptions: { value: DeviceType; label: string; icon: React.ReactNode }[] = [
  { value: 'laptop', label: 'Laptop', icon: <Laptop className="w-4 h-4" /> },
  { value: 'desktop', label: 'Desktop', icon: <HardDrive className="w-4 h-4" /> },
  { value: 'phone', label: 'Phone', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'tablet', label: 'Tablet', icon: <Tablet className="w-4 h-4" /> },
  { value: 'printer', label: 'Printer', icon: <FileText className="w-4 h-4" /> },
  { value: 'monitor', label: 'Monitor', icon: <Monitor className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <Package className="w-4 h-4" /> },
];

// Simplified form data matching the new Service interface
interface ServiceFormData {
  name: string;
  category: ServiceCategory;
  description: string;
  applicableDeviceTypes: DeviceType[];
  basePrice: number;
  priceType: 'fixed' | 'starting-from' | 'quote-required';
  estimatedDuration: string;
  warranty: string;
  notes: string;
  isActive: boolean;
  isPopular: boolean;
}

const initialFormData: ServiceFormData = {
  name: '',
  category: 'repair',
  description: '',
  applicableDeviceTypes: ['laptop', 'desktop'],
  basePrice: 0,
  priceType: 'fixed',
  estimatedDuration: '',
  warranty: '',
  notes: '',
  isActive: true,
  isPopular: false,
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
          applicableDeviceTypes: service.applicableDeviceTypes || ['laptop', 'desktop'],
          basePrice: service.basePrice,
          priceType: service.priceType,
          estimatedDuration: service.estimatedDuration,
          warranty: service.warranty || '',
          notes: service.notes || '',
          isActive: service.isActive,
          isPopular: service.isPopular || false,
        });
      }
    }
  }, [id, isEditing]);

  // Toggle device type selection
  const toggleDeviceType = (deviceType: DeviceType) => {
    setFormData(prev => {
      const isSelected = prev.applicableDeviceTypes.includes(deviceType);
      return {
        ...prev,
        applicableDeviceTypes: isSelected
          ? prev.applicableDeviceTypes.filter(dt => dt !== deviceType)
          : [...prev.applicableDeviceTypes, deviceType]
      };
    });
  };

  // Category options
  const categoryOptions = serviceCategories.map(cat => ({
    value: cat.value,
    label: `${cat.icon} ${cat.label}`,
  }));

  // Price type options - Simplified for Sri Lankan context
  const priceTypeOptions = [
    { value: 'fixed', label: '💰 Fixed Price' },
    { value: 'starting-from', label: '📊 Starting From' },
    { value: 'quote-required', label: '📝 Quote Required' },
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

    if (formData.applicableDeviceTypes.length === 0) {
      newErrors.applicableDeviceTypes = 'At least one device type is required';
    }

    if (formData.basePrice < 0) {
      newErrors.basePrice = 'Price cannot be negative';
    }

    if (!formData.estimatedDuration.trim()) {
      newErrors.estimatedDuration = 'Estimated duration is required';
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
        applicableDeviceTypes: formData.applicableDeviceTypes,
        basePrice: formData.basePrice,
        priceType: formData.priceType,
        estimatedDuration: formData.estimatedDuration,
        warranty: formData.warranty || undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
        isPopular: formData.isPopular,
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

            {/* Active Status Toggle */}
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-5 h-5 rounded-md border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Service is Active
                </span>
              </label>
            </div>

            {/* Applicable Device Types */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                Applicable Device Types <span className="text-red-500">*</span>
              </label>
              <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                Select which device types this service can be performed on
              </p>
              <div className="flex flex-wrap gap-2">
                {deviceTypeOptions.map((option) => {
                  const isSelected = formData.applicableDeviceTypes.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleDeviceType(option.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? theme === 'dark'
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : theme === 'dark'
                            ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option.icon}
                      <span className="font-medium">{option.label}</span>
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
              {errors.applicableDeviceTypes && (
                <p className={errorClass}>{errors.applicableDeviceTypes}</p>
              )}
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
            {(formData.priceType === 'fixed' || formData.priceType === 'starting-from') && (
              <div className="md:col-span-2">
                <label className={labelClass}>
                  {formData.priceType === 'fixed' ? 'Fixed Price' : 'Starting Price'} (Rs.) <span className="text-red-500">*</span>
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
                  {formData.priceType === 'fixed' 
                    ? 'Set to 0 for free services' 
                    : 'Actual price may vary based on device model and parts required'}
                </p>
              </div>
            )}

            {formData.priceType === 'quote-required' && (
              <div className={`md:col-span-2 p-4 rounded-xl ${
                theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  <p className={`text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                    Price will be quoted after diagnosis based on device condition and parts required
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
                placeholder="e.g., 1-2 hours, Same day, 2-3 days"
                className={`${inputClass} ${errors.estimatedDuration ? 'border-red-500' : ''}`}
              />
              {errors.estimatedDuration && <p className={errorClass}>{errors.estimatedDuration}</p>}
            </div>

            {/* Warranty */}
            <div>
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
                  placeholder="e.g., 3 months, 1 year"
                  className={`${inputClass} pl-11`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Internal Notes Card */}
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
              Internal Notes
            </h2>
          </div>

          <div>
            <label className={labelClass}>Notes (Staff Only)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Any internal notes about this service..."
              className={`${inputClass} resize-none`}
            />
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
