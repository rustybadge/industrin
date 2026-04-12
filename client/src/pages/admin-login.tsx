import { Link } from "wouter";
import { SignIn } from "@clerk/clerk-react";
import { useAdminAccess } from "@/hooks/use-admin-access";
import IndustrinLogo from "@/components/ui/industrin-logo";

export default function AdminLogin() {
  const { admin, isSignedIn, isLoading, logout } = useAdminAccess();

  // While Clerk is loading, show nothing — prevents <SignIn> from mounting
  // and firing its auto-redirect before we know the session state.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Signed in but not as admin — break the redirect loop with a sign-out screen.
  if (isSignedIn && !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Ingen adminåtkomst</h1>
          <p className="text-gray-600">
            Du är inloggad men har inte administratörsbehörighet. Logga ut och logga in med ett adminkonto.
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

  // Already signed in as admin — nothing to do here, /admin will pick them up.
  if (isSignedIn && admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Not signed in — render the Clerk sign-in form.
  return (
    <div className="min-h-screen flex">
      {/* Left panel — dark brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-950 flex-col justify-between p-12">
        <Link href="/">
          <IndustrinLogo className="h-7 w-auto text-white cursor-pointer" height={28} width={170} />
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
            Admin
          </p>
          <h2 className="text-3xl font-semibold leading-snug" style={{ letterSpacing: '-0.02em', color: '#ffffff' }}>
            Hantera listningar,<br />godkänn claims.
          </h2>
        </div>

        <p className="text-xs text-gray-600">
          industrin.net &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-8 py-12 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <Link href="/">
            <IndustrinLogo className="h-7 w-auto text-gray-900 cursor-pointer" height={28} width={170} />
          </Link>
        </div>

        <div className="w-full max-w-sm border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-8 pt-8 pb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Admin
            </p>
            <h1
              className="text-3xl font-semibold text-gray-900"
              style={{ letterSpacing: '-0.01em' }}
            >
              Logga in
            </h1>
          </div>

          <SignIn
            routing="path"
            path="/admin/login"
            forceRedirectUrl="/admin"
            fallbackRedirectUrl="/admin"
            appearance={{
              variables: {
                colorPrimary: "#111827",
                colorBackground: "#ffffff",
                colorText: "#111827",
                colorTextSecondary: "#6b7280",
                colorInputBackground: "#f9fafb",
                colorInputText: "#111827",
                borderRadius: "6px",
                fontFamily: "Inter Tight, sans-serif",
              },
              elements: {
                card: {
                  boxShadow: "none",
                  border: "none",
                  padding: "0 32px",
                  background: "transparent",
                },
                cardBox: {
                  boxShadow: "none",
                  border: "none",
                },
                headerTitle: { display: "none" },
                headerSubtitle: { display: "none" },
                footerAction: { display: "none" },
                footer: { display: "none" },
                formButtonPrimary: {
                  backgroundColor: "#111827",
                  fontSize: "14px",
                  fontWeight: "500",
                },
                formFieldLabel: {
                  fontSize: "13px",
                  color: "#374151",
                  marginBottom: "6px",
                },
                formFieldInput: {
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  padding: "10px 12px",
                  fontSize: "14px",
                },
                formFieldRow: {
                  marginBottom: "16px",
                },
              },
            }}
          />

          <div className="px-8 pb-8 pt-6 border-t border-gray-100">
            <Link href="/">
              <span className="text-sm text-gray-400 hover:text-gray-700 cursor-pointer transition-colors">
                ← Tillbaka till Industrin.net
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
