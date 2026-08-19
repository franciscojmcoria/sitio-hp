'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [load, setLoad] = useState(false)
  const router = useRouter()
  const sb = createClient()

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault(); setLoad(true); setErro('')
    const { error } = await sb.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('Email ou senha incorretos.'); setLoad(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  const s = { input: { width:'100%', background:'#1E2435', border:'1px solid #2D3748', borderRadius:8, padding:'10px 14px', color:'#E2E8F0', fontSize:14, outline:'none' } as React.CSSProperties }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0F1117', padding:20 }}>
      <div style={{ background:'#161B27', border:'1px solid #2D3748', borderRadius:16, padding:'40px 36px', width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:11, color:'#E8A825', letterSpacing:4, marginBottom:8 }}>🏠 CONTAINER RESIDENCIAL</div>
          <div style={{ fontSize:22, fontWeight:800 }}>OBRA LOTE 40</div>
          <div style={{ fontSize:12, color:'#64748B', marginTop:4 }}>Controle de Gastos · Várzea Grande/MT</div>
        </div>
        <form onSubmit={entrar} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ display:'block', fontSize:10, color:'#64748B', letterSpacing:2, marginBottom:6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="seu@email.com" style={s.input} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:10, color:'#64748B', letterSpacing:2, marginBottom:6 }}>SENHA</label>
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} required placeholder="••••••••" style={s.input} />
          </div>
          {erro && <div style={{ background:'#FFC7CE22', border:'1px solid #EF444444', borderRadius:8, padding:'8px 14px', fontSize:12, color:'#EF4444' }}>{erro}</div>}
          <button type="submit" disabled={load} style={{ background:load?'#A07818':'#E8A825', color:'#000', border:'none', borderRadius:8, padding:12, fontWeight:800, fontSize:14, cursor:load?'not-allowed':'pointer', letterSpacing:2, marginTop:4 }}>
            {load ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:24, fontSize:11, color:'#4A5568' }}>Acesso restrito · Francisco José Maria</div>
      </div>
    </div>
  )
}
