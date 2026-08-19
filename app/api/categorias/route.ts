import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function auth(req: NextRequest) { return req.headers.get('x-api-key') === process.env.OBRA_API_KEY }

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error:'Unauthorized' },{ status:401 })
  const sb = createServiceClient()
  const { data, error } = await sb.from('resumo_categorias').select('*')
  if (error) return NextResponse.json({ error:error.message },{ status:500 })
  const totalPrev = data?.reduce((a:number,b:any)=>a+b.valor_prev,0)??0
  const totalReal = data?.reduce((a:number,b:any)=>a+b.valor_real,0)??0
  return NextResponse.json({ data, resumo:{ total_previsto:totalPrev, total_realizado:totalReal, saldo:totalPrev-totalReal, pct_executado:totalPrev>0?+((totalReal/totalPrev)*100).toFixed(1):0 } })
}
