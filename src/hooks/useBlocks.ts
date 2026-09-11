import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blocksApi } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import type { Block } from '../lib/types';

export function useBlocks(pageId: string) {
  return useQuery({
    queryKey: queryKeys.blocks.forPage(pageId),
    queryFn: () => blocksApi.get(pageId),
    enabled: !!pageId,
  });
}

export function useSaveBlocks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      pageId, 
      blocks, 
      userId, 
      plainText 
    }: { 
      pageId: string; 
      blocks: Block[]; 
      userId?: string; 
      plainText?: string; 
    }) =>
      blocksApi.save(pageId, blocks, userId, plainText),
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks.forPage(variables.pageId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(variables.pageId) });
    },
  });
}
