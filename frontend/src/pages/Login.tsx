import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Shield, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignup) {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          // After signup, automatically log in
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok) {
            login(loginData.token, loginData.user);
            navigate('/admin');
          } else {
            setError(loginData.error);
          }
        } else {
          setError(data.error);
        }
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
          login(data.token, data.user);
          navigate(data.user.role === 'admin' ? '/admin' : '/student');
        } else {
          setError(data.error);
        }
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };
  return (
    <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-[#141414] shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#141414] flex items-center justify-center mb-4">
            <Shield className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tighter text-[#141414]">IntelliGroup AI</h1>
          <p className="text-sm text-[#141414]/60 italic font-serif">Group Formation System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignup && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#141414]/40" />
                <input
                  type="text"
                  required
                  className="w-full bg-[#F5F5F5] border border-[#141414] py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#141414]/40" />
              <input
                type="email"
                required
                className="w-full bg-[#F5F5F5] border border-[#141414] py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#141414]/40" />
              <input
                type="password"
                required
                className="w-full bg-[#F5F5F5] border border-[#141414] py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-500 text-red-600 text-xs p-3 font-mono">
              ERROR: {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#141414] text-white py-4 font-bold uppercase tracking-widest hover:bg-white hover:text-[#141414] border border-[#141414] transition-all flex items-center justify-center gap-2 group"
          >
            {isSignup ? 'Sign Up' : 'Sign In'}
            <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-xs text-[#141414]/60 hover:text-[#141414] underline"
          >
            {isSignup ? 'Already have an account? Sign In' : 'Need an admin account? Sign Up'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-[#141414]/10 text-center">
          <p className="text-[10px] text-[#141414]/40 uppercase tracking-widest">
            Secure Access Portal • v1.0.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}
