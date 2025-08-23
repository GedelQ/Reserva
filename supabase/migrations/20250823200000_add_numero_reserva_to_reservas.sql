-- 1. Adicionar a coluna como um BIGINT simples, permitindo nulos temporariamente.
ALTER TABLE public.reservas ADD COLUMN numero_reserva BIGINT;

-- 2. Preencher a nova coluna para todas as reservas que já existem.
-- A CTE garante que cada linha receba um número único.
WITH preenchimento AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM
    public.reservas
)
UPDATE
  public.reservas
SET
  numero_reserva = preenchimento.rn
FROM
  preenchimento
WHERE
  public.reservas.id = preenchimento.id;

-- 3. Após o preenchimento, tornar a coluna NOT NULL, pois todas as linhas agora têm um valor.
ALTER TABLE public.reservas ALTER COLUMN numero_reserva SET NOT NULL;

-- 4. Adicionar a restrição UNIQUE para garantir a unicidade e otimizar buscas.
-- Isso só funcionará se o passo 2 tiver gerado números únicos.
ALTER TABLE public.reservas ADD CONSTRAINT reservas_numero_reserva_key UNIQUE (numero_reserva);

-- 5. Criar uma sequência para gerar novos números de reserva.
CREATE SEQUENCE IF NOT EXISTS reservas_numero_reserva_seq;

-- 6. Ajustar o valor inicial da sequência para o próximo número disponível.
-- Usamos COALESCE para o caso de não haver reservas existentes (a tabela estar vazia).
SELECT setval('reservas_numero_reserva_seq', COALESCE((SELECT MAX(numero_reserva) FROM public.reservas), 1));

-- 7. Vincular a sequência à coluna para que novas inserções usem o auto-incremento.
ALTER TABLE public.reservas ALTER COLUMN numero_reserva SET DEFAULT nextval('reservas_numero_reserva_seq');