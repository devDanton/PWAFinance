import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await useTranslations('Common');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center sm:items-start text-center sm:text-left">
        <h1 className="text-4xl font-bold tracking-tight text-balance text-primary">
          {t('welcome')}
        </h1>
        <p className="text-muted-foreground max-w-lg">
          Esta é a aplicação base PWA Finance. Setup Next.js 15 + Tailwind CSS v4 + shadcn/ui + next-pwa + next-intl concluído!
        </p>
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">Learn More</Button>
        </div>
      </main>
    </div>
  );
}
