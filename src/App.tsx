import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NoticeDialog from '@/components/NoticeDialog';
import NotFound from '@/pages/not-found';
import Home from '@/pages/Home';
import Admin from '@/pages/Admin';
import AdminReports from '@/pages/AdminReports';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import { supabase, isAdminEmail } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase?.auth.getUser();
      const user = data.user;
      setCurrentUser(user ? { id: user.id, email: user.email } : null);
      setAuthLoading(false);
    };

    getUser();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      setLocation('/');
      return;
    }

    if (!isAdminEmail(currentUser.email)) {
      setLocation('/404');
    }
  }, [authLoading, currentUser, setLocation]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-sm font-medium text-slate-200">
        로그인 상태를 확인하는 중입니다...
      </div>
    );
  }

  if (!currentUser || !isAdminEmail(currentUser.email)) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/404" component={NotFound} />
      <Route path="/admin">
        <ProtectedAdminRoute>
          <Admin />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/reports">
        <ProtectedAdminRoute>
          <AdminReports />
        </ProtectedAdminRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
          <NoticeDialog />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
