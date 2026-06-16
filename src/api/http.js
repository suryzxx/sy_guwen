import axios from 'axios'
import { apiBaseUrl } from '../config/env'

const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 12000
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('consultant_token')
  if (token) {
    config.headers.Authorization = token
  }
  return config
})

http.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error.response?.data || error)
)

export default http
