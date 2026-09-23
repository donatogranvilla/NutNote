import { invoke } from '@tauri-apps/api/core';
import type {
  Page, PageWithDetails, PageWithAncestorsResponse, Block,
  User, UserWithPassword, PageType, Team,
  CreatePageRequest, UpdatePageRequest, QueryPagesRequest,
  PaginatedResponse, NutNoteConfig, ServerStatus, ChangeLogEntry
} from './types';

// Helper per determinare se il client è in modalità remota (HTTP)
export function getBackendMode(): 'local' | 'remote' {
  return (localStorage.getItem('nutnote_backend_mode') as 'local' | 'remote') || 'local';
}

export function setBackendMode(mode: 'local' | 'remote', serverUrl?: string) {
  localStorage.setItem('nutnote_backend_mode', mode);
  if (serverUrl) {
    localStorage.setItem('nutnote_server_url', serverUrl.replace(/\/+$/, ''));
  }
}

export function getServerUrl(): string {
  return localStorage.getItem('nutnote_server_url') || 'http://localhost:9700';
}

// Utente attivo, salvato da UserContext al login. Viaggia in ogni richiesta remota
// nell'header X-NutNote-User: sul server l'identità è una proprietà della richiesta,
// non del processo come invece è in locale.
export function getActiveUserId(): string | null {
  return localStorage.getItem('nutnote_active_user_id') || localStorage.getItem('nution_active_user_id');
}

async function remoteFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getServerUrl()}${path}`;
  const userId = getActiveUserId();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-NutNote-User': userId } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Errore HTTP ${res.status}`);
  }
  return res.json();
}

export const pagesApi = {
  create: async (req: CreatePageRequest, userId?: string): Promise<Page> => {
    const payload = {
      typeId: req.typeId,
      parentId: req.parentId || null,
      title: req.title,
      icon: req.icon || null,
      properties: req.properties || {},
      priority: req.priority || 'none',
      status: req.status || '',
      visibility: 'public',
    };
    const uid = userId || '123e4567-e89b-12d3-a456-426614174000';

    if (getBackendMode() === 'remote') {
      return remoteFetch<Page>('/api/pages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    return invoke<Page>('create_page', {
      payload,
      userId: uid,
    });
  },

  get: async (id: string): Promise<Page> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<Page>(`/api/pages/${id}`);
    }
    return invoke<Page>('get_page', { id });
  },

  getWithAncestors: async (id: string): Promise<PageWithAncestorsResponse> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<PageWithAncestorsResponse>(`/api/pages/${id}/full`);
    }
    return invoke<PageWithAncestorsResponse>('get_page_with_ancestors', { id });
  },

  query: async (req: QueryPagesRequest): Promise<PaginatedResponse<PageWithDetails>> => {
    const payload: Record<string, unknown> = {};
    if (req.typeName) payload.typeName = req.typeName;
    if (req.typeId) payload.typeId = req.typeId;
    if (req.parentId) payload.parentId = req.parentId;
    if (req.rootClientId) payload.rootClientId = req.rootClientId;
    if (req.limit) payload.limit = req.limit;
    if (req.offset) payload.offset = req.offset;
    if (req.includeArchived !== undefined) payload.isArchived = req.includeArchived;

    try {
      if (getBackendMode() === 'remote') {
        const items = await remoteFetch<PageWithDetails[]>('/api/pages/query', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const safeList = Array.isArray(items) ? items : [];
        return {
          items: safeList,
          total: safeList.length,
          offset: req.offset || 0,
          limit: req.limit || 50,
          hasMore: false,
        };
      }

      const items = await invoke<PageWithDetails[]>('query_pages', { payload });
      const safeList = Array.isArray(items) ? items : [];
      return {
        items: safeList,
        total: safeList.length,
        offset: req.offset || 0,
        limit: req.limit || 50,
        hasMore: false,
      };
    } catch (err) {
      console.error('[pagesApi.query] Error:', err);
      return { items: [], total: 0, offset: 0, limit: 50, hasMore: false };
    }
  },

  update: async (req: UpdatePageRequest, userId?: string): Promise<Page> => {
    const uid = userId || '123e4567-e89b-12d3-a456-426614174000';

    if (getBackendMode() === 'remote') {
      return remoteFetch<Page>(`/api/pages/${req.id}`, {
        method: 'PUT',
        body: JSON.stringify(req),
      });
    }

    return invoke<Page>('update_page', {
      payload: req,
      userId: uid,
    });
  },

  delete: async (id: string): Promise<void> => {
    if (getBackendMode() === 'remote') {
      await remoteFetch<boolean>(`/api/pages/${id}`, { method: 'DELETE' });
      return;
    }
    return invoke<void>('delete_page', { id });
  },

  togglePin: async (id: string): Promise<void> => {
    if (getBackendMode() === 'remote') {
      await remoteFetch<boolean>(`/api/pages/${id}/pin`, { method: 'POST' });
      return;
    }
    return invoke<void>('toggle_pin_page', { id });
  },

  getPinned: async (): Promise<Page[]> => {
    try {
      if (getBackendMode() === 'remote') {
        return await remoteFetch<Page[]>('/api/pages/pinned');
      }
      return await invoke<Page[]>('get_pinned_pages', {});
    } catch {
      return [];
    }
  },

  getRecent: async (limit?: number): Promise<Page[]> => {
    try {
      if (getBackendMode() === 'remote') {
        return await remoteFetch<Page[]>(`/api/pages/recent?limit=${limit ?? 10}`);
      }
      return await invoke<Page[]>('get_recent_pages', { limit: limit ?? 10 });
    } catch {
      return [];
    }
  },

  move: async (id: string, newParentId: string | null, newPosition: number): Promise<void> => {
    const payload = { id, newParentId, newPosition };
    if (getBackendMode() === 'remote') {
      await remoteFetch<Page>(`/api/pages/${id}/move`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return;
    }
    return invoke<void>('move_page', { payload });
  },
};

export const pageTypesApi = {
  getAll: async (): Promise<PageType[]> => {
    try {
      if (getBackendMode() === 'remote') {
        return await remoteFetch<PageType[]>('/api/page-types');
      }
      return await invoke<PageType[]>('get_page_types', {});
    } catch {
      return [];
    }
  },

  get: async (idOrName: string): Promise<PageType> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<PageType>(`/api/page-types/${idOrName}`);
    }
    return invoke<PageType>('get_page_type', { id: idOrName });
  },
};

