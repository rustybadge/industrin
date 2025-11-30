import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  UserCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminAccess } from '@/hooks/use-admin-access';

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
  const { admin, logout, isLoading: authLoading, getAdminToken } = useAdminAccess();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'claims'>('overview');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

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
    if (!authLoading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
          title: "Claim approved",
          description: data.status === 'membership'
            ? `${companyName} already had a Clerk account. Access granted automatically.`
            : `Invitation sent via Clerk${data.invitationEmail ? ` to ${data.invitationEmail}` : ''}.`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to approve claim",
          description: errorData.message || 'Unknown error',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to approve claim:', error);
      toast({
        title: "Error",
        description: 'Failed to approve claim. Please try again.',
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
          title: "Access revoked",
          description: "Company user access has been revoked."
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to revoke access",
          description: errorData.message || 'Unknown error',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to revoke access:', error);
      toast({
        title: "Error",
        description: 'Failed to revoke access. Please try again.',
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
          title: "Access reactivated",
          description: "Company user access has been reactivated."
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to reactivate access",
          description: errorData.message || 'Unknown error',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to reactivate access:', error);
      toast({
        title: "Error",
        description: 'Failed to reactivate access. Please try again.',
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
          title: "Claim rejected",
          description: "The claim request has been rejected."
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to reject claim",
          description: errorData.message || 'Unknown error',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to reject claim:', error);
      toast({
        title: "Error",
        description: 'Failed to reject claim. Please try again.',
        variant: "destructive"
      });
    }
  };

  const handleResetClaim = async (claimId: string) => {
    if (!confirm('Are you sure you want to reset this claim to pending? This will allow you to approve it again.')) {
      return;
    }

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
          title: "Claim reset",
          description: "The claim has been reset to pending. You can now approve it again."
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to reset claim",
          description: errorData.message || 'Unknown error',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to reset claim:', error);
      toast({
        title: "Error",
        description: 'Failed to reset claim. Please try again.',
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
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
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <Badge variant="outline" className="ml-3 bg-blue-50 text-blue-700 border-blue-200">
                {admin?.username}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
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
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('claims')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'claims'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Claim Requests
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            
            {!admin ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">You must be logged in to view the dashboard.</p>
                <Button onClick={() => navigate('/admin/login')}>Go to Login</Button>
              </div>
            ) : statsError ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Error loading stats: {statsError.message}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {statsError.message.includes('401') || statsError.message.includes('Unauthorized') 
                    ? 'Your session may have expired. Please log in again.'
                    : 'Please try refreshing the page.'}
                </p>
                <Button onClick={() => navigate('/admin/login')}>Go to Login</Button>
              </div>
            ) : (
              <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
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
                  <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
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
                  <CardTitle className="text-sm font-medium">Approved Claims</CardTitle>
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
                  <CardTitle className="text-sm font-medium">Rejected Claims</CardTitle>
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
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Button onClick={() => setSelectedTab('claims')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Review Claims
                  </Button>
                  <Button variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
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
            <h2 className="text-2xl font-bold text-gray-900">Claim Requests</h2>
            
            {!admin ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">You must be logged in to view claim requests.</p>
                <Button onClick={() => navigate('/admin/login')}>Go to Login</Button>
              </div>
            ) : claimsError ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Error loading claim requests: {claimsError.message}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {claimsError.message.includes('401') || claimsError.message.includes('Unauthorized')
                    ? 'Your session may have expired. Please log in again.'
                    : 'Please try refreshing the page.'}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => refetchClaims()}>Retry</Button>
                  <Button variant="outline" onClick={() => navigate('/admin/login')}>Go to Login</Button>
                </div>
              </div>
            ) : claimsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading claim requests...</p>
              </div>
            ) : claimRequests && claimRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No claim requests found.</p>
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
                            <p><strong>Applicant:</strong> {claim.name}</p>
                            <p><strong>Email:</strong> {claim.email}</p>
                            {claim.phone && <p><strong>Phone:</strong> {claim.phone}</p>}
                            <p><strong>Submitted:</strong> {new Date(claim.submittedAt).toLocaleDateString()}</p>
                            {claim.message && (
                              <div className="mt-2">
                                <p><strong>Message:</strong></p>
                                <p className="text-gray-700 bg-background p-2 rounded mt-1">{claim.message}</p>
                              </div>
                            )}
                            {claim.serviceCategories && claim.serviceCategories.length > 0 && (
                              <div className="mt-2">
                                <p><strong>Service Categories:</strong></p>
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
                                  <p className="font-semibold text-gray-900">Company Users:</p>
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
                                    {selectedCompanyId === claim.companyId ? 'Hide Users' : 'View Users'}
                                  </Button>
                                </div>
                                {selectedCompanyId === claim.companyId && (
                                  <div className="mt-2 space-y-2">
                                    {companyUsersLoading ? (
                                      <div className="flex items-center gap-2 p-3">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        <p className="text-sm text-gray-500">Loading users...</p>
                                      </div>
                                    ) : companyUsers && companyUsers.length === 0 ? (
                                      <p className="text-sm text-gray-500 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                        No company users found. This might mean the claim was approved but no user account was created.
                                      </p>
                                    ) : companyUsers ? (
                                      companyUsers.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-600">{user.email}</p>
                                            <p className="text-xs text-gray-500 mt-1">Role: {user.role}</p>
                                          </div>
                                          <div className="flex items-center gap-3 ml-4">
                                            <Badge variant={user.isActive ? "default" : "secondary"} className="min-w-[70px] justify-center">
                                              {user.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                            {user.isActive ? (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRevokeAccess(user.id)}
                                                className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                                              >
                                                <Ban className="h-3 w-3 mr-1" />
                                                Revoke Access
                                              </Button>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleActivateAccess(user.id)}
                                                className="text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400"
                                              >
                                                <UserCheck className="h-3 w-3 mr-1" />
                                                Activate
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-gray-500">Click "View Users" to load company users.</p>
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
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectClaim(claim.id)}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {claim.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResetClaim(claim.id)}
                              className="border-orange-300 text-orange-600 hover:bg-orange-50"
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Reset to Pending
                            </Button>
                          )}
                          {claim.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResetClaim(claim.id)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Reset to Pending
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/companies/${claim.company?.slug}`, '_blank')}
                          >
                            View Company
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No claim requests</h3>
                      <p className="text-gray-600">There are no claim requests to review at the moment.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
