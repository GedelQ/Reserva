# 🍕 API de Reservas da Pizzaria v1.3

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

Consulta o total de mesas disponíveis e reservadas para uma data específica.

### 2. Pesquisar Reservas
**GET** `/reservas`

Busca reservas com base em filtros. As reservas são retornadas agrupadas por `numero_reserva`.

*   **Query Params (Opcionais):**
    *   `data_reserva` (string): Filtra por uma data específica (formato `YYYY-MM-DD`).
    *   `numero_reserva` (number): Filtra pela reserva com o número exato.
    *   `telefone_cliente` (string): Busca por parte do telefone do cliente.
    *   `status` (string): Filtra por status (ex: `pendente`, `confirmada`, `cancelada`).

### 3. Criar Reserva(s)
**POST** `/reservas`

Cria uma ou mais reservas para um cliente. A resposta é a reserva criada, já no formato agrupado.

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

### 4. Modificar Reserva (Grupo)
**POST** `/reservas/modificar-mesas`

Modifica um grupo de reservas existente. Permite alterar as mesas, a data e outros dados da reserva.

*   Usa o `id` de qualquer reserva do grupo como âncora.
*   A API primeiro verifica se as novas mesas estão disponíveis na nova data antes de aplicar qualquer alteração.

#### Body da Requisição:
```json
{
  "id_ancora": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "novas_mesas": [10, 12, 14],
  "dados_reserva": {
    "data_reserva": "2025-09-16",
    "horario_reserva": "20:30:00",
    "observacoes": "Cliente pediu urgência."
  }
}
```

### 5. Atualizar Status da Reserva
**POST** `/reservas/atualizar-status`

Atualiza o status de uma única reserva individual.

*   Se o status for alterado para `cancelada`, o `id_mesa` será salvo em `id_mesa_historico` e o campo `id_mesa` ficará nulo.

#### Body da Requisição:
```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "status": "confirmada"
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