import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { useCallback, useMemo } from "react";

const ADMIN_ROLE = "admin";

export function useAdminAccess() {
  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();

  const admin = useMemo(() => {
    if (!isLoaded || !user) {
      return null;
    }

    const metadata = (user.publicMetadata || {}) as Record<string, unknown>;
    const role = metadata.role;
    if (role !== ADMIN_ROLE) {
      return null;
    }

    return {
      id: user.id,
      username:
        user.username ||
        user.primaryEmailAddress?.emailAddress ||
        "Administratör",
      role: role as string,
      isSuperAdmin: Boolean(metadata.isSuperAdmin),
      email: user.primaryEmailAddress?.emailAddress || "",
    };
  }, [isLoaded, user]);

  const isLoading = !isLoaded;

  const logout = useCallback(() => {
    signOut({ redirectUrl: "/admin/login" });
  }, [signOut]);

  const getAdminToken = useCallback(
    async () => {
      const template =
        import.meta.env.VITE_CLERK_JWT_TEMPLATE_NAME ||
        import.meta.env.CLERK_JWT_TEMPLATE_NAME;
      const token = await getToken(
        template ? { template } : undefined
      );
      if (!token) {
        throw new Error("Unable to fetch admin session token from Clerk");
      }
      return token;
    },
    [getToken]
  );

  return {
    admin,
    isLoading,
    logout,
    getAdminToken,
  };
}
