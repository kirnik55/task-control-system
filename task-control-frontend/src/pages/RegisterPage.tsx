import { FormEvent, useState } from 'react'
import { api } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'
export default function RegisterPage(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [name,setName]=useState('')
  const [error,setError]=useState<string|null>(null)
  const [ok,setOk]=useState<string|null>(null)
  const navigate=useNavigate()
  const onSubmit=async(e:FormEvent)=>{ e.preventDefault(); setError(null); setOk(null)
    try{ await api.post('/users/v1/register',{email,password,name}); setOk('Registered!'); setTimeout(()=>navigate('/login'),500) }
    catch(err:any){ setError(err?.response?.data?.error?.message||'Registration failed') } }
  return (<div className="max-w-md mx-auto card p-6">
    <h1 className="text-xl font-semibold mb-4">Регистрация</h1>
    <form onSubmit={onSubmit} className="space-y-3">
      <div><label className="label">Email</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div><label className="label">Пароль</label><input type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <div><label className="label">Имя</label><input className="input" value={name} onChange={e=>setName(e.target.value)} /></div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {ok && <div className="text-green-700 text-sm">{ok}</div>}
      <button className="btn-primary w-full" type="submit">Зарегестрироваться</button>
    </form>
    <p className="text-sm mt-4">Уже есть аккаунт? <Link className="underline" to="/login">Авторизуйтесь</Link></p>
  </div>)
}
