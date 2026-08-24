import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import LoginPage from './pages/auth/LoginPage';
import CustomerLayout from './layouts/CustomerLayout';
import StaffLayout from './layouts/StaffLayout';
import ManagerLayout from './layouts/ManagerLayout';
import CursorGlow from './components/CursorGlow';
import './StaffManager.css';

function MainAppView() {
  const { currentUser } = useApp();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');

  // Sync URL changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Determine active view & login modal overlay state
  let activeLayout = <CustomerLayout onNavigate={navigate} />;
  let showLoginModal = false;
  let modalTargetRole = 'staff';

  if (currentPath.startsWith('/staff')) {
    if (currentUser && currentUser.role === 'staff') {
      activeLayout = <StaffLayout onNavigate={navigate} />;
    } else {
      // Unauthenticated access to /staff -> show Coffee Menu + Login Modal Overlay!
      activeLayout = <CustomerLayout onNavigate={navigate} />;
      showLoginModal = true;
      modalTargetRole = 'staff';
    }
  } else if (currentPath.startsWith('/manager')) {
    if (currentUser && currentUser.role === 'manager') {
      activeLayout = <ManagerLayout onNavigate={navigate} />;
    } else {
      // Unauthenticated access to /manager -> show Coffee Menu + Login Modal Overlay!
      activeLayout = <CustomerLayout onNavigate={navigate} />;
      showLoginModal = true;
      modalTargetRole = 'manager';
    }
  }

  return (
    <div className="app-root-container">
      {/* Gold Theme Mouse Cursor Follower Glow */}
      <CursorGlow />

      {/* Active Layout View (Customer, Staff, or Manager) */}
      {activeLayout}

      {/* Login MODAL OVERLAY when accessing protected routes without authentication */}
      {showLoginModal && (
        <LoginPage
          targetRole={modalTargetRole}
          onNavigate={navigate}
          onClose={() => navigate('/')}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppView />
    </AppProvider>
  );
}
