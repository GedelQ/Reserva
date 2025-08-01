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

---

## Webhooks (Notificações)

O sistema pode enviar notificações automáticas (webhooks) para um endpoint configurado sempre que ocorrerem eventos específicos relacionados às reservas.

### Tabela `webhook_config`

Esta tabela armazena a configuração do endpoint que receberá as notificações.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `uuid` | Identificador único da configuração. |
| `endpoint_url` | `text` | A URL para onde o webhook será enviado (POST). |
| `enabled` | `boolean` | Se `true`, o webhook está ativo. |
| `secret_key` | `text` | (Opcional) Chave secreta para assinar o payload. |
| `events` | `ARRAY` | Lista de eventos que ativam o webhook. |

### Tabela `webhook_logs`

Registra cada tentativa de envio de um webhook.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `uuid` | Identificador único do log. |
| `config_id` | `uuid` | Referência ao `id` da tabela `webhook_config`. |
| `event` | `text` | O evento que disparou o webhook (ex: `reserva_criada`). |
| `success` | `boolean` | Se `true`, o envio foi bem-sucedido. |
| `error_message` | `text` | Mensagem de erro em caso de falha. |

### Eventos de Webhook

Os seguintes eventos podem ser configurados para disparar uma notificação:

*   `reserva_criada`
*   `reserva_atualizada`
*   `reserva_cancelada`

### Exemplo de Payload

O payload enviado para o `endpoint_url` terá a seguinte estrutura:

```json
{
  "event": "reserva_criada",
  "timestamp": "2025-08-01T20:00:00.000Z",
  "data": {
    "reservas": [
      {
        "id": "...",
        "id_mesa": 10,
        "data_reserva": "2025-09-15",
        "horario_reserva": "20:00:00",
        "nome_cliente": "Ana Beatriz",
        "status": "pendente",
        "..."
      }
    ],
    "cliente": {
      "nome": "Ana Beatriz",
      "telefone": "(21) 98765-4321"
    },
    "mesas": [10],
    "total_mesas": 1
  }
}
```

### Assinatura de Segurança

Se uma `secret_key` for fornecida na configuração, o webhook incluirá um header `X-Webhook-Signature` com uma assinatura HMAC-SHA256 do payload para verificação.
