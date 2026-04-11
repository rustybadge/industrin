import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Building,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  Settings,
  TrendingUp,
  Ban,
  UserCheck,
  MapPin,
  Phone,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminAccess } from '@/hooks/use-admin-access';
import type { CompanyDetail } from '@/lib/api';

interface ClaimRequest {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  serviceCategories?: string[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  company: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface DashboardStats {
  totalCompanies: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
}

interface CompanyUser {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const { admin, logout, isLoading: authLoading, isSignedIn, getAdminToken } = useAdminAccess();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'claims' | 'companies'>('overview');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);

  const fetchWithAdminAuth = useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
      const token = await getAdminToken();
      const headers = new Headers(init?.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
    [getAdminToken]
  );

  useEffect(() => {
    if (!authLoading && !admin && isSignedIn === false) {
      navigate('/admin/login');
    }
  }, [admin, authLoading, isSignedIn, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar...</p>
        </div>
      </div>
    );
  }

  // Signed in but not as admin — show access-denied instead of redirect loop
  if (!admin && isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Ingen adminåtkomst</h1>
          <p className="text-gray-600">
            Det inloggade kontot har inte administratörsbehörighet. Logga ut och logga in med ett adminkonto.
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

  if (!admin) {
    return null;
  }

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await fetchWithAdminAuth('/api/admin/stats');
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/admin/login');
          throw new Error('Session expired. Please log in again.');
        }
        const errorText = await response.text();
        console.error('Failed to fetch stats:', response.status, errorText);
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!admin,
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch claim requests
  const { data: claimRequests, isLoading: claimsLoading, error: claimsError, refetch: refetchClaims } = useQuery<ClaimRequest[]>({
    queryKey: ['/api/admin/claim-requests'],
    queryFn: async () => {
      const response = await fetchWithAdminAuth('/api/admin/claim-requests');
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/admin/login');
          throw new Error('Session expired. Please log in again.');
        }
        const errorText = await response.text();
        console.error('Failed to fetch claim requests:', response.status, errorText);
        throw new Error(`Failed to fetch claim requests: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!admin,
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch company users for selected company
  const { data: companyUsers, isLoading: companyUsersLoading, refetch: refetchCompanyUsers } = useQuery<CompanyUser[]>({
    queryKey: ['/api/admin/companies', selectedCompanyId, 'users'],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const response = await fetchWithAdminAuth(`/api/admin/companies/${selectedCompanyId}/users`);
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/admin/login');
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to fetch company users');
      }
      return response.json();
    },
    enabled: !!selectedCompanyId && !!admin,
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch all companies with profiles (admin companies tab)
  const { data: adminCompanies, isLoading: adminCompaniesLoading, error: adminCompaniesError } = useQuery<CompanyDetail[]>({
    queryKey: ['/api/admin/companies'],
    queryFn: async () => {
      const token = await getAdminToken();
      const response = await fetch('/api/admin/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/admin/login');
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(`Failed to fetch companies: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!admin && selectedTab === 'companies',
    retry: 1,
    retryDelay: 1000,
  });

  const handleApproveClaim = async (claimId: string, companyName: string) => {
    try {
      const response = await fetchWithAdminAuth(`/api/admin/claim-requests/${claimId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        refetchClaims();
        toast({
          title: "Ansökan godkänd",
          description: data.status === 'membership'
            ? `${companyName} hade redan ett konto. Tillgång beviljad automatiskt. Bekräftelsemail skickat till sökanden.`
            : `Inbjudan skickad via e-post till ${data.invitationEmail ?? 'sökanden'}. Bekräftelsemail skickat till sökanden.`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Kunde inte godkänna ansökan",
          description: errorData.message || 'Okänt fel',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to approve claim:', error);
      toast({
        title: "Fel",
        description: 'Kunde inte godkänna ansökan. Försök igen.',
        variant: "destructive"
      });
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    try {
      const response = await fetchWithAdminAuth(`/api/admin/company-users/${userId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        refetchCompanyUsers();
        refetchClaims();
        toast({
          title: "Åtkomst återkallad",
          description: "Användarens åtkomst har återkallats."
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Kunde inte återkalla åtkomst",
          description: errorData.message || 'Okänt fel',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to revoke access:', error);
      toast({
        title: "Fel",
        description: 'Kunde inte återkalla åtkomst. Försök igen.',
        variant: "destructive"
      });
    }
  };

  const handleActivateAccess = async (userId: string) => {
    try {
      const response = await fetchWithAdminAuth(`/api/admin/company-users/${userId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        refetchCompanyUsers();
        refetchClaims();
        toast({
          title: "Åtkomst återaktiverad",
          description: "Användarens åtkomst har återaktiverats."
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Kunde inte återaktivera åtkomst",
          description: errorData.message || 'Okänt fel',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to reactivate access:', error);
      toast({
        title: "Fel",
        description: 'Kunde inte återaktivera åtkomst. Försök igen.',
        variant: "destructive"
      });
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    try {
      const response = await fetchWithAdminAuth(`/api/admin/claim-requests/${claimId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        refetchClaims();
        toast({
          title: "Ansökan avvisad",
          description: "Ansökan har avvisats."
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Kunde inte avvisa ansökan",
          description: errorData.message || 'Okänt fel',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to reject claim:', error);
      toast({
        title: "Fel",
        description: 'Kunde inte avvisa ansökan. Försök igen.',
        variant: "destructive"
      });
    }
  };

  const handleDeleteClaim = async (claimId: string) => {
    try {
      const response = await fetchWithAdminAuth(`/api/admin/claim-requests/${claimId}/delete`, {
        method: 'POST',
      });
      if (response.ok) {
        refetchClaims();
        toast({ title: "Raderad", description: "Ansökan har tagits bort." });
      } else {
        toast({ title: "Fel", description: "Kunde inte radera.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Fel", description: "Kunde inte radera.", variant: "destructive" });
    }
  };

  const handleResetClaim = async (claimId: string) => {
    try {
      const response = await fetchWithAdminAuth(`/api/admin/claim-requests/${claimId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        refetchClaims();
        toast({
          title: "Ansökan återställd",
          description: "Ansökan har återställts till väntande. Du kan nu godkänna den igen."
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Kunde inte återställa ansökan",
          description: errorData.message || 'Okänt fel',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to reset claim:', error);
      toast({
        title: "Fel",
        description: 'Kunde inte återställa ansökan. Försök igen.',
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Väntar</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Godkänd</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Avvisad</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Adminsida</h1>
              <Badge variant="outline" className="ml-3 bg-blue-50 text-blue-700 border-blue-200">
                {admin?.username}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Inställningar
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Översikt
            </button>
            <button
              onClick={() => setSelectedTab('claims')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'claims'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ägaransökningar
            </button>
            <button
              onClick={() => setSelectedTab('companies')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'companies'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Företag
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Översikt</h2>

            {!admin ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Du måste vara inloggad för att se adminsidan.</p>
                <Button onClick={() => navigate('/admin/login')}>Gå till inloggning</Button>
              </div>
            ) : statsError ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Error loading stats: {statsError.message}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {statsError.message.includes('401') || statsError.message.includes('Unauthorized')
                    ? 'Din session kan ha gått ut. Logga in igen.'
                    : 'Prova att ladda om sidan.'}
                </p>
                <Button onClick={() => navigate('/admin/login')}>Gå till inloggning</Button>
              </div>
            ) : (
              <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Totalt antal företag</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.totalCompanies || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Väntande ansökningar</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {statsLoading ? '...' : stats?.pendingClaims || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Godkända ansökningar</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {statsLoading ? '...' : stats?.approvedClaims || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avvisade ansökningar</CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {statsLoading ? '...' : stats?.rejectedClaims || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Snabbåtgärder</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Button onClick={() => setSelectedTab('claims')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Granska ansökningar
                  </Button>
                  <Button variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Visa statistik
                  </Button>
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </div>
        )}

        {selectedTab === 'claims' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Ägaransökningar</h2>

            {!admin ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Du måste vara inloggad för att se ansökningar.</p>
                <Button onClick={() => navigate('/admin/login')}>Gå till inloggning</Button>
              </div>
            ) : claimsError ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Error loading claim requests: {claimsError.message}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {claimsError.message.includes('401') || claimsError.message.includes('Unauthorized')
                    ? 'Din session kan ha gått ut. Logga in igen.'
                    : 'Prova att ladda om sidan.'}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => refetchClaims()}>Försök igen</Button>
                  <Button variant="outline" onClick={() => navigate('/admin/login')}>Gå till inloggning</Button>
                </div>
              </div>
            ) : claimsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Laddar ansökningar...</p>
              </div>
            ) : claimRequests && claimRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Inga ansökningar hittades.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {claimRequests?.map((claim) => (
                  <Card
                    key={claim.id}
                    data-testid="claim-card"
                    data-claim-id={claim.id}
                    data-claim-email={claim.email}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              {claim.company?.name || `Company ID: ${claim.companyId}`}
                            </h3>
                            {getStatusBadge(claim.status)}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Sökande:</strong> {claim.name}</p>
                            <p><strong>E-post:</strong> {claim.email}</p>
                            {claim.phone && <p><strong>Telefon:</strong> {claim.phone}</p>}
                            <p><strong>Inlämnad:</strong> {new Date(claim.submittedAt).toLocaleDateString()}</p>
                            {claim.message && (
                              <div className="mt-2">
                                <p><strong>Meddelande:</strong></p>
                                <p className="text-gray-700 bg-background p-2 rounded mt-1">{claim.message}</p>
                              </div>
                            )}
                            {claim.serviceCategories && claim.serviceCategories.length > 0 && (
                              <div className="mt-2">
                                <p><strong>Tjänstekategorier:</strong></p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {claim.serviceCategories.map((category, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {category}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {claim.status === 'approved' && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="font-semibold text-gray-900">Företagsanvändare:</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (selectedCompanyId === claim.companyId) {
                                        setSelectedCompanyId(null);
                                      } else {
                                        setSelectedCompanyId(claim.companyId);
                                        refetchCompanyUsers();
                                      }
                                    }}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    {selectedCompanyId === claim.companyId ? 'Dölj användare' : 'Visa användare'}
                                  </Button>
                                </div>
                                {selectedCompanyId === claim.companyId && (
                                  <div className="mt-2 space-y-2">
                                    {companyUsersLoading ? (
                                      <div className="flex items-center gap-2 p-3">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        <p className="text-sm text-gray-500">Laddar användare...</p>
                                      </div>
                                    ) : companyUsers && companyUsers.length === 0 ? (
                                      <p className="text-sm text-gray-500 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                        Inga företagsanvändare hittades. Ansökan kan ha godkänts utan att ett användarkonto skapades.
                                      </p>
                                    ) : companyUsers ? (
                                      companyUsers.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-600">{user.email}</p>
                                            <p className="text-xs text-gray-500 mt-1">Roll: {user.role}</p>
                                          </div>
                                          <div className="flex items-center gap-3 ml-4">
                                            <Badge variant={user.isActive ? "default" : "secondary"} className="min-w-[70px] justify-center">
                                              {user.isActive ? 'Aktiv' : 'Inaktiv'}
                                            </Badge>
                                            {user.isActive ? (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRevokeAccess(user.id)}
                                                className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                                              >
                                                <Ban className="h-3 w-3 mr-1" />
                                                Återkalla åtkomst
                                              </Button>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleActivateAccess(user.id)}
                                                className="text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400"
                                              >
                                                <UserCheck className="h-3 w-3 mr-1" />
                                                Aktivera
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-gray-500">Klicka på 'Visa användare' för att ladda användare.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {claim.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveClaim(claim.id, claim.company?.name || 'Company')}
                                className="bg-gray-900 hover:bg-black"
                                data-testid="approve-claim-button"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Godkänn
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectClaim(claim.id)}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Avvisa
                              </Button>
                            </>
                          )}
                          {claim.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setResetConfirmId(claim.id)}
                              className="border-orange-300 text-orange-600 hover:bg-orange-50"
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Återställ till väntande
                            </Button>
                          )}
                          {claim.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setResetConfirmId(claim.id)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Återställ till väntande
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/companies/${claim.company?.slug}`, '_blank')}
                          >
                            Visa företag
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(claim.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            Radera
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {claimRequests?.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Inga ansökningar</h3>
                      <p className="text-gray-600">Det finns inga ägaransökningar att granska just nu.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
        {selectedTab === 'companies' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Företag</h2>

            {adminCompaniesError ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Kunde inte hämta företag: {(adminCompaniesError as Error).message}</p>
                <Button onClick={() => navigate('/admin/login')}>Gå till inloggning</Button>
              </div>
            ) : adminCompaniesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Laddar företag...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adminCompanies?.map((company) => {
                  const isExpanded = expandedCompanyId === company.id;
                  const isComplete = Boolean(company.profile?.visitingAddress && company.contacts?.length > 0);
                  const displayAddress = company.profile?.visitingAddress
                    || (company.city ? company.city : null);

                  return (
                    <Card key={company.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        {/* Row: thumbnail + name + city + badge + button */}
                        <div className="flex items-center gap-4">
                          {/* Logo thumbnail */}
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={`${company.name} logotyp`}
                              className="w-10 h-10 object-contain rounded border border-gray-100 bg-white flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded border border-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0">
                              <Building className="h-5 w-5 text-gray-300" />
                            </div>
                          )}

                          {/* Name + city */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{company.name}</p>
                            {(company.city || company.region) && (
                              <p className="text-sm text-gray-500 truncate">
                                {[company.city, company.region].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>

                          {/* Profile completion badge */}
                          <div className="flex-shrink-0">
                            {isComplete ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 border">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Komplett
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 border">
                                Ofullständig
                              </Badge>
                            )}
                          </div>

                          {/* Expand button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedCompanyId(isExpanded ? null : company.id)}
                            className="flex-shrink-0"
                          >
                            {isExpanded ? (
                              <><ChevronUp className="h-4 w-4 mr-1" />Dölj</>
                            ) : (
                              <><ChevronDown className="h-4 w-4 mr-1" />Visa detaljer</>
                            )}
                          </Button>
                        </div>

                        {/* Expanded detail panel */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left column */}
                            <div className="space-y-4">
                              {/* Logo larger */}
                              {company.logoUrl && (
                                <img
                                  src={company.logoUrl}
                                  alt={`${company.name} logotyp`}
                                  className="w-24 h-24 object-contain rounded-lg border border-gray-100 bg-white"
                                />
                              )}

                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Beskrivning</p>
                                <p className="text-sm text-gray-700 line-clamp-4">
                                  {company.description_sv || company.description || '–'}
                                </p>
                              </div>

                              {(company.categories?.length > 0 || (company.serviceområden?.length ?? 0) > 0) && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tjänster</p>
                                  <div className="flex flex-wrap gap-1">
                                    {[...(company.categories || []), ...(company.serviceområden || [])].map((item) => (
                                      <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right column */}
                            <div className="space-y-3 text-sm">
                              {company.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-gray-700">{company.phone}</span>
                                </div>
                              )}
                              {company.website && (
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <a
                                    href={`https://${company.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline truncate"
                                  >
                                    {company.website}
                                  </a>
                                </div>
                              )}
                              {company.contactEmail && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">E-post:</span>
                                  <span className="text-gray-700">{company.contactEmail}</span>
                                </div>
                              )}
                              {company.profile?.visitingAddress && (
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{company.profile.visitingAddress}</span>
                                </div>
                              )}
                              {company.profile?.openingHours && (
                                <div className="flex items-start gap-2">
                                  <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700 whitespace-pre-wrap">{company.profile.openingHours}</span>
                                </div>
                              )}
                              {company.contacts && company.contacts.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kontaktpersoner</p>
                                  <div className="space-y-1">
                                    {company.contacts.map((c) => (
                                      <div key={c.id} className="flex items-center gap-2">
                                        <span className="font-medium text-gray-800">{c.name}</span>
                                        {c.phone && (
                                          <span className="text-gray-500">{c.phone}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(`/companies/${company.slug}`, '_blank')}
                                >
                                  Öppna publikt
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {adminCompanies?.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Inga företag hittades.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 mt-8">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-end">
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Logga ut
          </button>
        </div>
      </footer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera ansökan</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera denna ansökan permanent? Åtgärden kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmId(null)}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDeleteClaim(deleteConfirmId!);
                setDeleteConfirmId(null);
              }}
            >
              Radera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog
        open={resetConfirmId !== null}
        onOpenChange={(open) => { if (!open) setResetConfirmId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Återställ ansökan</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill återställa ansökan till väntande? Du kan sedan godkänna den igen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetConfirmId(null)}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleResetClaim(resetConfirmId!);
                setResetConfirmId(null);
              }}
            >
              Återställ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
