'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // Tenant is now created during Registration. 
    // This route is deprecated and redirects to dashboard.
    router.push('/dashboard/overview');
  }, [router]);

  return <div className="min-h-screen bg-[#141618] flex items-center justify-center text-asas-sand text-[10px] uppercase font-bold tracking-widest">Redirection...</div>;
}
