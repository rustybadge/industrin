import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Building, LogOut } from 'lucide-react';
import { useCompanyAccess } from '@/hooks/use-company-access';
import { useAuth } from '@clerk/clerk-react';

// SVG ring constants — r=34, cx=cy=40
const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 213.6
const RING_SCORE = 74; // TODO: wire to real data
const RING_DASHOFFSET = RING_CIRCUMFERENCE * (1 - RING_SCORE / 100); // ≈ 55.5

function Sparkline({ heights }: { heights: string[] }) {
  return (
    <div className="h-8 flex items-end gap-0.5 mt-3">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-2 rounded-sm bg-gray-200"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

function CompanyDashboard() {
  const { companyUser, logout, isLoading: authLoading, getCompanyToken } = useCompanyAccess();
  const { isSignedIn, getToken } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [setupError, setSetupError] = useState(false);
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

  // Fetch company profile — hooks must be before any early returns
  const { data: company, isLoading, error } = useQuery({
    queryKey: ['/api/company/profile'],
    enabled: !!companyUser,
    queryFn: async () => {
      const response = await fetchWithCompanyAuth('/api/company/profile');
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error('[company-dashboard] /api/company/profile failed:', response.status, body);
        throw new Error(`HTTP ${response.status}: ${body || 'no body'}`);
      }
      return response.json();
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

  if (!companyUser) {
    return null;
  }

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
          <div className="text-xs font-mono bg-gray-100 px-3 py-2 rounded text-left break-all space-y-1">
            <p><span className="text-gray-500">error:</span> {(error as Error).message}</p>
            <p><span className="text-gray-500">companyId:</span> {companyUser?.companyId ?? 'none'}</p>
            <p><span className="text-gray-500">userId:</span> {companyUser?.id ?? 'none'}</p>
            <p><span className="text-gray-500">role:</span> {companyUser?.role ?? 'none'}</p>
          </div>
          <button onClick={() => window.location.reload()} className="text-sm text-blue-600 hover:underline">
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  const isDashboard = location === '/company/dashboard';

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 h-14">
        <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Left: icon + company name */}
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {company?.name ?? ''} {/* TODO: wire to real data */}
            </span>
          </div>

          {/* Right: nav items */}
          <nav className="flex items-center gap-1">
            <span
              className={
                'text-sm px-1 transition-colors ' +
                (isDashboard
                  ? 'text-gray-900 font-semibold border-b-2 border-[#1D9E75] cursor-default'
                  : 'text-gray-500 hover:text-gray-800 cursor-pointer')
              }
            >
              Dashboard
            </span>

            <span className="text-gray-300 mx-2 select-none">|</span>

            <span
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer px-1"
              onClick={() => navigate('/company/edit')}
            >
              Redigera profil
            </span>

            <span className="text-gray-300 mx-2 select-none">|</span>

            <span
              className={
                'text-sm transition-colors px-1 ' +
                (company?.slug
                  ? 'text-gray-500 hover:text-gray-800 cursor-pointer'
                  : 'text-gray-300 cursor-not-allowed')
              }
              onClick={() => company?.slug && navigate('/företag/' + company.slug)}
            >
              Visa publik profil
            </span>

            <span className="text-gray-300 mx-2 select-none">|</span>

            <span
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer px-1 flex items-center gap-1"
              onClick={() => logout()}
            >
              <LogOut className="h-3.5 w-3.5" />
              Logga ut
            </span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Row 1: four stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {/* Card 1 — Profilvisningar */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Profilvisningar</p>
            <p className="text-3xl font-semibold text-[#111] mt-1">312</p> {/* TODO: wire to real data */}
            <p className="text-xs text-[#1D9E75] mt-1">↑ 18% vs förra veckan</p> {/* TODO: wire to real data */}
            <Sparkline heights={['40%', '55%', '45%', '70%', '60%', '80%', '65%']} /> {/* TODO: wire to real data */}
          </div>

          {/* Card 2 — Nya förfrågningar (highlighted) */}
          <div className="rounded-lg border border-[#1D9E75] bg-white p-5 relative">
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1D9E75] text-white text-xs flex items-center justify-center">
              7 {/* TODO: wire to real data */}
            </span>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Nya förfrågningar</p>
            <p className="text-3xl font-semibold text-[#111] mt-1">7</p> {/* TODO: wire to real data */}
            <p className="text-xs text-[#F0A500] mt-1">3 obesvarade</p> {/* TODO: wire to real data */}
          </div>

          {/* Card 3 — Sökträffar */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Sökträffar</p>
            <p className="text-3xl font-semibold text-[#111] mt-1">1 840</p> {/* TODO: wire to real data */}
            <p className="text-xs text-[#1D9E75] mt-1">↑ 7% vs förra veckan</p> {/* TODO: wire to real data */}
            <Sparkline heights={['30%', '50%', '40%', '60%', '55%', '75%', '70%']} /> {/* TODO: wire to real data */}
          </div>

          {/* Card 4 — Klick till hemsida */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Klick till hemsida</p>
            <p className="text-3xl font-semibold text-[#111] mt-1">41</p> {/* TODO: wire to real data */}
            <p className="text-xs text-gray-400 mt-1">Liknande förra veckan</p> {/* TODO: wire to real data */}
            <Sparkline heights={['60%', '55%', '65%', '50%', '60%', '45%', '55%']} /> {/* TODO: wire to real data */}
          </div>
        </div>

        {/* Row 2: enquiries + profile strength */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left (lg:col-span-3): Senaste förfrågningar */}
          <div className="lg:col-span-3 rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Senaste förfrågningar</p>

            <ul>
              {/* TODO: wire to real data */}
              {[
                { unread: true,  sender: 'AB Volvo Components · Begäran om offert på hydraulikservice', time: '2 tim' },
                { unread: true,  sender: 'Sandvik Machining · Underhållskontrakt CNC',                  time: '5 tim' },
                { unread: true,  sender: 'Scania CV AB · Akut reparation växellåda',                    time: 'igår'  },
                { unread: false, sender: 'SKF Sverige · Ny samarbetsförfrågan',                         time: '3 d'   },
                { unread: false, sender: 'Atlas Copco · Kompressorservice',                             time: '5 d'   },
              ].map((row, i) => (
                <li key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: row.unread ? '#1D9E75' : '#D1D5DB' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{row.sender}</p>
                    <p className="text-xs text-gray-400">{row.time}</p>
                  </div>
                  {row.unread ? (
                    <span className="bg-[#1D9E75]/10 text-[#1D9E75] text-xs px-2 py-0.5 rounded flex-shrink-0">
                      Ny
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded flex-shrink-0">
                      Läst
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <button className="text-sm text-[#1D9E75] hover:underline cursor-pointer mt-3">
              Visa alla förfrågningar →
            </button>
          </div>

          {/* Right (lg:col-span-2): Profilstyrka */}
          <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-gray-900">Profilstyrka</p>
            <p className="text-xs text-gray-400 mb-4 mt-1 leading-relaxed">
              Profilstyrka visar hur komplett din företagsprofil är på industrin.net. En starkare profil syns bättre i sökresultat och skapar förtroende hos potentiella kunder.
            </p>

            {/* Circular progress ring */}
            <div className="flex justify-center mb-4">
              <svg width="80" height="80" viewBox="0 0 80 80">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="6"
                />
                {/* Progress circle — 74% TODO: wire to real data */}
                <circle
                  cx="40"
                  cy="40"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#1D9E75"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_DASHOFFSET}
                  transform="rotate(-90 40 40)"
                />
                {/* Center text */}
                <text x="40" y="37" textAnchor="middle" fontSize="16" fontWeight="600" fill="#111">
                  {RING_SCORE} {/* TODO: wire to real data */}
                </text>
                <text x="40" y="50" textAnchor="middle" fontSize="10" fill="#6B7280">
                  / 100
                </text>
              </svg>
            </div>

            {/* Sub-metrics */}
            <div className="space-y-2 text-xs">
              {/* TODO: wire to real data */}
              {[
                { label: 'Profil komplett',       value: '82%',    color: 'text-[#1D9E75]' },
                { label: 'Svarsfrekvens',          value: '91%',    color: 'text-[#1D9E75]' },
                { label: 'Org.nummer verifierat',  value: 'Ja',     color: 'text-[#1D9E75]' },
                { label: 'Certifieringar',         value: 'Saknas', color: 'text-[#F0A500]' },
              ].map((m) => (
                <div key={m.label} className="flex justify-between">
                  <span className="text-gray-500">{m.label}</span>
                  <span className={m.color}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Checklist */}
            <div className="space-y-2 mt-4 text-xs">
              {/* TODO: wire to real data */}
              <div className="flex items-center gap-1.5">
                <span className="text-[#1D9E75] font-medium">&#10003;</span>
                <span className="text-gray-600">Kontaktpersoner tillagda</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#1D9E75] font-medium">&#10003;</span>
                <span className="text-gray-600">Agenturer listade</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#F0A500] font-medium">!</span>
                <span className="text-gray-600">Ladda upp certifikat</span>
                <span
                  className="text-[#1D9E75] text-xs cursor-pointer hover:underline ml-1"
                  onClick={() => navigate('/company/edit')}
                >
                  Lägg till →
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#F0A500] font-medium">!</span>
                <span className="text-gray-600">Kontaktfotos saknas</span>
                <span
                  className="text-[#1D9E75] text-xs cursor-pointer hover:underline ml-1"
                  onClick={() => navigate('/company/edit')}
                >
                  Lägg till →
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: three analytics cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Col 1: Synlighet per kanal */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Synlighet per kanal</p>
            <div className="space-y-4">
              {/* TODO: wire to real data */}
              {[
                { label: 'Organisk sökning', pct: 68 },
                { label: 'Direktlänk',       pct: 22 },
                { label: 'Nyhetsbrev',        pct: 10 },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="text-xs text-gray-500 mb-1 flex justify-between">
                    <span>{bar.label}</span>
                    <span className="text-gray-700">{bar.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div
                      className="h-full bg-[#1D9E75] rounded-full"
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: Heta sökord */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Heta sökord</p>
            <div className="flex flex-wrap gap-2">
              {/* TODO: wire to real data */}
              {['stångmatare', 'LNS magasin', 'magnetbord'].map((kw) => (
                <span
                  key={kw}
                  className="text-xs px-3 py-1.5 rounded-full bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20"
                >
                  {kw}
                </span>
              ))}
              {['AMF spännverktyg', 'rhenus skärvätska', 'kärnborrmaskin', 'CNC tillbehör'].map((kw) => (
                <span
                  key={kw}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Col 3: Branschjämförelse */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Branschjämförelse</p>
            <div className="space-y-4">
              {/* TODO: wire to real data */}
              {[
                { label: 'Detta företag',     value: 21, width: '70%',  textColor: 'text-[#1D9E75]', barColor: 'bg-[#1D9E75]' },
                { label: 'Snitt i kategorin', value: 11, width: '37%',  textColor: 'text-gray-400',  barColor: 'bg-gray-400'  },
                { label: 'Topp i kategorin',  value: 30, width: '100%', textColor: 'text-gray-400',  barColor: 'bg-gray-400'  },
              ].map((row) => (
                <div key={row.label}>
                  <div className="text-xs text-gray-500 mb-1 flex justify-between">
                    <span>{row.label}</span>
                    <span className={row.textColor}>{row.value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div
                      className={`h-full rounded-full ${row.barColor}`}
                      style={{ width: row.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: Snabb åtgärd */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Snabb åtgärd
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              className="text-sm px-4 py-2 rounded-md border border-gray-200 bg-white text-gray-700 hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => toast({ title: 'Kommer snart' })}
            >
              Förbättra beskrivning med AI
            </button>
            <button
              className="text-sm px-4 py-2 rounded-md border border-gray-200 bg-white text-gray-700 hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => navigate('/company/edit')}
            >
              Lägg till certifieringar
            </button>
            <button
              className="text-sm px-4 py-2 rounded-md border border-gray-200 bg-white text-gray-700 hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => toast({ title: 'Kommer snart' })}
            >
              Öka synligheten
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}

export default CompanyDashboard;
