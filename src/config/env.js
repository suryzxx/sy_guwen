export const appEnv = import.meta.env.VITE_APP_ENV || 'test'
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

export const isProduction = appEnv === 'production'
