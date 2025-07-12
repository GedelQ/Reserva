ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS reservas_id_mesa_check;
ALTER TABLE public.reservas ADD CONSTRAINT reservas_id_mesa_check CHECK ((id_mesa >= 1) AND (id_mesa <= 98));