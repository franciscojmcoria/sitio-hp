import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function auth(req: NextRequest) { return req.headers.get('x-api-key') === process.env.OBRA_API_KEY }

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error:'Unauthorized' },{ status:401 })
  const sb = createServiceClient()
  const [{ data:resumo },{ data:ultimos }] = await Promise.all([
    sb.from('resumo_categorias').select('*'),
    sb.from('lancamentos').select('*').order('created_at',{ascending:false}).limit(5)
  ])
  const totalPrev = resumo?.reduce((a:number,b:any)=>a+b.valor_prev,0)??0
  const totalReal = resumo?.reduce((a:number,b:any)=>a+b.valor_real,0)??0
  return NextResponse.json({ total_previsto:totalPrev, total_realizado:totalReal, saldo:totalPrev-totalReal, pct_executado:totalPrev>0?+((totalReal/totalPrev)*100).toFixed(1):0, por_categoria:resumo, ultimos_lancamentos:ultimos })
}
