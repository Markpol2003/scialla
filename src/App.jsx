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

  // Determine active view based on route and authentication
  let activeLayout;

  if (currentPath.startsWith('/staff')) {
    if (currentUser && currentUser.role === 'staff' && currentUser.status !== 'Inactive' && currentUser.status !== 'Resigned') {
      activeLayout = <StaffLayout onNavigate={navigate} />;
    } else {
      // Unauthenticated access to /staff -> show standalone staff login
      activeLayout = (
        <LoginPage
          targetRole="staff"
          onNavigate={navigate}
          onClose={() => navigate('/')}
        />
      );
    }
  } else if (currentPath.startsWith('/manager')) {
    if (currentUser && currentUser.role === 'manager') {
      activeLayout = <ManagerLayout onNavigate={navigate} />;
    } else {
      // Unauthenticated access to /manager -> show standalone manager login
      activeLayout = (
        <LoginPage
          targetRole="manager"
          onNavigate={navigate}
          onClose={() => navigate('/')}
        />
      );
    }
  } else {
    // Public customer menu (default route)
    activeLayout = <CustomerLayout onNavigate={navigate} />;
  }

  return (
    <div className="app-root-container">
      {/* Gold Theme Mouse Cursor Follower Glow */}
      <CursorGlow />

      {/* Active Layout View (Customer, Staff, or Manager) */}
      {activeLayout}
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
