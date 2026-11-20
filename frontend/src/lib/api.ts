import { createApiClient, type ApiClientOptions } from "@/lib/api-client"
import type {
  Company,
  Department,
  LoginRequest,
  Page,
  PageQuery,
  Profile,
  RegisterRequest,
  RegistrationResponse,
  SessionResponse,
  UpdateProfileRequest,
  UpdateUserRequest,
  User,
  UserQuery,
} from "@/types/api"

export function createApi(options?: ApiClientOptions) {
  const { json, noContent } = createApiClient(options)

  return {
    register: (data: RegisterRequest, signal?: AbortSignal) =>
      json<RegistrationResponse>("/auth/register", { method: "POST", json: data, signal }),
    login: (data: LoginRequest, signal?: AbortSignal) =>
      json<SessionResponse>("/auth/login", { method: "POST", json: data, signal }),
    logout: (signal?: AbortSignal) => noContent("/auth/logout", { method: "POST", signal }),
    getSession: (signal?: AbortSignal) => json<SessionResponse>("/auth/session", { signal }),
    getCompany: (id: number, signal?: AbortSignal) => json<Company>(`/companies/${id}`, { signal }),
    listUsers: (query?: UserQuery, signal?: AbortSignal) => json<Page<User>>("/users", { query, signal }),
    getUser: (id: number, signal?: AbortSignal) => json<User>(`/users/${id}`, { signal }),
    updateUser: (id: number, data: UpdateUserRequest, signal?: AbortSignal) =>
      json<User>(`/users/${id}`, { method: "PATCH", json: data, signal }),
    approveUser: (id: number, signal?: AbortSignal) => json<User>(`/users/${id}/approve`, { method: "POST", signal }),
    declineUser: (id: number, signal?: AbortSignal) => noContent(`/users/${id}/decline`, { method: "POST", signal }),
    getMyProfile: (signal?: AbortSignal) => json<Profile>("/profiles/me", { signal }),
    updateMyProfile: (data: UpdateProfileRequest, signal?: AbortSignal) =>
      json<Profile>("/profiles/me", { method: "PATCH", json: data, signal }),
    listDepartments: (query?: PageQuery, signal?: AbortSignal) =>
      json<Page<Department>>("/departments", { query, signal }),
  }
}

export const api = createApi()
export type Api = ReturnType<typeof createApi>
