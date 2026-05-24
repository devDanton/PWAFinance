import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from './login-form';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Common');

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-3xl" />
      
      <div className="z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
