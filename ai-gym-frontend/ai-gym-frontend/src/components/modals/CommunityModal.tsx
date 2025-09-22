import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Palette, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommunityCreated: () => void;
  editingCommunity?: any;
}

interface FormData {
  communityName: string;
  projectName: string;
  logoFile: File | null;
  logoPreview: string;
  brandColor: string;
  apiKeyId: string;
  forumEnabled: boolean;
  startFromTemplate: boolean;
  templateId: string;
  includeContent: boolean;
}

interface ValidationErrors {
  communityName?: string;
  brandColor?: string;
  apiKeyId?: string;
}

const CommunityModal: React.FC<CommunityModalProps> = ({
  isOpen,
  onClose,
  onCommunityCreated,
  editingCommunity
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [formData, setFormData] = useState<FormData>({
    communityName: editingCommunity?.name || '',
    projectName: editingCommunity?.project_name || '',
    logoFile: null,
    logoPreview: editingCommunity?.logo_url || '',
    brandColor: editingCommunity?.brand_color || '#3B82F6',
    apiKeyId: editingCommunity?.api_key_id || '',
    forumEnabled: editingCommunity?.forum_enabled ?? true,
    startFromTemplate: false,
    templateId: '',
    includeContent: false
  });

  // Load available API keys and templates when modal opens
  React.useEffect(() => {
    if (isOpen && !editingCommunity) {
      loadAvailableOptions();
    }
  }, [isOpen]);

  const loadAvailableOptions = async () => {
    try {
      // Load API keys
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('id, name, key_type')
        .eq('status', 'active')
        .order('name');

      if (apiKeys) {
        setAvailableApiKeys(apiKeys);
      }

      // Load community templates
      const { data: templates } = await supabase
        .from('communities')
        .select('id, name, project_name')
        .eq('is_template', true)
        .eq('status', 'active')
        .order('name');

      if (templates) {
        setAvailableTemplates(templates);
      }
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Community name validation
    if (!formData.communityName.trim()) {
      newErrors.communityName = 'Community name is required';
    } else if (formData.communityName.length < 2) {
      newErrors.communityName = 'Community name must be at least 2 characters';
    }

    // Brand color validation
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (!hexColorRegex.test(formData.brandColor)) {
      newErrors.brandColor = 'Please enter a valid HEX color code';
    }

    // API key validation
    if (!formData.apiKeyId && !formData.startFromTemplate) {
      newErrors.apiKeyId = 'Please select an API key';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogoUpload = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          logoFile: file,
          logoPreview: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleLogoUpload(files[0]);
    }
  }, [handleLogoUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleLogoUpload(files[0]);
    }
  }, [handleLogoUpload]);

  const uploadLogo = async (): Promise<string | null> => {
    if (!formData.logoFile) return null;

    try {
      const fileExt = formData.logoFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `community-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, formData.logoFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      let logoUrl = formData.logoPreview;

      // Upload new logo if provided
      if (formData.logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Prepare community data
      const communityData = {
        name: formData.communityName.trim(),
        project_name: formData.projectName.trim() || null,
        logo_url: logoUrl,
        brand_color: formData.brandColor,
        api_key_id: formData.apiKeyId || null,
        forum_enabled: formData.forumEnabled,
        status: 'active',
        is_template: false
      };

      let result;

      if (editingCommunity) {
        // Update existing community
        const { data, error } = await supabase
          .from('communities')
          .update(communityData)
          .eq('id', editingCommunity.id)
          .select()
          .single();

        result = { data, error };
      } else {
        // Create new community
        if (formData.startFromTemplate && formData.templateId) {
          // Clone from template
          const { data, error } = await supabase.functions.invoke('clone-community-template', {
            body: {
              template_id: formData.templateId,
              community_data: communityData,
              include_content: formData.includeContent
            }
          });
          result = { data, error };
        } else {
          // Create from scratch
          const { data, error } = await supabase
            .from('communities')
            .insert([communityData])
            .select()
            .single();

          result = { data, error };
        }
      }

      if (result.error) {
        if (result.error.code === '23505') {
          setErrors({ communityName: 'A community with this name already exists' });
          return;
        }
        throw result.error;
      }

      // Reset form and close modal
      resetForm();
      onCommunityCreated();
      onClose();
    } catch (error) {
      console.error('Error saving community:', error);
      // Show error toast or notification here
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      communityName: '',
      projectName: '',
      logoFile: null,
      logoPreview: '',
      brandColor: '#3B82F6',
      apiKeyId: '',
      forumEnabled: true,
      startFromTemplate: false,
      templateId: '',
      includeContent: false
    });
    setErrors({});
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingCommunity ? 'Edit Community' : 'Create New Community'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template Selection */}
          {!editingCommunity && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.startFromTemplate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startFromTemplate: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Start from Template
                </span>
              </label>

              {formData.startFromTemplate && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Template
                    </label>
                    <select
                      value={formData.templateId}
                      onChange={(e) => setFormData(prev => ({ ...prev, templateId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={formData.startFromTemplate}
                    >
                      <option value="">Select a template...</option>
                      {availableTemplates.map((template: any) => (
                        <option key={template.id} value={template.id}>
                          {template.name} {template.project_name && `(${template.project_name})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.includeContent}
                      onChange={(e) => setFormData(prev => ({ ...prev, includeContent: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">
                      Include all content (agents, documents, etc.)
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Community Name *
              </label>
              <input
                type="text"
                value={formData.communityName}
                onChange={(e) => setFormData(prev => ({ ...prev, communityName: e.target.value }))}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.communityName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter community name"
                required
              />
              {errors.communityName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertTriangle size={16} className="mr-1" />
                  {errors.communityName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional project name"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Community Logo
            </label>
            <div className="flex items-center space-x-6">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {formData.logoPreview ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                    <img
                      src={formData.logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                    <Upload size={24} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* Upload Area */}
              <div className="flex-1">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Drag and drop an image, or <span className="text-blue-600">click to browse</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: Square image, at least 200x200px
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Brand Color and API Key */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Color *
              </label>
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-md border border-gray-300 cursor-pointer"
                  style={{ backgroundColor: formData.brandColor }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = formData.brandColor;
                    input.onchange = (e) => {
                      setFormData(prev => ({ ...prev, brandColor: (e.target as HTMLInputElement).value }));
                    };
                    input.click();
                  }}
                >
                  <Palette size={16} className="text-white m-2" />
                </div>
                <input
                  type="text"
                  value={formData.brandColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, brandColor: e.target.value }))}
                  className={`flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                    errors.brandColor ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="#3B82F6"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              {errors.brandColor && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertTriangle size={16} className="mr-1" />
                  {errors.brandColor}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key {!formData.startFromTemplate && '*'}
              </label>
              <select
                value={formData.apiKeyId}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKeyId: e.target.value }))}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.apiKeyId ? 'border-red-500' : 'border-gray-300'
                }`}
                required={!formData.startFromTemplate}
              >
                <option value="">Select an API key...</option>
                {availableApiKeys.map((apiKey: any) => (
                  <option key={apiKey.id} value={apiKey.id}>
                    {apiKey.name} ({apiKey.key_type})
                  </option>
                ))}
              </select>
              {errors.apiKeyId && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertTriangle size={16} className="mr-1" />
                  {errors.apiKeyId}
                </p>
              )}
            </div>
          </div>

          {/* Forum Toggle */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.forumEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, forumEnabled: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Enable Forum
                </span>
                <p className="text-xs text-gray-500">
                  Allow users to participate in community discussions
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>
                {editingCommunity ? 'Update Community' : 'Create Community'}
              </span>
              {!isLoading && <Check size={16} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommunityModal;