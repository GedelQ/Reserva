# 🍕 API de Reservas da Pizzaria

## 📋 Visão Geral

API REST completa para gerenciamento de reservas de mesas da pizzaria. Permite consultar disponibilidade, criar, editar e cancelar reservas.

**Base URL:** `https://[seu-projeto].supabase.co/functions/v1/reservas-api`

## 🔑 Autenticação

A API utiliza a chave anônima do Supabase no header:
```
Authorization: Bearer [SUPABASE_ANON_KEY]
```

## 📊 Limites e Regras

- **Limite máximo:** 30 mesas por dia
- **Total de mesas:** 94 mesas disponíveis (numeradas de 1 a 94)
- **Capacidade por mesa:** 4 pessoas
- **Horários disponíveis:** 18:00 às 22:00 (intervalos de 30 minutos)

## 🛠️ Endpoints

### 1. 📅 Consultar Disponibilidade

**GET** `/disponibilidade`

Consulta a disponibilidade de mesas para uma data específica.

#### Parâmetros Query:
- `data_reserva` (obrigatório): Data no formato YYYY-MM-DD
- `horario_reserva` (opcional): Horário específico (ex: "19:00")
- `quantidade_mesas` (opcional): Quantidade de mesas desejadas (padrão: 1)

#### Exemplo de Requisição:
```bash
GET /disponibilidade?data_reserva=2025-01-15&horario_reserva=19:00&quantidade_mesas=2
```

#### Exemplo de Resposta:
```json
{
  "data_consulta": "2025-01-15",
  "limite_mesas_por_dia": 30,
  "total_mesas_reservadas": 12,
  "total_mesas_disponiveis": 18,
  "pode_reservar_quantidade": true,
  "quantidade_solicitada": 2,
  "mesas_disponiveis": [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39],
  "total_mesas_livres": 82,
  "disponibilidade_por_horario": {
    "horario": "19:00",
    "mesas_ocupadas": 5,
    "mesas_disponiveis": 25,
    "pode_reservar": true
  },
  "horarios_disponiveis": ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"]
}
```

### 2. 📋 Listar Reservas

**GET** `/reservas`

Lista reservas com filtros opcionais.

#### Parâmetros Query (todos opcionais):
- `data_reserva`: Filtrar por data (YYYY-MM-DD)
- `cliente_nome`: Buscar por nome do cliente (busca parcial)
- `cliente_telefone`: Buscar por telefone
- `mesa`: Filtrar por número da mesa

#### Exemplo de Requisição:
```bash
GET /reservas?data_reserva=2025-01-15&cliente_nome=João
```

#### Exemplo de Resposta:
```json
{
  "reservas": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "created_at": "2025-01-15T10:30:00Z",
      "id_mesa": 15,
      "nome_cliente": "João Silva",
      "telefone_cliente": "(11) 99999-9999",
      "data_reserva": "2025-01-15",
      "horario_reserva": "19:00",
      "observacoes": "Aniversário",
      "status": "ativa"
    }
  ],
  "total": 1,
  "filtros_aplicados": {
    "data_reserva": "2025-01-15",
    "cliente_nome": "João",
    "cliente_telefone": null,
    "mesa": null
  }
}
```

### 3. ➕ Criar Reserva

**POST** `/reservas`

Cria uma nova reserva para uma ou múltiplas mesas.

#### Body da Requisição:
```json
{
  "nome_cliente": "Maria Santos",
  "telefone_cliente": "(11) 88888-8888",
  "data_reserva": "2025-01-15",
  "horario_reserva": "20:00",
  "observacoes": "Mesa para comemoração",
  "mesas": [10, 11, 12]
}
```

**OU para uma mesa específica:**
```json
{
  "nome_cliente": "Pedro Costa",
  "telefone_cliente": "(11) 77777-7777",
  "data_reserva": "2025-01-15",
  "horario_reserva": "19:30",
  "id_mesa": 25,
  "observacoes": "Cliente VIP"
}
```

#### Exemplo de Resposta (Sucesso):
```json
{
  "message": "Reservas criadas com sucesso",
  "reservas_criadas": 3,
  "mesas_reservadas": [10, 11, 12],
  "reservas": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "id_mesa": 10,
      "nome_cliente": "Maria Santos",
      "telefone_cliente": "(11) 88888-8888",
      "data_reserva": "2025-01-15",
      "horario_reserva": "20:00",
      "observacoes": "Mesa para comemoração",
      "status": "ativa",
      "created_at": "2025-01-15T11:00:00Z"
    }
  ],
  "cliente": {
    "nome": "Maria Santos",
    "telefone": "(11) 88888-8888"
  },
  "detalhes": {
    "data": "2025-01-15",
    "horario": "20:00",
    "observacoes": "Mesa para comemoração"
  }
}
```

