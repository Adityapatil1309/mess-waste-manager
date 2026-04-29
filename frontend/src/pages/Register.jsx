import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { FaLeaf, FaGoogle } from 'react-icons/fa';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', roll_number: '', organization_code: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await API.post('/auth/register', form);
      toast.success('Account created! Please log in 🎉');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const GOOGLE_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy';
  const isGoogleMock = GOOGLE_ID === 'dummy' || GOOGLE_ID.includes('your_google');

  const handleMockSocialLogin = async (provider, token) => {
    setLoading(true);
    try {
        const res = await API.post('/auth/social-login', { 
            provider, 
            token,
            role: form.role,
            roll_number: form.roll_number,
            organization_code: form.organization_code
        });
        login(res.data.access_token);
        toast.success(`Authenticated via ${provider} (Mock)! 🌱`);
        const payload = JSON.parse(atob(res.data.access_token.split('.')[1]));
        if (payload.role === 'student') navigate('/student-dashboard');
        else navigate('/dashboard');
    } catch (err) {
        toast.error(err.response?.data?.detail || `${provider} Login failed`);
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (isGoogleMock) handleMockSocialLogin('google', 'mock_google_token');
    else loginWithGoogle();
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await API.post('/auth/social-login', { 
          provider: 'google', 
          token: tokenResponse.access_token,
          role: form.role,
          roll_number: form.roll_number,
          organization_code: form.organization_code
        });
        login(res.data.access_token);
        toast.success(`Authenticated via Google! 🌱`);
        const payload = JSON.parse(atob(res.data.access_token.split('.')[1]));
        if (payload.role === 'student') navigate('/student-dashboard');
        else navigate('/dashboard');
      } catch (err) {
        toast.error(err.response?.data?.detail || `Google Login failed`);
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error('Google Login Failed')
  });


  return (
    <div className="min-h-screen flex bg-gray-50 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-40 -left-20 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 z-10 w-full max-w-7xl mx-auto">
        
        <Link to="/" className="flex items-center gap-3 mb-6 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-primary-500/30 transition-transform group-hover:scale-105">
            <FaLeaf className="text-white text-2xl" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-gray-900 group-hover:text-primary-600 transition-colors">
            MessWaste<span className="text-primary-600 font-light">AI</span>
          </span>
        </Link>

        {/* Form Container with Glassmorphism */}
        <div className="w-full max-w-md animate-fade-in bg-white/80 backdrop-blur-xl border border-white p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
          
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight mb-2">
              Create account
            </h2>
            <p className="text-gray-500 text-sm font-medium">Start your sustainability journey today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors">
                  <HiOutlineUser size={20} />
                </div>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-gray-400 font-medium"
                  placeholder="Enter your name"
                  required
                  id="register-name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors">
                  <HiOutlineMail size={20} />
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-gray-400 font-medium"
                  placeholder="hello@example.com"
                  required
                  id="register-email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors">
                  <HiOutlineLockClosed size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-gray-400 font-medium"
                  placeholder="Min 6 characters"
                  required
                  id="register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium appearance-none"
                id="register-role"
              >
                <option value="student">Student</option>
                <option value="mess_manager">Mess Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {form.role === 'student' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Roll Number</label>
                <input
                  type="text"
                  value={form.roll_number}
                  onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-gray-400 font-medium"
                  placeholder="e.g., CS2024001"
                  id="register-roll"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-black text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 mt-2 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-900/20 disabled:opacity-70 disabled:hover:translate-y-0"
              id="register-submit"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Social Auth Separator */}
          <div className="mt-6 flex items-center gap-4">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-gray-200 flex-1"></div>
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider text-[11px]">Or continue with</span>
            <div className="h-px bg-gradient-to-l from-transparent via-gray-200 to-gray-200 flex-1"></div>
          </div>

          {/* Social Login Buttons */}
          <div className="mt-5 flex flex-col gap-4">
            <button
              type="button"
              onClick={handleGoogleClick}
              className="flex items-center justify-center gap-2.5 py-3.5 px-4 w-full bg-white border border-gray-200 rounded-2xl hover:bg-gray-50/50 text-gray-700 font-bold transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300"
              id="register-google"
            >
              <FaGoogle className="text-[#DB4437] text-lg" />
              <span>Continue with Google</span>
            </button>
          </div>

          <p className="text-center text-gray-500 mt-8 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-bold hover:text-primary-700 hover:underline decoration-2 underline-offset-4">
              Sign in here
            </Link>
          </p>
        </div>
        
        {/* Footer Text */}
        <p className="mt-8 text-gray-400 text-sm font-medium z-10">
          © {new Date().getFullYear()} MessWasteAI. All rights reserved.
        </p>
      </div>
    </div>
  );
}
