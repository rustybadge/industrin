import { useState } from 'react';
import { Building, LogOut, Menu, X } from 'lucide-react';

interface CompanyNavProps {
  companyName: string;
  companySlug?: string | null;
  activePage: 'dashboard' | 'edit';
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export default function CompanyNav({
  companyName,
  companySlug,
  activePage,
  onNavigate,
  onLogout,
}: CompanyNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard',       key: 'dashboard', path: '/company/dashboard' },
    { label: 'Redigera profil', key: 'edit',       path: '/company/edit'      },
    {
      label: 'Visa publik profil',
      key: 'profile',
      path: companySlug ? '/företag/' + companySlug : null,
    },
  ];

  return (
    <header className="bg-white border-b border-[#E5E7EB] relative z-40">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Left: company name */}
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-[#9CA3AF] flex-shrink-0" />
          <span className="text-sm font-medium text-[#4B5563] truncate max-w-[160px] sm:max-w-none">
            {companyName}
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ label, key, path }) => {
            const isActive = activePage === key;
            const isDisabled = path === null;
            return (
              <span key={key}>
                <span
                  onClick={() => !isDisabled && path && onNavigate(path)}
                  className={
                    isActive
                      ? 'text-sm px-2 text-[#092490] font-medium cursor-default'
                      : isDisabled
                      ? 'text-sm px-2 text-[#9CA3AF] cursor-not-allowed'
                      : 'text-sm px-2 text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer'
                  }
                >
                  {label}
                </span>
                {key !== 'profile' && (
                  <span className="text-[#E5E7EB] mx-1 select-none">|</span>
                )}
              </span>
            );
          })}
          <span className="text-[#E5E7EB] mx-1 select-none">|</span>
          <span
            className="text-sm text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer px-2 flex items-center gap-1"
            onClick={onLogout}
          >
            <LogOut className="h-3.5 w-3.5" />
            Logga ut
          </span>
        </nav>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 text-[#4B5563] hover:text-[#111827] transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Meny"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-white border-b border-[#E5E7EB] shadow-md">
          {navItems.map(({ label, key, path }) => {
            const isActive = activePage === key;
            const isDisabled = path === null;
            return (
              <button
                key={key}
                onClick={() => {
                  if (!isDisabled && path) {
                    onNavigate(path);
                    setMenuOpen(false);
                  }
                }}
                className={`w-full text-left px-6 py-3.5 text-sm border-b border-[#F3F4F6] last:border-0 ${
                  isActive
                    ? 'text-[#092490] font-medium bg-[#f5f7ff]'
                    : isDisabled
                    ? 'text-[#9CA3AF] cursor-not-allowed'
                    : 'text-[#4B5563] hover:bg-[#F9FAFB]'
                }`}
              >
                {label}
              </button>
            );
          })}
          <button
            onClick={() => { onLogout(); setMenuOpen(false); }}
            className="w-full text-left px-6 py-3.5 text-sm text-[#4B5563] hover:bg-[#F9FAFB] flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logga ut
          </button>
        </div>
      )}
    </header>
  );
}
