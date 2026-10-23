import React, { useEffect, useState } from 'react';
import { Search, Sparkles, Building, ArrowRight, CheckCircle2, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { api } from '../../api/client';
import { WorkOrder, RelatedCaseMatch } from '../../types';
import { useNotifications } from '../../context/NotificationContext';

interface RelatedCasesPageProps {
  onNavigateOrder: (orderId: string) => void;
}

export const RelatedCasesPage: React.FC<RelatedCasesPageProps> = ({ onNavigateOrder }) => {
  const { addToast } = useNotifications();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [matches, setMatches] = useState<RelatedCaseMatch[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.get('/api/work-orders');
        if (Array.isArray(data)) {
          setOrders(data);
          if (data.length > 0) {
            setSelectedOrderId(data[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load orders for related search:', err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, []);

  const runInvestigation = async (orderId: string) => {
    if (!orderId) return;
    setSearching(true);
    try {
      const data = await api.get(`/api/work-orders/${orderId}/related-cases`);
      if (Array.isArray(data)) {
        setMatches(data);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Investigation Error',
        message: err.message || 'Unable to query vector similarity index.',
      });
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      runInvestigation(selectedOrderId);
    }
  }, [selectedOrderId]);

  const selectedOrder = orders.find((o) => o._id === selectedOrderId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-blue-950/50 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Atlas Vector Search
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
              Embedding Dimension: 2560 (qwen3-embedding:4b)
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">Semantic Related-Case Discovery</h2>
          <p className="text-xs text-slate-300 mt-1">
            Detect cross-unit root causes (e.g. upper floor leaks vs ceiling drips) strictly isolated to the property
          </p>
        </div>

        <Button
          onClick={() => runInvestigation(selectedOrderId)}
          loading={searching}
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="w-4 h-4 text-purple-400" />}
        >
          Re-query Vector Index
        </Button>
      </div>

      {loadingOrders ? (
        <LoadingSpinner message="Loading property work orders..." />
      ) : orders.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400">No work orders available.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Target Work Order Selector */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Select Anchor Complaint (1/{orders.length})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {orders.map((o) => {
                const isSelected = o._id === selectedOrderId;
                return (
                  <div
                    key={o._id}
                    onClick={() => setSelectedOrderId(o._id)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-950/20'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-blue-400">{o.orderNumber}</span>
                      <span className="text-[10px] text-slate-400">
                        {o.unitId ? `Unit ${o.unitId.unitNumber}` : 'Shared Area'}
                      </span>
                    </div>
                    <div className="font-semibold text-white truncate">{o.title}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{o.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side-by-Side Comparison & Semantic Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Anchor Card */}
            {selectedOrder && (
              <Card className="p-5 border-blue-500/30 bg-blue-950/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    Anchor Complaint Details
                  </span>
                  <Badge variant="status" status={selectedOrder.status} />
                </div>
                <h4 className="text-base font-bold text-white mb-1.5">{selectedOrder.title}</h4>
                <p className="text-xs text-slate-200 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 mb-2">
                  {selectedOrder.description}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                  <span>Unit: {selectedOrder.unitId ? selectedOrder.unitId.unitNumber : 'Shared'}</span>
                  <span>Category: {selectedOrder.category}</span>
                  <span>Created: {new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                </div>
              </Card>
            )}

            {/* Vector Similarity Results */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Potentially Related Work Orders in Same Property ({matches.length})
                </h3>
                {searching && <span className="text-xs text-purple-400 animate-pulse">Computing cosine distance...</span>}
              </div>

              {matches.length === 0 ? (
                <Card className="p-8 text-center text-xs text-slate-400">
                  No other complaints exceed the similarity threshold (&ge;0.65) within this property.
                </Card>
              ) : (
                <div className="space-y-4">
                  {matches.map((m, idx) => (
                    <Card
                      key={idx}
                      className="p-5 border-purple-500/30 hover:border-purple-400/50 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-400">
                            {m.workOrder?.orderNumber}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {m.workOrder?.unitId ? `Unit ${m.workOrder.unitId.unitNumber}` : 'Shared Area'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {Math.round(m.similarityScore * 100)}% Semantic Match
                          </span>
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-white">{m.workOrder?.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        {m.workOrder?.description}
                      </p>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <div className="text-[11px] text-slate-400">
                          Status: <span className="text-slate-200 font-medium">{m.workOrder?.status}</span>
                        </div>
                        <button
                          onClick={() => onNavigateOrder(m.workOrder?._id)}
                          className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                        >
                          <span>Open Ticket</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
