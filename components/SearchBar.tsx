"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="relative flex-1">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "ค้นหาชื่อ, ชื่อเล่น, ยศ, รุ่น หรือตำแหน่ง"}
        aria-label="ค้นหาสมาชิก"
        className="w-full rounded-lg border border-navy-200 bg-white py-2.5 pl-9 pr-9 text-sm text-navy-950 placeholder:text-navy-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-200"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="ล้างคำค้นหา"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
