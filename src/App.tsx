/* ============ ریشه برنامه ============ */
import { useEffect, useState } from 'react';
import { StoreProvider } from './state/store';
import { ToastProvider } from './components/ui';
import Layout, { type Route } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Today from './pages/Today';
import Subjects from './pages/Subjects';
import Reviews from './pages/Reviews';
import CalendarPage from './pages/CalendarPage';
import Tests from './pages/Tests';
import Mistakes from './pages/Mistakes';
import Sessions from './pages/Sessions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const ROUTES: Route[] = ['dashboard', 'today', 'subjects', 'reviews', 'calendar', 'tests', 'mistakes', 'sessions', 'reports', 'settings'];

function routeFromHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(h) ? h : 'dashboard';
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => routeFromHash());

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (r: Route) => {
    window.location.hash = `/${r}`;
    setRoute(r);
  };

  return (
    <StoreProvider>
      <ToastProvider>
        <Layout route={route} navigate={navigate}>
          {route === 'dashboard' && <Dashboard navigate={navigate} />}
          {route === 'today' && <Today />}
          {route === 'subjects' && <Subjects />}
          {route === 'reviews' && <Reviews />}
          {route === 'calendar' && <CalendarPage />}
          {route === 'tests' && <Tests />}
          {route === 'mistakes' && <Mistakes />}
          {route === 'sessions' && <Sessions />}
          {route === 'reports' && <Reports />}
          {route === 'settings' && <Settings />}
        </Layout>
      </ToastProvider>
    </StoreProvider>
  );
}
