CREATE TABLE IF NOT EXISTS orcamento (
  id SERIAL PRIMARY KEY, categoria TEXT NOT NULL UNIQUE,
  valor_prev DECIMAL(10,2) NOT NULL DEFAULT 0,
  cor TEXT NOT NULL DEFAULT '#E8A825', icone TEXT NOT NULL DEFAULT '📦',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS lancamentos (
  id SERIAL PRIMARY KEY, data DATE NOT NULL, descricao TEXT NOT NULL,
  categoria TEXT NOT NULL REFERENCES orcamento(categoria) ON UPDATE CASCADE,
  fornecedor TEXT NOT NULL, valor DECIMAL(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'PIX',
  documento TEXT, obs TEXT, status TEXT NOT NULL DEFAULT 'Pago',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orcamento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "autenticado_leitura_orcamento" ON orcamento;
DROP POLICY IF EXISTS "autenticado_tudo_lancamentos"  ON lancamentos;
CREATE POLICY "autenticado_leitura_orcamento" ON orcamento  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_tudo_lancamentos"  ON lancamentos FOR ALL    TO authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON TABLE orcamento   TO authenticated;
GRANT ALL    ON TABLE lancamentos TO authenticated, service_role;
GRANT ALL    ON SEQUENCE lancamentos_id_seq TO authenticated, service_role;
INSERT INTO orcamento (categoria,valor_prev,cor,icone) VALUES
  ('Mão de Obra',8000.00,'#E8A825','👷'),('Elétrica',2942.72,'#4FC3F7','⚡'),
  ('Hidráulica/Esgoto',3161.00,'#22D3EE','💧'),('Alvenaria',3931.17,'#F97316','🧱'),
  ('Varanda/Estrutura',5850.00,'#A78BFA','🏗️'),('Fogão Caipira',3263.00,'#FB923C','🔥'),
  ('Infraestrutura',1200.00,'#34D399','🔩')
ON CONFLICT (categoria) DO NOTHING;
INSERT INTO lancamentos (data,descricao,categoria,fornecedor,valor,forma_pagamento,documento,obs)
SELECT * FROM (VALUES
  ('2026-06-10'::date,'Eucalipto tratado — vigas varanda','Varanda/Estrutura','Lyptus Comércio de Eucalipto Tratado',1517.80,'PIX','Comprov. Inter','Madeira eucalipto para varanda'),
  ('2026-06-11'::date,'Arame de cerca','Infraestrutura','Jose Henrique Oliveira dos Anjos',570.00,'PIX','Comprov. Inter','Arame para cerca do lote'),
  ('2026-06-15'::date,'1ª parcela — mão de obra (Jairo)','Mão de Obra','Isaias Aquino da Conceicao',3000.00,'PIX','Comprov. Inter','1ª parcela contrato pedreiro Jairo'),
  ('2026-06-16'::date,'Material elétrico — NF-e 000.134.388','Elétrica','Elétrica Paraná',2650.98,'NF-e','NF-e 000.134.388','Cabos, disjuntores WEG, DR, tomadas, LED'),
  ('2026-06-17'::date,'Alvenaria — cimento, cal, ferro, manta','Alvenaria','Rebouças Construção (Beira Rio)',1700.00,'Cartão 3x','Pedido 1.565.824','Cimento 18sc + Cal 6sc + Ferro + Manta'),
  ('2026-06-17'::date,'Material hidráulico e esgoto','Hidráulica/Esgoto','Aágua Saneamento',3066.17,'Cartão 4x','Comprov. Rede #KV6L01QA','Tubos PVC, conexões, registros — orç. 15330'),
  ('2026-06-17'::date,'Material elétrico complementar','Elétrica','Rute Aquino da Conceicao Duarte',165.00,'PIX','Comprov. Inter','Complemento elétrico'),
  ('2026-06-19'::date,'Adiantamento — mão de obra','Mão de Obra','Rute Aquino da Conceicao Duarte',400.00,'PIX','Comprov. Inter','Adiantamento mão de obra')
) AS t(data,descricao,categoria,fornecedor,valor,forma_pagamento,documento,obs)
WHERE NOT EXISTS (SELECT 1 FROM lancamentos l WHERE l.data=t.data AND l.descricao=t.descricao AND l.valor=t.valor::decimal);
CREATE OR REPLACE VIEW resumo_categorias AS
SELECT o.categoria, o.valor_prev, o.cor, o.icone,
  COALESCE(SUM(l.valor),0) AS valor_real,
  o.valor_prev - COALESCE(SUM(l.valor),0) AS saldo,
  CASE WHEN o.valor_prev>0 THEN ROUND((COALESCE(SUM(l.valor),0)/o.valor_prev)*100,1) ELSE 0 END AS pct_executado
FROM orcamento o LEFT JOIN lancamentos l ON l.categoria=o.categoria
GROUP BY o.id,o.categoria,o.valor_prev,o.cor,o.icone ORDER BY o.id;
GRANT SELECT ON resumo_categorias TO authenticated, service_role;
SELECT 'orcamento' AS tabela, COUNT(*) AS registros FROM orcamento
UNION ALL SELECT 'lancamentos', COUNT(*) FROM lancamentos;
