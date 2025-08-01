# 🍕 API de Reservas da Pizzaria v1.1

## 📋 Visão Geral

API REST para gerenciamento de reservas de mesas. Esta versão introduz o gerenciamento de status de reserva (`pendente`, `confirmada`, `cancelada`).

**Base URL:** `https://[seu-projeto].supabase.co/functions/v1/reservas-api`

## 🔑 Autenticação

A chave de serviço (`service_role`) ou anônima (`anon`) do Supabase deve ser enviada no header:

```
Authorization: Bearer [SUPABASE_KEY]
```

## 📦 Modelo de Dados: `reservas`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Identificador único da reserva (PK) |
| `id_mesa` | `integer` | Número da mesa reservada |
| `data_reserva` | `date` | Data da reserva |
| `horario_reserva` | `time` | Horário da reserva |
| `nome_cliente` | `text` | Nome do cliente |
| `telefone_cliente` | `text` | Telefone do cliente |
| `observacoes` | `text` | Observações adicionais (opcional) |
| `status` | `text` | Status: `pendente`, `confirmada`, `cancelada` |
| `created_at` | `timestamptz` | Data e hora de criação |

---

## 🛠️ Endpoints

### 1. Consultar Disponibilidade
**GET** `/disponibilidade`

Verifica a disponibilidade de mesas para uma data específica.

*   **Query Params:**
    *   `data_reserva` (obrigatório): Data no formato `YYYY-MM-DD`.

#### Exemplo de Resposta:
```json
{
  "data_consulta": "2025-12-25",
  "limite_mesas_por_dia": 30,
  "total_mesas_reservadas": 15,
  "total_mesas_disponiveis": 15,
  "mesas_disponiveis_lista": [3, 4, ...],
  "horarios_disponiveis": ["18:00", "18:30", ...]
}
```

### 2. Listar Reservas
**GET** `/reservas`

Lista reservas com filtros. Por padrão, retorna apenas reservas com status `pendente` ou `confirmada`.

*   **Query Params:**
    *   `data_reserva`: `YYYY-MM-DD`.
    *   `cliente_nome`: Nome parcial do cliente.
    *   `cliente_telefone`: Número parcial do telefone.
    *   `mesa`: Número da mesa.
    *   `status`: Filtra por um ou mais status, separados por vírgula (ex: `status=pendente,cancelada`).

### 3. Criar Reserva(s)
**POST** `/reservas`

Cria uma ou mais reservas para um cliente.

#### Body da Requisição:
```json
{
  "nome_cliente": "Ana Beatriz",
  "telefone_cliente": "(21) 98765-4321",
  "data_reserva": "2025-09-15",
  "horario_reserva": "20:00:00",
  "mesas": [10, 11],
  "observacoes": "Próximo à janela, se possível.",
  "status": "pendente" // Opcional, padrão: 'pendente'. Aceita 'confirmada'.
}
```

#### Resposta de Sucesso (201):
```json
{
  "message": "Reservas criadas com sucesso",
  "reservas": [
    { "id": "...", "id_mesa": 10, "status": "pendente", ... },
    { "id": "...", "id_mesa": 11, "status": "pendente", ... }
  ]
}
```

### 4. Atualizar Reserva
**PUT** `/reservas/{id}`

Atualiza os dados de uma reserva específica, incluindo seu status.

*   **Path Param:** `id` da reserva.

#### Body da Requisição:
```json
{
  "horario_reserva": "20:30:00",
  "status": "confirmada"
}
```

### 5. Cancelar Reserva
**DELETE** `/reservas/{id}`

Altera o status de uma reserva para `cancelada`. A reserva não é permanentemente removida.

*   **Path Param:** `id` da reserva.

#### Resposta de Sucesso (200):
```json
{
  "message": "Reserva cancelada com sucesso",
  "reserva": { "id": "...", "status": "cancelada", ... }
}
```

### 6. Status da API
**GET** `/status`

Retorna o status operacional da API.

---

## 🚨 Códigos de Erro

| Código | Descrição |
|---|---|
| 400 | **Bad Request** - Parâmetros inválidos ou ausentes. |
| 401 | **Unauthorized** - Chave de API ausente ou inválida. |
| 404 | **Not Found** - Recurso ou reserva não encontrado. |
| 409 | **Conflict** - Conflito de reserva (ex: mesa já ocupada, limite diário excedido). |
| 500 | **Internal Server Error** - Erro inesperado no servidor. |