import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  History,
  FileText,
  PhoneCall,
  Search,
  CalendarCheck,
  Users,
  FolderOpen,
  Activity,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen = false,
  onClose,
}) => {
  const { user } = useAuth();
  const role = user?.role;

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
}

  const residentNav: NavItem[] = [
    { id: 'resident-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'resident-create', label: 'New Request', icon: PlusCircle },
    { id: 'resident-orders', label: 'My Work Orders', icon: ClipboardList },
    { id: 'resident-history', label: 'Maintenance History', icon: History },
    { id: 'public-notices', label: 'Community Notices', icon: FileText },
    { id: 'public-emergency', label: 'Emergency Contacts', icon: PhoneCall },
  ];

  const managerNav: NavItem[] = [
    { id: 'manager-dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { id: 'manager-orders', label: 'Work Orders Queue', icon: ClipboardList },
    { id: 'manager-related', label: 'Related Case Discovery', icon: Search, badge: 'Vector' },
    { id: 'manager-scheduling', label: 'AI Scheduling Agent', icon: CalendarCheck, badge: 'Agent' },
    { id: 'manager-vendors', label: 'Vendors & Technicians', icon: Users },
    { id: 'manager-documents', label: 'Document & Policy RAG', icon: FolderOpen },
    { id: 'manager-audit', label: 'Audit Trail', icon: Activity },
    { id: 'public-notices', label: 'Notices & Bulletin', icon: FileText },
    { id: 'public-emergency', label: 'Emergency Contacts', icon: PhoneCall },
  ];

  const vendorNav: NavItem[] = [
    { id: 'vendor-dashboard', label: 'Technician Dashboard', icon: LayoutDashboard },
    { id: 'vendor-assignments', label: 'Assigned Work Orders', icon: ClipboardList },
    { id: 'vendor-schedule', label: 'My Schedule', icon: Calendar },
    { id: 'vendor-documents', label: 'Repair Documents', icon: FolderOpen },
    { id: 'public-emergency', label: 'Emergency Contacts', icon: PhoneCall },
  ];

  const navItems = role === 'property_manager'
    ? managerNav
    : role === 'vendor_technician'
    ? vendorNav
    : residentNav;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl p-4 transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-6">
            <div className="px-3">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
                Navigation
              </span>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      if (onClose) onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User scope preview box */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2 mb-1.5">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">Authorized Scope</span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2">
              {role === 'property_manager'
                ? 'Managing: Grand Heights Apartments & Oakwood Terrace'
                : role === 'vendor_technician'
                ? 'Vendor: QuickFlow Plumbing (Licensed Service)'
                : 'Resident: Unit 101, Grand Heights Building A'}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
