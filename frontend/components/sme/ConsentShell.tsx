'use client';

import React from 'react';
import Link from 'next/link';
import { ApexMark, BellIcon, BuildingIcon, GridIcon, ShieldOutlineIcon } from './icons';

type PortalTab = 'dashboard' | 'consent' | 'facilities';

interface ConsentShellProps {
  children: React.ReactNode;
  active: PortalTab;
  consentId?: string;
}

export default function ConsentShell({ children, active, consentId }: ConsentShellProps) {
  const consentHref = consentId ? `/sme/${encodeURIComponent(consentId)}` : '/sme';

  return (
    <div className="mx-auto flex min-h-screen w-full flex-col bg-[#f6f9ff] text-[#0f172a]">
      {/* Responsive Header */}
      <header className="sticky top-0 z-20 w-full border-b border-slate-200/50 bg-[#f6f9ff]/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-3 pt-4">
          <div className="flex items-center gap-2.5">
            <ApexMark />
            <div className="leading-tight">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                Apex Finance
              </p>
              <p className="text-[17px] font-semibold tracking-[-0.02em] text-slate-900">
                Consent Portal
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="/sme" 
              className={`text-sm font-medium transition-colors ${active === 'dashboard' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Dashboard
            </Link>
            <Link 
              href={consentHref} 
              className={`text-sm font-medium transition-colors ${active === 'consent' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Consent Request
            </Link>
            <Link 
              href="/sme/facilities" 
              className={`text-sm font-medium transition-colors ${active === 'facilities' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Facilities
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
              aria-label="Notifications"
            >
              <BellIcon />
            </button>
            <div
              className="h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-gradient-to-br from-slate-300 to-slate-600 shadow-sm"
              aria-label="Account"
              title="Demo SME operator"
            >
              <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-white">
                SM
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 pb-28 md:pb-10">
        {children}
      </main>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <nav className="fixed bottom-0 left-0 z-20 w-full border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur-sm md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3">
          <NavItem href="/sme" label="Dashboard" active={active === 'dashboard'} icon="grid" />
          <NavItem href={consentHref} label="Consent Portal" active={active === 'consent'} icon="shield" />
          <NavItem href="/sme/facilities" label="Facilities" active={active === 'facilities'} icon="building" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: 'grid' | 'shield' | 'building';
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 py-1 text-[11px] font-medium ${
        active ? 'text-slate-900' : 'text-slate-400'
      }`}
    >
      {icon === 'grid' && <GridIcon active={active} />}
      {icon === 'shield' && <ShieldOutlineIcon active={active} />}
      {icon === 'building' && <BuildingIcon active={active} />}
      <span>{label}</span>
    </Link>
  );
}