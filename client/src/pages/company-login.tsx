import { Building } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useCompanyAccess } from "@/hooks/use-company-access";

export default function CompanyLogin() {
  const [, navigate] = useLocation();
  const { companyUser, isSignedIn, isLoading, logout } = useCompanyAccess();

  // Wait for Clerk to initialise before mounting <SignIn> — prevents auto-redirect
  // firing before we know who is logged in.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Signed in but wrong role (e.g. admin account) — offer sign-out.
  if (isSignedIn && !companyUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto mb-4 flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
            <Building className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Ingen företagsåtkomst</h1>
          <p className="text-gray-600">
            Du är inloggad men kontot är inte kopplat till ett godkänt företag. Logga ut och logga in med rätt konto.
          </p>
          <button
            onClick={logout}
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors"
          >
            Logga ut
          </button>
        </div>
      </div>
    );
  }

  // Already signed in as company user — will land on dashboard.
  if (isSignedIn && companyUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Not signed in — show the Clerk sign-in form.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
            <Building className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Logga in som företag</h1>
          <p className="text-sm text-gray-600 mt-2">
            Logga in med kontot kopplat till ert företag på Industrin.net
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <SignIn
            routing="path"
            path="/company/login"
            forceRedirectUrl="/company/dashboard"
            fallbackRedirectUrl="/company/dashboard"
            appearance={{
              variables: {
                colorPrimary: "#111827",
              },
            }}
          />
        </div>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Tillbaka till Industrin.net
          </Button>
        </div>
      </div>
    </div>
  );
}
