import React, { useState } from 'react';
import { Building, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAuth, DEMO_CREDENTIALS } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserRole } from '../../types';

interface LoginPageProps {
  onNavigateRegister: () => void;
  onNavigateHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateRegister, onNavigateHome }) => {
  const { login } = useAuth();
  const { addToast } = useNotifications();

  const [email, setEmail] = useState('manager.sarah@grandheights.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      addToast({
        type: 'success',
        title: 'Signed In',
        message: 'Welcome back to Apartment Maintenance Operations.',
      });
      onNavigateHome();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Sign In Failed',
        message: err.message || 'Invalid email or password.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role];
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.password);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20 mb-3">
            <Building className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Apartment Maintenance Operations</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in with your role-authorized credentials</p>
        </div>

        <Card className="p-6 sm:p-8">
          {/* Quick Demo Fill Buttons */}
          <div className="mb-6 pb-6 border-b border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Quick Autofill Demo Account
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectDemo('property_manager')}
                className="p-2 rounded-xl text-center bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 text-[11px] font-semibold text-blue-400 transition-all"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemo('resident')}
                className="p-2 rounded-xl text-center bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-[11px] font-semibold text-emerald-400 transition-all"
              >
                Resident
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemo('vendor_technician')}
                className="p-2 rounded-xl text-center bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-[11px] font-semibold text-amber-400 transition-all"
              >
                Technician
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full mt-2"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
            Have an invitation code?{' '}
            <button
              onClick={onNavigateRegister}
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Register with invite
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
