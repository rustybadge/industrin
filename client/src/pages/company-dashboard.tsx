import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Building, LogOut } from 'lucide-react';
import { useCompanyAccess } from '@/hooks/use-company-access';
import { useAuth } from '@clerk/clerk-react';
import { calculateDataQuality } from '@/utils/data-quality';

// SVG ring constants — r=40, cx=cy=50
const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 251.3

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
          <div className="text-xs font-mono bg-gray-100 px-3 py-2 rounded-none text-left break-all space-y-1">
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

  const ringScore = company ? Math.round(calculateDataQuality(company).percentage) : 0;
  const ringDashoffset = RING_CIRCUMFERENCE * (1 - ringScore / 100);

  const isDashboard = location === '/company/dashboard';

  // Inline sparkline points — 7 data points, max=80, SVG viewBox 0 0 80 32
  const heroPoints = [40, 55, 45, 70, 60, 80, 65];
  const standardPoints = [40, 55, 45, 70, 60, 80, 65];
  const searchPoints = [30, 50, 40, 60, 55, 75, 70];
  const maxVal = 80;
  const svgH = 32;
  const svgW = 80;

  function toPolyline(pts: number[]) {
    const step = svgW / (pts.length - 1);
    return pts
      .map((v, i) => `${(i * step).toFixed(1)},${(svgH - (v / maxVal) * svgH).toFixed(1)}`)
      .join(' ');
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Top nav */}
      <header className="bg-white border-b border-[#E5E7EB] h-14">
        <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Left: icon + company name */}
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-[#9CA3AF]" />
            <span className="text-sm font-medium text-[#4B5563]">
              {company?.name ?? ''} {/* TODO: wire to real data */}
            </span>
          </div>

          {/* Right: nav items */}
          <nav className="flex items-center gap-1">
            <span
              className={
                isDashboard
                  ? 'text-sm px-1 text-[#092490] font-medium cursor-default'
                  : 'text-sm text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer px-1'
              }
            >
              Dashboard
            </span>

            <span className="text-[#E5E7EB] mx-2 select-none">|</span>

            <span
              className="text-sm text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer px-1"
              onClick={() => navigate('/company/edit')}
            >
              Redigera profil
            </span>

            <span className="text-[#E5E7EB] mx-2 select-none">|</span>

            <span
              className={
                'text-sm transition-colors px-1 ' +
                (company?.slug
                  ? 'text-[#4B5563] hover:text-[#111827] cursor-pointer'
                  : 'text-[#9CA3AF] cursor-not-allowed')
              }
              onClick={() => company?.slug && navigate('/företag/' + company.slug)}
            >
              Visa publik profil
            </span>

            <span className="text-[#E5E7EB] mx-2 select-none">|</span>

            <span
              className="text-sm text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer px-1 flex items-center gap-1"
              onClick={() => logout()}
            >
              <LogOut className="h-3.5 w-3.5" />
              Logga ut
            </span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">

        {/* Row 1: four stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {/* Card 1 — Nya förfrågningar (HERO CARD) */}
          <div className="bg-[#092490] p-7 rounded-none relative overflow-hidden">
            <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/20 text-white text-xs flex items-center justify-center">
              7 {/* TODO: wire to real data */}
            </span>
            <p className="text-sm font-medium text-white/80">Nya förfrågningar</p>
            <p className="text-4xl font-medium text-white mt-1">7</p> {/* TODO: wire to real data */}
            <p className="text-sm text-white/80 mt-1">3 obesvarade</p> {/* TODO: wire to real data */}
            <svg
              viewBox="0 0 80 32"
              width="80"
              height="32"
              className="absolute bottom-6 right-6"
            >
              <polyline
                points={toPolyline(heroPoints)}
                stroke="white"
                strokeOpacity="0.7"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>

          {/* Card 2 — Profilvisningar (STANDARD CARD) */}
          <div className="bg-white border border-[#E5E7EB] p-6 rounded-none relative overflow-hidden">
            <p className="text-sm font-medium text-[#111827]">Profilvisningar</p>
            <p className="text-3xl font-medium text-[#111827] mt-1">312</p> {/* TODO: wire to real data */}
            <p className="text-xs text-[#092490] font-medium mt-1">↑ 18% vs förra veckan</p> {/* TODO: wire to real data */}
            <svg
              viewBox="0 0 80 32"
              width="80"
              height="32"
              className="absolute bottom-6 right-6"
            >
              <polyline
                points={toPolyline(standardPoints)}
                stroke="#092490"
                strokeOpacity="0.6"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>

          {/* Card 3 — Sökträffar (STANDARD CARD) */}
          <div className="bg-white border border-[#E5E7EB] p-6 rounded-none relative overflow-hidden">
            <p className="text-sm font-medium text-[#111827]">Sökträffar</p>
            <p className="text-3xl font-medium text-[#111827] mt-1">1 840</p> {/* TODO: wire to real data */}
            <p className="text-xs text-[#092490] font-medium mt-1">↑ 7% vs förra veckan</p> {/* TODO: wire to real data */}
            <svg
              viewBox="0 0 80 32"
              width="80"
              height="32"
              className="absolute bottom-6 right-6"
            >
              <polyline
                points={toPolyline(searchPoints)}
                stroke="#092490"
                strokeOpacity="0.6"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>

          {/* Card 4 — Klick till hemsida (UTILITY CARD) */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-5 rounded-none">
            <p className="text-sm font-medium text-[#111827]">Klick till hemsida</p>
            <p className="text-2xl font-medium text-[#111827] mt-1">41</p> {/* TODO: wire to real data */}
            <div className="h-1.5 bg-[#E5E7EB] rounded-full mt-3">
              <div className="h-full bg-[#092490] rounded-full" style={{ width: '41%' }} /> {/* TODO: wire to real data */}
            </div>
          </div>
        </div>

        {/* Row 2: enquiries + profile strength */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Left (lg:col-span-3): Senaste förfrågningar — STANDARD CARD */}
          <div className="lg:col-span-3 bg-white border border-[#E5E7EB] p-6 rounded-none">
            <p className="text-base font-medium text-[#111827] mb-5">Senaste förfrågningar</p>

            <ul>
              {/* TODO: wire to real data */}
              {[
                { unread: true,  sender: 'AB Volvo Components', subject: 'Begäran om offert på hydraulikservice', time: '2 tim' },
                { unread: true,  sender: 'Sandvik Machining',   subject: 'Underhållskontrakt CNC',               time: '5 tim' },
                { unread: true,  sender: 'Scania CV AB',        subject: 'Akut reparation växellåda',            time: 'igår'  },
                { unread: false, sender: 'SKF Sverige',         subject: 'Ny samarbetsförfrågan',                time: '3 d'   },
                { unread: false, sender: 'Atlas Copco',         subject: 'Kompressorservice',                    time: '5 d'   },
              ].map((row, i) => (
                <li key={i} className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-[#111827]">{row.sender}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">{row.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {row.unread ? (
                      <span className="bg-[#cfd8fc] text-[#092490] text-xs font-medium px-2 py-0.5 rounded-full">
                        Ny
                      </span>
                    ) : (
                      <span className="bg-[#F3F4F6] text-[#9CA3AF] text-xs font-medium px-2 py-0.5 rounded-full">
                        Läst
                      </span>
                    )}
                    <span className="text-xs text-[#092490] font-medium cursor-pointer ml-1">Visa</span>
                  </div>
                </li>
              ))}
            </ul>

            <a className="block w-full text-center text-sm text-[#9CA3AF] hover:text-[#4B5563] mt-4 pt-4 border-t border-[#F3F4F6] cursor-pointer">
              Visa alla förfrågningar
            </a>
          </div>

          {/* Right (lg:col-span-2): Profilstyrka — STANDARD CARD */}
          <div className="lg:col-span-2 bg-white border border-[#E5E7EB] p-6 rounded-none">
            <p className="text-base font-medium text-[#111827] mb-1">Profilstyrka</p>
            <p className="text-xs text-[#9CA3AF] mb-5 leading-relaxed">
              Profilstyrka visar hur komplett din företagsprofil är på industrin.net. En starkare profil syns bättre i sökresultat och skapar förtroende hos potentiella kunder.
            </p>

            {/* Circular progress ring */}
            <div className="flex justify-center mb-4">
              <svg width="100" height="100" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#092490"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringDashoffset}
                  transform="rotate(-90 50 50)"
                />
                {/* Center text */}
                <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827">
                  {ringScore}
                </text>
                <text x="50" y="58" textAnchor="middle" fontSize="10" fill="#9CA3AF">
                  / 100
                </text>
              </svg>
            </div>

            {/* Sub-metrics */}
            <div className="text-xs">
              {/* TODO: wire to real data */}
              {[
                { label: 'Profil komplett',       value: '82%',    color: 'text-[#092490]' },
                { label: 'Svarsfrekvens',          value: '91%',    color: 'text-[#092490]' },
                { label: 'Org.nummer verifierat',  value: 'Ja',     color: 'text-[#092490]' },
                { label: 'Certifieringar',         value: 'Saknas', color: 'text-[#F0A500]' },
              ].map((m) => (
                <div key={m.label} className="flex justify-between py-1.5 border-b border-[#F3F4F6] last:border-0">
                  <span className="text-[#4B5563]">{m.label}</span>
                  <span className={m.color}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Checklist */}
            <div className="mt-4">
              {/* TODO: wire to real data */}
              <div className="flex items-center gap-2 text-sm text-[#4B5563] py-1">
                <span className="w-3 h-3 rounded-full bg-[#092490] flex-shrink-0" />
                <span>Kontaktpersoner tillagda</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#4B5563] py-1">
                <span className="w-3 h-3 rounded-full bg-[#092490] flex-shrink-0" />
                <span>Agenturer listade</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#4B5563] py-1">
                <span className="w-3 h-3 rounded-full border-2 border-[#E5E7EB] flex-shrink-0" />
                <span>Ladda upp certifikat</span>
                <span
                  className="text-[#092490] text-xs cursor-pointer hover:underline ml-1"
                  onClick={() => navigate('/company/edit')}
                >
                  Lägg till →
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#4B5563] py-1">
                <span className="w-3 h-3 rounded-full border-2 border-[#E5E7EB] flex-shrink-0" />
                <span>Kontaktfotos saknas</span>
                <span
                  className="text-[#092490] text-xs cursor-pointer hover:underline ml-1"
                  onClick={() => navigate('/company/edit')}
                >
                  Lägg till →
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: three analytics cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">

          {/* Col 1: Synlighet per kanal — STANDARD CARD */}
          <div className="bg-white border border-[#E5E7EB] p-6 rounded-none">
            <p className="text-sm font-medium text-[#111827] mb-4">Synlighet per kanal</p>
            <div className="space-y-4">
              {/* TODO: wire to real data */}
              {[
                { label: 'Organisk sökning', pct: 68 },
                { label: 'Direktlänk',       pct: 22 },
                { label: 'Nyhetsbrev',        pct: 10 },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-xs text-[#4B5563]">{bar.label}</span>
                    <span className="text-xs font-medium text-[#111827]">{bar.pct}%</span>
                  </div>
                  <div className="h-2 bg-[#E5E7EB] rounded-full">
                    <div
                      className="h-full bg-[#092490] rounded-full"
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: Heta sökord — STANDARD CARD */}
          <div className="bg-white border border-[#E5E7EB] p-6 rounded-none">
            <p className="text-sm font-medium text-[#111827] mb-4">Heta sökord</p>
            <div className="flex flex-wrap gap-2">
              {/* TODO: wire to real data */}
              {['stångmatare', 'LNS magasin', 'magnetbord'].map((kw) => (
                <span
                  key={kw}
                  className="bg-[#cfd8fc] text-[#092490] border border-[#092490]/20 text-xs px-3 py-1.5 rounded-full"
                >
                  {kw}
                </span>
              ))}
              {['AMF spännverktyg', 'rhenus skärvätska', 'kärnborrmaskin', 'CNC tillbehör'].map((kw) => (
                <span
                  key={kw}
                  className="bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] text-xs px-3 py-1.5 rounded-full"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Col 3: Branschjämförelse — UTILITY CARD */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-5 rounded-none">
            <p className="text-sm font-medium text-[#111827] mb-4">Branschjämförelse</p>
            <div className="space-y-4">
              {/* TODO: wire to real data */}
              {[
                { label: 'Detta företag',     value: 21, width: '70%',  textColor: 'text-[#092490]', barColor: 'bg-[#092490]' },
                { label: 'Snitt i kategorin', value: 11, width: '37%',  textColor: 'text-[#9CA3AF]', barColor: 'bg-[#E5E7EB]' },
                { label: 'Topp i kategorin',  value: 30, width: '100%', textColor: 'text-[#9CA3AF]', barColor: 'bg-[#E5E7EB]' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-xs text-[#4B5563]">{row.label}</span>
                    <span className={`text-xs font-medium ${row.textColor}`}>{row.value}</span>
                  </div>
                  <div className="h-2 bg-[#E5E7EB] rounded-full">
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

        {/* Row 4: Snabb åtgärd — UTILITY CARD */}
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-5 rounded-none">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-medium text-[#111827]">Snabb åtgärd</p>
              <p className="text-sm text-[#9CA3AF] mt-0.5">Nästa steg för att förbättra er profil</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                className="text-sm px-4 py-2 rounded-none border border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#9CA3AF] transition-colors"
                onClick={() => toast({ title: 'Kommer snart' })}
              >
                Förbättra beskrivning med AI
              </button>
              <button
                className="text-sm px-4 py-2 rounded-none border border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#9CA3AF] transition-colors"
                onClick={() => navigate('/company/edit')}
              >
                Lägg till certifieringar
              </button>
              <button
                className="text-sm px-4 py-2 rounded-none border border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#9CA3AF] transition-colors"
                onClick={() => toast({ title: 'Kommer snart' })}
              >
                Öka synligheten
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default CompanyDashboard;
