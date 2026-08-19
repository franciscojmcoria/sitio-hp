export type Lancamento = {
  id: number; data: string; descricao: string; categoria: string
  fornecedor: string; valor: number; forma_pagamento: string
  documento?: string; obs?: string; status: string
  comprovante_url?: string; created_at?: string
}
export type ResumoCategoria = {
  categoria: string; valor_prev: number; valor_real: number
  saldo: number; pct_executado: number; cor: string; icone: string
}
