CREATE OR REPLACE FUNCTION public.gerar_numero_reserva()
RETURNS BIGINT AS $$
BEGIN
  RETURN nextval('reservas_numero_reserva_seq');
END;
$$ LANGUAGE plpgsql;
