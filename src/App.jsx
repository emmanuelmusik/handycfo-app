import { useMemo, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useBusinesses } from './hooks/useBusinesses';
import Login from './pages/Login';
import CreateFirstBusiness from './pages/CreateFirstBusiness';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Inbox from './pages/Inbox';
import Reports from './pages/Reports';
import Messages from './pages/Messages';
import Network from './pages/Network';
import Settings from './pages/Settings';
import ConfirmModal from './components/ConfirmModal';
import { useBadgeCounts } from './hooks/useBadgeCounts';
import { supabase } from './lib/supabaseClient';
import Sidebar from './components/layout/Sidebar';
import MobileTopbar from './components/layout/MobileTopbar';
import FooterNav from './components/layout/FooterNav';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();

  if (authLoading) return null; // avoid a login-page flash while the session check resolves
  if (!user) return <Login />;

  return <AuthenticatedApp userEmail={user.email} onSignOut={signOut} />;
}

function AuthenticatedApp({ userEmail, onSignOut }) {
  const { businesses, loading, createBusiness, updateBusiness, deleteBusiness } = useBusinesses();
  const [currentBusinessId, setCurrentBusinessId] = useState(null);
  // Coming back from Dropbox lands on /?dropbox=connected, so open Settings to show the result.
  const dropboxResult = useMemo(() => new URLSearchParams(window.location.search).get('dropbox'), []);
  const [currentView, setCurrentView] = useState(dropboxResult ? 'settings' : 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatContactId, setChatContactId] = useState(null);
  const [badgeKey, setBadgeKey] = useState(0);
  const [businessToDelete, setBusinessToDelete] = useState(null);
  const [goodbye, setGoodbye] = useState(false);

  const activeBusinessId = currentBusinessId || businesses[0]?.id;
  const activeBusiness = businesses.find((b) => b.id === activeBusinessId);
  const badgeCounts = useBadgeCounts(activeBusinessId, badgeKey);
  const refreshBadges = () => setBadgeKey((k) => k + 1);

  async function handleAddBusiness() {
    const name = window.prompt('Business name?');
    if (!name) return;
    const created = await createBusiness({ name, businessType: 'New business' });
    setCurrentBusinessId(created.id);
  }

  async function handleDeleteBusiness(business) {
    await deleteBusiness(business.id);
    if (activeBusinessId === business.id) setCurrentBusinessId(null); // falls back to businesses[0]
    setBusinessToDelete(null);
    setCurrentView('dashboard');
  }

  async function handleAccountDeleted() {
    setGoodbye(true);
    // The user no longer exists server-side, so only clear the local session.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setTimeout(() => { window.location.href = window.location.pathname; }, 2500);
  }

  function openChat(contactId) {
    setChatContactId(contactId);
    setCurrentView('messages');
  }

  if (goodbye) {
    return (
      <div className="goodbye-overlay show">
        <div className="goodbye-card">
          <div className="goodbye-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></div>
          <h2>Your account has been deleted</h2>
          <p>All of your data has been erased. Thank you for trying HandyCFO.</p>
        </div>
      </div>
    );
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
        onDeleteBusiness={setBusinessToDelete}
        badgeCounts={badgeCounts}
        userEmail={userEmail}
        onSignOut={onSignOut}
      />

      <main className="main">
        <MobileTopbar onOpenSidebar={() => setSidebarOpen(true)} />
        {activeBusiness && renderView({
          view: currentView,
          business: activeBusiness,
          userEmail,
          dropboxResult,
          chatContactId,
          navigate: setCurrentView,
          openChat,
          refreshBadges,
          updateBusiness,
          deleteBusiness: handleDeleteBusiness,
          onAccountDeleted: handleAccountDeleted,
          onSignOut,
        })}
      </main>

      <FooterNav
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenSidebar={() => setSidebarOpen(true)}
        badgeCounts={badgeCounts}
      />

      {businessToDelete && (
        <ConfirmModal
          title="Delete business?"
          message={`Delete ${businessToDelete.name} and all of its invoices, expenses and stored receipts? This can't be undone.`}
          onConfirm={() => handleDeleteBusiness(businessToDelete).catch((e) => window.alert(e.message))}
          onCancel={() => setBusinessToDelete(null)}
        />
      )}
    </div>
  );
}

function renderView(ctx) {
  const { view, business } = ctx;
  // key={business.id} remounts the page on business switch, so each
  // screen refetches instead of briefly showing the previous business.
  switch (view) {
    case 'inbox': return <Inbox key={business.id} business={business} onChanged={ctx.refreshBadges} />;
    case 'invoices': return <Invoices key={business.id} business={business} />;
    case 'expenses': return <Expenses key={business.id} business={business} />;
    case 'reports': return <Reports key={business.id} business={business} />;
    case 'messages':
      return (
        <Messages
          key={business.id}
          business={business}
          initialContactId={ctx.chatContactId}
          onNavigate={ctx.navigate}
          onChanged={ctx.refreshBadges}
        />
      );
    case 'network': return <Network onOpenChat={ctx.openChat} />;
    case 'settings':
      return (
        <Settings
          key={business.id}
          business={business}
          userEmail={ctx.userEmail}
          dropboxResult={ctx.dropboxResult}
          onUpdateBusiness={ctx.updateBusiness}
          onDeleteBusiness={ctx.deleteBusiness}
          onAccountDeleted={ctx.onAccountDeleted}
          onSignOut={ctx.onSignOut}
        />
      );
    default: return <Dashboard key={business.id} business={business} userEmail={ctx.userEmail} />;
  }
}
