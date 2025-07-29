# 🍕 API de Reservas da Pizzaria

## 📋 Visão Geral

API REST para gerenciamento de reservas de mesas, clientes e configurações do sistema.

**Base URL:** `https://[seu-projeto].supabase.co/functions/v1/reservas-api`

## 🔑 Autenticação

A API utiliza a chave de serviço (`service_role`) ou a chave anônima (`anon`) do Supabase, dependendo do nível de acesso necessário. A chave deve ser enviada no header de autorização:

```
Authorization: Bearer [SUPABASE_KEY]
```

## 📦 Modelos de Dados (Schema do Banco)

Esta seção detalha as tabelas do banco de dados que a API utiliza.

### `mesas`
Armazena informações sobre cada mesa do restaurante.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Identificador único da mesa (PK) |
| `numero_mesa` | `integer` | Número de identificação da mesa |
| `capacidade` | `integer` | Quantidade de pessoas que a mesa comporta |
| `fileira` | `integer` | Localização da mesa (número da fileira) |
| `disponivel` | `boolean` | `true` se a mesa está disponível para reserva |
| `created_at` | `timestamptz` | Data e hora de criação do registro |

### `reservas`
Gerencia as reservas feitas pelos clientes.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Identificador único da reserva (PK) |
| `id_mesa` | `integer` | Número da mesa reservada (de 1 a 98) |
| `data_reserva` | `date` | Data para a qual a reserva foi feita |
| `horario_reserva` | `time` | Horário da reserva |
| `nome_cliente` | `text` | Nome do cliente que fez a reserva |
| `telefone_cliente` | `text` | Telefone do cliente (opcional) |
| `observacoes` | `text` | Observações adicionais (opcional) |
| `status` | `text` | Status da reserva (`ativa`, `cancelada`, `finalizada`) |
| `created_at` | `timestamptz` | Data e hora de criação do registro |

### `profiles`
Armazena dados de perfis de usuários, estendendo a tabela `auth.users`.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Identificador único do perfil (PK, FK para `auth.users`) |
| `full_name` | `text` | Nome completo do usuário (opcional) |
| `avatar_url` | `text` | URL do avatar do usuário (opcional) |
| `created_at` | `timestamptz` | Data e hora de criação do perfil |

### `users`
Tabela para usuários personalizados da aplicação.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Identificador único do usuário (PK) |
| `email` | `text` | Endereço de e-mail único do usuário |
| `created_at` | `timestamptz` | Data e hora de criação do usuário |

### `webhook_config`
Configurações para os webhooks que enviam notificações de eventos.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Identificador único da configuração (PK) |
| `endpoint_url` | `text` | URL para onde o webhook será enviado |
| `enabled` | `boolean` | `true` se o webhook está ativo |
| `secret_key` | `text` | Chave secreta para validar o payload (opcional) |
| `events` | `ARRAY` | Lista de eventos que acionam o webhook (ex: `reserva_criada`) |
| `created_at` | `timestamptz` | Data e hora de criação da configuração |
| `updated_at` | `timestamptz` | Data e hora da última atualização |

### `webhook_logs`
Registros de tentativas de envio de webhooks.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Identificador único do log (PK) |
| `config_id` | `uuid` | ID da configuração de webhook associada (FK) |
| `event` | `text` | Evento que disparou o webhook |
| `success` | `boolean` | `true` se o envio foi bem-sucedido |
| `error_message` | `text` | Mensagem de erro em caso de falha (opcional) |
| `created_at` | `timestamptz` | Data e hora de criação do log |

## 🛠️ Endpoints (Exemplos com base na tabela `reservas`)

Os endpoints abaixo são exemplos de como a API pode ser usada para interagir com a tabela `reservas`.

### 1. Listar Reservas
**GET** `/reservas`

Lista reservas com filtros opcionais.

*   **Query Params:** `data_reserva`, `cliente_nome`, `cliente_telefone`, `id_mesa`

#### Exemplo de Resposta:
```json
{
  "reservas": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "created_at": "2025-07-29T10:30:00Z",
      "id_mesa": 15,
      "data_reserva": "2025-08-10",
      "horario_reserva": "19:00:00",
      "observacoes": "Aniversário",
      "status": "ativa",
      "nome_cliente": "João da Silva",
      "telefone_cliente": "(11) 99999-9999"
    }
  ]
}
```

### 2. Criar Reserva
**POST** `/reservas`

Cria uma nova reserva.

#### Body da Requisição:
```json
{
  "id_mesa": 25,
  "data_reserva": "2025-08-11",
  "horario_reserva": "20:30:00",
  "nome_cliente": "Maria Santos",
  "telefone_cliente": "(11) 88888-8888",
  "observacoes": "Cliente VIP"
}
```

### 3. Atualizar Reserva
**PUT** `/reservas/{id}`

Atualiza uma reserva existente.

#### Body da Requisição:
```json
{
  "horario_reserva": "21:00:00",
  "observacoes": "Mesa para 2 pessoas"
}
```

### 4. Cancelar Reserva
**DELETE** `/reservas/{id}`

Cancela uma reserva (geralmente atualizando o `status` para `cancelada`).

## 🚨 Códigos de Erro

| Código | Descrição |
|---|---|
| 400 | **Bad Request** - Parâmetros inválidos ou ausentes. |
| 401 | **Unauthorized** - Chave de API ausente ou inválida. |
| 404 | **Not Found** - Recurso não encontrado. |
| 500 | **Internal Server Error** - Erro inesperado no servidor. |
