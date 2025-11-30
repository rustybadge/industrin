import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { useCallback, useMemo } from "react";

const COMPANY_ROLE = "company";

export function useCompanyAccess() {
  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();

  const companyUser = useMemo(() => {
    if (!isLoaded || !user) {
      return null;
    }

    const metadata = (user.publicMetadata || {}) as Record<
      string,
      unknown
    >;
    const role = metadata.role;
    const companyId = metadata.companyId as string | undefined;
    if (role !== COMPANY_ROLE || !companyId) {
      return null;
    }

    return {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || "",
      name: user.fullName || user.firstName || "Company user",
      companyId,
      role: role as string,
    };
  }, [isLoaded, user]);

  const isLoading = !isLoaded;

  const logout = useCallback(() => {
    signOut({ redirectUrl: "/company/login" });
  }, [signOut]);

  const getCompanyToken = useCallback(
    async () => {
      const template =
        import.meta.env.VITE_CLERK_JWT_TEMPLATE_NAME ||
        import.meta.env.CLERK_JWT_TEMPLATE_NAME;
      const token = await getToken(
        template ? { template } : undefined
      );
      if (!token) {
        throw new Error("Unable to fetch company session token from Clerk");
      }
      return token;
    },
    [getToken]
  );

  return {
    companyUser,
    isLoading,
    logout,
    getCompanyToken,
  };
}