export const blocksApi = {
  get: async (pageId: string): Promise<Block[]> => {
    try {
      if (getBackendMode() === 'remote') {
        return await remoteFetch<Block[]>(`/api/blocks/${pageId}`);
      }
      return await invoke<Block[]>('get_blocks', { pageId });
    } catch {
      return [];
    }
  },

  save: async (pageId: string, blocks: Block[], userId?: string, plainText?: string): Promise<boolean> => {
    const payload = {
      pageId,
      blocks: blocks.map((b, idx) => ({
        id: b.id || undefined,
        parentBlockId: b.parentBlockId || null,
        type: b.type,
        content: b.content,
        position: b.position !== undefined ? b.position : idx,
      })),
      plainText: plainText || null,
      userId: userId || undefined,
    };

    if (getBackendMode() === 'remote') {
      return remoteFetch<boolean>(`/api/blocks/${pageId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }

    return invoke<boolean>('save_blocks', { payload });
  },
};

export const relationsApi = {
  create: async (sourceId: string, targetId: string, relationType: string, description?: string, userId?: string): Promise<boolean> => {
    const payload = { sourceId, targetId, relationType, description };
    if (getBackendMode() === 'remote') {
      return remoteFetch<boolean>('/api/relations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    return invoke<boolean>('create_page_relation', {
      payload,
      userId: userId || '123e4567-e89b-12d3-a456-426614174000',
    });
  },

  getForPage: async (pageId: string): Promise<any[]> => {
    try {
      if (getBackendMode() === 'remote') {
        return await remoteFetch<any[]>(`/api/relations/${pageId}`);
      }
      return await invoke<any[]>('get_page_relations', { pageId });
    } catch {
      return [];
    }
  },

  delete: async (id: string): Promise<boolean> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<boolean>(`/api/relations/item/${id}`, { method: 'DELETE' });
    }
    return invoke<boolean>('delete_page_relation', { id });
  },
};

export const searchApi = {
  search: async (query: string, limit?: number): Promise<any[]> => {
    try {
      if (getBackendMode() === 'remote') {
        return await remoteFetch<any[]>(`/api/search?q=${encodeURIComponent(query)}&limit=${limit ?? 20}`);
      }
      return await invoke<any[]>('search_pages', { query, limit: limit ?? 20 });
    } catch {
      return [];
    }
  },
};

export interface FolderFileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
  extension: string;
  modified_str: string;
}

export const filesApi = {
  uploadFile: (sourcePath: string) => invoke<{ path: string, filename: string }>('upload_file', { sourcePath }),
  listDirectory: async (folderPath: string): Promise<FolderFileInfo[]> => {
    try {
      return await invoke<FolderFileInfo[]>('list_directory_contents', { folderPath });
    } catch (e) {
      console.warn('listDirectory failed or running in browser:', e);
      return [];
    }
  },
  openPath: async (pathToOpen: string): Promise<boolean> => {
    try {
      await invoke('open_path_in_os', { pathToOpen });
      return true;
    } catch (e) {
      console.warn('openPath failed:', e);
      return false;
    }
  },
};

export const teamsApi = {
  getAll: async (): Promise<Team[]> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<Team[]>('/api/teams');
    }
    return invoke<Team[]>('get_teams', {});
  },

  create: async (payload: { name: string; description?: string; color?: string }): Promise<Team> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<Team>('/api/teams', { method: 'POST', body: JSON.stringify(payload) });
    }
    return invoke<Team>('create_team', { payload });
  },

  update: async (payload: { id: string; name: string; description?: string; color?: string }): Promise<Team> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<Team>(`/api/teams/${payload.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    return invoke<Team>('update_team', { payload });
  },

  remove: async (id: string): Promise<void> => {
    if (getBackendMode() === 'remote') {
      await remoteFetch<boolean>(`/api/teams/${id}`, { method: 'DELETE' });
      return;
    }
    await invoke('delete_team', { id });
  },
};

export interface ChatMessage {
  id: string;
  pageId: string;
  userId: string;
  content: string;
  createdAt: string;
}

/**
 * Chat di progetto. È l'unica funzione di NutNote intrinsecamente collaborativa,
 * quindi è anche quella che ha più bisogno di passare dal server quando si lavora
 * in rete: finché parlava solo con il database locale, due colleghi sullo stesso
 * progetto scrivevano in due archivi distinti senza accorgersene.
 */
export const chatApi = {
  getMessages: async (pageId: string): Promise<ChatMessage[]> => {
    try {
      if (getBackendMode() === 'remote') {
        return await remoteFetch<ChatMessage[]>(`/api/chat/${pageId}`);
      }
      return await invoke<ChatMessage[]>('get_chat_messages', { pageId });
    } catch {
      return [];
    }
  },

  send: async (pageId: string, content: string): Promise<ChatMessage> => {
    const payload = { pageId, content };
    if (getBackendMode() === 'remote') {
      // In remoto l'autore arriva dall'header; in locale lo mette il comando
      // Tauri leggendo l'utente attivo del processo.
      return remoteFetch<ChatMessage>('/api/chat', { method: 'POST', body: JSON.stringify(payload) });
    }
    return invoke<ChatMessage>('create_chat_message', { payload });
  },
};

export interface CreateUserRequest {
  displayName: string;
  avatarColor?: string;
  password?: string;
  role?: string;
  teamId?: string | null;
}

export interface UpdateUserRequest extends CreateUserRequest {
  id: string;
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<User[]>('/api/users');
    }
    return invoke<User[]>('get_users', {});
  },

  /** Elenco con le password in chiaro, per il pannello di amministrazione. */
  getAllAdmin: async (): Promise<UserWithPassword[]> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<UserWithPassword[]>('/api/admin/users');
    }
    return invoke<UserWithPassword[]>('get_all_users_admin', {});
  },

  authenticate: async (id: string, password: string): Promise<User> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<User>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ id, password }),
      });
    }
    return invoke<User>('authenticate_user', { payload: { id, password } });
  },

  create: async (payload: CreateUserRequest): Promise<User> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    return invoke<User>('create_user', { payload });
  },

  update: async (payload: UpdateUserRequest): Promise<User> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<User>(`/api/users/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }
    return invoke<User>('update_user', { payload });
  },

  remove: async (id: string): Promise<void> => {
    if (getBackendMode() === 'remote') {
      await remoteFetch<boolean>(`/api/users/${id}`, { method: 'DELETE' });
      return;
    }
    await invoke('delete_user', { id });
  },

  updatePassword: async (userId: string, newPassword: string): Promise<void> => {
    if (getBackendMode() === 'remote') {
      await remoteFetch<boolean>(`/api/users/${userId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword }),
      });
      return;
    }
    await invoke('update_user_password', { payload: { userId, newPassword } });
  },

  /**
   * Imposta l'utente attivo.
   *
   * In remoto non c'è nulla da comunicare al server: l'identità viaggia
   * nell'header a ogni richiesta e il server non tiene sessioni. In locale,
   * invece, serve perché il filtro sulle note private legge lo stato del processo.
   */
  setActive: async (id: string): Promise<void> => {
    if (getBackendMode() === 'remote') return;
    await invoke('set_active_user', { id });
  },

  /**
   * Utente attivo. In remoto si risolve l'id salvato sul client contro l'elenco
   * del server: interrogare il database locale restituirebbe un profilo che sul
   * server potrebbe non esistere affatto.
   */
  getActive: async (): Promise<User | null> => {
    if (getBackendMode() === 'remote') {
      const id = getActiveUserId();
      if (!id) return null;
      const elenco = await remoteFetch<User[]>('/api/users');
      return elenco.find((u) => u.id === id) ?? null;
    }
    return invoke<User | null>('get_active_user', {});
  },
};

