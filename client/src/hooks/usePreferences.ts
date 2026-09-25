import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_PREFERENCES, type Preferences } from '@weatherwiz/shared';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthContext';
import { errorMessage } from '@/lib/api/errors';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import { useUserData } from './useUserData';

function localPrefs(): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...storage.get<Partial<Preferences>>(STORAGE_KEYS.preferences, {}),
  };
}

export function usePreferences() {
  const { user } = useAuth();
  const { service, scope, ready } = useUserData();
  const queryClient = useQueryClient();
  const key = ['user', scope, 'preferences'];

  const query = useQuery({
    queryKey: key,
    queryFn: () => service.getPreferences(),
    enabled: ready,
    initialData: () => (scope === 'local' ? localPrefs() : (user?.preferences ?? localPrefs())),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<Preferences>) => service.updatePreferences(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Preferences>(key);
      const next = { ...(previous ?? DEFAULT_PREFERENCES), ...patch };
      queryClient.setQueryData(key, next);
      // Mirror locally so the theme is right on the next first paint.
      storage.set(STORAGE_KEYS.preferences, next);
      return { previous };
    },
    onError: (err, _patch, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error(`Could not save preference: ${errorMessage(err)}`);
    },
    onSuccess: (prefs) => queryClient.setQueryData(key, prefs),
  });

  return { preferences: query.data ?? DEFAULT_PREFERENCES, update: mutation.mutate };
}
