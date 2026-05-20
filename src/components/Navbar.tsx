"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = { href: string; label: string; icon?: string };

export default function Navbar({
  user,
  items,
  brandHref,
  brandLabel,
}: {
  user: { name: string; nim?: string; email?: string; role: string };
  items: NavItem[];
  brandHref: string;
  brandLabel: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href={brandHref} className="font-bold text-lg text-brand-700">
          🇮🇩 {brandLabel}
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {items.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {it.icon} {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold leading-tight">{user.name}</div>
            <div className="text-xs text-slate-500">
              {user.role === "student" ? user.nim : user.email}
            </div>
          </div>
          <button onClick={logout} className="btn-ghost text-sm">
            Keluar
          </button>
        </div>
      </div>
      <nav className="md:hidden border-t border-slate-100 px-4 py-2 overflow-x-auto flex gap-1">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium ${
                active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {it.icon} {it.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
