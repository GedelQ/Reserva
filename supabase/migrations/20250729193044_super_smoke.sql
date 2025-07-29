/*
  # Popular dados iniciais das mesas

  1. Dados Iniciais
    - Criar 98 mesas conforme layout da pizzaria
    - Fileiras 1-6: 8 mesas cada (48 mesas total)
    - Fileiras 7-11: 10 mesas cada (50 mesas total)
    - Todas com capacidade de 4 pessoas
    - Todas disponíveis por padrão

  2. Estrutura
    - Mesa 1-8: Fileira 1
    - Mesa 9-16: Fileira 2
    - ...
    - Mesa 49-58: Fileira 7
    - Mesa 89-98: Fileira 11
*/

-- Inserir mesas das fileiras 1-6 (8 mesas cada)
DO $$
DECLARE
  mesa_num integer := 1;
  fileira_num integer;
  posicao integer;
BEGIN
  -- Fileiras 1 a 6 (8 mesas cada)
  FOR fileira_num IN 1..6 LOOP
    FOR posicao IN 1..8 LOOP
      INSERT INTO mesas (numero_mesa, capacidade, fileira, disponivel)
      VALUES (mesa_num, 4, fileira_num, true)
      ON CONFLICT DO NOTHING;
      
      mesa_num := mesa_num + 1;
    END LOOP;
  END LOOP;
  
  -- Fileiras 7 a 11 (10 mesas cada)
  FOR fileira_num IN 7..11 LOOP
    FOR posicao IN 1..10 LOOP
      INSERT INTO mesas (numero_mesa, capacidade, fileira, disponivel)
      VALUES (mesa_num, 4, fileira_num, true)
      ON CONFLICT DO NOTHING;
      
      mesa_num := mesa_num + 1;
    END LOOP;
  END LOOP;
END $$;