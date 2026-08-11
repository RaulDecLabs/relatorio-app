-- Adiciona campos de Atribuição/Origem, Motivo de Perda e Produto às oportunidades do Nectar CRM
ALTER TABLE nectar_deals
ADD COLUMN origin_name text,
ADD COLUMN owner_name text,
ADD COLUMN loss_reason text,
ADD COLUMN product_names text;
