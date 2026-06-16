export const appEnv = import.meta.env.VITE_APP_ENV || 'test'
export const useMock = import.meta.env.VITE_USE_MOCK !== 'false'
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

export const isProduction = appEnv === 'production'
