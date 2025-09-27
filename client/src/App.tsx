import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Companies from "@/pages/companies";
import CompanyProfile from "@/pages/company-profile";
import ClaimRequest from "@/pages/claim-request";
import QuoteRequest from "@/pages/quote-request";
import Integritetspolicy from "@/pages/integritetspolicy";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

function Router() {
  // Automatically scroll to top on route changes
  useScrollToTop();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/companies" component={Companies} />
          <Route path="/company/:id" component={CompanyProfile} />
          <Route path="/companies/:slug" component={CompanyProfile} />
          <Route path="/companies/:slug/quote" component={QuoteRequest} />
          <Route path="/ansokkontroll/:companySlug" component={ClaimRequest} />
          <Route path="/integritetspolicy" component={Integritetspolicy} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
