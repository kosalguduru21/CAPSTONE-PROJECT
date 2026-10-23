import React, { useEffect, useState } from 'react';
import { ClipboardList, Search, Filter, ArrowRight, User, Building } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { api } from '../../api/client';
import { WorkOrder } from '../../types';

interface ManagerWorkOrdersPageProps {
  onNavigateOrder: (orderId: string) => void;
}

export const ManagerWorkOrdersPage: React.FC<ManagerWorkOrdersPageProps> = ({ onNavigateOrder }) => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.get('/api/work-orders');
        if (Array.isArray(data)) {
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to load manager work orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && o.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && o.priority !== priorityFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(term) ||
        o.title.toLowerCase().includes(term) ||
        o.description.toLowerCase().includes(term) ||
        o.category.toLowerCase().includes(term) ||
        (o.residentId?.fullName && o.residentId.fullName.toLowerCase().includes(term)) ||
        (o.unitId?.unitNumber && o.unitId.unitNumber.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Work Orders Queue</h2>
          <p className="text-xs text-slate-400 mt-1">
            Review, prioritize, assign vendors, and track repairs across authorized properties
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order #, title, unit, or resident name..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Under Review">Under Review</option>
          <option value="Assigned">Assigned</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In Progress">In Progress</option>
          <option value="Work Completed — Awaiting Review">Work Completed</option>
          <option value="Resolved">Resolved</option>
          <option value="Reopened">Reopened</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="plumbing">Plumbing</option>
          <option value="electrical">Electrical</option>
          <option value="hvac">HVAC</option>
          <option value="appliances">Appliances</option>
          <option value="fixtures">Fixtures</option>
          <option value="structural">Structural</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Priorities</option>
          <option value="Emergency">Emergency</option>
          <option value="High">High</option>
          <option value="Normal">Normal</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading work orders queue..." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No Work Orders Found"
          description="There are no work orders matching your current search or filter criteria."
          icon={ClipboardList}
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
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    {order.unitId ? `Unit ${order.unitId.unitNumber}` : 'Shared Area'}
                  </span>
                  {order.residentId?.fullName && (
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      • {order.residentId.fullName}
                    </span>
                  )}
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
