import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Wrench,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  User,
  Clock,
  ShieldCheck,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { api } from '../../api/client';
import { WorkOrder, Vendor, Estimate, RelatedCaseMatch } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

interface ManagerWorkOrderDetailProps {
  orderId: string;
  onBack: () => void;
  onNavigateOrder: (id: string) => void;
}

export const ManagerWorkOrderDetail: React.FC<ManagerWorkOrderDetailProps> = ({
  orderId,
  onBack,
  onNavigateOrder,
}) => {
  const { addToast } = useNotifications();
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [relatedCases, setRelatedCases] = useState<RelatedCaseMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Estimate Decision State
  const [estimateModalOpen, setEstimateModalOpen] = useState(false);
  const [estimateDecision, setEstimateDecision] = useState<'Approved' | 'Rejected' | 'Revision Requested'>('Approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);

  const fetchDetails = async () => {
    try {
      const orderData = await api.get(`/api/work-orders/${orderId}`);
      setOrder(orderData);

      const vendorsData = await api.get('/api/vendors');
      if (Array.isArray(vendorsData)) {
        setVendors(vendorsData);
      }

      // Fetch related cases via vector similarity
      try {
        const related = await api.get(`/api/work-orders/${orderId}/related-cases`);
        if (Array.isArray(related)) {
          setRelatedCases(related);
        }
      } catch (err) {
        console.warn('Related cases retrieval warning:', err);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Loading Failed',
        message: err.message || 'Unable to fetch work order.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [orderId]);

  const handleAssignVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;

    setAssignLoading(true);
    try {
      await api.post(`/api/work-orders/${orderId}/assignment`, {
        vendorId: selectedVendorId,
      });

      addToast({
        type: 'success',
        title: 'Vendor Assigned',
        message: 'Vendor has been assigned and notified to propose schedule/estimate.',
      });

      setAssignModalOpen(false);
      await fetchDetails();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Assignment Failed',
        message: err.message || 'Unable to assign vendor.',
      });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleEstimateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.activeEstimate) return;

    setDecisionLoading(true);
    try {
      await api.post(`/api/work-orders/${orderId}/estimate-decision`, {
        decision: estimateDecision,
        decisionNotes: decisionNotes.trim() || undefined,
        currentRevision: order.activeEstimate.revision,
      });

      addToast({
        type: 'success',
        title: 'Decision Recorded',
        message: `Estimate marked as ${estimateDecision}.`,
      });

      setEstimateModalOpen(false);
      await fetchDetails();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Estimate Decision Failed',
        message: err.message || 'Stale estimate version or unauthorized.',
      });
    } finally {
      setDecisionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading work order details..." />;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-400">Work order not found.</p>
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
        <span>Back to Queue</span>
      </button>

      {/* Main Header Bar */}
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
            Submitted by {order.residentId?.fullName} ({order.residentId?.email}) • Property: {order.propertyId?.name}
          </p>
        </div>

        {/* Manager Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!order.currentAssignment && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAssignModalOpen(true)}
              icon={<Wrench className="w-4 h-4" />}
            >
              Assign Approved Vendor
            </Button>
          )}

          {order.activeEstimate && order.activeEstimate.status === 'Submitted' && (
            <Button
              variant="success"
              size="sm"
              onClick={() => setEstimateModalOpen(true)}
              icon={<DollarSign className="w-4 h-4" />}
            >
              Review Estimate (${order.activeEstimate.total.toFixed(2)})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Description, Attachments, and AI Related Cases */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Resident Report Description
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              {order.description}
            </p>

            {order.accessNotes && (
              <div className="mt-4 pt-4 border-t border-slate-800 text-xs">
                <span className="font-semibold text-slate-400">Unit Access Instructions:</span>
                <p className="text-slate-300 mt-0.5">{order.accessNotes}</p>
              </div>
            )}
          </Card>

          {/* AI Semantic Related Cases Investigation Box */}
          <Card className="p-6 border-purple-500/30 bg-purple-950/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Semantic Related-Case Investigation
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    MongoDB Atlas Vector Search across same-property complaints
                  </p>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                Vector Model: qwen3-embedding:4b
              </span>
            </div>

            {relatedCases.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 text-center">
                No statistically similar maintenance complaints found within this property.
              </div>
            ) : (
              <div className="space-y-3">
                {relatedCases.map((match, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {match.workOrder?.orderNumber}
                        </span>
                        <Badge variant="status" status={match.workOrder?.status} />
                        <span className="text-[11px] text-slate-400">
                          {match.workOrder?.unitId ? `Unit ${match.workOrder.unitId.unitNumber}` : 'Shared Area'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {Math.round(match.similarityScore * 100)}% Similarity Match
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-white mb-1">
                      {match.workOrder?.title}
                    </h4>
                    <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                      {match.workOrder?.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                      <span className="text-slate-400 italic">
                        Notice: AI suggests potential correlation (e.g. shared piping); human manager verification required.
                      </span>
                      <button
                        onClick={() => onNavigateOrder(match.workOrder?._id)}
                        className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 shrink-0 ml-2"
                      >
                        <span>Investigate</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Completion Evidence if present */}
          {(order.completionNotes || (order.completionEvidence && order.completionEvidence.length > 0)) && (
            <Card className="p-6 border-emerald-500/30 bg-emerald-950/10">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                <ShieldCheck className="w-4 h-4" />
                <span>Vendor Completion Review</span>
              </div>
              {order.completionNotes && (
                <div className="text-xs text-slate-200 bg-slate-900/90 p-4 rounded-xl border border-slate-800 mb-3">
                  <span className="font-semibold block text-slate-400 mb-1">Technician Notes:</span>
                  {order.completionNotes}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Column: Coordination, Estimate, Preferred Windows */}
        <div className="space-y-6">
          {/* Active Estimate Line Items */}
          {order.activeEstimate && (
            <Card className="p-5 space-y-4 border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <DollarSign className="w-4 h-4" />
                  <span>Itemized Estimate</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Rev #{order.activeEstimate.revision}
                </span>
              </div>

              <div className="divide-y divide-slate-800/80 text-xs">
                {order.activeEstimate.lineItems?.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-medium">{item.description}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.category} • {item.quantity} × ${item.unitPrice}
                      </div>
                    </div>
                    <span className="font-semibold text-slate-100">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>${order.activeEstimate.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax:</span>
                  <span>${order.activeEstimate.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Quote:</span>
                  <span className="text-emerald-400">${order.activeEstimate.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Decision Status:</span>
                <span className="font-semibold text-emerald-300">{order.activeEstimate.status}</span>
              </div>
            </Card>
          )}

          {/* Preferred Access Windows */}
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

          {/* Vendor Assignment Status */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Wrench className="w-4 h-4 text-blue-400" />
              <span>Assigned Vendor</span>
            </div>
            {order.currentAssignment ? (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="font-bold text-white">QuickFlow Plumbing Service</div>
                <div className="text-[11px] text-slate-400">License #PLM-2024-998</div>
                <div className="text-emerald-400 text-[11px] font-medium">Assignment Active</div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                No vendor currently assigned.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Assign Vendor Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Approved Vendor"
        subtitle="Select an approved contractor with verified trade skills for this property"
      >
        <form onSubmit={handleAssignVendor} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Vendor</label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Choose Approved Vendor --</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name} ({v.skills.join(', ')}) • Rate: ${v.hourlyRate}/hr
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAssignModalOpen(false)}
              disabled={assignLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={assignLoading}
              icon={<Wrench className="w-4 h-4" />}
            >
              Assign Vendor
            </Button>
          </div>
        </form>
      </Modal>

      {/* Estimate Decision Modal */}
      <Modal
        isOpen={estimateModalOpen}
        onClose={() => setEstimateModalOpen(false)}
        title="Review & Authorize Estimate"
        subtitle="Spending threshold rules: Estimates under $500 can be approved directly by property manager"
      >
        <form onSubmit={handleEstimateDecision} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Decision</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Approved', 'Rejected', 'Revision Requested'] as const).map((dec) => (
                <button
                  type="button"
                  key={dec}
                  onClick={() => setEstimateDecision(dec)}
                  className={`p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    estimateDecision === dec
                      ? dec === 'Approved'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : dec === 'Rejected'
                        ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                        : 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {dec}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Decision Notes</label>
            <textarea
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="e.g. Labor hours approved within standard emergency threshold..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEstimateModalOpen(false)}
              disabled={decisionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={estimateDecision === 'Approved' ? 'success' : 'danger'}
              loading={decisionLoading}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Record Decision
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
