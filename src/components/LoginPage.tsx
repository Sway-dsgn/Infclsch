import React, { useState } from 'react';
import { Compass, LogIn, Eye, EyeOff, ArrowLeft, Sparkles, Mail, Lock, Chrome, TrendingUp, Users, BarChart3, Target, Star, CheckCircle, Music2, Youtube, Facebook, Instagram } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  onBack: () => void;
  darkMode: boolean;
}

export default function LoginPage({ onLogin, onBack, darkMode }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Harap isi email dan password.');
      return;
    }
    if (password.length < 3) {
      setError('Password minimal 3 karakter.');
      return;
    }
    localStorage.setItem('influx_user', JSON.stringify({ username: email.trim() }));
    onLogin();
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Influx</span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Log in to your account</h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-7 leading-relaxed">
            Welcome back! Access your creator dashboard and manage your campaigns.
          </p>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-xs">
              <Chrome className="w-4 h-4" />
              Google
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-xs">
              <Facebook className="w-4 h-4 text-blue-700" />
              Facebook
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">atau lanjut dengan email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="Enter your email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                />
                <span className="text-xs text-slate-600">Remember me</span>
              </label>
              <button type="button" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer">
                Forgot Password?
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Log In
            </button>
          </form>

          {/* Sign Up */}
          <p className="text-center text-xs text-slate-500 mt-6">
            Don't have an account?{' '}
            <button type="button" onClick={onLogin} className="font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer">
              Create account
            </button>
          </p>
        </div>
      </div>

      {/* RIGHT: Brand Visual */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        {/* Abstract background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center px-12 max-w-lg mx-auto">
          {/* Floating Dashboard Card */}
          <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl animate-[fadeIn_0.6s_ease-out]">
            {/* Card Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex -space-x-1.5">
                {['RR', 'SN', 'GW', 'BS'].map((a, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-white/20 ring-2 ring-white/30 flex items-center justify-center text-[8px] font-bold text-white">
                    {a}
                  </div>
                ))}
              </div>
              <div className="flex-1" />
              <TrendingUp className="w-4 h-4 text-blue-200" />
            </div>

            {/* Creator rows */}
            {[
              { name: 'Rizky Ramadhan', username: '@rizkyr_kuliner', followers: '12.5K', er: '5.4%' },
              { name: 'Siti Nurhaliza', username: '@sitinur_style', followers: '48K', er: '6.8%' },
              { name: 'Bimo Suroboyo', username: '@bimosby', followers: '23.1K', er: '7.2%' },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                  {c.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{c.name}</div>
                  <div className="text-[10px] text-blue-200">{c.username}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">{c.followers}</div>
                  <div className="text-[10px] text-blue-200">{c.er} ER</div>
                </div>
              </div>
            ))}

            {/* Bottom stats */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/10">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="w-3 h-3 text-blue-200" />
                  <span className="text-xs font-bold text-white">2.4K</span>
                </div>
                <p className="text-[9px] text-blue-200">Creators</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <BarChart3 className="w-3 h-3 text-blue-200" />
                  <span className="text-xs font-bold text-white">5.8%</span>
                </div>
                <p className="text-[9px] text-blue-200">Avg. ER</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Target className="w-3 h-3 text-blue-200" />
                  <span className="text-xs font-bold text-white">89%</span>
                </div>
                <p className="text-[9px] text-blue-200">Match Rate</p>
              </div>
            </div>
          </div>

          {/* Floating platform icons */}
          <div className="flex items-center gap-4 mt-6">
            {[
              { icon: <Instagram className="w-4 h-4" />, label: 'Instagram' },
              { icon: <Music2 className="w-4 h-4" />, label: 'TikTok' },
              { icon: <Youtube className="w-4 h-4" />, label: 'YouTube' },
              { icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1.5">
                <div className="text-white/80">{item.icon}</div>
                <span className="text-[10px] font-medium text-white/80">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Text */}
          <div className="text-center mt-8">
            <p className="text-lg font-bold text-white leading-snug">Connect with creators that drive impact</p>
            <p className="text-sm text-blue-200 mt-2 leading-relaxed">
              Everything you need to discover, analyze, and grow influencer campaigns in one powerful platform.
            </p>
          </div>

          {/* Slider dots */}
          <div className="flex items-center gap-1.5 mt-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === 0 ? 'bg-white w-5' : 'bg-white/40'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
