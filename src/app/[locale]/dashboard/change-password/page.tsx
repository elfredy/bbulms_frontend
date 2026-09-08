import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { getMe } from "@/lib/api";

import styles from "../dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function ChangePasswordPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("changePassword");
  const me = await getMe();
  if (!me) redirect(`/${locale}/login`);

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.meta}>{t("hint")}</p>
        </div>
      </header>
      <div className={styles.content} style={{ maxWidth: 420 }}>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
