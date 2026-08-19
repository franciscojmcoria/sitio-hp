import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN!
const USER_ID = parseInt(process.env.TELEGRAM_USER_ID || '928092508')
const API     = `https://api.telegram.org/bot${TOKEN}`
const CATS    = ['Mão de Obra','Elétrica','Hidráulica/Esgoto','Alvenaria','Varanda/Estrutura','Fogão Caipira','Infraestrutura']

async function reply(chat_id: number, text: string) {
  await fetch(`${API}/sendMessage`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id, text, parse_mode:'HTML' })
  })
}

const fmt   = (n: number) => `R$ ${n.toLocaleString('pt-BR',{minimumFractionDigits:2})}`
const fmtD  = (d: string) => { const [y,m,dia]=d.split('-'); return `${dia}/${m}/${y}` }

// Salva foto/doc do Telegram no Supabase Storage e retorna URL pública
async function salvarArquivo(fileId: string, ext: string, mimeType: string): Promise<string|null> {
  try {
    const infoResp = await fetch(`${API}/getFile?file_id=${fileId}`)
    const info     = await infoResp.json()
    const filePath = info.result?.file_path
    if (!filePath) return null

    const dlResp   = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${filePath}`)
    const buffer   = await dlResp.arrayBuffer()
    const nome     = `telegram_${Date.now()}.${ext}`
    const sb       = createServiceClient()
    const { data, error } = await sb.storage.from('comprovantes')
      .upload(nome, new Uint8Array(buffer), { contentType: mimeType })
    if (error || !data) return null

    const { data:{ publicUrl } } = sb.storage.from('comprovantes').getPublicUrl(data.path)
    return publicUrl
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const body    = await req.json()
    const msg     = body?.message
    if (!msg) return NextResponse.json({ ok:true })

    const chat_id = msg.chat?.id as number
    const user_id = msg.from?.id  as number
    const text    = (msg.text || '').trim()

    if (user_id !== USER_ID) {
      await reply(chat_id, '⛔ Acesso não autorizado.')
      return NextResponse.json({ ok:true })
    }

    const sb = createServiceClient()

    // ── FOTO OU DOCUMENTO (comprovante) ──────────────────────
    if (msg.photo || msg.document) {
      let fileId   = ''
      let ext      = 'jpg'
      let mimeType = 'image/jpeg'

      if (msg.photo) {
        fileId   = msg.photo[msg.photo.length-1].file_id
        ext      = 'jpg'; mimeType = 'image/jpeg'
      } else {
        fileId   = msg.document.file_id
        mimeType = msg.document.mime_type || 'application/octet-stream'
        ext      = msg.document.file_name?.split('.').pop() || 'pdf'
      }

      await reply(chat_id, '⏳ Salvando comprovante...')
      const url = await salvarArquivo(fileId, ext, mimeType)

      if (!url) {
        await reply(chat_id, '❌ Erro ao salvar o arquivo. Tente novamente.')
        return NextResponse.json({ ok:true })
      }

      // Verificar se veio legenda com dados do lançamento
      const caption = (msg.caption || '').trim()
      const partes  = caption.split('|').map((s: string) => s.trim())

      if (partes.length >= 4) {
        const [valorStr, descricao, categoria, fornecedor, forma_pagamento='PIX'] = partes
        const valor = parseFloat(valorStr.replace(',','.'))

        if (!isNaN(valor) && valor>0 && CATS.includes(categoria)) {
          const hoje = new Date().toISOString().split('T')[0]
          const { error } = await sb.from('lancamentos').insert({
            data:hoje, descricao, categoria, fornecedor, valor,
            forma_pagamento: forma_pagamento||'PIX',
            comprovante_url: url,
            obs:'Via bot Telegram (com comprovante)'
          })
          if (error) {
            await reply(chat_id, `❌ Comprovante salvo mas erro no lançamento: ${error.message}`)
          } else {
            await reply(chat_id,
              `✅ <b>COMPROVANTE + LANÇAMENTO REGISTRADOS!</b>\n\n` +
              `📝 ${descricao}\n💰 ${fmt(valor)}\n🏷️ ${categoria}\n🏪 ${fornecedor}\n` +
              `💳 ${forma_pagamento||'PIX'}\n📎 Comprovante anexado!\n\n` +
              `Digite /status para ver o resumo! 📊`
            )
          }
          return NextResponse.json({ ok:true })
        }
      }

      // Foto salva mas sem legenda válida
      await reply(chat_id,
        `📎 <b>Comprovante salvo!</b>\n\n` +
        `Para criar o lançamento, reenvie a foto com esta legenda:\n\n` +
        `<code>VALOR | DESCRIÇÃO | CATEGORIA | FORNECEDOR | FORMA</code>\n\n` +
        `📌 Exemplo:\n` +
        `<code>1998 | Telha Brasilit 20un | Alvenaria | Beira Rio | PIX</code>`
      )
      return NextResponse.json({ ok:true })
    }

    // ── /start ───────────────────────────────────────────────
    if (text==='/start'||text.startsWith('/start ')) {
      await reply(chat_id,
        `🏠 <b>OBRA LOTE 40 — Bot de Controle</b>\n\n` +
        `Olá Francisco! Comandos disponíveis:\n\n` +
        `/status — 📊 Resumo geral da obra\n` +
        `/ultimos — 📋 Últimos 5 pagamentos\n` +
        `/categorias — 🗂️ Progresso por categoria\n` +
        `/novo — ➕ Como adicionar pagamento\n` +
        `/add [dados] — ✅ Adicionar pagamento\n\n` +
        `📎 <b>Comprovante:</b> Envie uma foto com a legenda no formato:\n` +
        `<code>VALOR | DESCRIÇÃO | CATEGORIA | FORNECEDOR | FORMA</code>`
      )
      return NextResponse.json({ ok:true })
    }

    // ── /status ──────────────────────────────────────────────
    if (text==='/status') {
      const { data } = await sb.from('resumo_categorias').select('*')
      if (!data) { await reply(chat_id,'❌ Erro ao buscar dados.'); return NextResponse.json({ ok:true }) }
      const totalPrev = data.reduce((a:number,b:any)=>a+Number(b.valor_prev),0)
      const totalReal = data.reduce((a:number,b:any)=>a+Number(b.valor_real),0)
      const saldo     = totalPrev-totalReal
      const pct       = totalPrev>0?((totalReal/totalPrev)*100).toFixed(1):'0'
      const b         = Math.round(Number(pct)/10)
      await reply(chat_id,
        `📊 <b>OBRA LOTE 40 — STATUS</b>\n\n` +
        `${'█'.repeat(b)}${'░'.repeat(10-b)} <b>${pct}%</b>\n\n` +
        `💰 Previsto:  <b>${fmt(totalPrev)}</b>\n` +
        `✅ Realizado: <b>${fmt(totalReal)}</b>\n` +
        `💚 Saldo:     <b>${fmt(saldo)}</b>`
      )
      return NextResponse.json({ ok:true })
    }

    // ── /ultimos ─────────────────────────────────────────────
    if (text==='/ultimos') {
      const { data } = await sb.from('lancamentos').select('*').order('data',{ascending:false}).limit(5)
      if (!data||data.length===0) { await reply(chat_id,'📋 Nenhum lançamento.'); return NextResponse.json({ ok:true }) }
      let m=`📋 <b>ÚLTIMOS PAGAMENTOS</b>\n\n`
      data.forEach((l:any)=>{ m+=`• <b>${fmtD(l.data)}</b> — ${l.descricao}${l.comprovante_url?' 📎':''}\n  💰 ${fmt(Number(l.valor))} · ${l.categoria} · ${l.forma_pagamento}\n\n` })
      await reply(chat_id,m)
      return NextResponse.json({ ok:true })
    }

    // ── /categorias ──────────────────────────────────────────
    if (text==='/categorias') {
      const { data } = await sb.from('resumo_categorias').select('*')
      if (!data) { await reply(chat_id,'❌ Erro.'); return NextResponse.json({ ok:true }) }
      let m=`🗂️ <b>PROGRESSO POR CATEGORIA</b>\n\n`
      data.forEach((r:any)=>{
        const p=Math.min(Number(r.pct_executado),100)
        const e=p>=100?'🔴':p>=70?'🟡':'🟢'
        m+=`${r.icone} <b>${r.categoria}</b>\n${'█'.repeat(Math.round(p/10))}${'░'.repeat(10-Math.round(p/10))} ${e} ${r.pct_executado}%\n${fmt(Number(r.valor_real))} / ${fmt(Number(r.valor_prev))}\n\n`
      })
      await reply(chat_id,m)
      return NextResponse.json({ ok:true })
    }

    // ── /novo ────────────────────────────────────────────────
    if (text==='/novo') {
      await reply(chat_id,
        `➕ <b>ADICIONAR PAGAMENTO</b>\n\n` +
        `<b>Opção 1 — Texto:</b>\n` +
        `<code>/add VALOR | DESCRIÇÃO | CATEGORIA | FORNECEDOR | FORMA</code>\n\n` +
        `<b>Opção 2 — Foto com legenda:</b>\n` +
        `Envie a foto do comprovante com a legenda no mesmo formato!\n\n` +
        `📌 <b>Exemplo:</b>\n` +
        `<code>1998 | Telha Brasilit 20un | Alvenaria | Beira Rio | PIX</code>\n\n` +
        `📂 <b>Categorias:</b>\n${CATS.map(c=>`• ${c}`).join('\n')}\n\n` +
        `💳 <b>Formas:</b> PIX · Cartão · Cartão 3x · NF-e · Dinheiro`
      )
      return NextResponse.json({ ok:true })
    }

    // ── /add ─────────────────────────────────────────────────
    if (text.startsWith('/add ')) {
      const partes = text.substring(5).split('|').map((s:string)=>s.trim())
      if (partes.length<4) {
        await reply(chat_id,`❌ Formato incompleto!\n\nUse:\n<code>/add VALOR | DESCRIÇÃO | CATEGORIA | FORNECEDOR | FORMA</code>\n\nDigite /novo para ver exemplos.`)
        return NextResponse.json({ ok:true })
      }
      const [valorStr,descricao,categoria,fornecedor,forma_pagamento='PIX'] = partes
      const valor = parseFloat(valorStr.replace(',','.'))
      if (isNaN(valor)||valor<=0) { await reply(chat_id,'❌ Valor inválido. Ex: 1500 ou 1500,50'); return NextResponse.json({ ok:true }) }
      if (!CATS.includes(categoria)) { await reply(chat_id,`❌ Categoria inválida: "${categoria}"\n\n${CATS.map(c=>`• ${c}`).join('\n')}`); return NextResponse.json({ ok:true }) }

      const hoje = new Date().toISOString().split('T')[0]
      const { error } = await sb.from('lancamentos').insert({
        data:hoje, descricao, categoria, fornecedor, valor,
        forma_pagamento:forma_pagamento||'PIX', obs:'Via bot Telegram'
      })
      if (error) {
        await reply(chat_id,`❌ Erro ao salvar: ${error.message}`)
      } else {
        await reply(chat_id,
          `✅ <b>PAGAMENTO REGISTRADO!</b>\n\n` +
          `📝 ${descricao}\n💰 ${fmt(valor)}\n🏷️ ${categoria}\n🏪 ${fornecedor}\n💳 ${forma_pagamento||'PIX'}\n📅 ${fmtD(hoje)}\n\n` +
          `💡 <i>Dica: para anexar comprovante, envie a foto com a mesma legenda!</i>\n\n` +
          `Digite /status para ver o resumo! 📊`
        )
      }
      return NextResponse.json({ ok:true })
    }

    await reply(chat_id,`❓ Não entendi. Digite /start para ver os comandos.`)
    return NextResponse.json({ ok:true })

  } catch { return NextResponse.json({ ok:true }) }
}
