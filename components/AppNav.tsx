"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <span className="app-nav-brand">Deal Analyzer</span>
        <div className="app-nav-links">
          <Link href="/" className={pathname === "/" ? "active" : undefined}>
            Worksheet
          </Link>
          <Link href="/compare" className={pathname === "/compare" ? "active" : undefined}>
            Compare
          </Link>
        </div>
      </div>
    </nav>
  );
}