#### Exemplo de Resposta (Erro - Limite Atingido):
```json
{
  "error": "Limite de 30 mesas por dia seria ultrapassado. Atualmente: 28 reservadas, solicitando: 3",
  "limite_mesas": 30,
  "mesas_ja_reservadas": 28,
  "mesas_solicitadas": 3,
  "mesas_disponiveis": 2
}
```

#### Exemplo de Resposta (Erro - Mesas Ocupadas):
```json
{
  "error": "Mesas já ocupadas: 10, 11",
  "mesas_ocupadas": [10, 11],
  "mesas_solicitadas": [10, 11, 12]
}
```

### 4. ✏️ Atualizar Reserva

**PUT** `/reservas/{id}`

Atualiza uma reserva existente.

#### Body da Requisição:
```json
{
  "nome_cliente": "João Silva Santos",
  "telefone_cliente": "(11) 99999-8888",
  "horario_reserva": "19:30",
  "observacoes": "Mudança de horário"
}
```

#### Exemplo de Resposta:
```json
{
  "message": "Reserva atualizada com sucesso",
  "reserva": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "id_mesa": 15,
    "nome_cliente": "João Silva Santos",
    "telefone_cliente": "(11) 99999-8888",
    "data_reserva": "2025-01-15",
    "horario_reserva": "19:30",
    "observacoes": "Mudança de horário",
    "status": "ativa",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### 5. ❌ Cancelar Reserva

**DELETE** `/reservas/{id}`

Cancela uma reserva existente.

#### Exemplo de Resposta:
```json
{
  "message": "Reserva cancelada com sucesso",
  "reserva": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "id_mesa": 15,
    "nome_cliente": "João Silva",
    "telefone_cliente": "(11) 99999-9999",
    "data_reserva": "2025-01-15",
    "horario_reserva": "19:00",
    "observacoes": "Aniversário",
    "status": "cancelada",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### 6. 🔍 Status da API

**GET** `/status`

Retorna informações sobre o status e configuração da API.

#### Exemplo de Resposta:
```json
{
  "status": "online",
  "api_version": "1.0.0",
  "endpoints": {
    "GET /disponibilidade": "Consultar disponibilidade de mesas",
    "GET /reservas": "Listar reservas com filtros",
    "POST /reservas": "Criar nova reserva",
    "PUT /reservas/:id": "Atualizar reserva existente",
    "DELETE /reservas/:id": "Cancelar reserva",
    "GET /status": "Status da API"
  },
  "limite_mesas_por_dia": 30,
  "horarios_disponiveis": ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"]
}
```

## 🚨 Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Parâmetros inválidos ou ausentes |
| 404 | Not Found - Reserva ou endpoint não encontrado |
| 409 | Conflict - Limite de mesas atingido ou mesa já ocupada |
| 500 | Internal Server Error - Erro interno do servidor |

## 📝 Exemplos de Uso

### Verificar disponibilidade antes de reservar:
```bash
# 1. Consultar disponibilidade
curl -X GET "https://[projeto].supabase.co/functions/v1/reservas-api/disponibilidade?data_reserva=2025-01-15&quantidade_mesas=2" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"

# 2. Se disponível, criar reserva
curl -X POST "https://[projeto].supabase.co/functions/v1/reservas-api/reservas" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "nome_cliente": "Ana Costa",
    "telefone_cliente": "(11) 66666-6666",
    "data_reserva": "2025-01-15",
    "horario_reserva": "19:00",
    "mesas": [20, 21]
  }'
```

### Buscar reserva de um cliente:
```bash
curl -X GET "https://[projeto].supabase.co/functions/v1/reservas-api/reservas?cliente_nome=Ana&data_reserva=2025-01-15" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"
```

### Cancelar reserva:
```bash
curl -X DELETE "https://[projeto].supabase.co/functions/v1/reservas-api/reservas/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"
```

## 🔧 Configuração

1. A edge function é automaticamente implantada no Supabase
2. Use a URL base: `https://[seu-projeto].supabase.co/functions/v1/reservas-api`
3. Inclua sempre o header de autorização com a chave anônima do Supabase

## 📱 Integração com Aplicações

Esta API pode ser integrada com:
- **Aplicativos móveis** (React Native, Flutter)
- **Sites de reserva online** (React, Vue, Angular)
- **Sistemas de terceiros** (WhatsApp Business, chatbots)
- **Aplicações de delivery** (iFood, Uber Eats)
- **Sistemas de gestão** (ERPs, CRMs)

## 🛡️ Segurança

- Todas as requisições passam pelo sistema de autenticação do Supabase
- Row Level Security (RLS) aplicado na base de dados
- CORS configurado para permitir requisições de qualquer origem
- Validação de dados em todas as operações