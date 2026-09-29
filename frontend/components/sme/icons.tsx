import React from 'react';

export function ApexMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-[#0f172a] text-white ${className}`}
      aria-hidden
    >
      <span className="text-[15px] font-semibold tracking-tight">A</span>
    </div>
  );
}

export function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"
        stroke="#0f172a"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 17a2.5 2.5 0 0 0 5 0"
        stroke="#0f172a"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="9" fill="#ECFDF5" stroke="#34D399" strokeWidth="1.4" />
      <path
        d="M6.5 10.2 8.7 12.4 13.5 7.6"
        stroke="#047857"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BankIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M3 18h18M12 4l9 6H3l9-6Z" stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="#64748b" strokeWidth="1.7" />
      <path d="M12 8v4.5L15 14" stroke="#64748b" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="1.7" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 5 6v6c0 4.2 2.8 7.4 7 8.5 4.2-1.1 7-4.3 7-8.5V6l-7-3Z"
        stroke="#047857"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 12.2 11.1 14.3 15.2 9.8" stroke="#047857" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldOutlineIcon({ active = false }: { active?: boolean }) {
  const stroke = active ? '#0f172a' : '#94a3b8';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 5 6v6c0 4.2 2.8 7.4 7 8.5 4.2-1.1 7-4.3 7-8.5V6l-7-3Z"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GridIcon({ active = false }: { active?: boolean }) {
  const stroke = active ? '#0f172a' : '#94a3b8';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" stroke={stroke} strokeWidth="1.7" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" stroke={stroke} strokeWidth="1.7" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" stroke={stroke} strokeWidth="1.7" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" stroke={stroke} strokeWidth="1.7" />
    </svg>
  );
}

export function BuildingIcon({ active = false }: { active?: boolean }) {
  const stroke = active ? '#0f172a' : '#94a3b8';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20V8l8-5 8 5v12" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function LockSmallWhite() {
  return <LockIcon size={16} color="#ffffff" />;
}
