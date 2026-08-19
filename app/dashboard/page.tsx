'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Lancamento, ResumoCategoria } from '@/lib/types'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtD = (d: string) => { const [y,m,dia] = d.split('-'); return `${dia}/${m}/${y}` }
const FORMAS = ['PIX','Cartão','Cartão 2x','Cartão 3x','Cartão 4x','NF-e','Dinheiro','Boleto']
const CATS = ['Mão de Obra','Elétrica','Hidráulica/Esgoto','Alvenaria','Varanda/Estrutura','Fogão Caipira','Infraestrutura']
const S = { bg:'#0F1117', surf:'#161B27', surf2:'#1E2435', bord:'#2D3748', text:'#E2E8F0', muted:'#64748B', gold:'#E8A825' }
const card: React.CSSProperties = { background:S.surf, border:`1px solid ${S.bord}`, borderRadius:12, padding:20 }
const inp: React.CSSProperties = { background:S.surf2, border:`1px solid ${S.bord}`, borderRadius:8, padding:'8px 12px', color:S.text, fontSize:13, outline:'none', width:'100%' }

function Badge({ cat, cor }: { cat: string; cor: string }) {
  return <span style={{ background:cor+'22', color:cor, border:`1px solid ${cor}44`, borderRadius:4, padding:'2px 8px', fontSize:10, fontWeight:600, whiteSpace:'nowrap' }}>{cat}</span>
}
function Bar2({ value, max, cor }: { value:number; max:number; cor:string }) {
  const pct = max > 0 ? Math.min((value/max)*100, 100) : 0
  return <div style={{ background:S.surf2, borderRadius:8, height:10, overflow:'hidden', flexGrow:1 }}><div style={{ width:`${pct}%`, height:'100%', background:value>max?'#EF4444':cor, borderRadius:8, transition:'width .5s' }} /></div>
}
const TipPie = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return <div style={{ background:S.surf2, border:`1px solid ${S.bord}`, borderRadius:8, padding:'8px 14px' }}><div style={{ color:S.text, fontSize:11, fontWeight:700 }}>{payload[0].name}</div><div style={{ color:S.gold, fontSize:13, fontWeight:800 }}>{fmt(payload[0].value)}</div></div>
}

