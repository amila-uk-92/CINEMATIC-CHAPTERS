import { getAdminSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { AdminDashboardClient } from './AdminDashboardClient';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const admin = await getAdminSession();
  if (!admin) {
    redirect('/admin/login');
  }

  return <AdminDashboardClient admin={admin} />;
}
