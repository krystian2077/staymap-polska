import Link from "next/link";

const LINKS = ["Polityka", "Regulamin", "Pomoc", "Kontakt", "Kariera"];

export function Footer() {
  return (
    <footer className="border-t border-[#e4ebe7] bg-[#f8faf9] px-6 py-9 md:px-12">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-end leading-none">
          <span className="text-[20px] font-black tracking-[-.6px] text-[#0a2e1a]">StayMap</span>
          <span className="ml-0.5 text-[23px] leading-none text-[#16a34a]">.</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-[#3d4f45]">
          {LINKS.map((label) => (
            <Link key={label} href="/" className="transition-colors hover:text-[#0a2e1a]">
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-[#7a8f84]">© {new Date().getFullYear()} StayMap Polska</p>
      </div>
    </footer>
  );
}

