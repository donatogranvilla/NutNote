import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pagesApi } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import type { CreatePageRequest, QueryPagesRequest, UpdatePageRequest } from '../lib/types';

export function usePages(request: QueryPagesRequest) {
  return useQuery({
    queryKey: [...queryKeys.pages.all, request],
    queryFn: () => pagesApi.query(request),
    staleTime: 10_000,
  });
}

export function usePage(id: string) {
  return useQuery({
    queryKey: queryKeys.pages.detail(id),
    queryFn: () => pagesApi.get(id),
    enabled: !!id,
  });
}

export function usePageWithAncestors(id: string) {
  return useQuery({
    queryKey: queryKeys.pages.withAncestors(id),
    queryFn: () => pagesApi.getWithAncestors(id),
    enabled: !!id,
  });
}

export function usePinnedPages() {
  return useQuery({
    queryKey: queryKeys.pages.pinned,
    queryFn: () => pagesApi.getPinned(),
    staleTime: 10_000,
  });
}

export function useRecentPages(limit?: number) {
  return useQuery({
    queryKey: queryKeys.pages.recent(limit),
    queryFn: () => pagesApi.getRecent(limit),
    staleTime: 10_000,
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ request, userId }: { request: CreatePageRequest; userId?: string }) =>
      pagesApi.create(request, userId || '123e4567-e89b-12d3-a456-426614174000'),
    
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all });
      if (newPage.parentId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.pages.children(newPage.parentId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.pages.withAncestors(newPage.parentId) });
      }
    },
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ request, userId }: { request: UpdatePageRequest; userId?: string }) =>
      pagesApi.update(request, userId || '123e4567-e89b-12d3-a456-426614174000'),
    
    onSuccess: (updatedPage) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(updatedPage.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.withAncestors(updatedPage.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.pinned });
    },
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.pinned });
    },
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pagesApi.togglePin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.pinned });
    },
  });
}
