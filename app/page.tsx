import { Header } from "@/components/Header";
import { MembersDirectory } from "@/components/MembersDirectory";
import { ErrorState } from "@/components/StateMessage";
import { getMembersResult, SheetsUnavailableError } from "@/lib/members-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialData;
  let loadError: string | null = null;

  try {
    initialData = await getMembersResult();
  } catch (error) {
    loadError =
      error instanceof SheetsUnavailableError
        ? "ไม่สามารถโหลดข้อมูลสมาชิกจากฐานข้อมูลได้ในขณะนี้"
        : "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง";
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {loadError || !initialData ? (
          <ErrorState message={loadError ?? undefined} />
        ) : (
          <MembersDirectory initialData={initialData} />
        )}
      </main>
      <footer className="border-t border-navy-100 bg-white px-4 py-4 text-center text-xs text-navy-500 sm:px-6">
        ชมรมยูโด โรงเรียนนายร้อยตำรวจ
      </footer>
    </div>
  );
}
