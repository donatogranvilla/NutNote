import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useSearch(query: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => searchApi.search(query, limit),
    enabled: query.length > 2, // solo se ci sono almeno 3 caratteri
  });
}
