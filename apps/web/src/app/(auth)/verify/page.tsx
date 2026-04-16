import { redirect } from 'next/navigation';

type VerifyPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
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
