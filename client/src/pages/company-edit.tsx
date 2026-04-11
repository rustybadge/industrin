import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Trash2, Plus, Upload } from 'lucide-react';
import { useCompanyAccess } from '@/hooks/use-company-access';
import { useAuth } from '@clerk/clerk-react';
import { SERVICE_CATEGORIES } from '@/data/service-categories';

// ---- Types ----------------------------------------------------------------

interface CompanyProfileData {
  visitingAddress?: string;
  postalAddress?: string;
  openingHours?: string;
}

interface ContactData {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface CompanyEditData {
  id: string;
  name: string;
  slug: string;
  description: string;
  description_sv?: string | null;
  phone?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  city?: string | null;
  logoUrl?: string | null;
  categories: string[];
  profile: CompanyProfileData;
  contacts: ContactData[];
}

// ---- Loading spinner -------------------------------------------------------

function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Laddar...</p>
      </div>
    </div>
  );
}

// ---- Section: Om företaget -------------------------------------------------

function AboutSection({
  company,
  fetchWithCompanyAuth,
}: {
  company: CompanyEditData;
  fetchWithCompanyAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [descriptionSv, setDescriptionSv] = useState(company.description_sv ?? '');

  useEffect(() => {
    setDescriptionSv(company.description_sv ?? '');
  }, [company.description_sv]);

  const mutation = useMutation({
    mutationFn: async (data: { description_sv: string }) => {
      const response = await fetchWithCompanyAuth('/api/company/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Serverfel ${response.status}`);
      }
      return response.json() as Promise<CompanyEditData>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/profile'] });
      toast({ title: 'Sparat', description: 'Beskrivningen har sparats.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Kunde inte spara', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Om företaget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="description_sv">Beskrivning</Label>
          <Textarea
            id="description_sv"
            value={descriptionSv}
            onChange={(e) => setDescriptionSv(e.target.value)}
            rows={8}
            className="mt-1"
            placeholder="Beskriv ert företag, era tjänster och vad som gör er unika inom branschen."
          />
        </div>
        <Button
          onClick={() => mutation.mutate({ description_sv: descriptionSv })}
          disabled={mutation.isPending}
          size="sm"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Spara
        </Button>
      </CardContent>
    </Card>
  );
}

// ---- Section: Kontaktuppgifter ---------------------------------------------

function ContactInfoSection({
  company,
  fetchWithCompanyAuth,
}: {
  company: CompanyEditData;
  fetchWithCompanyAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [phone, setPhone] = useState(company.phone ?? '');
  const [website, setWebsite] = useState(company.website ?? '');
  const [contactEmail, setContactEmail] = useState(company.contactEmail ?? '');

  useEffect(() => {
    setPhone(company.phone ?? '');
    setWebsite(company.website ?? '');
    setContactEmail(company.contactEmail ?? '');
  }, [company.phone, company.website, company.contactEmail]);

  const mutation = useMutation({
    mutationFn: async (data: { phone: string; website: string; contactEmail: string }) => {
      const response = await fetchWithCompanyAuth('/api/company/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Serverfel ${response.status}`);
      }
      return response.json() as Promise<CompanyEditData>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/profile'] });
      toast({ title: 'Sparat', description: 'Kontaktuppgifterna har sparats.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Kunde inte spara', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kontaktuppgifter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-123 45 67"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="website">Webbplats</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="www.ertforetag.se"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="contactEmail">Kontakt-e-post</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="info@ertforetag.se"
              className="mt-1"
            />
          </div>
        </div>
        <Button
          onClick={() => mutation.mutate({ phone, website, contactEmail })}
          disabled={mutation.isPending}
          size="sm"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Spara
        </Button>
      </CardContent>
    </Card>
  );
}

// ---- Section: Adress & öppettider -----------------------------------------

function AddressSection({
  company,
  fetchWithCompanyAuth,
}: {
  company: CompanyEditData;
  fetchWithCompanyAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [visitingAddress, setVisitingAddress] = useState(company.profile?.visitingAddress ?? '');
  const [postalAddress, setPostalAddress] = useState(company.profile?.postalAddress ?? '');
  const [openingHours, setOpeningHours] = useState(company.profile?.openingHours ?? '');

  useEffect(() => {
    setVisitingAddress(company.profile?.visitingAddress ?? '');
    setPostalAddress(company.profile?.postalAddress ?? '');
    setOpeningHours(company.profile?.openingHours ?? '');
  }, [company.profile]);

  const mutation = useMutation({
    mutationFn: async (data: { profile: CompanyProfileData }) => {
      const response = await fetchWithCompanyAuth('/api/company/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Serverfel ${response.status}`);
      }
      return response.json() as Promise<CompanyEditData>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/profile'] });
      toast({ title: 'Sparat', description: 'Adressuppgifterna har sparats.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Kunde inte spara', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adress &amp; öppettider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="visitingAddress">Besöksadress</Label>
          <Input
            id="visitingAddress"
            value={visitingAddress}
            onChange={(e) => setVisitingAddress(e.target.value)}
            placeholder="Industrivägen 5, 123 45 Stad"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="postalAddress">Postadress</Label>
          <Input
            id="postalAddress"
            value={postalAddress}
            onChange={(e) => setPostalAddress(e.target.value)}
            placeholder="Box 123, 123 45 Stad"
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">Lämna tomt om samma som besöksadressen.</p>
        </div>
        <div>
          <Label htmlFor="openingHours">Öppettider</Label>
          <Input
            id="openingHours"
            value={openingHours}
            onChange={(e) => setOpeningHours(e.target.value)}
            placeholder="Mån–Fre 07:00–16:00"
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Fyll i era vanliga öppettider. Exempel: Mån–Fre 07:00–16:00, Lör 08:00–12:00.
          </p>
        </div>
        <Button
          onClick={() =>
            mutation.mutate({
              profile: { visitingAddress, postalAddress, openingHours },
            })
          }
          disabled={mutation.isPending}
          size="sm"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Spara
        </Button>
      </CardContent>
    </Card>
  );
}

// ---- Section: Kontaktpersoner ---------------------------------------------

function ContactsSection({
  company,
  fetchWithCompanyAuth,
}: {
  company: CompanyEditData;
  fetchWithCompanyAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; email: string }) => {
      const response = await fetchWithCompanyAuth('/api/company/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Serverfel ${response.status}`);
      }
      return response.json() as Promise<ContactData>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/profile'] });
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      toast({ title: 'Kontakt tillagd', description: 'Kontaktpersonen har lagts till.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Kunde inte lägga till', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await fetchWithCompanyAuth(`/api/company/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Serverfel ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/profile'] });
      toast({ title: 'Kontakt borttagen' });
    },
    onError: (error: Error) => {
      toast({ title: 'Kunde inte ta bort', description: error.message, variant: 'destructive' });
    },
  });

  const handleAdd = () => {
    if (!newName.trim()) {
      toast({ title: 'Namn krävs', description: 'Ange ett namn för kontaktpersonen.', variant: 'destructive' });
      return;
    }
    addMutation.mutate({ name: newName.trim(), phone: newPhone.trim(), email: newEmail.trim() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kontaktpersoner</CardTitle>
        <CardDescription>
          Lägg till namngivna kontakter som visas på er företagsprofil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {company.contacts.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {company.contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                  {contact.phone && (
                    <p className="text-xs text-gray-500">{contact.phone}</p>
                  )}
                  {contact.email && (
                    <p className="text-xs text-gray-500">{contact.email}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(contact.id)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Ta bort ${contact.name}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Lägg till ny kontakt</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="newContactName">Namn *</Label>
              <Input
                id="newContactName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Anna Andersson"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="newContactPhone">Telefon</Label>
              <Input
                id="newContactPhone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="010-123 45 67"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="newContactEmail">E-post</Label>
              <Input
                id="newContactEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="anna@ertforetag.se"
                className="mt-1"
              />
            </div>
          </div>
          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending}
            size="sm"
            variant="outline"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Lägg till kontakt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Section: Logotyp -------------------------------------------------------

function LogoSection({
  company,
  fetchWithCompanyAuth,
}: {
  company: CompanyEditData;
  fetchWithCompanyAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await fetchWithCompanyAuth('/api/company/logo', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Serverfel ${response.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/company/profile'] });
      toast({ title: 'Logotyp uppladdad', description: 'Er logotyp har sparats.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Okänt fel';
      toast({ title: 'Kunde inte ladda upp', description: message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logotyp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {company.logoUrl && (
          <div className="border rounded p-3 inline-block">
            <img
              src={company.logoUrl}
              alt="Logotyp"
              className="max-h-24 object-contain"
            />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isUploading ? 'Laddar upp...' : 'Välj bild'}
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Max 2 MB. Rekommenderat format: PNG eller SVG med transparent bakgrund.
        </p>
      </CardContent>
    </Card>
  );
}

// ---- Section: Tjänster ------------------------------------------------------

function ServicesSection({
  company,
  fetchWithCompanyAuth,
}: {
  company: CompanyEditData;
  fetchWithCompanyAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>(company.categories ?? []);

  useEffect(() => {
    setSelected(company.categories ?? []);
  }, [company.categories]);

  const toggle = (subcategory: string) => {
    setSelected((prev) =>
      prev.includes(subcategory)
        ? prev.filter((s) => s !== subcategory)
        : [...prev, subcategory]
    );
  };

  const mutation = useMutation({
    mutationFn: async (categories: string[]) => {
      const response = await fetchWithCompanyAuth('/api/company/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Serverfel ${response.status}`);
      }
      return response.json() as Promise<CompanyEditData>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/profile'] });
      toast({ title: 'Sparat', description: 'Era valda tjänster har sparats.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Kunde inte spara', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tjänster ni erbjuder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {Object.values(SERVICE_CATEGORIES).map((category) => (
            <div key={category.id}>
              <p className="text-sm font-semibold text-gray-700 mb-2">{category.name}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {category.subcategories.map((sub) => (
                  <label key={sub} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(sub)}
                      onChange={() => toggle(sub)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    {sub}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button
          onClick={() => mutation.mutate(selected)}
          disabled={mutation.isPending}
          size="sm"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Spara
        </Button>
      </CardContent>
    </Card>
  );
}

// ---- Main page component ---------------------------------------------------

function CompanyEdit() {
  const { companyUser, isLoading: authLoading, getCompanyToken } = useCompanyAccess();
  const { isSignedIn, getToken } = useAuth();
  const [, navigate] = useLocation();
  const setupAttempted = useRef(false);
  const [setupError, setSetupError] = useState(false);

  const fetchWithCompanyAuth = useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
      const token = await getCompanyToken();
      const headers = new Headers(init?.headers ?? {});
      headers.set('Authorization', `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
    [getCompanyToken]
  );

  // Mirror the same metadata-fix logic as company-dashboard
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
            window.location.reload();
          } else {
            setSetupError(true);
          }
        } catch {
          setSetupError(true);
        }
      });
    } else if (!authLoading && !companyUser && !isSignedIn) {
      navigate('/company/login');
    }
  }, [authLoading, companyUser, isSignedIn, getToken, navigate]);

  const { data: company, isLoading } = useQuery({
    queryKey: ['/api/company/profile'],
    enabled: !!companyUser,
    queryFn: async () => {
      const response = await fetchWithCompanyAuth('/api/company/profile');
      if (!response.ok) throw new Error('Kunde inte hämta företagsprofil');
      return response.json() as Promise<CompanyEditData>;
    },
  });

  if (authLoading) return <Spinner />;

  if (setupError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Kunde inte verifiera åtkomst</h1>
          <p className="text-gray-600">
            Vi kunde inte koppla ditt konto till ett godkänt företag. Kontakta oss på{' '}
            <a href="mailto:info@industrin.net" className="text-blue-600 hover:underline">
              info@industrin.net
            </a>{' '}
            om du tror att detta är ett misstag.
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Tillbaka till startsidan
          </button>
        </div>
      </div>
    );
  }

  if (!companyUser) return null;

  if (isLoading) return <Spinner />;

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-gray-600">Kunde inte ladda företagsprofil.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/company/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Redigera företagsprofil</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <AboutSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
        <ContactInfoSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
        <AddressSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
        <ContactsSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
        <LogoSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
        <ServicesSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
      </main>
    </div>
  );
}

export default CompanyEdit;
