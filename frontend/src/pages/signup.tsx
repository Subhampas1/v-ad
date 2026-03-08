import React, { useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/store/authStore';
import { Zap, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Signup: NextPage = () => {
  const router = useRouter();
  const { signup, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    try {
      await signup(email, password, name);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Signup failed');
    }
  };

  const strength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length > 0 ? 1 : 0;
  const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-green-500'];
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -right-40 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-40 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-xl tracking-tight">V-AD</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Create your account</h1>
          <p className="text-sm text-gray-400 mt-1.5">Start creating AI ads in minutes</p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="Your name" autoComplete="name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/60 focus:bg-white/[0.07] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="you@example.com" autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/60 focus:bg-white/[0.07] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="Min. 8 characters" autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/60 focus:bg-white/[0.07] transition"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength meter */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3].map((i) => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-all ${strength >= i ? strengthColors[strength] : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500">{strengthLabels[strength]}</p>
                </div>
              )}
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-60">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          {/* Free tier perks */}
          <div className="pt-2 space-y-2">
            {['Free to get started', 'No credit card required', 'AI-powered scripts & videos'].map((perk) => (
              <div key={perk} className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {perk}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
