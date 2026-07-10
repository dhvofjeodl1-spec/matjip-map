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
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

function AppPageShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen overflow-x-hidden overflow-y-auto bg-gray-50">{children}</div>;
}

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      setAuthLoading(true);
      const { data } = await supabase?.auth.getSession();
      const user = data.session?.user ?? null;
      if (!isMounted) return;
      setCurrentUser(user ? { id: user.id, email: user.email } : null);
      setAuthLoading(false);
    };

    void syncSession();

    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      if (!isMounted) return;
      setCurrentUser(user ? { id: user.id, email: user.email } : null);
      setAuthLoading(false);
    }) ?? { data: null };

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      setLocation('/');
      return;
    }

    const email = currentUser.email?.trim().toLowerCase();
    const isAdmin = email === 'dhvofjeodl1@gmail.com';

    if (!isAdmin) {
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

  const email = currentUser?.email?.trim().toLowerCase();
  const isAdmin = email === 'dhvofjeodl1@gmail.com';

  if (!currentUser || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about">
        <AppPageShell>
          <About />
        </AppPageShell>
      </Route>
      <Route path="/contact">
        <AppPageShell>
          <Contact />
        </AppPageShell>
      </Route>
      <Route path="/404">
        <AppPageShell>
          <NotFound />
        </AppPageShell>
      </Route>
      <Route path="/admin">
        <ProtectedAdminRoute>
          <AppPageShell>
            <Admin />
          </AppPageShell>
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/reports">
        <ProtectedAdminRoute>
          <AppPageShell>
            <AdminReports />
          </AppPageShell>
        </ProtectedAdminRoute>
      </Route>
      <Route>
        <AppPageShell>
          <NotFound />
        </AppPageShell>
      </Route>
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
