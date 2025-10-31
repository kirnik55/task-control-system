import { create } from 'zustand'
type AuthState={ token:string|null; setToken:(t:string|null)=>void; logout:()=>void }
export const useAuthStore=create<AuthState>((set)=>({
  token: localStorage.getItem('token'),
  setToken:(t)=>{ if(t) localStorage.setItem('token',t); else localStorage.removeItem('token'); set({token:t}); },
  logout:()=>{ localStorage.removeItem('token'); set({token:null}); }
}))
