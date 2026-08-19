import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Obra Lote 40', description: 'Controle de Gastos' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#0F1117;color:#E2E8F0;font-family:'Segoe UI',sans-serif}input,select,button{font-family:inherit}`}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
