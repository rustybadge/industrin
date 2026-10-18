import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useCompanyAccess } from '@/hooks/use-company-access';
import { useAuth } from '@clerk/clerk-react';
import { calculateDataQuality } from '@/utils/data-quality';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CompanyNav from '@/components/company/company-nav';
import { Badge } from '@/components/ui/badge';

// SVG ring constants — r=40, cx=cy=50
const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const FIELD_LABELS: Record<string, string> = {
  hasDescription:    'Företagsbeskrivning',
  hasContactEmail:   'Kontakt-e-post',
  hasPhone:          'Telefonnummer',
  hasWebsite:        'Webbplats',
  hasAddress:        'Adress',
  hasServiceområden: 'Serviceområden',
  hasCategories:     'Tjänstekategorier',
};

function CompanyDashboard() {
  const { companyUser, logout, isLoading: authLoading, getCompanyToken } = useCompanyAccess();
  const { isSignedIn, getToken } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [setupError, setSetupError] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
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

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['/api/company/profile'],
    enabled: !!companyUser,
    queryFn: async () => {
      const response = await fetchWithCompanyAuth('/api/company/profile');
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${body || 'no body'}`);
      }
      return response.json();
    },
  });

  const { data: serviceRequests = [], refetch: refetchRequests } = useQuery<any[]>({
    queryKey: ['/api/company/requests'],
    enabled: !!companyUser,
    queryFn: async () => {
      const response = await fetchWithCompanyAuth('/api/company/requests');
      if (!response.ok) return [];
      return response.json();
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, message }: { requestId: string; message: string }) => {
      const response = await fetchWithCompanyAuth(`/api/company/requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Okänt fel' }));
        throw new Error(err.message);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Svar skickat', description: 'Köparen har fått ditt svar via e-post.' });
      setRespondingTo(null);
      setResponseText('');
      refetchRequests();
    },
    onError: (err: any) => {
      toast({ title: 'Fel', description: err.message || 'Kunde inte skicka svar.', variant: 'destructive' });
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
            onClick={() => { window.location.href = '/'; }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Tillbaka till startsidan
          </button>
        </div>
      </div>
    );
  }

  if (!companyUser) return null;

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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-3">
          <p className="text-gray-700 font-medium">Kunde inte ladda företagsprofil.</p>
          <div className="text-xs font-mono bg-gray-100 px-3 py-2 rounded-none text-left break-all space-y-1">
            <p><span className="text-gray-500">error:</span> {(error as Error).message}</p>
            <p><span className="text-gray-500">companyId:</span> {companyUser?.companyId ?? 'none'}</p>
          </div>
          <button onClick={() => window.location.reload()} className="text-sm text-blue-600 hover:underline">
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  const quality = company ? calculateDataQuality(company) : null;
  const ringScore = quality ? Math.round(quality.percentage) : 0;
  const ringDashoffset = RING_CIRCUMFERENCE * (1 - ringScore / 100);

  const unanswered = serviceRequests.filter((r: any) => !r.hasResponded).length;

  return (
    <div className="bg-white min-h-screen">
      <CompanyNav
        companyName={company?.name ?? ''}
        companySlug={company?.slug}
        activePage="dashboard"
        onNavigate={navigate}
        onLogout={logout}
      />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">

        {/* Row 1: stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

          {/* Card 1 — Förfrågningar (real) */}
          <Card className="rounded-none bg-[#092490] border-[#092490]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Förfrågningar</CardTitle>
              {unanswered > 0 && (
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/30 text-xs">
                  {unanswered} nya
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium text-white">{serviceRequests.length}</div>
              <p className="text-sm text-white/70 mt-1">{unanswered} obesvarade</p>
            </CardContent>
          </Card>

          {/* Cards 2–4 — coming soon, honest */}
          {[
            { label: 'Profilbesök',       sub: 'Mäts när statistik aktiveras' },
            { label: 'Klick till hemsida', sub: 'Mäts när statistik aktiveras' },
            { label: 'Telefonklick',       sub: 'Mäts när statistik aktiveras' },
          ].map(({ label, sub }) => (
            <Card key={label} className="rounded-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <span className="text-xs text-[#D1D5DB] font-medium">Kommer snart</span>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-medium text-[#D1D5DB]">–</div>
                <p className="text-xs text-[#D1D5DB] mt-1">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Row 2: enquiries + profile strength */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Förfrågningar — real */}
          <div className="lg:col-span-3 bg-white border border-[#E5E7EB] p-6 rounded-none">
            <p className="text-base font-medium text-[#111827] mb-5">Senaste förfrågningar</p>

            {serviceRequests.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[#9CA3AF]">Inga förfrågningar i ditt område ännu.</p>
                <p className="text-xs text-[#C4C9D4] mt-1">Nya förfrågningar visas här när köpare söker hjälp i er region.</p>
              </div>
            ) : (
              <ul>
                {serviceRequests.slice(0, 5).map((req: any) => (
                  <li key={req.id} className="py-4 border-b border-[#F3F4F6] last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-[#111827]">{req.serviceType}</p>
                          {req.urgency === 'akut' && (
                            <span className="bg-red-50 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">Akut</span>
                          )}
                          {!req.hasResponded && (
                            <span className="bg-[#cfd8fc] text-[#092490] text-xs font-medium px-2 py-0.5 rounded-full">Ny</span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B7280] mb-1">
                          {req.location || req.region} · {new Date(req.submittedAt).toLocaleDateString('sv-SE')}
                        </p>
                        <p className="text-sm text-[#374151] line-clamp-2">{req.description}</p>
                      </div>
                    </div>

                    {!req.hasResponded ? (
                      respondingTo === req.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={responseText}
                            onChange={e => setResponseText(e.target.value)}
                            placeholder="Skriv ert svar till köparen..."
                            className="w-full text-sm border border-gray-200 rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#092490]"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => respondMutation.mutate({ requestId: req.id, message: responseText })}
                              disabled={!responseText.trim() || respondMutation.isPending}
                              className="text-xs px-4 py-2 bg-[#092490] text-white rounded hover:bg-[#071d74] disabled:opacity-50 transition-colors"
                            >
                              {respondMutation.isPending ? 'Skickar...' : 'Skicka svar'}
                            </button>
                            <button
                              onClick={() => { setRespondingTo(null); setResponseText(''); }}
                              className="text-xs px-4 py-2 border border-gray-200 text-gray-600 rounded hover:border-gray-400 transition-colors"
                            >
                              Avbryt
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRespondingTo(req.id)}
                          className="mt-3 text-xs text-[#092490] font-medium hover:underline"
                        >
                          Svara på förfrågan →
                        </button>
                      )
                    ) : (
                      <p className="mt-2 text-xs text-[#9CA3AF]">✓ Ni har svarat på denna förfrågan</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Profilstyrka — real */}
          <div className="lg:col-span-2 bg-white border border-[#E5E7EB] p-6 rounded-none">
            <p className="text-base font-medium text-[#111827] mb-1">Profilstyrka</p>
            <p className="text-xs text-[#9CA3AF] mb-5 leading-relaxed">
              En komplett profil syns bättre i sökresultat och skapar förtroende hos potentiella kunder.
            </p>

            <div className="flex justify-center mb-4">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="#E5E7EB" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r={RING_RADIUS} fill="none"
                  stroke={ringScore >= 70 ? '#16a34a' : ringScore >= 40 ? '#092490' : '#F0A500'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringDashoffset}
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827">
                  {ringScore}
                </text>
                <text x="50" y="58" textAnchor="middle" fontSize="10" fill="#9CA3AF">/ 100</text>
              </svg>
            </div>

            {/* Real checklist from data quality */}
            {quality && (
              <div className="mt-2 space-y-1">
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const done = quality.completedFields.includes(key);
                  return (
                    <div key={key} className="flex items-center justify-between text-sm text-[#4B5563] py-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${done ? 'bg-[#092490]' : 'border-2 border-[#E5E7EB]'}`} />
                        <span className={done ? '' : 'text-[#9CA3AF]'}>{label}</span>
                      </div>
                      {!done && (
                        <span
                          className="text-[#092490] text-xs cursor-pointer hover:underline"
                          onClick={() => navigate('/company/edit')}
                        >
                          Åtgärda →
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: analytics — honest coming soon */}
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-6 rounded-none">
          <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
            <p className="text-sm font-medium text-[#111827]">Statistik & insikter</p>
            <span className="text-xs text-[#9CA3AF] bg-white border border-[#E5E7EB] px-2 py-0.5 rounded">Kommer snart</span>
          </div>
          <p className="text-sm text-[#9CA3AF]">
            Profilbesök, klick, sökord och branschjämförelser aktiveras när statistikinsamlingen är igång.
            Förfrågningar som kommer in visas redan nu ovan.
          </p>
        </div>

        {/* Row 4: recommendations — driven by real profile quality */}
        {quality && quality.missingFields.length > 0 && (
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-5 rounded-none">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-[#111827]">Rekommenderade åtgärder</p>
                <p className="text-sm text-[#9CA3AF] mt-0.5">
                  Fyll i {quality.missingFields.length} saknade {quality.missingFields.length === 1 ? 'fält' : 'fält'} för att stärka er profil och synas bättre.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  className="text-sm px-4 py-2 rounded-none border border-[#092490] bg-[#092490] text-white hover:bg-[#071d74] transition-colors"
                  onClick={() => navigate('/company/edit')}
                >
                  Uppdatera profil
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default CompanyDashboard;