export const changelogApi = {
  getHistory: async (entityType: string, entityId: string): Promise<ChangeLogEntry[]> => {
    try {
      if (getBackendMode() === 'remote') {
        return await remoteFetch<ChangeLogEntry[]>(`/api/changelog/${entityType}/${entityId}`);
      }
      return await invoke<ChangeLogEntry[]>('get_entity_history', { entityType, entityId });
    } catch {
      return [];
    }
  },

  getRecent: async (limit?: number): Promise<ChangeLogEntry[]> => {
    try {
      return await invoke<ChangeLogEntry[]>('get_recent_changes', { limit: limit ?? 30 });
    } catch {
      return [];
    }
  },

  restoreField: async (logId: string, userId?: string): Promise<boolean> => {
    if (getBackendMode() === 'remote') {
      return await remoteFetch<boolean>('/api/changelog/restore', {
        method: 'POST',
        body: JSON.stringify({ logId }),
      });
    }
    return await invoke<boolean>('restore_field', {
      logId,
      userId: userId || '123e4567-e89b-12d3-a456-426614174000',
    });
  },
};

export const configApi = {
  get: () => invoke<NutNoteConfig>('get_config', {}),
  save: (config: NutNoteConfig) => invoke<boolean>('save_config', { newConfig: config }),
  testDbPath: (path: string) => invoke<boolean>('test_db_path', { path }),
};

