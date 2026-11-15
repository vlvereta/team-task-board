// Domain and DTO types shared by the API client, the UI and the mock server.

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Public user shape. Never includes password material. */
export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: string;
}

export interface Column {
  id: TaskStatus;
  title: string;
}

export interface Board {
  id: string;
  name: string;
  columns: Column[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  /** 0-based, dense within its status column. */
  position: number;
  assigneeId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  assigneeId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assigneeId?: string | null;
}

export interface MoveTaskInput {
  status: TaskStatus;
  position: number;
}

export type ErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'invalid_credentials'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'internal_error';

/** Every non-2xx response body has this shape. */
export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    /** Field-level messages for 400 validation errors. */
    fields?: Record<string, string>;
  };
}

export const PASSWORD_MIN_LENGTH = 8;
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 5000;
export const NAME_MAX_LENGTH = 60;
export const BOARD_NAME_MAX_LENGTH = 80;
