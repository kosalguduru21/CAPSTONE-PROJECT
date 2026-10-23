import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Wrench,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  RotateCcw,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { api } from '../../api/client';
import { WorkOrder, Estimate } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

interface ResidentWorkOrderDetailProps {
  orderId: string;
  onBack: () => void;
}

export const ResidentWorkOrderDetail: React.FC<ResidentWorkOrderDetailProps> = ({
  orderId,
  onBack,
}) => {
  const { addToast } = useNotifications();
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Reopen modal state
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await api.get(`/api/work-orders/${orderId}`);
      setOrder(data);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Unable to load work order details.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleConfirmResolution = async () => {
    if (!confirm('Are you satisfied that the maintenance problem has been completely resolved?')) {
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/api/work-orders/${orderId}/completion-review`, {
        satisfied: true,
      });
      addToast({
        type: 'success',
        title: 'Work Order Resolved',
        message: 'Thank you for confirming resolution of your request.',
      });
      await fetchOrder();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Unable to complete review.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;

    setActionLoading(true);
    try {
      await api.post(`/api/work-orders/${orderId}/completion-review`, {
        satisfied: false,
        reopenReason: reopenReason.trim(),
      });
      addToast({
        type: 'warning',
        title: 'Case Reopened',
        message: 'Your case has been reopened and escalated to property management.',
      });
      setReopenModalOpen(false);
      setReopenReason('');
      await fetchOrder();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Unable to reopen ticket.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading work order details..." />;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-400">Work order not found or access denied.</p>
        <Button onClick={onBack} size="sm" className="mt-4">
          Return
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Requests</span>
      </button>

      {/* Header and Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm font-bold text-blue-400">{order.orderNumber}</span>
            <Badge variant="status" status={order.status} />
            <Badge variant="priority" priority={order.priority} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{order.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Submitted on {new Date(order.createdAt).toLocaleDateString()} • Property: {order.propertyId?.name}
          </p>
        </div>

        {/* Resident Completion Review Actions */}
        {order.status === 'Work Completed — Awaiting Review' && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="success"
              onClick={handleConfirmResolution}
              loading={actionLoading}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm Resolved
            </Button>
            <Button
              variant="danger"
              onClick={() => setReopenModalOpen(true)}
              loading={actionLoading}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Request Reopen
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details & Evidence */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              Problem Description
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              {order.description}
            </p>

            {/* Access Notes */}
            {order.accessNotes && (
              <div className="mt-4 pt-4 border-t border-slate-800 text-xs">
                <span className="font-semibold text-slate-400">Access Instructions:</span>
                <p className="text-slate-300 mt-0.5">{order.accessNotes}</p>
              </div>
            )}
          </Card>

          {/* Completion Details & Evidence (if completed) */}
          {(order.completionNotes || (order.completionEvidence && order.completionEvidence.length > 0)) && (
            <Card className="p-6 border-emerald-500/30 bg-emerald-950/10">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
                <ShieldCheck className="w-4 h-4" />
                <span>Technician Completion Evidence</span>
              </div>
              {order.completionNotes && (
                <div className="text-xs text-slate-200 bg-slate-900/90 p-4 rounded-xl border border-slate-800 mb-4 leading-relaxed">
                  <span className="font-semibold block text-slate-400 mb-1">Work Notes:</span>
                  {order.completionNotes}
                </div>
              )}

              {order.completionEvidence && order.completionEvidence.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-300 block mb-2">
                    Evidence Photographs / Documents:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {order.completionEvidence.map((att, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <span className="truncate max-w-[180px] text-slate-200">{att.originalName}</span>
                        <a
                          href={`/uploads/${att.filename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 p-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Reopening History if present */}
          {order.reopenReason && (
            <Card className="p-6 border-rose-500/30 bg-rose-950/10">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
                <RotateCcw className="w-4 h-4" />
                <span>Reopening Notice</span>
              </div>
              <p className="text-xs text-rose-200">{order.reopenReason}</p>
            </Card>
          )}
        </div>

        {/* Right Column: Coordination, Estimate, Schedule */}
        <div className="space-y-6">
          {/* Schedule & Preferred Windows */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Visit & Access Windows</span>
            </div>

            <div className="space-y-2">
              {order.preferredAccessWindows?.map((win, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between"
                >
                  <span className="font-medium text-slate-200">{win.date}</span>
                  <span className="text-slate-400">{win.timeSlot}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Assigned Technician Card */}
          {order.currentAssignment && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Wrench className="w-4 h-4 text-blue-400" />
                <span>Assigned Technician</span>
              </div>
              <div className="text-xs text-slate-300">
                <div className="font-semibold text-white">QuickFlow Plumbing Service</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Licensed Contractor</div>
              </div>
            </Card>
          )}

          {/* Active Estimate Card if exists */}
          {order.activeEstimate && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Cost Estimate</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Quote:</span>
                <span className="font-bold text-white text-base">
                  ${order.activeEstimate.total.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Status: <span className="text-emerald-400 font-medium">{order.activeEstimate.status}</span>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Reopen Modal */}
      <Modal
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        title="Request Case Reopening"
        subtitle="Please describe why the completed repair did not resolve the problem"
      >
        <form onSubmit={handleRequestReopen} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Reason / Unresolved Symptoms
            </label>
            <textarea
              required
              rows={4}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g. Water is still dripping after pipe was replaced, or faucet handle became loose again..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReopenModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={actionLoading}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Confirm Reopen Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