export const serverApi = {
  getStatus: () => invoke<ServerStatus>('get_server_status', {}),
  start: (port?: number) => invoke<ServerStatus>('start_server', { portOverride: port || null }),
  stop: () => invoke<ServerStatus>('stop_server', {}),
};

export interface SavedView {
  id: string;
  name: string;
  displayType: 'table' | 'kanban' | 'list' | 'calendar' | 'gallery';
  filters: string;
  sortBy: string;
  groupBy?: string | null;
  visibleProperties: string;
  scopeType: 'global' | 'type' | 'page';
  scopeId?: string | null;
  isDefault: boolean;
  position: number;
  createdBy: string;
  createdAt: string;
}

export interface CreateViewRequest {
  name: string;
  displayType: string;
  filters?: string;
  sortBy?: string;
  groupBy?: string | null;
  visibleProperties?: string;
  scopeType?: string;
  scopeId?: string | null;
  isDefault?: boolean;
}

/**
 * Viste salvate: una configurazione di elenco a cui si è dato un nome.
 *
 * Filtri e ordinamenti viaggiano come JSON in stringa: la loro forma la decide
 * l'interfaccia, così aggiungere un criterio non richiede di cambiare lo schema
 * del database né i tipi lato Rust.
 */
export const viewsApi = {
  getForScope: async (scopeType: string, scopeId?: string | null): Promise<SavedView[]> => {
    try {
      if (getBackendMode() === 'remote') {
        const q = new URLSearchParams({ scopeType });
        if (scopeId) q.set('scopeId', scopeId);
        return await remoteFetch<SavedView[]>(`/api/views?${q.toString()}`);
      }
      return await invoke<SavedView[]>('get_views', { scopeType, scopeId: scopeId ?? null });
    } catch {
      return [];
    }
  },

  create: async (payload: CreateViewRequest): Promise<SavedView> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<SavedView>('/api/views', { method: 'POST', body: JSON.stringify(payload) });
    }
    return invoke<SavedView>('create_view', { payload });
  },

  update: async (payload: { id: string } & Partial<CreateViewRequest> & { position?: number }): Promise<SavedView> => {
    if (getBackendMode() === 'remote') {
      return remoteFetch<SavedView>(`/api/views/${payload.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    return invoke<SavedView>('update_view', { payload });
  },

  remove: async (id: string): Promise<void> => {
    if (getBackendMode() === 'remote') {
      await remoteFetch<boolean>(`/api/views/${id}`, { method: 'DELETE' });
      return;
    }
    await invoke('delete_view', { id });
  },
};
