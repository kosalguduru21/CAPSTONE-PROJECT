import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Wrench,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Upload,
  Plus,
  Trash2,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { api } from '../../api/client';
import { WorkOrder, EstimateLineItem } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

interface VendorAssignmentDetailProps {
  orderId: string;
  onBack: () => void;
}

export const VendorAssignmentDetail: React.FC<VendorAssignmentDetailProps> = ({
  orderId,
  onBack,
}) => {
  const { addToast } = useNotifications();
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Complete work modal state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [completeLoading, setCompleteLoading] = useState(false);

  // Create Estimate modal state
  const [estimateModalOpen, setEstimateModalOpen] = useState(false);
  const [estimateLines, setEstimateLines] = useState<EstimateLineItem[]>([
    { description: 'Initial diagnostic & labor', category: 'Labor', quantity: 2, unitPrice: 85, total: 170 },
  ]);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await api.get(`/api/work-orders/${orderId}`);
      setOrder(data);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Loading Failed',
        message: err.message || 'Unable to load assignment details.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleStartWork = async () => {
    try {
      await api.patch(`/api/work-orders/${orderId}/status`, {
        status: 'In Progress',
      });
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: 'Work order marked as In Progress. Resident notified.',
      });
      await fetchOrder();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Unable to update status.',
      });
    }
  };

  const handleCompleteWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionNotes.trim()) {
      addToast({
        type: 'warning',
        title: 'Validation',
        message: 'Please provide completion notes describing work performed.',
      });
      return;
    }

    setCompleteLoading(true);
    try {
      const formData = new FormData();
      formData.append('completionNotes', completionNotes.trim());
      formData.append('status', 'Work Completed — Awaiting Review');

      evidenceFiles.forEach((file) => {
        formData.append('completionEvidence', file);
      });

      await api.upload(`/api/work-orders/${orderId}/complete`, formData);

      addToast({
        type: 'success',
        title: 'Completion Submitted',
        message: 'Completion notes and evidence uploaded. Awaiting resident review.',
      });

      setCompleteModalOpen(false);
      await fetchOrder();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Unable to submit completion review.',
      });
    } finally {
      setCompleteLoading(false);
    }
  };

  const handleAddEstimateLine = () => {
    setEstimateLines((prev) => [
      ...prev,
      { description: 'Replacement part / seal', category: 'Material', quantity: 1, unitPrice: 45, total: 45 },
    ]);
  };

  const handleRemoveEstimateLine = (idx: number) => {
    setEstimateLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateEstimateLine = (idx: number, field: keyof EstimateLineItem, val: any) => {
    setEstimateLines((prev) =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        const updated = { ...line, [field]: val };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
        }
        return updated;
      })
    );
  };

  const handleSubmitEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstimateLoading(true);
    try {
      await api.post('/api/estimates', {
        workOrderId: orderId,
        lineItems: estimateLines,
      });

      addToast({
        type: 'success',
        title: 'Estimate Submitted',
        message: 'Itemized estimate submitted to property manager for review.',
      });

      setEstimateModalOpen(false);
      await fetchOrder();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Error',
        message: err.message || 'Unable to submit estimate.',
      });
    } finally {
      setEstimateLoading(false);
    }
  };

  const subtotal = estimateLines.reduce((acc, curr) => acc + curr.total, 0);
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;

  if (loading) {
    return <LoadingSpinner message="Loading assignment..." />;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-400">Assignment not found or access expired.</p>
        <Button onClick={onBack} size="sm" className="mt-4">
          Return
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Assigned Jobs</span>
      </button>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm font-bold text-blue-400">{order.orderNumber}</span>
            <Badge variant="status" status={order.status} />
            <Badge variant="priority" priority={order.priority} />
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {order.unitId ? `Unit ${order.unitId.unitNumber}` : 'Shared Area'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{order.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Resident: {order.residentId?.fullName} • Property: {order.propertyId?.name}
          </p>
        </div>

        {/* Action Controls for Technician */}
        <div className="flex flex-wrap items-center gap-2">
          {!order.activeEstimate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEstimateModalOpen(true)}
              icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
            >
              Submit Estimate
            </Button>
          )}

          {order.status !== 'In Progress' && order.status !== 'Work Completed — Awaiting Review' && order.status !== 'Resolved' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartWork}
              icon={<Wrench className="w-4 h-4" />}
            >
              Start Work (In Progress)
            </Button>
          )}

          {order.status !== 'Work Completed — Awaiting Review' && order.status !== 'Resolved' && (
            <Button
              variant="success"
              size="sm"
              onClick={() => setCompleteModalOpen(true)}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Complete Work & Upload Evidence
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Job Description & Problem Details
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800 mb-4">
              {order.description}
            </p>

            {order.accessNotes && (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200">
                <span className="font-semibold block mb-0.5">Unit Access & Pet Notice:</span>
                {order.accessNotes}
              </div>
            )}
          </Card>

          {/* Completion Notes display if finished */}
          {order.completionNotes && (
            <Card className="p-6 border-emerald-500/30 bg-emerald-950/10">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Submitted Completion Record</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                {order.completionNotes}
              </p>
            </Card>
          )}
        </div>

        {/* Right Column: Windows & Estimate Status */}
        <div className="space-y-6">
          {/* Preferred Windows */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Resident Access Windows</span>
            </div>
            <div className="space-y-2">
              {order.preferredAccessWindows?.map((w, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between"
                >
                  <span className="text-slate-200 font-medium">{w.date}</span>
                  <span className="text-slate-400">{w.timeSlot}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Active Estimate status */}
          {order.activeEstimate && (
            <Card className="p-5 space-y-3 border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <DollarSign className="w-4 h-4" />
                  <span>Submitted Estimate</span>
                </div>
                <span className="text-xs font-bold text-white">
                  ${order.activeEstimate.total.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Decision: <span className="text-emerald-300 font-semibold">{order.activeEstimate.status}</span>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Complete Work Modal */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Submit Work Completion & Evidence"
        subtitle="Document repairs performed and attach completion photos for resident and manager review"
      >
        <form onSubmit={handleCompleteWork} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Performed Notes</label>
            <textarea
              required
              rows={4}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="e.g. Cut drywall, replaced leaking PVC drain coupling, pressure tested joint, cleaned work area..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Upload Completion Photos / Documentation
            </label>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.txt"
              onChange={(e) => {
                if (e.target.files) {
                  setEvidenceFiles(Array.from(e.target.files));
                }
              }}
              className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCompleteModalOpen(false)}
              disabled={completeLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              loading={completeLoading}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Submit Completion Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Itemized Estimate Builder Modal */}
      <Modal
        isOpen={estimateModalOpen}
        onClose={() => setEstimateModalOpen(false)}
        title="Submit Itemized Cost Estimate"
        subtitle="Deterministic pricing: server automatically calculates subtotal, taxes, and final total"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitEstimate} className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Line Items
              </span>
              <button
                type="button"
                onClick={handleAddEstimateLine}
                className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {estimateLines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                >
                  <input
                    type="text"
                    required
                    value={line.description}
                    onChange={(e) => handleUpdateEstimateLine(idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none"
                  />
                  <select
                    value={line.category}
                    onChange={(e) => handleUpdateEstimateLine(idx, 'category', e.target.value)}
                    className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                  >
                    <option value="Labor">Labor</option>
                    <option value="Material">Material</option>
                    <option value="Permit">Permit</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => handleUpdateEstimateLine(idx, 'quantity', Number(e.target.value))}
                    className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => handleUpdateEstimateLine(idx, 'unitPrice', Number(e.target.value))}
                    className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    placeholder="Price"
                  />
                  <span className="w-16 font-semibold text-right text-slate-200">
                    ${line.total.toFixed(2)}
                  </span>
                  {estimateLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEstimateLine(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Calculations Box */}
            <div className="pt-3 border-t border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax (8.25%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-1">
                <span>Calculated Total:</span>
                <span className="text-emerald-400">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEstimateModalOpen(false)}
              disabled={estimateLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              loading={estimateLoading}
              icon={<DollarSign className="w-4 h-4" />}
            >
              Submit Itemized Estimate
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
