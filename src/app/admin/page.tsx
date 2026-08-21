import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import AdminDashboardClient from '@/components/AdminDashboardClient';

export default async function AdminPage() {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    const isAuthorized = await verifySession(session);

    if (!isAuthorized) {
        redirect('/admin/login');
    }

    return <AdminDashboardClient />;
}