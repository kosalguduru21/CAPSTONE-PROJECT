import React, { useEffect, useState } from 'react';
import { Users, Wrench, CheckCircle2, ShieldCheck, Phone, Mail, DollarSign } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { api } from '../../api/client';
import { Vendor } from '../../types';

export const VendorManagementPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const data = await api.get('/api/vendors');
        if (Array.isArray(data)) {
          setVendors(data);
        }
      } catch (err) {
        console.error('Failed to load vendors:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Approved Vendor Directory</h2>
          <p className="text-xs text-slate-400 mt-1">
            Licensed trade contractors vetted for maintenance assignments and scheduling eligibility
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading vendor directory..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((v) => (
            <Card key={v._id} className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{v.status}</span>
                  </span>
                  <span className="text-xs font-bold text-slate-200">${v.hourlyRate}/hr</span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{v.name}</h3>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5 my-3">
                  {v.skills?.map((s, i) => (
                    <span
                      key={i}
                      className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{v.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{v.phone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Capacity:</span>
                <span className="text-white font-medium">
                  {v.currentActiveJobs || 0} / {v.maxActiveJobs || 10} active jobs
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
