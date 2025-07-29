/*
  # Popular tabela de mesas com dados iniciais

  1. Dados Iniciais
    - Criar 98 mesas conforme layout do sistema
    - Fileiras 1-6: 8 mesas cada (48 mesas total)
    - Fileiras 7-11: 10 mesas cada (50 mesas total)
    - Todas as mesas com capacidade de 4 pessoas

  2. Numeração
    - Mesas numeradas sequencialmente de 1 a 98
    - Distribuídas pelas fileiras conforme layout
*/

-- Inserir mesas das fileiras 1-6 (8 mesas cada)
DO $$
DECLARE
  fileira_num integer;
  mesa_num integer := 1;
  posicao integer;
BEGIN
  -- Fileiras 1 a 6 com 8 mesas cada
  FOR fileira_num IN 1..6 LOOP
    FOR posicao IN 1..8 LOOP
      INSERT INTO mesas (numero_mesa, capacidade, fileira, disponivel)
      VALUES (mesa_num, 4, fileira_num, true)
      ON CONFLICT DO NOTHING;
      
      mesa_num := mesa_num + 1;
    END LOOP;
  END LOOP;
  
  -- Fileiras 7 a 11 com 10 mesas cada
  FOR fileira_num IN 7..11 LOOP
    FOR posicao IN 1..10 LOOP
      INSERT INTO mesas (numero_mesa, capacidade, fileira, disponivel)
      VALUES (mesa_num, 4, fileira_num, true)
      ON CONFLICT DO NOTHING;
      
      mesa_num := mesa_num + 1;
    END LOOP;
  END LOOP;
END $$;