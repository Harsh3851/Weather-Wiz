import { useAuth } from '@/auth/AuthContext';
import { apiUserDataService, localUserDataService, type UserDataService } from '@/lib/services';

/**
 * Signed-in users read and write through the API; everyone else (and demo
 * mode) uses browser storage behind the same interface. `scope` is part of
 * every user query key so switching accounts never shows stale data.
 */
export function useUserData(): { service: UserDataService; scope: string; ready: boolean } {
  const { status, user } = useAuth();
  if (status === 'authenticated' && user) {
    return { service: apiUserDataService, scope: user.id, ready: true };
  }
  return { service: localUserDataService, scope: 'local', ready: status !== 'loading' };
}
