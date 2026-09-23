import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import TypeListPage from './pages/TypeListPage';
import PageDetailPage from './pages/PageDetailPage';
import { CloudMapView } from './pages/CloudMapView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider, useUser } from './contexts/UserContext';
import { AspettoProvider } from './contexts/AspettoContext';
import UserSelectPage from './pages/UserSelectPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 10_000,
      retry: 1,
      retryDelay: 500,
      networkMode: 'always',
    },
    mutations: {
      retry: 0,
      networkMode: 'always',
    },
  },
});

function MainApp() {
  const { activeUser, isLoading } = useUser();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        Inizializzazione...
      </div>
    );
  }

  if (!activeUser) {
    return <UserSelectPage />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="map" element={<CloudMapView />} />
          {/* Dynamic Type Route */}
          <Route path="type/:typeName" element={<TypeListPage />} />
          {/* Direct aliases for ease of navigation */}
          <Route path="clients" element={<TypeListPage type="client" />} />
          <Route path="projects" element={<TypeListPage type="project" />} />
          <Route path="commesse" element={<TypeListPage type="commessa" />} />
          <Route path="notes" element={<TypeListPage type="note" />} />
          <Route path="wiki" element={<TypeListPage type="wiki" />} />
          <Route path="bugs" element={<TypeListPage type="bug" />} />
          <Route path="tasks" element={<TypeListPage type="todo" />} />
          <Route path="todos" element={<TypeListPage type="todo" />} />
          <Route path="files" element={<TypeListPage type="file" />} />
          {/* Page Detail Route */}
          <Route path="page/:id" element={<PageDetailPage />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary fallbackTitle="Errore critico di NutNote">
      <QueryClientProvider client={queryClient}>
        <AspettoProvider>
          <UserProvider>
            <MainApp />
          </UserProvider>
        </AspettoProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
