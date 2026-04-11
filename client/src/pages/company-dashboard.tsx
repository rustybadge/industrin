import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Building,
  LogOut,
  Save,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText
} from 'lucide-react';
import { useCompanyAccess } from '@/hooks/use-company-access';
import { useAuth } from '@clerk/clerk-react';

function CompanyDashboard() {
  const { companyUser, logout, isLoading: authLoading, getCompanyToken } = useCompanyAccess();
  const { isSignedIn, getToken } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const setupAttempted = useRef(false);

  const fetchWithCompanyAuth = useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
      const token = await getCompanyToken();
      const headers = new Headers(init?.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
    [getCompanyToken]
  );

  // If user is signed in via Clerk but missing role metadata (new invitation flow),
  // call the setup endpoint to fix their metadata, then reload.
  useEffect(() => {
    if (!authLoading && !companyUser && isSignedIn && !setupAttempted.current) {
      setupAttempted.current = true;
      getToken().then(async (token) => {
        try {
          const res = await fetch('/api/company/setup', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            // Metadata updated — reload to pick up new Clerk session
            window.location.reload();
          } else {
            navigate('/company/login');
          }
        } catch {
          navigate('/company/login');
        }
      });
    } else if (!authLoading && !companyUser && !isSignedIn) {
      navigate('/company/login');
    }
  }, [authLoading, companyUser, isSignedIn, getToken, navigate]);

  // Fetch company profile — hooks must be before any early returns
  const { data: company, isLoading } = useQuery({
    queryKey: ['/api/company/profile'],
    enabled: !!companyUser,
    queryFn: async () => {
      const response = await fetchWithCompanyAuth('/api/company/profile');
      if (!response.ok) throw new Error('Failed to fetch company profile');
      const data = await response.json();
      setFormData(data);
      return data;
    },
  });

  // Update company mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetchWithCompanyAuth('/api/company/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/profile'] });
      setIsEditing(false);
      toast({ title: 'Sparat', description: 'Ändringarna har sparats.' });
    },
    onError: (error: any) => {
      toast({ title: 'Kunde inte spara', description: error.message, variant: 'destructive' });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar...</p>
        </div>
      </div>
    );
  }

  if (!companyUser) {
    return null;
  }

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building className="h-6 w-6 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Företagspanel</h1>
              <Badge variant="outline" className="ml-3 bg-blue-50 text-blue-700 border-blue-200">
                {company?.name || 'Company'}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => company?.slug && navigate(`/companies/${company.slug}`)}
                disabled={!company?.slug}
              >
                Visa publik profil
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Company Profile Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Företagsprofil</CardTitle>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  Redigera profil
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button onClick={() => { setIsEditing(false); setFormData(company); }} variant="outline" size="sm">
                    Avbryt
                  </Button>
                  <Button onClick={handleSave} size="sm" disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? 'Sparar...' : 'Spara ändringar'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Företagsnamn</label>
                  {isEditing ? (
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  ) : (
                    <p className="text-gray-900">{company?.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
                  {isEditing ? (
                    <Input
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                  ) : (
                    <p className="text-gray-900">{company?.city || company?.location}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    E-post
                  </label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={formData.contactEmail || ''}
                      onChange={(e) => handleChange('contactEmail', e.target.value)}
                    />
                  ) : (
                    <p className="text-gray-900">{company?.contactEmail || 'Ej angivet'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Telefon
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  ) : (
                    <p className="text-gray-900">{company?.phone || 'Ej angivet'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Globe className="h-4 w-4 mr-1" />
                    Webbplats
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.website || ''}
                      onChange={(e) => handleChange('website', e.target.value)}
                    />
                  ) : (
                    <p className="text-gray-900">{company?.website || 'Ej angivet'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Adress
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                    />
                  ) : (
                    <p className="text-gray-900">{company?.address || 'Ej angivet'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  Beskrivning
                </label>
                {isEditing ? (
                  <Textarea
                    value={formData.description_sv || formData.description || ''}
                    onChange={(e) => handleChange('description_sv', e.target.value)}
                    rows={6}
                    placeholder="Beskriv ert företag och era tjänster..."
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {company?.description_sv || company?.description || 'Ingen beskrivning angiven'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quote Requests Card */}
          <Card>
            <CardHeader>
              <CardTitle>Offertförfrågningar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Hantering av offertförfrågningar kommer snart...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default CompanyDashboard;

