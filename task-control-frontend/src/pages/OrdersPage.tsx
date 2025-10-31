import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
export default function OrdersPage(){
  const [items,setItems]=useState<any[]>([]); const [loading,setLoading]=useState(true)
  const [page,setPage]=useState(1); const [limit]=useState(10)
  const [product,setProduct]=useState(''); const [quantity,setQuantity]=useState(1); const [price,setPrice]=useState(0)
  const load=async()=>{ setLoading(true); const res=await api.get('/orders/v1/orders',{ params:{page,limit} }); setItems(res.data.data.items||[]); setLoading(false) }
  useEffect(()=>{ load() },[page])
  const create=async(e:FormEvent)=>{ e.preventDefault(); await api.post('/orders/v1/orders',{ items:[{product,quantity,price}] }); setProduct(''); setQuantity(1) , setPrice(0); load() }
  return (<div className="grid md:grid-cols-3 gap-6">
    <div className="md:col-span-2 card p-6">
      <div className="flex items-center justify-between mb-4"><h1 className="text-xl font-semibold">Мои заказы</h1><button onClick={load} className="btn-outline">Обновить</button></div>
      {loading? <div>Загрузка...</div> : <div className="space-y-3">
        {items.length===0 && <div className="text-sm text-zinc-500">У вас нет заказов</div>}
        {items.map(o=> (<Link to={`/orders/${o.id}`} key={o.id} className="block p-4 border rounded-xl hover:bg-zinc-50">
          <div className="flex justify-between text-sm"><div><div className="font-medium">#{o.id.slice(0,8)}</div><div className="text-zinc-500">{o.status} • Стоимость: {o.total}</div></div>
          <div className="text-zinc-500">{new Date(o.createdAt).toLocaleString()}</div></div>
        </Link>))}
      </div>}
      <div className="flex gap-2 mt-4"><button className="btn-outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Предыдущая</button><div className="px-3 py-2 text-sm">Страница {page}</div><button className="btn-outline" onClick={()=>setPage(p=>p+1)}>Следующая</button></div>
    </div>
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-4">Создать заказ</h2>
      <form className="space-y-3" onSubmit={create}>
        <div><label className="label">Товар</label><input className="input" value={product} onChange={e=>setProduct(e.target.value)} /></div>
        <div><label className="label">Кол-во</label><input type="number" className="input" value={quantity} onChange={e=>setQuantity(parseInt(e.target.value||'0'))} /></div>
        <div><label className="label">Цена</label><input type="number" className="input" value={price} onChange={e=>setPrice(parseFloat(e.target.value||'0'))} /></div>
        <button className="btn-primary w-full" type="submit">Создать</button>
      </form>
    </div>
  </div>)
}




