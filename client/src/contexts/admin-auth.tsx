import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useLocation } from 'wouter';

interface AdminUser {
  id: string;
  username: string;
  role: string;
  isSuperAdmin: boolean;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  const tokenRef = useRef<string | null>(null);

  const isCurrentToken = (token: string | null) => tokenRef.current === token;

  const verifyAdminToken = async (token: string, retryCount = 0) => {
    try {
      const response = await fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const adminData = await response.json();
        console.log('Admin token verified successfully');
        if (!isCurrentToken(token)) {
          return;
        }
        setAdmin(adminData);
        setIsLoading(false);
      } else if (response.status === 401 || response.status === 403) {
        // Token is invalid or expired - remove it
        console.log('Token verification failed (401/403), removing token');
        if (!isCurrentToken(token)) {
          return;
        }
        localStorage.removeItem('admin_token');
        tokenRef.current = null;
        setAdmin(null);
        setIsLoading(false);
      } else {
        // Other error (500, etc.) - retry up to 3 times
        console.warn('Token verification failed with status:', response.status);
        if (retryCount < 3) {
          console.log(`Retrying token verification... (attempt ${retryCount + 1}/3)`);
          setTimeout(() => {
            if (isCurrentToken(token)) {
              verifyAdminToken(token, retryCount + 1);
            }
          }, 1000 * (retryCount + 1));
        } else {
          // After retries, keep token but don't set admin
          // User will need to refresh or re-login
          console.error('Token verification failed after retries - please refresh or re-login');
          if (!isCurrentToken(token)) {
            return;
          }
          setAdmin(null);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Token verification network error:', error);
      // On network error, retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        console.log(`Retrying after network error... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          if (isCurrentToken(token)) {
            verifyAdminToken(token, retryCount + 1);
          }
        }, 1000 * (retryCount + 1));
      } else {
        // After retries, keep token - server might be starting up
        console.error('Token verification failed after retries - keeping token, please refresh');
        if (!isCurrentToken(token)) {
          return;
        }
        setAdmin(null);
        setIsLoading(false);
      }
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const { admin, token } = await response.json();
        localStorage.setItem('admin_token', token);
        tokenRef.current = token;
        setAdmin(admin);
        setIsLoading(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    tokenRef.current = null;
    setAdmin(null);
    setIsLoading(false);
    navigate('/admin/login');
  };

  useEffect(() => {
    // Check if admin is logged in on app start
    const token = localStorage.getItem('admin_token');
    if (token) {
      tokenRef.current = token;
      // Verify token is still valid
      verifyAdminToken(token);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsLoading(true);
      tokenRef.current = token;
      await verifyAdminToken(token);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, isLoading, refreshAuth }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

// Higher-order component to protect admin routes
export function withAdminAuth<T extends object>(Component: React.ComponentType<T>) {
  return function ProtectedComponent(props: T) {
    const { admin, isLoading } = useAdminAuth();
    const [, navigate] = useLocation();

    useEffect(() => {
      if (!isLoading && !admin) {
        navigate('/admin/login');
      }
    }, [admin, isLoading, navigate]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!admin) {
      return null;
    }

    return <Component {...props} />;
  };
}

