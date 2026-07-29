"use client";

import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function LogoutButton({ className }: { className?: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const locale = useLocale();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className={className}
    >
      {t("logout")}
    </button>
  );
}
