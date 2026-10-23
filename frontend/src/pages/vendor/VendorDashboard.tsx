import React, { useEffect, useState } from 'react';
import { Wrench, Clock, CheckCircle2, AlertTriangle, ArrowRight, ClipboardList, Calendar } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { MetricCard } from '../../components/common/MetricCard';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { api } from '../../api/client';
import { WorkOrder } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface VendorDashboardProps {
  onNavigateAssignment: (id: string) => void;
  onNavigateAll: () => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  onNavigateAssignment,
  onNavigateAll,
}) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        const data = await api.get('/api/work-orders');
        if (Array.isArray(data)) {
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to load vendor work orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssigned();
  }, []);

  const activeJobs = orders.filter((o) => ['Assigned', 'Scheduled', 'In Progress'].includes(o.status));
  const awaitingReview = orders.filter((o) => o.status === 'Work Completed — Awaiting Review');
  const completed = orders.filter((o) => o.status === 'Resolved');

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-indigo-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Technician Dispatch Portal
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Welcome, {user?.fullName || 'Technician'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Organization: QuickFlow Plumbing Service • Trade: Plumbing & Pipe Repairs
          </p>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <strong>Privacy Safeguard:</strong> Access restricted exclusively to active assigned work orders.
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Active Dispatched Jobs"
          value={activeJobs.length}
          subtitle="Assigned or in progress"
          icon={<Wrench className="w-5 h-5 text-amber-400" />}
          color="amber"
        />
        <MetricCard
          title="Awaiting Resident Sign-off"
          value={awaitingReview.length}
          subtitle="Completion evidence submitted"
          icon={<Clock className="w-5 h-5 text-blue-400" />}
          color="blue"
        />
        <MetricCard
          title="Completed Lifetime"
          value={completed.length}
          subtitle="Resolved work orders"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          color="emerald"
        />
      </div>

      {/* Active Assigned Jobs */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">My Active Assignments</h3>
            <p className="text-xs text-slate-400">
              Update status, record repair notes, propose visits, and upload completion photos
            </p>
          </div>
          {orders.length > 0 && (
            <button
              onClick={onNavigateAll}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>View All ({orders.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner message="Loading your assigned jobs..." />
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No active jobs assigned to your technician account.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {orders.map((order) => (
              <div
                key={order._id}
                onClick={() => onNavigateAssignment(order._id)}
                className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-850/50 -mx-4 px-4 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">
                      {order.orderNumber}
                    </span>
                    <Badge variant="status" status={order.status} />
                    <Badge variant="priority" priority={order.priority} />
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {order.unitId ? `Unit ${order.unitId.unitNumber}` : 'Shared Area'}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                    {order.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-1 max-w-xl">
                    {order.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div className="text-xs text-slate-400">
                    <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{order.category}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
