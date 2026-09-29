import React from 'react';

export default function SmeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f9ff] tracking-[-0.01em] antialiased">{children}</div>
  );
}
