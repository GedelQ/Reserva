CREATE OR REPLACE FUNCTION public.criar_reserva_em_grupo(
    p_nome_cliente TEXT,
    p_telefone_cliente TEXT,
    p_data_reserva DATE,
    p_horario_reserva TEXT,
    p_observacoes TEXT,
    p_status TEXT,
    p_mesas INT[]
)
RETURNS SETOF public.reservas AS $$
DECLARE
    v_numero_reserva BIGINT;
    v_mesa_id INT;
BEGIN
    -- Etapa 1: Gerar um único número de reserva para todo o grupo
    SELECT nextval('reservas_numero_reserva_seq') INTO v_numero_reserva;

    -- Etapa 2: Iterar sobre as mesas e inserir cada reserva com o mesmo número
    FOREACH v_mesa_id IN ARRAY p_mesas
    LOOP
        INSERT INTO public.reservas (
            nome_cliente, 
            telefone_cliente, 
            data_reserva, 
            horario_reserva, 
            observacoes, 
            status, 
            id_mesa,
            numero_reserva
        )
        VALUES (
            p_nome_cliente, 
            p_telefone_cliente, 
            p_data_reserva, 
            p_horario_reserva, 
            p_observacoes, 
            p_status::public.status_reserva, -- Cast para o tipo enum
            v_mesa_id,
            v_numero_reserva
        );
    END LOOP;

    -- Etapa 3: Retornar todas as reservas recém-criadas com base no número da reserva
    RETURN QUERY 
    SELECT * FROM public.reservas WHERE numero_reserva = v_numero_reserva;

END;
$$ LANGUAGE plpgsql;