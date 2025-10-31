import axios from 'axios'
import { useAuthStore } from './store'
const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
export const api = axios.create({ baseURL })
api.interceptors.request.use((config)=>{ const token=useAuthStore.getState().token; if(token){ config.headers=config.headers||{}; config.headers['Authorization']=`Bearer ${token}` } return config })
