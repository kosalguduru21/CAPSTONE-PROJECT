import React, { useEffect, useState } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MetricCard } from '../../components/common/MetricCard';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { api } from '../../api/client';
import { WorkOrder } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ResidentDashboardProps {
  onNavigateCreate: () => void;
  onNavigateOrder: (orderId: string) => void;
  onNavigateAllOrders: () => void;
  onOpenChat: () => void;
}

export const ResidentDashboard: React.FC<ResidentDashboardProps> = ({
  onNavigateCreate,
  onNavigateOrder,
  onNavigateAllOrders,
  onOpenChat,
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
        console.error('Failed to load resident work orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const openOrders = orders.filter((o) => !['Resolved', 'Cancelled', 'Rejected'].includes(o.status));
  const inProgress = orders.filter((o) => ['In Progress', 'Assigned', 'Scheduled'].includes(o.status));
  const awaitingReview = orders.filter((o) => o.status === 'Work Completed — Awaiting Review');
  const resolvedOrders = orders.filter((o) => o.status === 'Resolved');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/20 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Resident Portal</span>
          <h2 className="text-2xl font-bold text-white mt-1">Welcome back, {user?.fullName || 'Resident'}</h2>
          <p className="text-xs text-slate-300 mt-1">
            Unit 101 • Grand Heights Apartments • Building A
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={onNavigateCreate}
            icon={<PlusCircle className="w-4 h-4" />}
            size="md"
          >
            Report an Issue
          </Button>
          <Button
            variant="secondary"
            onClick={onOpenChat}
            icon={<Sparkles className="w-4 h-4 text-purple-400" />}
            size="md"
          >
            Ask AI
          </Button>
        </div>
      </div>

      {/* Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Requests"
          value={openOrders.length}
          subtitle="Currently open or scheduled"
          icon={<ClipboardList className="w-5 h-5 text-blue-400" />}
          color="blue"
        />
        <MetricCard
          title="In Progress / Scheduled"
          value={inProgress.length}
          subtitle="Technicians dispatched"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          color="amber"
        />
        <MetricCard
          title="Awaiting Your Review"
          value={awaitingReview.length}
          subtitle="Work complete; sign-off needed"
          icon={<AlertCircle className="w-5 h-5 text-emerald-400" />}
          color="emerald"
        />
        <MetricCard
          title="Resolved Lifetime"
          value={resolvedOrders.length}
          subtitle="Successfully closed tickets"
          icon={<CheckCircle2 className="w-5 h-5 text-purple-400" />}
          color="purple"
        />
      </div>

      {/* Recent Work Orders List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Recent Maintenance Requests</h3>
            <p className="text-xs text-slate-400">Track progress, technician visits, and estimate approvals</p>
          </div>
          {orders.length > 0 && (
            <button
              onClick={onNavigateAllOrders}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>View All ({orders.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner message="Loading your maintenance requests..." />
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            You currently have no maintenance requests. Click "Report an Issue" to submit your first request.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {orders.slice(0, 5).map((order) => (
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
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {order.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-1 max-w-xl">
                    {order.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
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