export default function Dashboard() {
  const sb = createClient(); const router = useRouter()
  const [tab, setTab] = useState<'dash'|'lanc'|'cats'>('dash')
  const [lance, setLance] = useState<Lancamento[]>([])
  const [resumo, setResumo] = useState<ResumoCategoria[]>([])
  const [busca, setBusca] = useState(''); const [filtCat, setFiltCat] = useState('Todas')
  const [showForm, setShowForm] = useState(false); const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ data:'', descricao:'', categoria:'Alvenaria', fornecedor:'', valor:'', forma_pagamento:'PIX', documento:'', obs:'' })

  const load = useCallback(async () => {
    const [{ data:l },{ data:r }] = await Promise.all([
      sb.from('lancamentos').select('*').order('data',{ascending:false}),
      sb.from('resumo_categorias').select('*')
    ])
    if (l) setLance(l); if (r) setResumo(r)
  }, [sb])

  useEffect(() => { load() }, [load])

  const logout = async () => { await sb.auth.signOut(); router.push('/login') }

  const adicionar = async () => {
    if (!form.data||!form.descricao||!form.fornecedor||!form.valor) return
    setSaving(true)
    await sb.from('lancamentos').insert({ ...form, valor:parseFloat(form.valor), documento:form.documento||null, obs:form.obs||null })
    setSaving(false)
    setForm({ data:'', descricao:'', categoria:'Alvenaria', fornecedor:'', valor:'', forma_pagamento:'PIX', documento:'', obs:'' })
    setShowForm(false); await load()
  }

  const excluir = async (id: number) => {
    if (!confirm('Excluir este lançamento?')) return
    await sb.from('lancamentos').delete().eq('id', id); await load()
  }

  const totalPrev = resumo.reduce((a,b)=>a+b.valor_prev,0)
  const totalReal = resumo.reduce((a,b)=>a+b.valor_real,0)
  const saldo = totalPrev-totalReal
  const pct = totalPrev>0?(totalReal/totalPrev)*100:0
  const corMap = Object.fromEntries(resumo.map(r=>[r.categoria,r.cor]))
  const pieData = resumo.filter(r=>r.valor_real>0).map(r=>({ name:r.categoria, value:r.valor_real, cor:r.cor }))
  const filtered = lance.filter(l=>(l.descricao.toLowerCase().includes(busca.toLowerCase())||l.fornecedor.toLowerCase().includes(busca.toLowerCase()))&&(filtCat==='Todas'||l.categoria===filtCat))

  const tabBtn = (t: string): React.CSSProperties => ({ padding:'8px 20px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:tab===t?700:400, background:tab===t?S.gold:'transparent', color:tab===t?'#000':S.muted, border:'none', transition:'all .2s' })

  return (
    <div style={{ background:S.bg, minHeight:'100vh' }}>
      <div style={{ background:S.surf, borderBottom:`1px solid ${S.bord}`, padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:10, color:S.gold, letterSpacing:3, marginBottom:2 }}>🏠 CONTAINER RESIDENCIAL</div>
          <div style={{ fontSize:20, fontWeight:800 }}>LOTE 40 — CONTROLE DA OBRA</div>
          <div style={{ fontSize:10, color:S.muted }}>Várzea Grande / MT · Previsto × Realizado</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:S.muted, letterSpacing:2 }}>TOTAL REALIZADO</div>
            <div style={{ fontSize:24, fontWeight:800, color:S.gold }}>{fmt(totalReal)}</div>
            <div style={{ fontSize:11, color:pct>100?'#EF4444':'#22C55E' }}>{pct.toFixed(1)}% do orçamento</div>
          </div>
          <button onClick={logout} style={{ background:'transparent', border:`1px solid ${S.bord}`, borderRadius:8, padding:'8px 14px', color:S.muted, cursor:'pointer', fontSize:11 }}>Sair</button>
        </div>
      </div>

      <div style={{ padding:'12px 24px', display:'flex', gap:8, borderBottom:`1px solid ${S.bord}`, background:S.surf }}>
        {([['dash','📊 Dashboard'],['lanc','📋 Lançamentos'],['cats','🗂️ Categorias']] as const).map(([t,l])=>(
          <button key={t} style={tabBtn(t)} onClick={()=>setTab(t)}>{l}</button>
        ))}
      </div>

      <div style={{ padding:24 }}>
        {tab==='dash' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
              {[{l:'TOTAL PREVISTO',v:fmt(totalPrev),c:'#4FC3F7',s:'orçamento base'},{l:'TOTAL REALIZADO',v:fmt(totalReal),c:S.gold,s:`${lance.length} pagamentos`},{l:'SALDO DISPONÍVEL',v:fmt(saldo),c:saldo>=0?'#22C55E':'#EF4444',s:saldo>=0?'dentro do orçamento':'⚠️ estouro'},{l:'% EXECUTADO',v:`${pct.toFixed(1)}%`,c:'#A78BFA',s:'do total previsto'}].map(({l,v,c,s})=>(
                <div key={l} style={card}><div style={{ fontSize:9, color:S.muted, letterSpacing:3, textTransform:'uppercase', marginBottom:6 }}>{l}</div><div style={{ fontSize:22, fontWeight:800, color:c, marginBottom:4 }}>{v}</div><div style={{ fontSize:10, color:S.muted }}>{s}</div></div>
              ))}
            </div>
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}><span style={{ fontSize:12, fontWeight:700, letterSpacing:2 }}>AVANÇO GERAL DA OBRA</span><span style={{ fontSize:12, color:S.gold, fontWeight:800 }}>{pct.toFixed(1)}%</span></div>
              <Bar2 value={totalReal} max={totalPrev} cor={S.gold} />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:10, color:S.muted }}><span>R$ 0</span><span>{fmt(totalPrev)}</span></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:16 }}>
              <div style={card}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:16, color:S.muted }}>REALIZADO POR CATEGORIA</div>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">{pieData.map((e,i)=><Cell key={i} fill={e.cor}/>)}</Pie><Tooltip content={<TipPie/>}/></PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:8 }}>
                  {pieData.map(e=>(<div key={e.name} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11 }}><div style={{ width:10, height:10, borderRadius:3, background:e.cor, flexShrink:0 }}/><span style={{ flex:1, color:S.muted }}>{e.name}</span><span style={{ fontWeight:700 }}>{fmt(e.value)}</span></div>))}
                </div>
              </div>
              <div style={card}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:16, color:S.muted }}>ÚLTIMOS PAGAMENTOS</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {lance.slice(0,6).map(l=>(<div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingBottom:10, borderBottom:`1px solid ${S.bord}` }}><div><div style={{ fontSize:12, fontWeight:700, marginBottom:3 }}>{l.descricao}</div><div style={{ display:'flex', gap:8, alignItems:'center' }}><span style={{ fontSize:10, color:S.muted }}>{fmtD(l.data)}</span><Badge cat={l.categoria} cor={corMap[l.categoria]||S.gold}/></div></div><div style={{ textAlign:'right' }}><div style={{ fontSize:14, fontWeight:800, color:S.gold }}>{fmt(l.valor)}</div><div style={{ fontSize:10, color:S.muted }}>{l.forma_pagamento}</div></div></div>))}
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:16, color:S.muted }}>PREVISTO × REALIZADO POR CATEGORIA</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={resumo} margin={{ top:0, right:20, left:0, bottom:0 }}>
                  <XAxis dataKey="categoria" tick={{ fontSize:9, fill:S.muted }} interval={0} angle={-10} textAnchor="end" height={50}/>
                  <YAxis tick={{ fontSize:9, fill:S.muted }} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={(v:number)=>fmt(v)} contentStyle={{ background:S.surf2, border:`1px solid ${S.bord}`, borderRadius:8, color:S.text, fontSize:11 }}/>
                  <Legend wrapperStyle={{ fontSize:11, color:S.muted }}/>
                  <Bar dataKey="valor_prev" name="Previsto" fill="#2D3748" radius={[4,4,0,0]}/>
                  <Bar dataKey="valor_real" name="Realizado" radius={[4,4,0,0]}>{resumo.map((r,i)=><Cell key={i} fill={r.cor}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab==='lanc' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
              <input placeholder="🔍 Buscar..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ ...inp, flex:1, minWidth:200 }}/>
              <select value={filtCat} onChange={e=>setFiltCat(e.target.value)} style={{ ...inp, width:'auto', cursor:'pointer' }}><option>Todas</option>{CATS.map(c=><option key={c}>{c}</option>)}</select>
              <button onClick={()=>setShowForm(!showForm)} style={{ background:S.gold, color:'#000', border:'none', borderRadius:8, padding:'9px 18px', fontWeight:800, cursor:'pointer', fontSize:13, whiteSpace:'nowrap' }}>+ Novo</button>
            </div>
            {showForm && (
              <div style={{ ...card, border:`1px solid ${S.gold}55` }}>
                <div style={{ fontSize:12, fontWeight:700, color:S.gold, letterSpacing:2, marginBottom:16 }}>REGISTRAR PAGAMENTO</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:12 }}>
                  {[{l:'DATA *',k:'data',t:'date'},{l:'VALOR *',k:'valor',t:'number'},{l:'FORMA',k:'forma_pagamento',t:'select'},{l:'CATEGORIA',k:'categoria',t:'select2'},{l:'DESCRIÇÃO *',k:'descricao',t:'text'},{l:'FORNECEDOR *',k:'fornecedor',t:'text'},{l:'DOCUMENTO',k:'documento',t:'text'},{l:'OBSERVAÇÃO',k:'obs',t:'text'}].map(({l,k,t})=>(
                    <div key={k}><label style={{ display:'block', fontSize:10, color:S.muted, letterSpacing:2, marginBottom:4 }}>{l}</label>
                      {t==='select'?<select value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ ...inp, cursor:'pointer' }}>{FORMAS.map(f=><option key={f}>{f}</option>)}</select>:t==='select2'?<select value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ ...inp, cursor:'pointer' }}>{CATS.map(c=><option key={c}>{c}</option>)}</select>:<input type={t} value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={inp} placeholder={k==='valor'?'0,00':undefined}/>}
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={adicionar} disabled={saving} style={{ background:saving?'#A07818':S.gold, color:'#000', border:'none', borderRadius:8, padding:'9px 22px', fontWeight:800, cursor:saving?'not-allowed':'pointer' }}>{saving?'Salvando...':'✅ Salvar'}</button>
                  <button onClick={()=>setShowForm(false)} style={{ background:'transparent', color:S.muted, border:`1px solid ${S.bord}`, borderRadius:8, padding:'9px 18px', cursor:'pointer' }}>Cancelar</button>
                </div>
              </div>
            )}
            <div style={card}>
              <div style={{ fontSize:11, color:S.muted, marginBottom:12 }}>{filtered.length} lançamento(s) · <strong style={{ color:S.gold }}>{fmt(filtered.reduce((a,b)=>a+b.valor,0))}</strong></div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr style={{ borderBottom:`1px solid ${S.bord}` }}>{['DATA','DESCRIÇÃO','CATEGORIA','FORNECEDOR','DOC','FORMA','VALOR',''].map(h=><th key={h} style={{ padding:'8px 12px', textAlign:'left', color:S.muted, fontWeight:700, fontSize:10, letterSpacing:1, whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filtered.map((l,i)=>(
                      <tr key={l.id} style={{ borderBottom:`1px solid ${S.bord}44`, background:i%2===0?'transparent':S.surf2+'66' }}>
                        <td style={{ padding:'10px 12px', color:S.muted, whiteSpace:'nowrap' }}>{fmtD(l.data)}</td>
                        <td style={{ padding:'10px 12px' }}><div style={{ fontWeight:700 }}>{l.descricao}</div>{l.obs&&<div style={{ fontSize:10, color:S.muted }}>{l.obs}</div>}</td>
                        <td style={{ padding:'10px 12px' }}><Badge cat={l.categoria} cor={corMap[l.categoria]||S.gold}/></td>
                        <td style={{ padding:'10px 12px', color:S.muted, fontSize:11 }}>{l.fornecedor}</td>
                        <td style={{ padding:'10px 12px', color:S.muted, fontSize:10, whiteSpace:'nowrap' }}>{l.documento||'—'}</td>
                        <td style={{ padding:'10px 12px' }}><span style={{ background:l.forma_pagamento==='PIX'?'#22C55E22':'#4FC3F722', color:l.forma_pagamento==='PIX'?'#22C55E':'#4FC3F7', borderRadius:4, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{l.forma_pagamento}</span></td>
                        <td style={{ padding:'10px 12px', fontWeight:800, color:S.gold, textAlign:'right', whiteSpace:'nowrap' }}>{fmt(l.valor)}</td>
                        <td style={{ padding:'10px 6px' }}><button onClick={()=>excluir(l.id)} style={{ background:'transparent', border:'none', color:'#EF444466', cursor:'pointer', fontSize:14 }}>🗑</button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{ borderTop:`2px solid ${S.gold}44` }}><td colSpan={6} style={{ padding:12, fontWeight:700, color:S.muted, fontSize:12 }}>TOTAL</td><td style={{ padding:12, fontWeight:900, color:S.gold, fontSize:16, textAlign:'right' }}>{fmt(filtered.reduce((a,b)=>a+b.valor,0))}</td><td/></tr></tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab==='cats' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              {[{l:'TOTAL PREVISTO',v:fmt(totalPrev),c:'#4FC3F7'},{l:'TOTAL REALIZADO',v:fmt(totalReal),c:S.gold},{l:'SALDO RESTANTE',v:fmt(saldo),c:saldo>=0?'#22C55E':'#EF4444'}].map(({l,v,c})=>(
                <div key={l} style={{ ...card, textAlign:'center' }}><div style={{ fontSize:10, color:S.muted, letterSpacing:2 }}>{l}</div><div style={{ fontSize:22, fontWeight:900, color:c, marginTop:6 }}>{v}</div></div>
              ))}
            </div>
            {resumo.map(r=>{
              const lc = lance.filter(l=>l.categoria===r.categoria)
              return (
                <div key={r.categoria} style={{ ...card, borderLeft:`3px solid ${r.cor}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div><div style={{ fontSize:14, fontWeight:800, marginBottom:2 }}>{r.icone} {r.categoria}</div><div style={{ fontSize:10, color:S.muted }}>{lc.length} lançamento(s)</div></div>
                    <div style={{ textAlign:'right' }}><div style={{ fontSize:18, fontWeight:900, color:r.cor }}>{fmt(r.valor_real)}</div><div style={{ fontSize:11, color:S.muted }}>de {fmt(r.valor_prev)}</div><div style={{ fontSize:11, color:r.saldo>=0?'#22C55E':'#EF4444', fontWeight:700 }}>{r.saldo>=0?`Saldo: ${fmt(r.saldo)}`:`⚠️ Estouro: ${fmt(Math.abs(r.saldo))}`}</div></div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}><Bar2 value={r.valor_real} max={r.valor_prev} cor={r.cor}/><span style={{ fontSize:12, fontWeight:800, color:r.pct_executado>100?'#EF4444':r.cor, whiteSpace:'nowrap' }}>{r.pct_executado}%</span></div>
                  {lc.length>0?<div style={{ display:'flex', flexDirection:'column', gap:6 }}>{lc.map(l=><div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:S.surf2, borderRadius:8, padding:'8px 12px' }}><div><span style={{ fontSize:11, fontWeight:700 }}>{l.descricao}</span><span style={{ fontSize:10, color:S.muted, marginLeft:10 }}>{fmtD(l.data)} · {l.forma_pagamento}</span></div><span style={{ fontSize:13, fontWeight:800, color:S.gold }}>{fmt(l.valor)}</span></div>)}</div>:<div style={{ background:S.surf2, borderRadius:8, padding:'10px 16px', fontSize:11, color:S.muted, fontStyle:'italic' }}>Nenhum pagamento registrado ainda</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
