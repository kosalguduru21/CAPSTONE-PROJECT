import React, { useEffect, useState } from 'react';
import { PhoneCall, ShieldAlert, Clock, Building, AlertOctagon } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { api } from '../../api/client';
import { CommunityInfo } from '../../types';

export const EmergencyContactsPage: React.FC = () => {
  const [info, setInfo] = useState<CommunityInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const data = await api.get('/api/community-info');
        setInfo(data);
      } catch (err) {
        console.error('Failed to load community info:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  return (
    <div className="space-y-6">
      {/* High-visibility Emergency Disclaimer Banner */}
      <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-rose-200">Life-Safety or Severe Structural Emergency?</h3>
          <p className="text-xs text-rose-300 mt-1 leading-relaxed">
            For fires, gas leaks, structural collapse, or active burst pipes causing rapid flooding, <strong>call 911</strong> immediately, then contact our 24/7 on-call emergency dispatch below. <strong>Do not wait for AI chat triage or non-emergency ticket review.</strong>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Emergency Contacts & Office Directory</h2>
          <p className="text-xs text-slate-400 mt-1">Direct contact numbers for property staff and emergency contractors</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading directory..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Emergency Dispatch Lines */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">24/7 On-Call Emergency Services</h3>
            </div>

            <div className="space-y-3">
              {(info?.emergencyContacts || [
                { name: 'Grand Heights 24/7 Emergency Dispatch', phone: '(555) 911-3000', serviceType: 'Property On-Call' },
                { name: 'Emergency Plumbing Response (QuickFlow)', phone: '(555) 300-4001', serviceType: 'Plumbing' },
                { name: 'Emergency Electrician (VoltMaster)', phone: '(555) 300-4002', serviceType: 'Electrical' },
              ]).map((c, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{c.name}</div>
                    <div className="text-[11px] text-slate-400">{c.serviceType}</div>
                  </div>
                  <a
                    href={`tel:${c.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{c.phone}</span>
                  </a>
                </div>
              ))}
            </div>
          </Card>

          {/* Management Office Hours & General Contact */}
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Leasing & Operations Office</h3>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-slate-200">Regular Operating Hours:</span>
                  </div>
                  <p className="pl-6 text-slate-300">{info?.officeHours || 'Monday – Friday: 8:00 AM – 6:00 PM | Saturday: 10:00 AM – 4:00 PM'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <PhoneCall className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-slate-200">General Inquiries & Non-Urgent:</span>
                  </div>
                  <p className="pl-6 text-slate-300">{info?.generalInquiries || 'management@grandheights.com • (555) 234-5678'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              Assigned Property: {info?.propertyName || 'Grand Heights Apartments & Oakwood Terrace'}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
