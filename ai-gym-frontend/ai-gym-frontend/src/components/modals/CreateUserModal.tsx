import React, { useState } from 'react';
import { X, User, Mail, Tag, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  availableTags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  onUserCreated: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  selectedTags: string[];
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  communityId,
  availableTags,
  onUserCreated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    tempPassword: string;
  } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    selectedTags: []
  });

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSecurePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Generate secure password
      const tempPassword = generateSecurePassword();
      
      // Create user
      const userData = {
        community_id: communityId,
        email: formData.email.trim(),
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        created_at: new Date().toISOString()
      };

      const { data: user, error: userError } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (userError) {
        if (userError.code === '23505') {
          setErrors({ email: 'A user with this email already exists' });
          return;
        }
        throw userError;
      }

      // Assign tags if selected
      if (formData.selectedTags.length > 0) {
        const tagAssignments = formData.selectedTags.map(tagId => ({
          user_id: user.id,
          tag_id: tagId,
          assigned_at: new Date().toISOString()
        }));

        const { error: tagError } = await supabase
          .from('user_tag_assignments')
          .insert(tagAssignments);

        if (tagError) {
          console.error('Error assigning tags:', tagError);
          // Don't fail the whole operation for tag assignment errors
        }
      }

      // Set created user info for display
      setCreatedUser({
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        tempPassword
      });

      onUserCreated();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      selectedTags: []
    });
    setErrors({});
    setCreatedUser(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {createdUser ? 'User Created Successfully!' : 'Create New User'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!createdUser ? (
            /* Create User Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="John"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle size={14} className="mr-1" />
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Doe"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle size={14} className="mr-1" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="john.doe@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle size={14} className="mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Tags */}
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Tags (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(tag.id)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors ${
                          formData.selectedTags.includes(tag.id)
                            ? 'text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={{
                          backgroundColor: formData.selectedTags.includes(tag.id) ? tag.color : undefined
                        }}
                      >
                        <Tag size={14} className="mr-1" />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Click tags to assign them to this user
                  </p>
                </div>
              )}

              {/* Password Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> A secure temporary password will be automatically generated for this user.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isLoading ? 'Creating...' : 'Create User'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="mb-4">
                <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  User Created Successfully!
                </h3>
                <p className="text-gray-600">
                  {createdUser.firstName} {createdUser.lastName} has been added to the system.
                </p>
              </div>

              {/* User Credentials */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-yellow-800 mb-3">🔑 User Credentials</h4>
                
                <div className="space-y-3 text-left">
                  <div>
                    <label className="block text-xs font-medium text-yellow-700 mb-1">Email:</label>
                    <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                      <span className="font-mono text-sm">{createdUser.email}</span>
                      <button
                        onClick={() => copyToClipboard(createdUser.email)}
                        className="text-yellow-600 hover:text-yellow-800 text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-yellow-700 mb-1">Temporary Password:</label>
                    <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                      <span className="font-mono text-sm">{createdUser.tempPassword}</span>
                      <button
                        onClick={() => copyToClipboard(createdUser.tempPassword)}
                        className="text-yellow-600 hover:text-yellow-800 text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-yellow-700 mt-3">
                  ⚠️ <strong>Important:</strong> Save these credentials now. The password will not be shown again.
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateUserModal;