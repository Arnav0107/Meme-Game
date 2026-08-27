import React, { useState, useEffect } from 'react';
import { useSocket, SocketProvider } from './context/SocketContext';
import LandingPage from './views/LandingPage';
import Dashboard from './views/Dashboard';
import AdminLogin from './views/AdminLogin';
import AdminDashboard from './views/AdminDashboard';
import WinnerScreen from './views/WinnerScreen';
import PresentationScreen from './views/PresentationScreen';

function MainApp() {
  const { team, gameState } = useSocket();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || null);

  // Simple state router
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    
    // Add support for manual state routing updates
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
    };
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
  };

  const handleAdminLogin = (token) => {
    setAdminToken(token);
    navigateTo('/admin');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    navigateTo('/');
  };

  // 1. Direct presentation Winner Screen route
  if (currentPath === '/winner-board') {
    return <WinnerScreen />;
  }

  // 1b. Unified Presentation Screen Route
  if (currentPath === '/presentation') {
    return <PresentationScreen />;
  }

  // 2. Admin Portal route
  if (currentPath === '/admin') {
    if (adminToken) {
      return (
        <AdminDashboard 
          adminToken={adminToken} 
          onLogout={handleAdminLogout} 
        />
      );
    } else {
      return <AdminLogin onLoginSuccess={handleAdminLogin} />;
    }
  }

  // 3. General Public / Player routes
  if (gameState.status === 'FINISHED') {
    return <WinnerScreen />;
  }

  if (team) {
    return <Dashboard />;
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <SocketProvider>
      <MainApp />
    </SocketProvider>
  );
}
