import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OrdersPage from './pages/OrdersPage'
import ProfilePage from './pages/ProfilePage'
import OrderPage from './pages/OrderPage'
import { useAuthStore } from './lib/store'
function Nav(){ const {token,logout}=useAuthStore(); const loc=useLocation(); return (
<header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
  <div className="container flex items-center gap-4 h-16">
    <Link to="/" className="font-semibold"></Link>
    <nav className="flex items-center gap-3 text-sm">
      <Link to="/orders" className={loc.pathname.startsWith('/orders')?'font-semibold':''}>Заказы</Link>
      <Link to="/profile" className={loc.pathname==='/profile'?'font-semibold':''}>Профиль</Link>
    </nav>
    <div className="ml-auto">{token?(
      <button className="btn-outline" onClick={logout}>Выйти</button>
    ):(<div className="flex gap-2">
      <Link to="/login" className="btn-outline">Авторизация</Link>
      <Link to="/register" className="btn-primary">Регистрация</Link>
    </div>)}</div>
  </div>
</header>)}
function Protected({children}:{children:JSX.Element}){ const {token}=useAuthStore(); if(!token) return <Navigate to="/login" replace/>; return children }
export default function App(){ return (<div><Nav/><main className="container py-6">
  <Routes>
    <Route path="/" element={<Navigate to="/orders" replace/>}/>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/register" element={<RegisterPage/>}/>
    <Route path="/profile" element={<Protected><ProfilePage/></Protected>}/>
    <Route path="/orders" element={<Protected><OrdersPage/></Protected>}/>
    <Route path="/orders/:id" element={<Protected><OrderPage/></Protected>}/>
    <Route path="*" element={<div className="text-center py-20">Not found</div>}/>
  </Routes>
</main></div>)}
