import { cookies } from 'next/headers';

export function isAdminLoggedIn() {
  return cookies().get('sz_admin_session')?.value === 'ok';
}

