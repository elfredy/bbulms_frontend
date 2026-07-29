import { getTranslations } from "next-intl/server";
import Link from "next/link";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("home");

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t("title")}</h1>
      <p style={{ color: "var(--muted)", maxWidth: 560 }}>{t("intro")}</p>
      <p>
        <Link href={`/${locale}/login`}>{t("loginLink")}</Link>
      </p>
    </div>
  );
}
