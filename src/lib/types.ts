export type UUID = string;
export type ISODateTime = string;
export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface Team {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  createdAt: ISODateTime;
}

export interface User {
  id: UUID;
  displayName: string;
  avatarColor: string;
  role: 'admin' | 'user';
  teamId?: string | null;
  teamName?: string | null;
  teamColor?: string | null;
  createdAt: ISODateTime;
}

export interface UserWithPassword extends User {
  password: string;
}

export type PropertyType = 
  | 'text'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'datetime'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'user'
  | 'page_reference'
  | 'file';

export interface PropertyDefinition {
  key: string;
  label: string;
  type: PropertyType;
  required: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  options?: SelectOption[];
  min?: number;
  max?: number;
  position: number;
  showInTable: boolean;
  showInCard: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  color: string;
}

export interface StatusDefinition {
  value: string;
  label: string;
  color: string;
  icon?: string;
  transitionsTo: string[];
  isInitial: boolean;
  isTerminal: boolean;
}

export interface PageType {
  id: UUID;
  name: string;
  label: string;
  labelPlural: string;
  icon: string;
  color: string;
  propertiesSchema: PropertyDefinition[];
  statusFlow: StatusDefinition[];
  allowedChildren: string[];
  defaultViewType: ViewDisplayType;
  isSystem: boolean;
  position: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Page {
  id: UUID;
  typeId: UUID;
  parentId: UUID | null;
  title: string;
  icon: string | null;
  coverUrl: string | null;
  properties: Record<string, unknown>;
  priority: Priority;
  status: string;
  position: number;
  isPinned: boolean;
  isArchived: boolean;
  createdBy: UUID;
  updatedBy: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  rootClientId?: string | null;
  visibility: 'public' | 'private';
  version: number;
}

export interface PageWithAncestorsResponse {
  page: Page;
  ancestors: Page[];
  children: Page[];
}

export interface PageWithDetails extends Page {
  typeName?: string;
  typeIcon?: string;
  typeColor?: string;
  statusLabel?: string;
  statusColor?: string;
  createdByName?: string;
  updatedByName?: string;
  ancestors?: Page[];
  children?: Page[];
  childrenCount?: number;
  relationsCount?: number;
}

export interface PageAncestor {
  id: UUID;
  title: string;
  icon: string | null;
  typeName: string;
  typeIcon: string;
}

export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet_list'
  | 'numbered_list'
  | 'todo'
  | 'code'
  | 'image'
  | 'divider'
  | 'quote'
  | 'callout'
  | 'toggle'
  | 'database_view'
  | 'page_reference'
  | 'folder'
  | 'event'
  | 'bookmark'
  | 'vault';

export interface Block {
  id: UUID;
  pageId: UUID;
  parentBlockId: UUID | null;
  type: BlockType;
  content: Record<string, unknown>;
  position: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type RelationType = 
  | 'reference'
  | 'blocks'
  | 'depends_on'
  | 'related'
  | 'duplicate';

export interface PageRelation {
  id: UUID;
  sourceId: UUID;
  targetId: UUID;
  relationType: RelationType;
  description: string | null;
  createdBy: UUID;
  createdAt: ISODateTime;
}

export interface PageRelationWithTarget extends PageRelation {
  direction?: 'outgoing' | 'incoming';
  otherPage?: {
    id: UUID;
    title: string;
    icon: string | null;
    typeName: string;
    typeLabel: string;
    priority: string;
    status: string;
    typeColor?: string;
    statusLabel?: string;
  };
  linkedPage?: {
    id: UUID;
    title: string;
    icon: string | null;
    typeName: string;
    typeIcon?: string;
    typeColor?: string;
    status: string;
    statusLabel?: string;
    statusColor?: string;
  };
  isOutgoing?: boolean;
}

export type ViewDisplayType = 'table' | 'kanban' | 'list' | 'calendar' | 'gallery';

export type FilterOperator = 
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than'
  | 'is_empty' | 'is_not_empty'
  | 'in' | 'not_in'
  | 'between';

export interface ViewFilter {
  property: string;
  operator: FilterOperator;
  value: unknown;
  conjunction: 'and' | 'or';
}

export interface ViewSort {
  property: string;
  direction: 'asc' | 'desc';
}

export interface View {
  id: UUID;
  name: string;
  displayType: ViewDisplayType;
  filters: ViewFilter[];
  sortBy: ViewSort[];
  groupBy: string | null;
  visibleProperties: string[];
  scopeType: 'global' | 'type' | 'page';
  scopeId: UUID | null;
  isDefault: boolean;
  position: number;
  createdBy: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface FormField {
  propertyKey: string;
  labelOverride: string | null;
  required: boolean;
  defaultValue: unknown;
  placeholder: string | null;
  position: number;
  visible: boolean;
}

export interface Form {
  id: UUID;
  name: string;
  pageTypeId: UUID;
  fields: FormField[];
  defaultParentId: UUID | null;
  isQuickForm: boolean;
  includeTitle: boolean;
  includeContent: boolean;
  createdBy: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface SearchResult {
  pageId: UUID;
  title: string;
  snippet: string;
  rank: number;
  typeName: string;
  typeIcon: string;
  typeColor: string;
  breadcrumb: string;
  updatedAt: ISODateTime;
}

export interface CreatePageRequest {
  typeId: string;
  parentId?: string | null;
  title: string;
  icon?: string;
  properties?: Record<string, unknown>;
  priority?: Priority;
  status?: string;
}

export interface UpdatePageRequest {
  id: string;
  title?: string;
  icon?: string | null;
  coverUrl?: string | null;
  properties?: Record<string, unknown>;
  priority?: Priority;
  status?: string;
  parentId?: string | null;
  position?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  visibility?: 'public' | 'private';
}

export interface QueryPagesRequest {
  typeId?: string;
  typeName?: string;
  parentId?: string;
  ancestorId?: string;
  rootClientId?: string;
  filters?: ViewFilter[];
  sortBy?: ViewSort[];
  offset?: number;
  limit?: number;
  includeArchived?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface NutNoteConfig {
  mode: 'local' | 'shared' | 'server' | 'client';
  dbPath?: string | null;
  filesPath?: string | null;
  serverPort?: number | null;
  serverUrl?: string | null;
}

export interface ServerStatus {
  isRunning: boolean;
  port: number;
  localIps: string[];
}

export interface ChangeLogEntry {
  id: string;
  entityType: 'page' | 'block';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'move';
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  userId: string;
  userName?: string | null;
  deviceId?: string | null;
  createdAt: string;
}

