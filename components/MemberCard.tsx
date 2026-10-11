import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DEFAULT_AVATAR_PATH, getSafePhotoUrl } from "@/lib/validate";
import type { PublicMember } from "@/lib/types";

function orDash(value: string): string {
  return value && value.trim() ? value : "—";
}

export function MemberCard({ member }: { member: PublicMember }) {
  const photoUrl = getSafePhotoUrl(member.photoUrl);

  return (
    <Link
      href={`/members/${encodeURIComponent(member.memberId)}`}
      className="group flex flex-col gap-3 rounded-xl border border-navy-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <Image
          src={photoUrl}
          alt=""
          width={56}
          height={56}
          unoptimized={photoUrl === DEFAULT_AVATAR_PATH}
          className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-navy-100"
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-navy-500">
            {orDash(member.rank)}
          </p>
          <p className="truncate text-base font-semibold text-navy-950">{orDash(member.fullName)}</p>
          {member.nickname && <p className="truncate text-sm text-navy-700">ชื่อเล่น {member.nickname}</p>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-navy-800">
        <div>
          <dt className="text-xs text-navy-500">รุ่น</dt>
          <dd className="font-medium">{orDash(member.generation)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-navy-500">ตำแหน่งในชมรม</dt>
          <dd className="truncate font-medium">{orDash(member.clubPosition)}</dd>
        </div>
      </dl>

      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-navy-700 group-hover:text-navy-900">
        ดูรายละเอียด
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
