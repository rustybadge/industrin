import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/contexts/admin-auth';
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
  TrendingUp
} from 'lucide-react';

interface ClaimRequest {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  company: {
    name: string;
    slug: string;
  };
}

interface DashboardStats {
  totalCompanies: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
}

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const [, navigate] = useLocation();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'claims'>('overview');

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  // Fetch claim requests
  const { data: claimRequests, isLoading: claimsLoading, refetch: refetchClaims } = useQuery<ClaimRequest[]>({
    queryKey: ['/api/admin/claim-requests'],
    queryFn: async () => {
      const response = await fetch('/api/admin/claim-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch claim requests');
      return response.json();
    },
  });

  const handleApproveClaim = async (claimId: string) => {
    try {
      const response = await fetch(`/api/admin/claim-requests/${claimId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        refetchClaims();
        
        // Show access token to admin
        if (data.accessToken) {
          const message = `Claim approved! Access token for company login:\n\n${data.accessToken}\n\nShare this with the company owner.`;
          alert(message);
          // Copy to clipboard
          navigator.clipboard.writeText(data.accessToken);
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to approve claim: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to approve claim:', error);
      alert('Failed to approve claim. Please try again.');
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    try {
      const response = await fetch(`/api/admin/claim-requests/${claimId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        refetchClaims();
        // TODO: Show success toast
      }
    } catch (error) {
      console.error('Failed to reject claim:', error);
      // TODO: Show error toast
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
          </div>
        )}

        {selectedTab === 'claims' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Claim Requests</h2>
            
            {claimsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading claim requests...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {claimRequests?.map((claim) => (
                  <Card key={claim.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold">{claim.company.name}</h3>
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
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {claim.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveClaim(claim.id)}
                                className="bg-gray-900 hover:bg-black"
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/companies/${claim.company.slug}`, '_blank')}
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
