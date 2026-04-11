import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useIsFetching } from "@tanstack/react-query";
import { ClerkLoaded, ClerkLoading } from "@clerk/clerk-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Companies from "@/pages/companies";
import CompanyProfile from "@/pages/company-profile";
import ClaimRequest from "@/pages/claim-request";
import QuoteRequest from "@/pages/quote-request";
import Integritetspolicy from "@/pages/integritetspolicy";
import Villkor from "@/pages/villkor";
import AdminLogin from "@/pages/admin-login";
import Signout from "@/pages/signout";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminSettings from "@/pages/admin-settings";
import GeneralQuoteRequest from "@/pages/general-quote-request";
import CompanyLogin from "@/pages/company-login";
import CompanyDashboard from "@/pages/company-dashboard";
import CompanyEdit from "@/pages/company-edit";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useState, useEffect } from "react";
import AppLoadingSkeleton from "@/components/AppLoadingSkeleton";

function Router() {
  // Automatically scroll to top on route changes
  useScrollToTop();

  return (
    <div className="min-h-screen flex flex-col">
      <Switch>
        {/* Emergency sign-out — clears any session and goes to home */}
        <Route path="/signout" component={Signout} />

        {/* Admin routes - no header/footer */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/login/*" component={AdminLogin} />
        <Route path="/admin/login/:splat*" component={AdminLogin} />
        <Route path="/admin/" component={AdminDashboard} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/settings/*" component={AdminSettings} />
        <Route path="/admin/:splat*" component={AdminDashboard} />
        
        {/* Company admin routes - no header/footer */}
        <Route path="/company/login" component={CompanyLogin} />
        <Route path="/company/login/*" component={CompanyLogin} />
        <Route path="/company/login/:splat*" component={CompanyLogin} />
        <Route path="/company/dashboard/" component={CompanyDashboard} />
        <Route path="/company/dashboard" component={CompanyDashboard} />
        <Route path="/company/dashboard/:splat*" component={CompanyDashboard} />
        <Route path="/company/edit" component={CompanyEdit} />
        
        {/* Public routes - with header/footer */}
        <Route path="/">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Home />
            </main>
            <Footer />
          </div>
        </Route>
        
        <Route path="/companies">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Companies />
            </main>
            <Footer />
          </div>
        </Route>
        
        <Route path="/begar-offert">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <GeneralQuoteRequest />
            </main>
            <Footer />
          </div>
        </Route>
        
        <Route path="/company/:id">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <CompanyProfile />
            </main>
            <Footer />
          </div>
        </Route>
        
        <Route path="/companies/:slug">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <CompanyProfile />
            </main>
            <Footer />
          </div>
        </Route>

        <Route path="/företag/:slug">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <CompanyProfile />
            </main>
            <Footer />
          </div>
        </Route>

        <Route path="/companies/:slug/quote">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <QuoteRequest />
            </main>
            <Footer />
          </div>
        </Route>
        
        <Route path="/ansokkontroll/:companySlug">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <ClaimRequest />
            </main>
            <Footer />
          </div>
        </Route>
        
        <Route path="/integritetspolicy">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Integritetspolicy />
            </main>
            <Footer />
          </div>
        </Route>

        <Route path="/villkor">
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Villkor />
            </main>
            <Footer />
          </div>
        </Route>

        <Route>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <NotFound />
            </main>
            <Footer />
          </div>
        </Route>
      </Switch>
    </div>
  );
}

// Renders the skeleton until the very first API fetch resolves.
// Once `initialLoading` flips to false it stays false for the lifetime of the app.
function AppWithLoadingGate() {
  const isFetching = useIsFetching();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // The first time React Query has an active fetch and then it drops to 0,
    // we know the initial data is in — permanently exit the skeleton.
    if (initialLoading && isFetching === 0) {
      setInitialLoading(false);
    }
  }, [isFetching, initialLoading]);

  if (initialLoading && isFetching > 0) {
    return <AppLoadingSkeleton />;
  }

  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ClerkLoading>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Laddar inloggning…</p>
            </div>
          </div>
        </ClerkLoading>
        <ClerkLoaded>
          <AppWithLoadingGate />
        </ClerkLoaded>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
