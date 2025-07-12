# 🧪 Teste da API com Suas Credenciais

## ✅ Suas Credenciais Confirmadas

- **URL Base:** `https://cesfnyyptixdowfjodhc.supabase.co/functions/v1/reservas-api`
- **Token:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc2ZueXlwdGl4ZG93ZmpvZGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDY0MzcsImV4cCI6MjA2NjkyMjQzN30.mx4-FsTYObPlOPfBHI8_tS6JypUOrf0fsS15uJx49MY`

## 🔧 Testes Corretos

### 1. ✅ Teste de Status (Deve Funcionar)
```bash
curl -X GET "https://cesfnyyptixdowfjodhc.supabase.co/functions/v1/reservas-api/status" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc2ZueXlwdGl4ZG93ZmpvZGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDY0MzcsImV4cCI6MjA2NjkyMjQzN30.mx4-FsTYObPlOPfBHI8_tS6JypUOrf0fsS15uJx49MY"
```

### 2. ✅ Disponibilidade (COM parâmetro obrigatório)
```bash
curl -X GET "https://cesfnyyptixdowfjodhc.supabase.co/functions/v1/reservas-api/disponibilidade?data_reserva=2025-01-15" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc2ZueXlwdGl4ZG93ZmpvZGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDY0MzcsImV4cCI6MjA2NjkyMjQzN30.mx4-FsTYObPlOPfBHI8_tS6JypUOrf0fsS15uJx49MY"
```

### 3. ✅ Listar Reservas
```bash
curl -X GET "https://cesfnyyptixdowfjodhc.supabase.co/functions/v1/reservas-api/reservas?data_reserva=2025-01-15" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc2ZueXlwdGl4ZG93ZmpvZGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDY0MzcsImV4cCI6MjA2NjkyMjQzN30.mx4-FsTYObPlOPfBHI8_tS6JypUOrf0fsS15uJx49MY"
```

### 4. ✅ Criar Reserva de Teste
```bash
curl -X POST "https://cesfnyyptixdowfjodhc.supabase.co/functions/v1/reservas-api/reservas" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc2ZueXlwdGl4ZG93ZmpvZGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDY0MzcsImV4cCI6MjA2NjkyMjQzN30.mx4-FsTYObPlOPfBHI8_tS6JypUOrf0fsS15uJx49MY" \
  -H "Content-Type: application/json" \
  -d '{
    "nome_cliente": "João Teste API",
    "telefone_cliente": "(11) 99999-9999",
    "data_reserva": "2025-01-15",
    "horario_reserva": "19:00",
    "id_mesa": 25,
    "observacoes": "Teste da API externa"
  }'
```

## 🚨 O Problema que Você Teve

Você estava usando:
```
❌ https://cesfnyyptixdowfjodhc.supabase.co/functions/v1/reservas-api/disponibilidade
```

Mas deveria ser:
```
✅ https://cesfnyyptixdowfjodhc.supabase.co/functions/v1/reservas-api/disponibilidade?data_reserva=2025-01-15
```

**O parâmetro `data_reserva` é obrigatório!**

## 🧪 Teste JavaScript Pronto

```javascript
// Teste completo com suas credenciais
const API_BASE = 'https://cesfnyyptixdowfjodhc.supabase.co/functions/v1/reservas-api'
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc2ZueXlwdGl4ZG93ZmpvZGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDY0MzcsImV4cCI6MjA2NjkyMjQzN30.mx4-FsTYObPlOPfBHI8_tS6JypUOrf0fsS15uJx49MY'

async function testarAPI() {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }

  try {
    // 1. Status
    console.log('🔍 Testando status...')
    const status = await fetch(`${API_BASE}/status`, { headers })
    console.log('Status:', await status.json())

    // 2. Disponibilidade
    console.log('🔍 Testando disponibilidade...')
    const disp = await fetch(`${API_BASE}/disponibilidade?data_reserva=2025-01-15`, { headers })
    console.log('Disponibilidade:', await disp.json())

    // 3. Reservas
    console.log('🔍 Testando reservas...')
    const reservas = await fetch(`${API_BASE}/reservas?data_reserva=2025-01-15`, { headers })
    console.log('Reservas:', await reservas.json())

  } catch (error) {
    console.error('Erro:', error)
  }
}

testarAPI()
```

## 📋 Parâmetros Obrigatórios por Endpoint

| Endpoint | Parâmetros Obrigatórios |
|----------|------------------------|
| `/status` | Nenhum |
| `/disponibilidade` | `data_reserva` (YYYY-MM-DD) |
| `/reservas` (GET) | Nenhum (mas recomendado `data_reserva`) |
| `/reservas` (POST) | `nome_cliente`, `telefone_cliente`, `data_reserva`, `horario_reserva`, `id_mesa` ou `mesas[]` |

## 🎯 Teste Agora

Copie e cole este comando no seu terminal ou ferramenta de API:

```bash
curl -X GET "https://cesfnyyptixdowfjodhc.supabase.co/functions/v1/reservas-api/status" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc2ZueXlwdGl4ZG93ZmpvZGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDY0MzcsImV4cCI6MjA2NjkyMjQzN30.mx4-FsTYObPlOPfBHI8_tS6JypUOrf0fsS15uJx49MY"
```

Se este funcionar, então a API está OK e o problema era só o parâmetro faltante!