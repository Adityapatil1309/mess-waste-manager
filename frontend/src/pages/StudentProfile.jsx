import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { HiOutlineUser, HiOutlineSave } from 'react-icons/hi';
import ProfileUploadWidget from '../components/ProfileUploadWidget';
export default function StudentProfile() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState({ name: '', roll_number: '', organization_code: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/student/profile')
      .then(res => setProfile({
        name: res.data.name || '',
        roll_number: res.data.roll_number || '',
        organization_code: ''
      }))
      .catch(err => console.error(err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.put('/student/profile', profile);
      if (res.data.access_token) {
        login(res.data.access_token);
      }
      toast.success('Profile updated! ✅');
      if (profile.organization_code) {
        setProfile({...profile, organization_code: ''});
      }
    } catch (err) { toast.error(err.response?.data?.detail || 'Update failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineUser className="text-secondary-500" /> My Profile
        </h1>
        <p className="text-gray-500 mt-1">Manage your student profile information</p>
      </div>

      {/* Profile Card */}
      <div className="glass-card p-8">
        <div className="flex flex-col items-center mb-8">
          <ProfileUploadWidget user={user} />
          <h2 className="text-xl font-bold text-gray-800 mt-2">{user?.name}</h2>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">Student</span>
        </div>

        <form onSubmit={handleSave} className="space-y-5 max-w-md mx-auto">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="input-field"
              id="profile-name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Roll Number</label>
            <input
              type="text"
              value={profile.roll_number}
              onChange={(e) => setProfile({ ...profile, roll_number: e.target.value })}
              className="input-field"
              placeholder="e.g., CS2024001"
              id="profile-roll"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Change Organization / Mess</label>
            <input
              type="text"
              value={profile.organization_code}
              onChange={(e) => setProfile({ ...profile, organization_code: e.target.value.toUpperCase() })}
              placeholder="Leave blank to keep current mess, or enter new code"
              className="input-field uppercase"
              id="profile-org"
              maxLength={20}
            />
            <p className="mt-2 text-xs text-gray-500">
              Only enter a new invite code here if you want to switch to a different mess. 
              Entering a code here will disconnect you from your current manager.
            </p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50" id="profile-save">
            <HiOutlineSave /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
