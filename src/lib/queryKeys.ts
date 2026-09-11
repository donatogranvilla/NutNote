export const queryKeys = {
  pages: {
    all: ['pages'],
    type: (typeName: string) => ['pages', 'type', typeName],
    detail: (id: string) => ['pages', 'detail', id],
    withAncestors: (id: string) => ['pages', 'withAncestors', id],
    children: (parentId: string) => ['pages', 'children', parentId],
    pinned: ['pages', 'pinned'],
    recent: (limit?: number) => ['pages', 'recent', limit],
  },
  pageTypes: {
    all: ['pageTypes'],
    detail: (idOrName: string) => ['pageTypes', idOrName],
  },
  blocks: {
    forPage: (pageId: string) => ['blocks', pageId],
  },
  relations: {
    forPage: (pageId: string) => ['relations', pageId],
  },
  views: {
    all: ['views'],
    results: (viewId: string) => ['views', 'results', viewId],
  },
  search: (query: string) => ['search', query],
} as const;
