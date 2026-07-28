import { cookies } from 'next/headers';

export function isAdminLoggedIn() {
  // No Codespaces, libera a prévia do admin sem usar Server Actions.
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return cookies().get('sz_admin_session')?.value === 'ok';
}
