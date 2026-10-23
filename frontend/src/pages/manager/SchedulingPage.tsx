import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { SchedulingProposalModal } from '../../components/scheduling/SchedulingProposalModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { api } from '../../api/client';
import { SchedulingProposal, WorkOrder } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

export const SchedulingPage: React.FC = () => {
  const { addToast } = useNotifications();
  const [scheduledOrders, setScheduledOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Proposal generation state
  const [generating, setGenerating] = useState(false);
  const [currentProposal, setCurrentProposal] = useState<SchedulingProposal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchScheduled = async () => {
    try {
      const data = await api.get('/api/work-orders');
      if (Array.isArray(data)) {
        // Filter orders that have been scheduled
        setScheduledOrders(data.filter((o) => ['Scheduled', 'In Progress', 'Assigned'].includes(o.status)));
      }
    } catch (err) {
      console.error('Failed to load scheduled work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled();
  }, []);

  const handleGenerateProposal = async () => {
    setGenerating(true);
    try {
      const data = await api.post('/api/scheduling-agent', {
        timeframe: 'next_week',
      });

      setCurrentProposal(data);
      setModalOpen(true);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Agent Error',
        message: err.message || 'Unable to execute bounded scheduling agent.',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-blue-950/50 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Bounded LangChain Agent
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
              Deterministic Tool Chain • Zod Validation
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">AI Maintenance Scheduling Agent</h2>
          <p className="text-xs text-slate-300 mt-1">
            Proposes non-emergency visits by intersecting resident access windows with certified technician availability.
          </p>
        </div>

        <Button
          onClick={handleGenerateProposal}
          loading={generating}
          variant="primary"
          icon={<Sparkles className="w-4 h-4 text-cyan-300" />}
        >
          Generate Next Week's Schedule
        </Button>
      </div>

      {/* Safety & Tool Architecture Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1">
            <span className="p-1 rounded bg-cyan-500/10 border border-cyan-500/20">Tool 1</span>
            <span>readOpenOrders()</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Queries eligible open orders. Explicitly <strong>excludes emergency tickets</strong> to ensure life-safety tickets are never delayed.
          </p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-1">
            <span className="p-1 rounded bg-purple-500/10 border border-purple-500/20">Tool 2</span>
            <span>checkVendorSkills()</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Matches trades (plumbing, electrical, HVAC) strictly to active, approved vendor accounts. Never recommends suspended vendors.
          </p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
            <span className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20">Tool 3</span>
            <span>intersectAccessWindows()</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Calculates deterministic date and time slot collisions. Human manager approval required before committing slots.
          </p>
        </Card>
      </div>

      {/* Confirmed Active Calendar Schedule */}
      <div>
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Currently Confirmed Maintenance Visits ({scheduledOrders.length})</span>
        </h3>

        {loading ? (
          <LoadingSpinner message="Loading confirmed visits..." />
        ) : scheduledOrders.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-400">
            No maintenance visits currently booked. Click "Generate Next Week's Schedule" to run the AI scheduling agent.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledOrders.map((order) => (
              <Card key={order._id} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{order.orderNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                      {order.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">{order.title}</h4>
                  <p className="text-xs text-slate-400 mb-3">
                    Unit: {order.unitId ? order.unitId.unitNumber : 'Shared Area'} • Resident: {order.residentId?.fullName}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-medium capitalize text-white">{order.category}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Assigned Vendor:</span>
                    <span className="font-medium text-white">QuickFlow Plumbing</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review & Confirmation Modal */}
      <SchedulingProposalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        proposal={currentProposal}
        onConfirmed={fetchScheduled}
      />
    </div>
  );
};
