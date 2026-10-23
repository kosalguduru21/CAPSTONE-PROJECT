import React, { useState } from 'react';
import {
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Wrench,
  ShieldCheck,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { api } from '../../api/client';
import { SchedulingProposal } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

interface SchedulingProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: SchedulingProposal | null;
  onConfirmed: () => void;
}

export const SchedulingProposalModal: React.FC<SchedulingProposalModalProps> = ({
  isOpen,
  onClose,
  proposal,
  onConfirmed,
}) => {
  const { addToast } = useNotifications();
  const [confirming, setConfirming] = useState(false);

  if (!proposal) return null;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await api.post('/api/scheduling-agent/confirm', {
        proposalId: proposal.proposalId,
      });

      addToast({
        type: 'success',
        title: 'Schedule Committed Successfully',
        message: `Committed ${response.confirmedBookings?.length || 0} maintenance visit(s). In-app notifications sent to residents and technicians.`,
      });
      onConfirmed();
      onClose();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Confirmation Failed',
        message: err.message || 'Unable to commit schedule. Please check for conflicting slots.',
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review AI Scheduling Proposal"
      subtitle="Deterministic slot intersection & skill matching with explicit manager sign-off"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Proposal Summary Banner */}
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
              Agent Execution Summary
            </div>
            <p className="text-sm text-slate-200">{proposal.summary}</p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <span className="text-xs text-slate-400">Proposal ID</span>
            <div className="font-mono text-xs text-slate-300">{proposal.proposalId?.substring(0, 8)}...</div>
          </div>
        </div>

        {/* Proposed Scheduled Visits */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Feasible Scheduled Visits ({proposal.scheduledProposals.length})</span>
          </h4>

          {proposal.scheduledProposals.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
              No non-emergency orders currently intersect with available technician windows.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {proposal.scheduledProposals.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-blue-400">
                        {item.orderNumber}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {item.category}
                      </span>
                    </div>
                    <h5 className="text-sm font-semibold text-white mb-1">{item.title}</h5>
                    {item.unitNumber && (
                      <p className="text-xs text-slate-400 mb-3">Unit: {item.unitNumber}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Wrench className="w-3.5 h-3.5 text-slate-400" />
                        <span>Technician:</span>
                      </div>
                      <span className="font-medium text-white">
                        {item.suggestedTechnician?.name} ({item.suggestedTechnician?.vendorName})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Proposed Slot:</span>
                      </div>
                      <span className="font-semibold text-cyan-300">
                        {item.proposedSlot?.date} • {item.proposedSlot?.timeSlot}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conflicts or Unresolved Constraints */}
        {proposal.conflicts && proposal.conflicts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Unresolved Constraints or Conflicts ({proposal.conflicts.length})</span>
            </h4>
            <div className="space-y-2">
              {proposal.conflicts.map((c, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between"
                >
                  <span className="font-mono font-semibold">{c.orderNumber}</span>
                  <span className="text-amber-300">{c.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tool Execution Telemetry (Human-in-the-loop audit) */}
        {proposal.toolExecutions && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>LangChain Tool Telemetry</span>
              </div>
              <span className="text-[11px] text-slate-500">Zod-Validated Inputs</span>
            </div>
            <div className="space-y-1.5">
              {proposal.toolExecutions.map((tool, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900 border border-slate-800/60"
                >
                  <span className="font-mono text-purple-300">{tool.toolName}()</span>
                  <span className="text-slate-400 truncate max-w-sm">{tool.summary}</span>
                  <span className="text-[11px] text-slate-500">{tool.durationMs}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={confirming}>
            Cancel / Edit Scope
          </Button>
          <Button
            variant="success"
            onClick={handleConfirm}
            loading={confirming}
            disabled={proposal.scheduledProposals.length === 0}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Confirm & Atomically Commit Schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
};
