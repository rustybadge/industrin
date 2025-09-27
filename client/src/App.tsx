import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider } from "@/contexts/admin-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Companies from "@/pages/companies";
import CompanyProfile from "@/pages/company-profile";
import ClaimRequest from "@/pages/claim-request";
import QuoteRequest from "@/pages/quote-request";
import Integritetspolicy from "@/pages/integritetspolicy";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminSettings from "@/pages/admin-settings";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

function Router() {
  // Automatically scroll to top on route changes
  useScrollToTop();

  return (
    <div className="min-h-screen flex flex-col">
      <Switch>
        {/* Admin routes - no header/footer */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/settings" component={AdminSettings} />
        
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminAuthProvider>
          <Router />
          <Toaster />
        </AdminAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
