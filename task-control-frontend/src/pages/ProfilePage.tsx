import { useEffect, useState } from 'react'
import { api } from '../lib/api'
export default function ProfilePage(){
  const [profile,setProfile]=useState<any>(null)
  const [name,setName]=useState(''); const [msg,setMsg]=useState<string|null>(null)
  const load=async()=>{ const res=await api.get('/users/v1/profile'); setProfile(res.data.data); setName(res.data.data.name||'') }
  useEffect(()=>{ load() },[])
  const save=async()=>{ await api.patch('/users/v1/profile',{name}); setMsg('Saved'); load() }
  if(!profile) return <div>Loading...</div>
  return (<div className="grid md:grid-cols-2 gap-6">
    <div className="card p-6"><h2 className="text-lg font-semibold mb-4">Мой профиль</h2>
      <div className="space-y-2 text-sm">
        <div><b>Email:</b> {profile.email}</div>
        <div><b>Роль:</b> {(profile.roles||[]).join(', ')}</div>
        <div><b>Создан:</b> {profile.createdAt}</div>
      </div></div>
    <div className="card p-6"><h2 className="text-lg font-semibold mb-4">Редактировать</h2>
      <div className="space-y-3"><div><label className="label">Имя</label>
        <input className="input" value={name} onChange={e=>setName(e.target.value)} /></div>
        <button className="btn-primary" onClick={save}>Сохранить</button>
        {msg && <div className="text-green-700 text-sm">{msg}</div>}
      </div></div>
  </div>)
}
