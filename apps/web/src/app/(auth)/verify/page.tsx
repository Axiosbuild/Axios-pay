import { redirect } from 'next/navigation';

type VerifyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();

  Object.entries(resolvedSearchParams ?? {}).forEach(([key, value]) => {
    if (typeof value === 'string') {
      params.set(key, value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    }
  });

  const query = params.toString();
  redirect(query ? `/verify-email?${query}` : '/verify-email');
}
