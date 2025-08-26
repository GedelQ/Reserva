-- Unifica o numero_reserva para reservas antigas que pertencem ao mesmo grupo.
-- Um "grupo" é definido por uma combinação única de nome_cliente, telefone_cliente, data_reserva e horario_reserva.

-- Etapa 1: Usar uma Common Table Expression (CTE) para identificar os grupos que precisam de correção.
-- Um grupo precisa de correção se tiver mais de um `numero_reserva` distinto para a mesma combinação de cliente/data/hora.
WITH grupo_canonica AS (
  SELECT
    nome_cliente,
    telefone_cliente,
    data_reserva,
    horario_reserva,
    -- Define o menor `numero_reserva` do grupo como o número canônico (oficial).
    MIN(numero_reserva) as numero_reserva_canonico
  FROM
    public.reservas
  GROUP BY
    nome_cliente,
    telefone_cliente,
    data_reserva,
    horario_reserva
  -- Filtra apenas os grupos que têm múltiplos e diferentes `numero_reserva`, pois só esses precisam ser corrigidos.
  HAVING
    COUNT(DISTINCT numero_reserva) > 1
)
-- Etapa 2: Atualizar a tabela de reservas.
UPDATE
  public.reservas r
SET
  -- Define o `numero_reserva` para o número canônico que encontramos para o grupo.
  numero_reserva = gc.numero_reserva_canonico
FROM
  -- Junta a tabela de reservas com a nossa CTE que contém os números corretos.
  grupo_canonica gc
WHERE
  -- Garante que a junção seja feita com base nos campos que definem o grupo.
  r.nome_cliente = gc.nome_cliente
  AND r.telefone_cliente = gc.telefone_cliente
  AND r.data_reserva = gc.data_reserva
  AND r.horario_reserva = gc.horario_reserva
  -- Otimização: atualiza apenas as linhas cujo `numero_reserva` ainda não é o canônico.
  AND r.numero_reserva != gc.numero_reserva_canonico;
