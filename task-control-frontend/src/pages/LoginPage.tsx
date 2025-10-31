import { FormEvent, useState } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../lib/store'
import { Link, useNavigate } from 'react-router-dom'
export default function LoginPage(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState<string|null>(null)
  const setToken=useAuthStore(s=>s.setToken); const navigate=useNavigate()
  const onSubmit=async(e:FormEvent)=>{ e.preventDefault(); setError(null); try{
    const res=await api.post('/users/v1/login',{email,password}); const token=res.data?.data?.token;
    if(token){ setToken(token); navigate('/orders') } else setError('No token in response')
  }catch(err:any){ setError(err?.response?.data?.error?.message||'Login failed') } }
  return (<div className="max-w-md mx-auto card p-6">
    <h1 className="text-xl font-semibold mb-4">Вход</h1>
    <form onSubmit={onSubmit} className="space-y-3">
      <div><label className="label">Email</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div><label className="label">Пароль</label><input type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button className="btn-primary w-full" type="submit">Войти</button>
    </form>
    <p className="text-sm mt-4">Нет аккаунта ? <Link className="underline" to="/register">Зарегестрируйтесь</Link></p>
  </div>)
}
