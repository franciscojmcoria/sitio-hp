import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function auth(req: NextRequest) { return req.headers.get('x-api-key') === process.env.OBRA_API_KEY }

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error:'Unauthorized' },{ status:401 })
  const { searchParams } = new URL(req.url)
  const cat = searchParams.get('cat'); const limit = parseInt(searchParams.get('limit')||'50')
  const sb = createServiceClient()
  let q = sb.from('lancamentos').select('*').order('data',{ascending:false}).limit(limit)
  if (cat) q = q.eq('categoria',cat)
  const { data, error } = await q
  if (error) return NextResponse.json({ error:error.message },{ status:500 })
  return NextResponse.json({ data, total:data?.length })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error:'Unauthorized' },{ status:401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error:'JSON inválido' },{ status:400 }) }
  const { data:d, descricao, categoria, fornecedor, valor, forma_pagamento } = body
  if (!d||!descricao||!categoria||!fornecedor||!valor) return NextResponse.json({ error:'Campos obrigatórios: data, descricao, categoria, fornecedor, valor' },{ status:400 })
  const sb = createServiceClient()
  const { data, error } = await sb.from('lancamentos').insert({ data:d, descricao, categoria, fornecedor, valor:Number(valor), forma_pagamento:forma_pagamento||'PIX', documento:body.documento||null, obs:body.obs||null }).select().single()
  if (error) return NextResponse.json({ error:error.message },{ status:500 })
  return NextResponse.json({ success:true, data },{ status:201 })
}
