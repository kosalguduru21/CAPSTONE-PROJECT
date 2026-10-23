import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { MaintenanceChatModal } from './components/chat/MaintenanceChatModal';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Public pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { NoticesPage } from './pages/public/NoticesPage';
import { EmergencyContactsPage } from './pages/public/EmergencyContactsPage';

// Resident pages
import { ResidentDashboard } from './pages/resident/ResidentDashboard';
import { CreateWorkOrderPage } from './pages/resident/CreateWorkOrderPage';
import { ResidentWorkOrdersList } from './pages/resident/ResidentWorkOrdersList';
import { ResidentWorkOrderDetail } from './pages/resident/ResidentWorkOrderDetail';

// Manager pages
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { ManagerWorkOrdersPage } from './pages/manager/ManagerWorkOrdersPage';
import { ManagerWorkOrderDetail } from './pages/manager/ManagerWorkOrderDetail';
import { RelatedCasesPage } from './pages/manager/RelatedCasesPage';
import { SchedulingPage } from './pages/manager/SchedulingPage';
import { DocumentLibraryPage } from './pages/manager/DocumentLibraryPage';
import { VendorManagementPage } from './pages/manager/VendorManagementPage';
import { AuditEventsPage } from './pages/manager/AuditEventsPage';

// Vendor pages
import { VendorDashboard } from './pages/vendor/VendorDashboard';
import { VendorAssignmentsPage } from './pages/vendor/VendorAssignmentsPage';
import { VendorAssignmentDetail } from './pages/vendor/VendorAssignmentDetail';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'register'>('landing');
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner message="Authenticating session..." />
      </div>
    );
  }

  // If user is not authenticated, render public portals
  if (!user) {
    if (publicView === 'login') {
      return (
        <>
          <LoginPage
            onNavigateRegister={() => setPublicView('register')}
            onNavigateHome={() => setPublicView('landing')}
          />
          <MaintenanceChatModal
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        </>
      );
    }
    if (publicView === 'register') {
      return (
        <>
          <RegisterPage
            onNavigateLogin={() => setPublicView('login')}
          />
          <MaintenanceChatModal
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        </>
      );
    }
    return (
      <>
        <LandingPage
          onNavigateLogin={() => setPublicView('login')}
          onOpenChat={() => setChatOpen(true)}
        />
        <MaintenanceChatModal
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </>
    );
  }

  // Navigate helper
  const navigateToOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (user.role === 'resident') {
      setCurrentTab('resident-detail');
    } else if (user.role === 'property_manager') {
      setCurrentTab('manager-detail');
    } else {
      setCurrentTab('vendor-detail');
    }
  };

  // Render role-specific content
  const renderMainContent = () => {
    // Resident Views
    if (user.role === 'resident') {
      switch (currentTab) {
        case 'resident-create':
          return (
            <CreateWorkOrderPage
              onBack={() => setCurrentTab('resident-orders')}
              onSuccess={(id) => navigateToOrder(id)}
            />
          );
        case 'resident-orders':
          return (
            <ResidentWorkOrdersList
              onNavigateCreate={() => setCurrentTab('resident-create')}
              onNavigateOrder={navigateToOrder}
            />
          );
        case 'resident-history':
          return (
            <ResidentWorkOrdersList
              onNavigateCreate={() => setCurrentTab('resident-create')}
              onNavigateOrder={navigateToOrder}
              historyOnly
            />
          );
        case 'resident-detail':
          return selectedOrderId ? (
            <ResidentWorkOrderDetail
              orderId={selectedOrderId}
              onBack={() => setCurrentTab('resident-orders')}
            />
          ) : (
            <ResidentDashboard
              onNavigateCreate={() => setCurrentTab('resident-create')}
              onNavigateOrder={navigateToOrder}
              onNavigateAllOrders={() => setCurrentTab('resident-orders')}
              onOpenChat={() => setChatOpen(true)}
            />
          );
        case 'public-notices':
          return <NoticesPage />;
        case 'public-emergency':
          return <EmergencyContactsPage />;
        case 'resident-dashboard':
        default:
          return (
            <ResidentDashboard
              onNavigateCreate={() => setCurrentTab('resident-create')}
              onNavigateOrder={navigateToOrder}
              onNavigateAllOrders={() => setCurrentTab('resident-orders')}
              onOpenChat={() => setChatOpen(true)}
            />
          );
      }
    }

    // Property Manager Views
    if (user.role === 'property_manager') {
      switch (currentTab) {
        case 'manager-orders':
          return <ManagerWorkOrdersPage onNavigateOrder={navigateToOrder} />;
        case 'manager-detail':
          return selectedOrderId ? (
            <ManagerWorkOrderDetail
              orderId={selectedOrderId}
              onBack={() => setCurrentTab('manager-orders')}
              onNavigateOrder={navigateToOrder}
            />
          ) : (
            <ManagerWorkOrdersPage onNavigateOrder={navigateToOrder} />
          );
        case 'manager-related':
          return <RelatedCasesPage onNavigateOrder={navigateToOrder} />;
        case 'manager-scheduling':
          return <SchedulingPage />;
        case 'manager-documents':
          return <DocumentLibraryPage />;
        case 'manager-vendors':
          return <VendorManagementPage />;
        case 'manager-audit':
          return <AuditEventsPage />;
        case 'public-notices':
          return <NoticesPage />;
        case 'public-emergency':
          return <EmergencyContactsPage />;
        case 'manager-dashboard':
        default:
          return (
            <ManagerDashboard
              onNavigateOrders={() => setCurrentTab('manager-orders')}
              onNavigateOrder={navigateToOrder}
              onNavigateRelated={() => setCurrentTab('manager-related')}
              onNavigateScheduling={() => setCurrentTab('manager-scheduling')}
              onNavigateDocuments={() => setCurrentTab('manager-documents')}
            />
          );
      }
    }

    // Vendor Technician Views
    if (user.role === 'vendor_technician') {
      switch (currentTab) {
        case 'vendor-assignments':
          return <VendorAssignmentsPage onNavigateAssignment={navigateToOrder} />;
        case 'vendor-detail':
          return selectedOrderId ? (
            <VendorAssignmentDetail
              orderId={selectedOrderId}
              onBack={() => setCurrentTab('vendor-assignments')}
            />
          ) : (
            <VendorAssignmentsPage onNavigateAssignment={navigateToOrder} />
          );
        case 'vendor-schedule':
          return <SchedulingPage />;
        case 'vendor-documents':
          return <DocumentLibraryPage />;
        case 'public-emergency':
          return <EmergencyContactsPage />;
        case 'vendor-dashboard':
        default:
          return (
            <VendorDashboard
              onNavigateAssignment={navigateToOrder}
              onNavigateAll={() => setCurrentTab('vendor-assignments')}
            />
          );
      }
    }

    return <div>Role not recognized.</div>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        onOpenChat={() => setChatOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setSelectedOrderId(null);
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all">
          {renderMainContent()}
        </main>
      </div>

      {/* Global Grounded RAG Chat Assistant Modal */}
      <MaintenanceChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
