import React, { useState } from 'react';
import {
  Wrench,
  Bell,
  Sparkles,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { useAuth, DEMO_CREDENTIALS } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserRole } from '../../types';

interface NavbarProps {
  onOpenChat: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenChat, onToggleSidebar }) => {
  const { user, logout, switchDemoAccount } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSwitchAccount = async (role: UserRole) => {
    setSwitching(true);
    setShowDemoMenu(false);
    try {
      await switchDemoAccount(role);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'property_manager':
        return 'Property Manager';
      case 'vendor_technician':
        return 'Vendor Technician';
      case 'resident':
        return 'Resident';
      default:
        return 'Guest';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand & Left items */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight hidden sm:inline-block">
                Apartment Maintenance
              </span>
              <span className="text-xs px-2 py-0.5 ml-2 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                AI Ops
              </span>
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* AI Grounded Assistant Button */}
          <button
            onClick={onOpenChat}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-purple-200 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-600/40 transition-all shadow-md shadow-purple-900/20 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-purple-400 animate-spin-slow" />
            <span className="hidden sm:inline">Ask Maintenance AI</span>
            <span className="sm:hidden">AI Assistant</span>
          </button>

          {/* Quick Demo Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
            >
              <span className="hidden md:inline text-slate-400">Demo Role:</span>
              <span className="text-blue-400">{getRoleLabel(user?.role)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Demo Persona
                </div>
                {Object.entries(DEMO_CREDENTIALS).map(([roleKey, creds]) => {
                  const isActive = user?.role === roleKey;
                  return (
                    <button
                      key={roleKey}
                      onClick={() => handleSwitchAccount(roleKey as UserRole)}
                      disabled={switching}
                      className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                        isActive ? 'text-blue-400 font-semibold bg-blue-500/10' : 'text-slate-300'
                      }`}
                    >
                      <div>
                        <div>{creds.label}</div>
                        <div className="text-[10px] text-slate-500">{creds.email}</div>
                      </div>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* In-app Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-950">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Notifications</h4>
                  <span className="text-[11px] text-slate-400">{unreadCount} unread</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => markAsRead(n._id)}
                        className={`p-3.5 text-xs transition-colors cursor-pointer hover:bg-slate-800/50 ${
                          !n.read ? 'bg-blue-950/20 text-slate-200' : 'text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white">{n.title}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-slate-300">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile & logout */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-white leading-tight">{user.fullName}</div>
                <div className="text-[10px] text-slate-400 leading-tight">{user.email}</div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href="#login"
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Sign In
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
