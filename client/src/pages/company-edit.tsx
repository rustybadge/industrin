import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Building, LogOut, Loader2, Trash2, Plus, Upload, Play, Briefcase, Award, Lock } from 'lucide-react';
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

// ---- Shared input class helpers --------------------------------------------

const inputClass =
  'w-full bg-white border border-[#E5E7EB] rounded-none px-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40';

const labelClass = 'block text-sm font-medium text-[#4B5563] mb-1.5';

const saveButtonClass =
  'text-sm font-medium px-5 py-2 rounded-none bg-[#1D9E75] text-white hover:bg-[#167A5A] transition-colors disabled:opacity-40';

// ---- Section: Om företaget -------------------------------------------------

function AboutSection({
  company,
  fetchWithCompanyAuth,
  isFirst,
}: {
  company: CompanyEditData;
  fetchWithCompanyAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  isFirst?: boolean;
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
    <div className={isFirst ? '' : 'border-t border-[#E5E7EB] pt-8 mt-8'}>
      <h2 className="text-lg font-semibold text-[#111827] mb-1">Om företaget</h2>
      <p className="text-sm text-[#9CA3AF] mb-5">Beskriv ert företag och era tjänster.</p>
      <div className="space-y-4">
        <div>
          <label htmlFor="description_sv" className={labelClass}>Beskrivning</label>
          <textarea
            id="description_sv"
            value={descriptionSv}
            onChange={(e) => setDescriptionSv(e.target.value)}
            rows={8}
            className={`${inputClass} resize-none min-h-[120px]`}
            placeholder="Beskriv ert företag, era tjänster och vad som gör er unika inom branschen."
          />
        </div>
        <button
          onClick={() => mutation.mutate({ description_sv: descriptionSv })}
          disabled={mutation.isPending}
          className={saveButtonClass}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />}
          Spara
        </button>
      </div>
    </div>
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
    <div className="border-t border-[#E5E7EB] pt-8 mt-8">
      <h2 className="text-lg font-semibold text-[#111827] mb-1">Kontaktuppgifter</h2>
      <p className="text-sm text-[#9CA3AF] mb-5">Telefon, webbplats och e-post som visas på er profil.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className={labelClass}>Telefon</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-123 45 67"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="website" className={labelClass}>Webbplats</label>
            <input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="www.ertforetag.se"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className={labelClass}>Kontakt-e-post</label>
            <input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="info@ertforetag.se"
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={() => mutation.mutate({ phone, website, contactEmail })}
          disabled={mutation.isPending}
          className={saveButtonClass}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />}
          Spara
        </button>
      </div>
    </div>
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
  }, [company.profile?.visitingAddress, company.profile?.postalAddress, company.profile?.openingHours]);

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
    <div className="border-t border-[#E5E7EB] pt-8 mt-8">
      <h2 className="text-lg font-semibold text-[#111827] mb-1">Adress &amp; öppettider</h2>
      <p className="text-sm text-[#9CA3AF] mb-5">Er besöksadress och öppettider visas på er profilsida.</p>
      <div className="space-y-4">
        <div>
          <label htmlFor="visitingAddress" className={labelClass}>Besöksadress</label>
          <input
            id="visitingAddress"
            value={visitingAddress}
            onChange={(e) => setVisitingAddress(e.target.value)}
            placeholder="Industrivägen 5, 123 45 Stad"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="postalAddress" className={labelClass}>Postadress</label>
          <input
            id="postalAddress"
            value={postalAddress}
            onChange={(e) => setPostalAddress(e.target.value)}
            placeholder="Box 123, 123 45 Stad"
            className={inputClass}
          />
          <p className="text-xs text-[#9CA3AF] mt-1.5">Lämna tomt om samma som besöksadressen.</p>
        </div>
        <div>
          <label htmlFor="openingHours" className={labelClass}>Öppettider</label>
          <input
            id="openingHours"
            value={openingHours}
            onChange={(e) => setOpeningHours(e.target.value)}
            placeholder="Mån–Fre 07:00–16:00"
            className={inputClass}
          />
          <p className="text-xs text-[#9CA3AF] mt-1.5">
            Fyll i era vanliga öppettider. Exempel: Mån–Fre 07:00–16:00, Lör 08:00–12:00.
          </p>
        </div>
        <button
          onClick={() =>
            mutation.mutate({
              profile: { visitingAddress, postalAddress, openingHours },
            })
          }
          disabled={mutation.isPending}
          className={saveButtonClass}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />}
          Spara
        </button>
      </div>
    </div>
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
    <div className="border-t border-[#E5E7EB] pt-8 mt-8">
      <h2 className="text-lg font-semibold text-[#111827] mb-1">Kontaktpersoner</h2>
      <p className="text-sm text-[#9CA3AF] mb-5">Lägg till namngivna kontakter som visas på er företagsprofil.</p>

      {company.contacts.length > 0 && (
        <ul className="divide-y divide-[#F3F4F6] mb-6">
          {company.contacts.map((contact) => (
            <li key={contact.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-[#111827]">{contact.name}</p>
                {contact.phone && (
                  <p className="text-xs text-[#9CA3AF]">{contact.phone}</p>
                )}
                {contact.email && (
                  <p className="text-xs text-[#9CA3AF]">{contact.email}</p>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate(contact.id)}
                disabled={deleteMutation.isPending}
                aria-label={`Ta bort ${contact.name}`}
                className="p-1.5 rounded hover:bg-[#F3F4F6] transition-colors"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-4">
        <p className="text-sm font-medium text-[#4B5563]">Lägg till ny kontakt</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="newContactName" className={labelClass}>Namn *</label>
            <input
              id="newContactName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Anna Andersson"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="newContactPhone" className={labelClass}>Telefon</label>
            <input
              id="newContactPhone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="010-123 45 67"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="newContactEmail" className={labelClass}>E-post</label>
            <input
              id="newContactEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="anna@ertforetag.se"
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={addMutation.isPending}
          className="inline-flex items-center text-sm font-medium px-5 py-2 rounded-none border border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#9CA3AF] transition-colors disabled:opacity-40"
        >
          {addMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Lägg till kontakt
        </button>
      </div>
    </div>
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
    <div className="border-t border-[#E5E7EB] pt-8 mt-8">
      <h2 className="text-lg font-semibold text-[#111827] mb-1">Logotyp</h2>
      <p className="text-sm text-[#9CA3AF] mb-5">Visas på er profilsida och i sökresultat.</p>

      {company.logoUrl && (
        <div className="border border-[#E5E7EB] rounded-none p-3 inline-block mb-4">
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

      <div
        className="border-2 border-dashed border-[#E5E7EB] rounded-none bg-white p-8 text-center hover:border-[#1D9E75]/50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#9CA3AF]" />
            <span className="text-sm text-[#4B5563]">Laddar upp...</span>
          </div>
        ) : (
          <>
            <Upload className="h-5 w-5 text-[#9CA3AF] mx-auto mb-2" />
            <p className="text-sm text-[#4B5563]">Dra och släpp eller klicka för att ladda upp</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Max 2 MB. PNG eller SVG med transparent bakgrund rekommenderas.</p>
          </>
        )}
      </div>
    </div>
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
  const [openCategory, setOpenCategory] = useState<string | null>(null);

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
    <div className="border-t border-[#E5E7EB] pt-8 mt-8">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-[#111827] mb-1">Tjänster</h2>
          <p className="text-sm text-[#9CA3AF]">Välj de tjänster ert företag erbjuder</p>
        </div>
        <span className="text-sm text-[#9CA3AF]">{selected.length} valda</span>
      </div>

      <div className="border-t border-[#E5E7EB]">
        {Object.values(SERVICE_CATEGORIES).map((category) => {
          const selectedInCategory = category.subcategories.filter((s) => selected.includes(s)).length;
          return (
            <div key={category.id} className="border-b border-[#E5E7EB]">
              <button
                onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                className="flex items-center justify-between w-full py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#111827]">{category.name}</span>
                  {selectedInCategory > 0 && (
                    <span className="bg-[#E8F7F2] text-[#1D9E75] text-xs font-semibold px-2 py-0.5 rounded-full">
                      {selectedInCategory}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-[#9CA3AF] transition-transform duration-150 ${openCategory === category.id ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {openCategory === category.id && (
                <div className="pb-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                    {category.subcategories.map((sub) => (
                      <label key={sub} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.includes(sub)}
                          onChange={() => toggle(sub)}
                          className="w-4 h-4 rounded border-[#E5E7EB] accent-[#1D9E75]"
                        />
                        <span className={`text-sm select-none ${selected.includes(sub) ? 'text-[#111827] font-medium' : 'text-[#4B5563]'}`}>
                          {sub}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <button
          onClick={() => mutation.mutate(selected)}
          disabled={mutation.isPending}
          className={saveButtonClass}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />}
          Spara tjänster
        </button>
      </div>
    </div>
  );
}

// ---- Section: Premium features ---------------------------------------------

function PremiumSection({ company }: { company: CompanyEditData & { tier?: string } }) {
  const { toast } = useToast();
  const isPremium = company.tier === 'premium';

  const features = [
    { Icon: Play,      title: 'Presentation via film',  desc: 'Bädda in en YouTube-film om er verksamhet' },
    { Icon: Briefcase, title: 'Filer & PDF',            desc: 'Ladda upp broschyrer och produktblad' },
    { Icon: Award,     title: 'Referensprojekt',        desc: 'Visa upp era bästa uppdrag och kunder' },
    { Icon: Lock,      title: 'Certifieringar',         desc: 'Lyft fram era certifieringar och godkännanden' },
  ] as const;

  return (
    <div className="border-t border-[#E5E7EB] pt-8 mt-8">
      <h2 className="text-lg font-semibold text-[#111827] mb-1">Premium-funktioner</h2>
      <p className="text-sm text-[#9CA3AF] mb-5">Lås upp för att synas mer och nå fler kunder.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {features.map(({ Icon, title, desc }) => (
          <div key={title} className="bg-white border border-[#E5E7EB] rounded-none p-6 relative overflow-hidden">
            {!isPremium && (
              <>
                <div className="filter blur-sm select-none pointer-events-none">
                  <Icon className="h-5 w-5 text-[#9CA3AF] mb-3" />
                  <p className="text-sm font-semibold text-[#111827] mb-1">{title}</p>
                  <p className="text-xs text-[#4B5563] leading-relaxed">{desc}</p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60">
                  <span className="text-sm font-semibold text-[#111827]">Premium</span>
                  <span
                    className="text-sm text-[#1D9E75] font-medium mt-1 cursor-pointer hover:underline"
                    onClick={() => toast({ title: 'Kommer snart', description: 'Premiumfunktioner lanseras inom kort.' })}
                  >
                    Uppgradera för åtkomst
                  </span>
                </div>
              </>
            )}
            {isPremium && (
              <>
                <Icon className="h-5 w-5 text-[#9CA3AF] mb-3" />
                <p className="text-sm font-semibold text-[#111827] mb-1">{title}</p>
                <p className="text-xs text-[#4B5563] leading-relaxed">{desc}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Main page component ---------------------------------------------------

function CompanyEdit() {
  const { companyUser, logout, isLoading: authLoading, getCompanyToken } = useCompanyAccess();
  const { isSignedIn, getToken } = useAuth();
  const [location, navigate] = useLocation();
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
    staleTime: 0,
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
    <div className="bg-[#F3F4F6] min-h-screen">
      {/* Top nav */}
      <header className="bg-white border-b border-[#E5E7EB] h-14">
        <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-[#9CA3AF]" />
            <span className="text-sm font-medium text-[#4B5563]">
              {company?.name ?? ''}
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <span
              className="text-sm text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer px-1"
              onClick={() => navigate('/company/dashboard')}
            >
              Dashboard
            </span>
            <span className="text-[#E5E7EB] mx-2 select-none">|</span>
            <span
              className={
                location.startsWith('/company/edit')
                  ? 'text-sm px-1 text-[#1D9E75] font-semibold cursor-default'
                  : 'text-sm text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer px-1'
              }
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

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <AboutSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} isFirst />
        <ContactInfoSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
        <AddressSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
        <ContactsSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
        <LogoSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
        <ServicesSection company={company} fetchWithCompanyAuth={fetchWithCompanyAuth} />
        <PremiumSection company={company} />
      </main>
    </div>
  );
}

export default CompanyEdit;
