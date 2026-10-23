import React, { useEffect, useState } from 'react';
import { ClipboardList, Search, ArrowRight, Wrench } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { api } from '../../api/client';
import { WorkOrder } from '../../types';

interface VendorAssignmentsPageProps {
  onNavigateAssignment: (id: string) => void;
}

export const VendorAssignmentsPage: React.FC<VendorAssignmentsPageProps> = ({
  onNavigateAssignment,
}) => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.get('/api/work-orders');
        if (Array.isArray(data)) {
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to load vendor orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filtered = orders.filter((o) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(term) ||
        o.title.toLowerCase().includes(term) ||
        o.description.toLowerCase().includes(term) ||
        (o.unitId?.unitNumber && o.unitId.unitNumber.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Assigned Work Orders</h2>
          <p className="text-xs text-slate-400 mt-1">
            Jobs assigned to your organization. Complete estimates, execute repairs, and submit evidence.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by order #, title, or unit number..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {loading ? (
        <LoadingSpinner message="Loading assigned jobs..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Assigned Jobs Found"
          description="You do not have any active or matching jobs assigned."
          icon={Wrench}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Card
              key={order._id}
              onClick={() => onNavigateAssignment(order._id)}
              hoverable
              className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
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
                <h4 className="text-sm font-semibold text-white">{order.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-1 max-w-xl">
                  {order.description}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-center">
                <div className="text-right text-slate-400">
                  <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                  <div className="text-[10px] text-slate-500 uppercase">{order.category}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
