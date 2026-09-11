import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { SearchModal } from './SearchModal';
import { ErrorBoundary } from '../common/ErrorBoundary';

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-6)' }}>
          <ErrorBoundary fallbackTitle="Errore nel caricamento della schermata">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <SearchModal />
    </div>
  );
}
