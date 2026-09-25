import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AlertRule,
  AlertRuleInput,
  LocationInput,
  SavedLocation,
  SavedLocationInput,
  SavedLocationPatch,
} from '@weatherwiz/shared';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/api/errors';
import { useUserData } from './useUserData';

export function useSavedLocations() {
  const { service, scope, ready } = useUserData();
  const queryClient = useQueryClient();
  const key = ['user', scope, 'locations'];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const query = useQuery({
    queryKey: key,
    queryFn: () => service.listLocations(),
    enabled: ready,
  });

  const add = useMutation({
    mutationFn: (input: SavedLocationInput) => service.addLocation(input),
    onSuccess: (loc) => {
      toast.success(`${loc.name} saved`);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not save location')),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SavedLocationPatch }) =>
      service.updateLocation(id, patch),
    onSuccess: () => void invalidate(),
    onError: (err) => toast.error(errorMessage(err, 'Could not update location')),
  });

  const remove = useMutation({
    mutationFn: (loc: SavedLocation) => service.removeLocation(loc.id),
    onMutate: async (loc) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedLocation[]>(key);
      queryClient.setQueryData<SavedLocation[]>(key, (list) =>
        list?.filter((l) => l.id !== loc.id),
      );
      return { previous };
    },
    onSuccess: (_v, loc) => toast.success(`${loc.name} removed`),
    onError: (err, _loc, ctx) => {
      queryClient.setQueryData(key, ctx?.previous);
      toast.error(errorMessage(err, 'Could not remove location'));
    },
    onSettled: () => void invalidate(),
  });

  const reorder = useMutation({
    mutationFn: (ordered: SavedLocation[]) => service.reorderLocations(ordered.map((l) => l.id)),
    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedLocation[]>(key);
      queryClient.setQueryData(
        key,
        ordered.map((l, order) => ({ ...l, order })),
      );
      return { previous };
    },
    onError: (err, _v, ctx) => {
      queryClient.setQueryData(key, ctx?.previous);
      toast.error(errorMessage(err, 'Could not reorder locations'));
    },
    onSettled: () => void invalidate(),
  });

  return { query, locations: query.data ?? [], add, update, remove, reorder };
}

export function useRecentSearches() {
  const { service, scope, ready } = useUserData();
  const queryClient = useQueryClient();
  const key = ['user', scope, 'recent'];

  const query = useQuery({ queryKey: key, queryFn: () => service.listRecent(), enabled: ready });
  const add = useMutation({
    mutationFn: (input: LocationInput) => service.addRecent(input),
    onSuccess: (list) => queryClient.setQueryData(key, list),
  });
  const clear = useMutation({
    mutationFn: () => service.clearRecent(),
    onSuccess: () => queryClient.setQueryData(key, []),
    onError: (err) => toast.error(errorMessage(err)),
  });
  return { recents: query.data ?? [], add, clear };
}

export function useAlertRules() {
  const { service, scope, ready } = useUserData();
  const queryClient = useQueryClient();
  const key = ['user', scope, 'alert-rules'];
  const invalidate = () =>
    queryClient.invalidateQueries({
      predicate: (q) =>
        q.queryKey[0] === 'user' &&
        q.queryKey[1] === scope &&
        String(q.queryKey[2]).startsWith('alert'),
    });

  const query = useQuery({
    queryKey: key,
    queryFn: () => service.listAlertRules(),
    enabled: ready,
  });
  const create = useMutation({
    mutationFn: (input: AlertRuleInput) => service.createAlertRule(input),
    onSuccess: () => {
      toast.success('Alert rule created');
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not create alert rule')),
  });
  const toggle = useMutation({
    mutationFn: (rule: AlertRule) => service.setAlertRuleEnabled(rule.id, !rule.enabled),
    onSuccess: () => void invalidate(),
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: (rule: AlertRule) => service.deleteAlertRule(rule.id),
    onSuccess: () => {
      toast.success('Alert rule deleted');
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  return { query, rules: query.data ?? [], create, toggle, remove };
}

export function useAlertEvaluation() {
  const { service, scope, ready } = useUserData();
  return useQuery({
    queryKey: ['user', scope, 'alert-evaluation'],
    queryFn: () => service.evaluateAlerts(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}
