import { Link } from "wouter";
import { SignIn } from "@clerk/clerk-react";
import IndustrinLogo from "@/components/ui/industrin-logo";

export default function AdminLogin() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 px-8 py-6">
        <Link href="/">
          <IndustrinLogo className="h-7 w-auto text-gray-900 cursor-pointer" height={28} width={170} />
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Admin</p>
            <h1 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: 'PP Neue Montreal, Inter Tight, sans-serif', letterSpacing: '-0.01em' }}>
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
                colorInputBackground: "#ffffff",
                colorInputText: "#111827",
                borderRadius: "6px",
                fontFamily: "Inter Tight, sans-serif",
              },
              elements: {
                card: {
                  boxShadow: "none",
                  border: "none",
                  padding: "0",
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
              },
            }}
          />

          <div className="mt-8 pt-6 border-t border-gray-100">
            <Link href="/">
              <span className="text-sm text-gray-400 hover:text-gray-700 cursor-pointer transition-colors">
                ← Tillbaka till Industrin.net
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
