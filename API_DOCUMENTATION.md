# 🍕 API de Reservas da Pizzaria v1.2

## 📋 Visão Geral

API REST para gerenciamento de reservas. Esta versão introduz um **formato de resposta em envelope**, onde todas as respostas, incluindo erros, retornam um status HTTP `200 OK`. O sucesso da operação deve ser verificado pelo campo `success` no corpo do JSON.

**Base URL:** `https://[seu-projeto].supabase.co/functions/v1/reservas-api`

## 🔑 Autenticação

A chave de API do Supabase deve ser enviada no header:
`Authorization: Bearer [SUPABASE_KEY]`

---

## 📦 Formato da Resposta (Envelope)

Todas as respostas da API seguem este padrão:

**Sucesso:**
```json
{
  "success": true,
  "data": { ... } // Payload específico do endpoint
}
```

**Erro:**
```json
{
  "success": false,
  "error": {
    "code": 404, // Código de erro original
    "message": "Reserva não encontrada"
  }
}
```

---

## 🛠️ Endpoints

### 1. Consultar Disponibilidade
**GET** `/disponibilidade?data_reserva=YYYY-MM-DD`

#### Exemplo de Resposta de Sucesso:
```json
{
  "success": true,
  "data": {
    "data_consulta": "2025-12-25",
    "total_mesas_reservadas": 15,
    "total_mesas_disponiveis": 15
  }
}
```

### 2. Listar Reservas
**GET** `/reservas`

*   **Query Params:** `data_reserva`, `status` (ex: `pendente,confirmada`)

#### Exemplo de Resposta de Sucesso:
```json
{
  "success": true,
  "data": {
    "reservas": [
      { "id": "...", "status": "confirmada", ... }
    ],
    "total": 1
  }
}
```

### 3. Criar Reserva(s)
**POST** `/reservas`

#### Body da Requisição:
```json
{
  "nome_cliente": "Ana Beatriz",
  "telefone_cliente": "(21) 98765-4321",
  "data_reserva": "2025-09-15",
  "horario_reserva": "20:00:00",
  "mesas": [10, 11],
  "status": "pendente"
}
```

### 4. Atualizar Reserva
**PUT** `/reservas/{id}`

#### Body da Requisição:
```json
{
  "horario_reserva": "20:30:00",
  "status": "confirmada"
}
```

### 5. Cancelar Reserva
**DELETE** `/reservas/{id}`

Altera o status de uma reserva para `cancelada`.

#### Exemplo de Resposta de Sucesso:
```json
{
    "success": true,
    "data": {
        "message": "Reserva cancelada com sucesso",
        "reserva": { "id": "...", "status": "cancelada", ... }
    }
}
```

### 6. Status da API
**GET** `/status`

Retorna o status operacional da API.
