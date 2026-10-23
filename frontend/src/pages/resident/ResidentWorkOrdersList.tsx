import React, { useEffect, useState } from 'react';
import { ClipboardList, PlusCircle, Search, Filter, ArrowRight } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { api } from '../../api/client';
import { WorkOrder, WorkOrderStatus } from '../../types';

interface ResidentWorkOrdersListProps {
  onNavigateCreate: () => void;
  onNavigateOrder: (orderId: string) => void;
  historyOnly?: boolean;
}

export const ResidentWorkOrdersList: React.FC<ResidentWorkOrdersListProps> = ({
  onNavigateCreate,
  onNavigateOrder,
  historyOnly = false,
}) => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.get('/api/work-orders');
        if (Array.isArray(data)) {
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (historyOnly && !['Resolved', 'Cancelled', 'Rejected'].includes(o.status)) {
      return false;
    }
    if (!historyOnly && ['Resolved', 'Cancelled'].includes(o.status) && statusFilter === 'active') {
      return false;
    }
    if (statusFilter !== 'all' && statusFilter !== 'active' && o.status !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(term) ||
        o.title.toLowerCase().includes(term) ||
        o.description.toLowerCase().includes(term) ||
        o.category.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {historyOnly ? 'Maintenance History' : 'My Work Orders'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {historyOnly
              ? 'Completed and resolved tickets for your unit'
              : 'Track active maintenance tickets, estimates, and technician visits'}
          </p>
        </div>
        {!historyOnly && (
          <Button
            onClick={onNavigateCreate}
            icon={<PlusCircle className="w-4 h-4" />}
            size="sm"
          >
            New Request
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ticket #, description, or category..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {!historyOnly && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Assigned">Assigned</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Work Completed — Awaiting Review">Work Completed</option>
            <option value="Resolved">Resolved</option>
          </select>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading work orders..." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title={historyOnly ? 'No Maintenance History' : 'No Work Orders Found'}
          description={
            historyOnly
              ? 'No resolved or archived requests found for your unit.'
              : 'You have no tickets matching your search or filter.'
          }
          icon={ClipboardList}
          actionText={!historyOnly ? 'Report an Issue' : undefined}
          onAction={!historyOnly ? onNavigateCreate : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card
              key={order._id}
              onClick={() => onNavigateOrder(order._id)}
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
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
