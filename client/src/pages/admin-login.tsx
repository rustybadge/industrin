import { useLocation } from "wouter";
import { Shield } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

export default function AdminLogin() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Admin Login</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your Clerk admin account to manage Industrin.se
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <SignIn
            routing="path"
            path="/admin/login"
            // Use forceRedirectUrl to avoid re-render loop and deprecated prop warnings
            forceRedirectUrl="/admin"
            // Fallback for older Clerk versions
            fallbackRedirectUrl="/admin"
            appearance={{
              variables: {
                colorPrimary: "#111827",
                colorBackground: "#ffffff",
              },
              elements: {
                footerAction: {
                  display: "none",
                },
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
