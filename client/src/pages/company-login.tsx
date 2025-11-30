import { Building } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function CompanyLogin() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
            <Building className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Company Login</h1>
          <p className="text-sm text-gray-600 mt-2">
            Sign in with the Clerk account assigned to your company
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <SignIn
            routing="path"
            path="/company/login"
            // Use forceRedirectUrl to avoid re-render loop and deprecated prop warnings
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
            ← Back to Industrin.se
          </Button>
        </div>
      </div>
    </div>
  );
}
