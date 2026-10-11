import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Phone } from "lucide-react";
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/StateMessage";
import { getPublicMemberById, SheetsUnavailableError } from "@/lib/members-service";
import { DEFAULT_AVATAR_PATH, getSafePhotoUrl, isValidMemberId } from "@/lib/validate";

interface MemberPageParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MemberPageParams): Promise<Metadata> {
  const { id } = await params;
  if (!isValidMemberId(id)) return {};

  try {
    const member = await getPublicMemberById(id);
    if (!member) return {};
    return {
      title: `${member.fullName} | ทำเนียบสมาชิกชมรมยูโด`,
      description: `${member.rank} ${member.fullName} รุ่น ${member.generation} — ${member.clubPosition}`,
    };
  } catch {
    return {};
  }
}

function orDash(value: string): string {
  return value && value.trim() ? value : "—";
}

export default async function MemberDetailPage({ params }: MemberPageParams) {
  const { id } = await params;

  if (!isValidMemberId(id)) {
    notFound();
  }

  let member;
  try {
    member = await getPublicMemberById(id);
  } catch (error) {
    return (
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
          <ErrorState
            message={
              error instanceof SheetsUnavailableError
                ? "ไม่สามารถโหลดข้อมูลสมาชิกจากฐานข้อมูลได้ในขณะนี้"
                : undefined
            }
          />
        </main>
      </div>
    );
  }

  if (!member) {
    notFound();
  }

  const photoUrl = getSafePhotoUrl(member.photoUrl);

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          กลับไปหน้าทำเนียบสมาชิก
        </Link>

        <section className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <Image
              src={photoUrl}
              alt=""
              width={96}
              height={96}
              unoptimized={photoUrl === DEFAULT_AVATAR_PATH}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-navy-100"
            />
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-navy-500">
                {orDash(member.rank)}
              </p>
              <h2 className="text-2xl font-semibold text-navy-950">{orDash(member.fullName)}</h2>
              {member.nickname && <p className="text-navy-700">ชื่อเล่น {member.nickname}</p>}
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-navy-100 pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-navy-500">รุ่น</dt>
              <dd className="font-medium text-navy-900">{orDash(member.generation)}</dd>
            </div>
            <div>
              <dt className="text-xs text-navy-500">ตำแหน่งในชมรม</dt>
              <dd className="font-medium text-navy-900">{orDash(member.clubPosition)}</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-start gap-3 rounded-lg bg-navy-50 p-4 text-sm text-navy-700">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" aria-hidden="true" />
            <p>
              เบอร์โทรศัพท์ของสมาชิกไม่เปิดเผยต่อสาธารณะ เพื่อความเป็นส่วนตัวตามนโยบายของชมรม
              หากต้องการติดต่อ กรุณาติดต่อผ่านแอดมินชมรม
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
