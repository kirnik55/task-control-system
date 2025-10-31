import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
export default function OrderPage(){
  const {id}=useParams(); const nav=useNavigate()
  const [order,setOrder]=useState<any>(null); const [status,setStatus]=useState('in_progress')
  const load=async()=>{ const res=await api.get(`/orders/v1/orders/${id}`); setOrder(res.data.data) }
  useEffect(()=>{ load() },[id])
  const update=async()=>{ await api.patch(`/orders/v1/orders/${id}`,{status}); load() }
  const cancel=async()=>{ await api.delete(`/orders/v1/orders/${id}`); nav('/orders') }
  if(!order) return <div>Loading...</div>
  return (<div className="max-w-2xl mx-auto card p-6">
    <h1 className="text-xl font-semibold mb-2">Заказ #{order.id}</h1>
    <div className="text-sm text-zinc-600 mb-4">Статус: {order.status} • Цена: {order.total}</div>
    <div className="space-y-2 mb-4">{order.items.map((it:any,idx:number)=>(<div key={idx} className="text-sm">{it.product} × {it.quantity}{it.price?` @ ${it.price}`:''}</div>))}</div>
    <div className="flex gap-2">
      <select className="input max-w-xs" value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="in_progress">В процессе</option><option value="done">Выполнен</option>
      </select>
      <button className="btn-primary" onClick={update}>Обновить</button>
      <button className="btn-outline" onClick={cancel}>Отмена</button>
    </div>
  </div>)
}
