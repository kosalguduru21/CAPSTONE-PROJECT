import React from 'react';
import {
  Building2,
  Wrench,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  Search,
  ArrowRight,
  CheckCircle,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAuth, DEMO_CREDENTIALS } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface LandingPageProps {
  onNavigateLogin: () => void;
  onOpenChat: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateLogin, onOpenChat }) => {
  const { switchDemoAccount } = useAuth();

  const handleDemoSignIn = async (role: UserRole) => {
    await switchDemoAccount(role);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>AI-Powered Full-Stack Capstone Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
            Apartment Maintenance <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Operations Platform
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A unified coordination system connecting <strong>Residents</strong>, <strong>Property Managers</strong>, and <strong>Vendor Technicians</strong> with grounded document RAG, semantic related-case discovery, and conflict-safe scheduling agents.
          </p>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Button size="lg" onClick={onNavigateLogin} icon={<ArrowRight className="w-4 h-4" />}>
              Sign In to Portal
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={onOpenChat}
              icon={<Sparkles className="w-4 h-4 text-purple-400" />}
            >
              Test Maintenance AI Chat
            </Button>
          </div>

          {/* Instant 1-Click Persona Demos */}
          <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Instant 1-Click Evaluation Personas
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleDemoSignIn('property_manager')}
                className="p-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-400">Property Manager</span>
                  <Building2 className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="text-sm font-semibold text-white">Sarah Jenkins</div>
                <div className="text-[11px] text-slate-400 mt-1">Triage, RAG, Scheduling</div>
              </button>

              <button
                onClick={() => handleDemoSignIn('resident')}
                className="p-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400">Resident</span>
                  <CheckCircle className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div className="text-sm font-semibold text-white">Alex Rivera</div>
                <div className="text-[11px] text-slate-400 mt-1">Submit, Track, Review</div>
              </button>

              <button
                onClick={() => handleDemoSignIn('vendor_technician')}
                className="p-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400">Vendor Technician</span>
                  <Wrench className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
                <div className="text-sm font-semibold text-white">Mario Rossi</div>
                <div className="text-[11px] text-slate-400 mt-1">QuickFlow Plumbing</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Pillar Highlights */}
      <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Enterprise AI Capstone Features</h2>
          <p className="text-sm text-slate-400">Strictly grounded, bounded, and role-authorized architecture</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Document-Grounded RAG</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesizes policies and equipment manuals with verifiable chunk citations. Features emergency bypass and blocks dangerous DIY guidance.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Semantic Related-Case Search</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects interconnected issues across units (e.g. upper ceiling leaks vs lower drips) using Atlas Vector Search embeddings scoped strictly to the property.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Bounded Scheduling Agent</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Orchestrates 3 LangChain Zod-validated tools to propose conflict-free visits without hallucination, requiring explicit manager sign-off.
            </p>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-4 text-center text-xs text-slate-500">
        Apartment Maintenance Operations • Capstone Project • MERN + Ollama + LangChain + Atlas Vector Search
      </footer>
    </div>
  );
};
