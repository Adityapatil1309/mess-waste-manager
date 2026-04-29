import { useState, useRef } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { HiOutlineUser } from 'react-icons/hi';
import ProfileUploadWidget from '../components/ProfileUploadWidget';

export default function ManagerProfile() {
  const { user, login } = useAuth();
  const [newOrgCode, setNewOrgCode] = useState(user?.invite_code || user?.org_code || '');
  const [updating, setUpdating] = useState(false);

  const handleUpdateCode = async (e) => {
    e.preventDefault();
    if (!newOrgCode || newOrgCode.length < 6) return toast.error('Code must be at least 6 characters');
    setUpdating(true);
    try {
      const res = await API.put('/organization/update-code', { new_org_code: newOrgCode.trim().toUpperCase() });
      if (res.data.access_token) {
        login(res.data.access_token);
      }
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update code');
    } finally {
      setUpdating(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewOrgCode(result);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineUser className="text-secondary-500" /> Manager Profile
        </h1>
        <p className="text-gray-500 mt-1">Manage your profile picture and information</p>
      </div>

      <div className="glass-card p-8">
        <div className="flex flex-col items-center mb-8">
          <ProfileUploadWidget user={user} />
          <h2 className="text-xl font-bold text-gray-800 mt-2">{user?.name}</h2>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 capitalize">
            {user?.role?.replace('_', ' ')}
          </span>
        </div>

        <div className="max-w-md mx-auto space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="input-field bg-gray-50 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="input-field bg-gray-50 cursor-not-allowed"
            />
          </div>
          
          <div className="pt-6 mt-6 border-t border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Organization Settings</h3>
            <form onSubmit={handleUpdateCode} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                  Organization Invite Code
                  <button 
                    type="button" 
                    onClick={generateRandomCode}
                    className="text-xs text-primary-600 hover:text-primary-700 font-bold"
                  >
                    Generate Random
                  </button>
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newOrgCode}
                    onChange={(e) => setNewOrgCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDEF"
                    maxLength={10}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all uppercase font-mono font-bold tracking-widest text-primary-700"
                  />
                  <button
                    type="submit"
                    disabled={updating || newOrgCode === (user?.invite_code || user?.org_code)}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {updating ? 'Saving...' : 'Update'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Must be 6-10 alphanumeric characters. Existing students will remain connected, but new students will need this new code.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
