'use client';

import React from 'react';
import ConsentShell from '@/components/sme/ConsentShell';
import { BankIcon, CheckCircleIcon, LockIcon } from '@/components/sme/icons';

export default function SmeFacilitiesPage() {
  return (
    <ConsentShell active="facilities">
      <div className="space-y-5 pt-1">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <CheckCircleIcon />
            Verified Institution
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <LockIcon size={13} color="#64748b" />
            256-bit TLS Encrypted
          </span>
        </div>

        <section>
          <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.025em] text-slate-900">
            Your trade credit facilities.
          </h1>
          <p className="mt-2 text-[14px] leading-5 text-slate-500">
            Facility underwriting stays with the bank. This view only lists the applications tied to
            consent requests you can authorize from the Consent Portal.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <BankIcon />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-slate-900">Trade Credit Facility</p>
              <p className="mt-1 text-[13px] leading-[18px] text-slate-500">
                Open a consent ID from Dashboard to review the data the bank needs before underwriting
                can continue.
              </p>
            </div>
          </div>
        </section>
      </div>
    </ConsentShell>
  );
}
