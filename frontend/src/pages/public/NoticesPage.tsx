import React, { useEffect, useState } from 'react';
import { FileText, Calendar, Bell, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { api } from '../../api/client';
import { Notice } from '../../types';

export const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const data = await api.get('/api/notices');
        if (Array.isArray(data)) {
          setNotices(data);
        }
      } catch (err) {
        console.error('Failed to load notices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Community Notices & Bulletins</h2>
          <p className="text-xs text-slate-400 mt-1">
            Official property maintenance announcements and scheduled operational notices
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading community notices..." />
      ) : notices.length === 0 ? (
        <EmptyState
          title="No Active Notices"
          description="There are currently no maintenance notices or community bulletins published."
          icon={Bell}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map((n) => (
            <Card key={n._id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {n.category || 'General'}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(n.effectiveDate || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{n.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{n.content}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Management Office Broadcast</span>
                <span className="text-emerald-400 font-medium">Public Access</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
