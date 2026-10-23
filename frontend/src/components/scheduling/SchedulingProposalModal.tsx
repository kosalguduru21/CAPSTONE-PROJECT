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

  const proposalsList = (proposal.scheduledProposals && proposal.scheduledProposals.length > 0)
    ? proposal.scheduledProposals
    : ((proposal as any).proposedVisits || []);

  const toolList = (proposal.toolExecutions && proposal.toolExecutions.length > 0)
    ? proposal.toolExecutions
    : ((proposal as any).toolsUsed || []);

  const conflictsList = proposal.conflicts || [];

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await api.post('/api/scheduling-agent/confirm', {
        proposalId: proposal.proposalId,
      });

      const count = response?.committedCount || response?.data?.committedCount || response?.confirmedBookings?.length || proposalsList.length;

      addToast({
        type: 'success',
        title: 'Schedule Committed Successfully',
        message: `Committed ${count} maintenance visit(s). In-app notifications sent to residents and technicians.`,
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
            <span>Feasible Scheduled Visits ({proposalsList.length})</span>
          </h4>

          {proposalsList.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
              No non-emergency orders currently intersect with available technician windows.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {proposalsList.map((item: any, idx: number) => {
                const orderRef = item.orderNumber || item.reference || item.orderId;
                const techName = item.suggestedTechnician?.name || item.technicianName || 'Technician';
                const vendorName = item.suggestedTechnician?.vendorName || item.vendorName || 'Authorized Vendor';
                const slotDate = item.proposedSlot?.date || (item.proposedStartTime ? new Date(item.proposedStartTime).toLocaleDateString() : 'Next Week');
                const slotTime = item.proposedSlot?.timeSlot || (item.proposedStartTime ? `${new Date(item.proposedStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Standard Window');
                const unitVal = item.unitNumber || item.unit;

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {orderRef}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {item.category}
                        </span>
                      </div>
                      <h5 className="text-sm font-semibold text-white mb-1">{item.title}</h5>
                      {unitVal && (
                        <p className="text-xs text-slate-400 mb-3">Unit: {unitVal}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Wrench className="w-3.5 h-3.5 text-slate-400" />
                          <span>Technician:</span>
                        </div>
                        <span className="font-medium text-white">
                          {techName} ({vendorName})
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Proposed Slot:</span>
                        </div>
                        <span className="font-semibold text-cyan-300">
                          {slotDate} • {slotTime}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Conflicts or Unresolved Constraints */}
        {conflictsList.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Unresolved Constraints or Conflicts ({conflictsList.length})</span>
            </h4>
            <div className="space-y-2">
              {conflictsList.map((c: any, i: number) => {
                const orderText = typeof c === 'string' ? '' : (c.orderNumber || c.reference || '');
                const reasonText = typeof c === 'string' ? c : (c.reason || c.message || JSON.stringify(c));
                return (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between"
                  >
                    {orderText && <span className="font-mono font-semibold">{orderText}</span>}
                    <span className="text-amber-300">{reasonText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tool Execution Telemetry (Human-in-the-loop audit) */}
        {toolList.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>LangChain Tool Telemetry</span>
              </div>
              <span className="text-[11px] text-slate-500">Zod-Validated Inputs</span>
            </div>
            <div className="space-y-1.5">
              {toolList.map((tool: any, idx: number) => {
                const name = tool.toolName || tool.name || 'tool';
                const summaryText = tool.summary || (tool.error ? `Error: ${tool.error}` : `Success (${tool.durationMs}ms)`);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900 border border-slate-800/60"
                  >
                    <span className="font-mono text-purple-300">{name}()</span>
                    <span className="text-slate-400 truncate max-w-sm">{summaryText}</span>
                    <span className="text-[11px] text-slate-500">{tool.durationMs || 0}ms</span>
                  </div>
                );
              })}
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
            disabled={proposalsList.length === 0}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Confirm & Atomically Commit Schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
};
