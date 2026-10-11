import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Loader2, SearchX, Users } from "lucide-react";

interface StateMessageProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: "neutral" | "error";
}

function StateMessage({ icon: Icon, title, description, tone = "neutral" }: StateMessageProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-navy-200 bg-white/60 px-6 py-14 text-center">
      <Icon
        className={`h-9 w-9 ${tone === "error" ? "text-red-600" : "text-navy-400"}`}
        aria-hidden="true"
      />
      <p className="text-base font-semibold text-navy-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-navy-600">{description}</p>}
    </div>
  );
}

export function LoadingState() {
  return (
    <StateMessage icon={Loader2} title="กำลังโหลดข้อมูลสมาชิก..." description="โปรดรอสักครู่" />
  );
}

export function EmptyState() {
  return (
    <StateMessage
      icon={SearchX}
      title="ไม่พบสมาชิกที่ตรงกับเงื่อนไข"
      description="ลองปรับคำค้นหาหรือรีเซ็ตตัวกรองดูอีกครั้ง"
    />
  );
}

export function NoMembersState() {
  return (
    <StateMessage
      icon={Users}
      title="ยังไม่มีข้อมูลสมาชิกในระบบ"
      description="เมื่อแอดมินเพิ่มข้อมูลในชีต Members ระบบจะแสดงรายชื่อที่นี่โดยอัตโนมัติ"
    />
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-red-200 bg-red-50/60 px-6 py-14 text-center">
      <AlertTriangle className="h-9 w-9 text-red-600" aria-hidden="true" />
      <p className="text-base font-semibold text-navy-900">ไม่สามารถโหลดข้อมูลสมาชิกได้</p>
      <p className="max-w-sm text-sm text-navy-600">
        {message ?? "เกิดข้อผิดพลาดระหว่างเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้งในอีกสักครู่"}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
        >
          ลองใหม่อีกครั้ง
        </button>
      )}
    </div>
  );
}
