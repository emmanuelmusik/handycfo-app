import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useBusinesses } from './hooks/useBusinesses';
import Login from './pages/Login';
import CreateFirstBusiness from './pages/CreateFirstBusiness';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import Sidebar from './components/layout/Sidebar';
import MobileTopbar from './components/layout/MobileTopbar';
import FooterNav from './components/layout/FooterNav';
import { NAV_ITEMS } from './components/layout/navItems';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();

  if (authLoading) return null; // avoid a login-page flash while the session check resolves
  if (!user) return <Login />;

  return <AuthenticatedApp userEmail={user.email} onSignOut={signOut} />;
}

function AuthenticatedApp({ userEmail, onSignOut }) {
  const { businesses, loading, createBusiness, deleteBusiness } = useBusinesses();
  const [currentBusinessId, setCurrentBusinessId] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeBusinessId = currentBusinessId || businesses[0]?.id;
  const activeBusiness = businesses.find((b) => b.id === activeBusinessId);

  async function handleAddBusiness() {
    const name = window.prompt('Business name?');
    if (!name) return;
    const created = await createBusiness({ name, businessType: 'New business' });
    setCurrentBusinessId(created.id);
  }

  async function handleDeleteBusiness(business) {
    const confirmed = window.confirm(
      `Delete ${business.name} and all of its invoices and expenses? This can't be undone.`
    );
    if (!confirmed) return;
    await deleteBusiness(business.id);
    if (activeBusinessId === business.id) setCurrentBusinessId(null); // falls back to businesses[0]
  }

  if (loading) return null;

  if (businesses.length === 0) {
    return (
      <CreateFirstBusiness
        onCreate={async (fields) => {
          const created = await createBusiness(fields);
          setCurrentBusinessId(created.id);
        }}
      />
    );
  }

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentView={currentView}
        onNavigate={(view) => { setCurrentView(view); setSidebarOpen(false); }}
        businesses={businesses}
        currentBusinessId={activeBusinessId}
        onSwitchBusiness={setCurrentBusinessId}
        onAddBusiness={handleAddBusiness}
        onDeleteBusiness={handleDeleteBusiness}
        userEmail={userEmail}
        onSignOut={onSignOut}
      />

      <main className="main">
        <MobileTopbar onOpenSidebar={() => setSidebarOpen(true)} />
        {activeBusiness && renderView(currentView, activeBusiness, userEmail)}
      </main>

      <FooterNav
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    </div>
  );
}

function renderView(view, business, userEmail) {
  if (view === 'dashboard') return <Dashboard business={business} userEmail={userEmail} />;
  const label = NAV_ITEMS.find((i) => i.view === view)?.label || view;
  return <ComingSoon title={label} />;
}
