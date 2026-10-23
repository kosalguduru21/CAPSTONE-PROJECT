import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarCheck,
  Search,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MetricCard } from '../../components/common/MetricCard';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { api } from '../../api/client';
import { WorkOrder } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ManagerDashboardProps {
  onNavigateOrders: () => void;
  onNavigateOrder: (id: string) => void;
  onNavigateRelated: () => void;
  onNavigateScheduling: () => void;
  onNavigateDocuments: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  onNavigateOrders,
  onNavigateOrder,
  onNavigateRelated,
  onNavigateScheduling,
  onNavigateDocuments,
}) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.get('/api/work-orders');
        if (Array.isArray(data)) {
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to load manager dashboard work orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const openOrders = orders.filter((o) => !['Resolved', 'Cancelled', 'Rejected'].includes(o.status));
  const newAwaiting = orders.filter((o) => ['Submitted', 'Under Review'].includes(o.status));
  const highPriority = orders.filter((o) => ['High', 'Emergency'].includes(o.priority) && !['Resolved', 'Cancelled'].includes(o.status));
  const inProgress = orders.filter((o) => ['In Progress', 'Assigned', 'Scheduled'].includes(o.status));
  const awaitingReview = orders.filter((o) => o.status === 'Work Completed — Awaiting Review');
  const resolved = orders.filter((o) => o.status === 'Resolved');

  return (
    <div className="space-y-6">
      {/* Property Scope Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/40 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Operations Center
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
              Authorized Scope: Grand Heights & Oakwood
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">Operations Dashboard</h2>
          <p className="text-xs text-slate-300 mt-1">
            Managed by {user?.fullName || 'Property Manager'} • Real-time maintenance coordination
          </p>
        </div>

        {/* Quick AI Operations Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={onNavigateScheduling}
            variant="primary"
            size="sm"
            icon={<CalendarCheck className="w-4 h-4 text-cyan-300" />}
          >
            Run Scheduling Agent
          </Button>
          <Button
            onClick={onNavigateRelated}
            variant="secondary"
            size="sm"
            icon={<Search className="w-4 h-4 text-purple-400" />}
          >
            Related Case Search
          </Button>
        </div>
      </div>

      {/* Operational Metrics (Derived strictly from live database) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Open Work Orders"
          value={openOrders.length}
          subtitle="Active property cases"
          icon={<ClipboardList className="w-5 h-5 text-blue-400" />}
          color="blue"
        />
        <MetricCard
          title="Awaiting Triage"
          value={newAwaiting.length}
          subtitle="New requests to review"
          icon={<Clock className="w-5 h-5 text-purple-400" />}
          color="purple"
        />
        <MetricCard
          title="High / Emergency"
          value={highPriority.length}
          subtitle="Requires expedited action"
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
          color="rose"
        />
        <MetricCard
          title="Work In Progress"
          value={inProgress.length}
          subtitle="Dispatched to technicians"
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
          color="amber"
        />
      </div>

      {/* Second row metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Awaiting Resident Sign-off"
          value={awaitingReview.length}
          subtitle="Vendor submitted completion evidence"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          color="emerald"
        />
        <MetricCard
          title="Resolved Successfully"
          value={resolved.length}
          subtitle="Closed maintenance tickets"
          icon={<CheckCircle2 className="w-5 h-5 text-cyan-400" />}
          color="cyan"
        />
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Document Retrieval Index
            </span>
            <FolderOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">Atlas Vector Search</div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Model: qwen3-embedding:4b</span>
            <button
              onClick={onNavigateDocuments}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              Manage &rarr;
            </button>
          </div>
        </Card>
      </div>

      {/* Triage Work Orders Queue */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Priority Triage & Recent Work Orders</h3>
            <p className="text-xs text-slate-400">
              Incoming resident complaints awaiting assignment, estimates, or scheduling
            </p>
          </div>
          <Button onClick={onNavigateOrders} variant="secondary" size="sm">
            View All Orders &rarr;
          </Button>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading work orders queue..." />
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No work orders currently recorded in authorized property scope.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {orders.slice(0, 6).map((order) => (
              <div
                key={order._id}
                onClick={() => onNavigateOrder(order._id)}
                className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-850/50 -mx-4 px-4 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">
                      {order.orderNumber}
                    </span>
                    <Badge variant="status" status={order.status} />
                    <Badge variant="priority" priority={order.priority} />
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {order.unitId ? `Unit ${order.unitId.unitNumber}` : 'Shared Area'}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
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
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
