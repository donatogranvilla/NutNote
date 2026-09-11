import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relationsApi } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useRelations(pageId: string) {
  return useQuery({
    queryKey: queryKeys.relations.forPage(pageId),
    queryFn: () => relationsApi.getForPage(pageId),
    enabled: !!pageId,
  });
}

export function useCreateRelation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sourceId, targetId, type, description, userId }: { sourceId: string; targetId: string; type: string; description?: string; userId: string }) =>
      relationsApi.create(sourceId, targetId, type, description, userId),
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.relations.forPage(variables.sourceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.relations.forPage(variables.targetId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(variables.sourceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(variables.targetId) });
    },
  });
}

export function useDeleteRelation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id }: { id: string }) => relationsApi.delete(id),
    
    onSuccess: () => {
      // We invalidate all relations because we might not have the source/target IDs handy here
      queryClient.invalidateQueries({ queryKey: ['relations'] });
      queryClient.invalidateQueries({ queryKey: ['pages'] }); // invalidate counts
    },
  });
}
