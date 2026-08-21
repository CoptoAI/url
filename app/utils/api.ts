import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import { getActiveOrganizationId, getAuthToken, removeAuthToken } from '@/utils/auth-token'

type APIOptions = Omit<NitroFetchOptions<NitroFetchRequest>, 'headers'> & {
  headers?: Record<string, string>
}

export function useAPI<T = unknown>(api: string, options?: APIOptions): Promise<T>
export async function useAPI(api: string, options?: APIOptions): Promise<unknown> {
  const { headers, ...fetchOptions } = options ?? {}
  const activeOrgId = getActiveOrganizationId()
  const requestHeaders: Record<string, string> = {
    'Authorization': `Bearer ${getAuthToken() ?? ''}`,
    'X-Requested-With': 'XMLHttpRequest',
    ...(activeOrgId ? { 'x-organization-id': activeOrgId } : {}),
    ...headers,
  }

  const requestOptions: NitroFetchOptions<NitroFetchRequest> = {
    ...fetchOptions,
    headers: requestHeaders,
  }

  try {
    return await $fetch(api, requestOptions)
  }
  catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 401) {
      removeAuthToken()
      if (import.meta.client && window.location.pathname !== '/dashboard/login')
        window.location.assign('/dashboard/login')
    }
    throw error
  }
}
