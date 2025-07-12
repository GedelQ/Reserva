@@ .. @@
 CREATE TABLE IF NOT EXISTS reservas (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   created_at timestamptz DEFAULT now(),
-  id_mesa integer NOT NULL CHECK (id_mesa >= 1 AND id_mesa <= 94),
+  id_mesa integer NOT NULL CHECK (id_mesa >= 1 AND id_mesa <= 98),
   nome_cliente text NOT NULL,
   telefone_cliente text NOT NULL,
   data_reserva date NOT NULL,
   horario_reserva time NOT NULL,
   observacoes text DEFAULT '',
   status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada', 'finalizada'))
 );