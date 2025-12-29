const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

type ApiErrorPayload = {
  error?: string
}

const buildUrl = (path: string) => `${API_BASE_URL}${path}`

const parseJson = async <T,>(response: Response): Promise<T> => {
  const text = await response.text()
  if (!text) {
    return {} as T
  }
  return JSON.parse(text) as T
}

const apiFetch = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options?.headers ?? {}),
    },
  })
  const payload = await parseJson<T | ApiErrorPayload>(response)
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload && payload.error
        ? payload.error
        : response.statusText
    throw new Error(message)
  }
  return payload as T
}

export const apiGet = async <T,>(path: string): Promise<T> => apiFetch<T>(path)

export const apiPost = async <T,>(path: string, body: unknown): Promise<T> =>
  apiFetch<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

export const apiPut = async <T,>(path: string, body: unknown): Promise<T> =>
  apiFetch<T>(path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

export const apiDelete = async <T,>(path: string): Promise<T> =>
  apiFetch<T>(path, {
    method: "DELETE",
  })
