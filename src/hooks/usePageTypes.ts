import { useQuery } from '@tanstack/react-query';
import { pageTypesApi } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function usePageTypes() {
  return useQuery({
    queryKey: queryKeys.pageTypes.all,
    queryFn: () => pageTypesApi.getAll(),
    staleTime: 60_000,
  });
}

export function usePageType(idOrName?: string) {
  return useQuery({
    queryKey: queryKeys.pageTypes.detail(idOrName || ''),
    queryFn: () => pageTypesApi.get(idOrName!),
    enabled: !!idOrName,
    staleTime: 60_000,
  });
}
