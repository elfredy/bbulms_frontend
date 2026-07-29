import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { LoginForm } from "@/components/LoginForm";

import styles from "./login.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("login");

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <p className={styles.topBrand}>BBU LMS</p>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
        <div className={styles.card}>
          <LoginForm />
        </div>
        <p className={styles.footer}>
          <Link href={`/${locale}`}>{t("backHome")}</Link>
        </p>
      </div>
    </div>
  );
}
