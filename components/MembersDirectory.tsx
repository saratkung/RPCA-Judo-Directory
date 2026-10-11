"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FilterSelect } from "@/components/FilterSelect";
import { MemberCard } from "@/components/MemberCard";
import { EmptyState, ErrorState, LoadingState, NoMembersState } from "@/components/StateMessage";
import type { MembersResult } from "@/lib/types";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;
const AUTO_REFRESH_MS = 45_000;

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

function formatLastUpdated(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return "ไม่ทราบเวลา";
  }
}

async function fetchMembers(params: {
  query: string;
  generation: string;
  position: string;
}): Promise<MembersResult> {
  const search = new URLSearchParams();
  if (params.query) search.set("q", params.query);
  if (params.generation) search.set("generation", params.generation);
  if (params.position) search.set("position", params.position);

  const response = await fetch(`/api/members?${search.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "ไม่สามารถโหลดข้อมูลสมาชิกได้");
  }
  return response.json();
}

export function MembersDirectory({ initialData }: { initialData: MembersResult }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [generation, setGeneration] = useState("");
  const [position, setPosition] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [data, setData] = useState<MembersResult>(initialData);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMembers({ query: debouncedQuery, generation, position });
      if (requestId === requestIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่คาดคิด");
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedQuery, generation, position]);

  useEffect(() => {
    // Deferred (rather than calling load() synchronously) so the fetch
    // is treated as a reaction to a dependency change, not a
    // same-tick state update during the effect itself.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Auto-refresh: re-fetch periodically so edits made in Google Sheets
  // appear without the visitor needing to reload the page.
  useEffect(() => {
    const interval = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Reset pagination when the active filters change. Computed during
  // render (React's documented pattern for adjusting state in response
  // to a prop/dependency change) instead of in an effect.
  const filterKey = `${debouncedQuery}|${generation}|${position}`;
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey);
  if (previousFilterKey !== filterKey) {
    setPreviousFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch("/api/revalidate", { method: "POST" }).catch(() => null);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleReset = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setGeneration("");
    setPosition("");
  }, []);

  const visibleMembers = useMemo(() => data.members.slice(0, visibleCount), [data.members, visibleCount]);
  const hasMore = visibleCount < data.members.length;
  const hasActiveFilters = Boolean(query || generation || position);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl border border-navy-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-navy-600">สมาชิกทั้งหมด</p>
            <p className="text-2xl font-semibold text-navy-950">{data.total.toLocaleString("th-TH")} คน</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-navy-500">
            {data.source === "sample" && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">
                กำลังแสดงข้อมูลตัวอย่าง (ยังไม่เชื่อมต่อ Google Sheets)
              </span>
            )}
            <span>อัปเดตข้อมูลล่าสุดเมื่อ {formatLastUpdated(data.lastUpdated)}</span>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 px-3 py-1.5 font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              รีเฟรช
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBar value={query} onChange={setQuery} />
          <div className="flex gap-3">
            <FilterSelect
              label="รุ่น"
              value={generation}
              options={data.generations}
              allLabel="ทุกรุ่น"
              onChange={setGeneration}
            />
            <FilterSelect
              label="ตำแหน่งในชมรม"
              value={position}
              options={data.positions}
              allLabel="ทุกตำแหน่ง"
              onChange={setPosition}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-sm text-navy-600">
            <span>พบ {data.total.toLocaleString("th-TH")} รายการที่ตรงกับเงื่อนไข</span>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 font-medium text-navy-700 hover:text-navy-900"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              รีเซ็ตตัวกรอง
            </button>
          </div>
        )}
      </section>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading && data.members.length === 0 ? (
        <LoadingState />
      ) : data.total === 0 ? (
        hasActiveFilters ? <EmptyState /> : <NoMembersState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleMembers.map((member) => (
              <MemberCard key={member.memberId} member={member} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="rounded-lg border border-navy-200 bg-white px-5 py-2.5 text-sm font-medium text-navy-800 shadow-sm hover:bg-navy-50"
              >
                แสดงเพิ่มเติม ({data.members.length - visibleCount} รายการ)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
