import { useEffect } from "react";
import { useClerk } from "@clerk/clerk-react";

/**
 * Emergency sign-out page — navigating to /signout clears any active Clerk
 * session and redirects to the homepage. Useful when a redirect loop makes
 * the normal login pages inaccessible.
 */
export default function Signout() {
  const { signOut } = useClerk();

  useEffect(() => {
    signOut({ redirectUrl: "/" });
  }, [signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        <p className="text-gray-600 text-sm">Loggar ut…</p>
      </div>
    </div>
  );
}
