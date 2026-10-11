import { ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-navy-800 bg-navy-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5 sm:px-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-navy-200">
            โรงเรียนนายร้อยตำรวจ
          </p>
          <h1 className="text-lg font-semibold sm:text-xl">ทำเนียบสมาชิกชมรมยูโด</h1>
        </div>
      </div>
    </header>
  );
}
