import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface CompanyUser {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
}

interface CompanyAuthContextType {
  companyUser: CompanyUser | null;
  login: (email: string, accessToken: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const CompanyAuthContext = createContext<CompanyAuthContextType | undefined>(undefined);

export function CompanyAuthProvider({ children }: { children: ReactNode }) {
  const [companyUser, setCompanyUser] = useState<CompanyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Check if company user is logged in on app start
    const token = localStorage.getItem('company_token');
    if (token) {
      // Verify token is still valid
      verifyCompanyToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyCompanyToken = async (token: string) => {
    try {
      const response = await fetch('/api/company/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setCompanyUser(userData);
      } else {
        localStorage.removeItem('company_token');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('company_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/company/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, accessToken }),
      });

      if (response.ok) {
        const { companyUser, token } = await response.json();
        localStorage.setItem('company_token', token);
        setCompanyUser(companyUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('company_token');
    setCompanyUser(null);
    navigate('/company/login');
  };

  return (
    <CompanyAuthContext.Provider value={{ companyUser, login, logout, isLoading }}>
      {children}
    </CompanyAuthContext.Provider>
  );
}

export function useCompanyAuth() {
  const context = useContext(CompanyAuthContext);
  if (context === undefined) {
    throw new Error('useCompanyAuth must be used within a CompanyAuthProvider');
  }
  return context;
}

// Higher-order component to protect company routes
export function withCompanyAuth<T extends object>(Component: React.ComponentType<T>) {
  return function ProtectedComponent(props: T) {
    const { companyUser, isLoading } = useCompanyAuth();
    const [, navigate] = useLocation();

    useEffect(() => {
      if (!isLoading && !companyUser) {
        navigate('/company/login');
      }
    }, [companyUser, isLoading, navigate]);

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

    if (!companyUser) {
      return null;
    }

    return <Component {...props} />;
  };
}

