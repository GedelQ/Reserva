# 🧪 Guia de Teste da API de Reservas

## 📍 URLs Corretas

### URL Base da API:
```
https://[SEU-PROJETO].supabase.co/functions/v1/reservas-api
```

**⚠️ IMPORTANTE:** Substitua `[SEU-PROJETO]` pelo nome real do seu projeto no Supabase.

## 🔧 Como Encontrar a URL Correta

1. **Acesse o Supabase Dashboard**
2. **Vá em Settings > API**
3. **Copie a "Project URL"** (algo como: `https://abcdefgh.supabase.co`)
4. **A URL da API será:** `https://abcdefgh.supabase.co/functions/v1/reservas-api`

## 🧪 Testes Básicos

### 1. Testar Status da API
```bash
curl -X GET "https://[SEU-PROJETO].supabase.co/functions/v1/reservas-api/status" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"
```

**Resposta esperada:**
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
  }
}
```

### 2. Consultar Disponibilidade
```bash
curl -X GET "https://[SEU-PROJETO].supabase.co/functions/v1/reservas-api/disponibilidade?data_reserva=2025-01-15" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"
```

### 3. Listar Reservas
```bash
curl -X GET "https://[SEU-PROJETO].supabase.co/functions/v1/reservas-api/reservas?data_reserva=2025-01-15" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"
```

### 4. Criar Reserva
```bash
curl -X POST "https://[SEU-PROJETO].supabase.co/functions/v1/reservas-api/reservas" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "nome_cliente": "Teste API",
    "telefone_cliente": "(11) 99999-9999",
    "data_reserva": "2025-01-15",
    "horario_reserva": "19:00",
    "id_mesa": 50,
    "observacoes": "Teste via API"
  }'
```

## 🔍 Possíveis Problemas e Soluções

### Problema 1: URL Incorreta
**Sintomas:** Erro 404 "Endpoint não encontrado"
**Solução:** Verificar se a URL base está correta

### Problema 2: Chave de API Incorreta
**Sintomas:** Erro 401 "Unauthorized"
**Solução:** Verificar se está usando a `SUPABASE_ANON_KEY` correta

### Problema 3: Edge Function não implantada
**Sintomas:** Erro 404 ou 500
**Solução:** A edge function é implantada automaticamente pelo Bolt

### Problema 4: Parâmetros Incorretos
**Sintomas:** Erro 400 "Bad Request"
**Solução:** Verificar se todos os parâmetros obrigatórios estão sendo enviados

## 🛠️ Testando com JavaScript

```javascript
// Configuração
const SUPABASE_URL = 'https://[SEU-PROJETO].supabase.co'
const SUPABASE_ANON_KEY = '[SUA-CHAVE-ANON]'
const API_BASE = `${SUPABASE_URL}/functions/v1/reservas-api`

// Função para testar a API
async function testarAPI() {
  try {
    // Teste 1: Status
    console.log('🔍 Testando status da API...')
    const statusResponse = await fetch(`${API_BASE}/status`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    const statusData = await statusResponse.json()
    console.log('✅ Status:', statusData)

    // Teste 2: Disponibilidade
    console.log('🔍 Testando disponibilidade...')
    const dispResponse = await fetch(`${API_BASE}/disponibilidade?data_reserva=2025-01-15`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    const dispData = await dispResponse.json()
    console.log('✅ Disponibilidade:', dispData)

    // Teste 3: Listar reservas
    console.log('🔍 Testando listagem de reservas...')
    const reservasResponse = await fetch(`${API_BASE}/reservas?data_reserva=2025-01-15`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    const reservasData = await reservasResponse.json()
    console.log('✅ Reservas:', reservasData)

  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

// Executar teste
testarAPI()
```

## 📝 Checklist de Verificação

- [ ] URL do projeto Supabase está correta
- [ ] Chave ANON está correta
- [ ] Edge function está implantada
- [ ] Headers de autorização estão sendo enviados
- [ ] Content-Type está definido para POST requests
- [ ] Parâmetros obrigatórios estão sendo enviados

## 🆘 Se Ainda Não Funcionar

1. **Verifique os logs no Supabase:**
   - Dashboard > Edge Functions > reservas-api > Logs

2. **Teste diretamente no Supabase:**
   - Dashboard > Edge Functions > reservas-api > Invoke

3. **Verifique se a function está ativa:**
   - Dashboard > Edge Functions (deve aparecer como "Active")

## 📞 URLs de Exemplo

Se seu projeto for `abcd1234`, as URLs seriam:
- Status: `https://abcd1234.supabase.co/functions/v1/reservas-api/status`
- Disponibilidade: `https://abcd1234.supabase.co/functions/v1/reservas-api/disponibilidade?data_reserva=2025-01-15`
- Reservas: `https://abcd1234.supabase.co/functions/v1/reservas-api/reservas`