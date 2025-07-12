# 🚀 Exemplos Práticos da API de Reservas

## 📱 Exemplos com JavaScript/Fetch

### 1. Consultar Disponibilidade

```javascript
async function consultarDisponibilidade(data, quantidadeMesas = 1) {
  const url = `https://[seu-projeto].supabase.co/functions/v1/reservas-api/disponibilidade?data_reserva=${data}&quantidade_mesas=${quantidadeMesas}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Disponibilidade:', data);
      return data;
    } else {
      console.error('Erro:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    return null;
  }
}

// Uso
consultarDisponibilidade('2025-01-15', 2);
```

### 2. Criar Reserva

```javascript
async function criarReserva(dadosReserva) {
  const url = 'https://[seu-projeto].supabase.co/functions/v1/reservas-api/reservas';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosReserva)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Reserva criada:', data);
      return data;
    } else {
      console.error('Erro ao criar reserva:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    return null;
  }
}

// Uso - Reserva simples
criarReserva({
  nome_cliente: 'João Silva',
  telefone_cliente: '(11) 99999-9999',
  data_reserva: '2025-01-15',
  horario_reserva: '19:00',
  id_mesa: 15,
  observacoes: 'Aniversário'
});

// Uso - Múltiplas mesas
criarReserva({
  nome_cliente: 'Maria Santos',
  telefone_cliente: '(11) 88888-8888',
  data_reserva: '2025-01-15',
  horario_reserva: '20:00',
  mesas: [10, 11, 12],
  observacoes: 'Evento corporativo'
});
```

### 3. Buscar Reservas

```javascript
async function buscarReservas(filtros = {}) {
  const params = new URLSearchParams();
  
  if (filtros.data_reserva) params.append('data_reserva', filtros.data_reserva);
  if (filtros.cliente_nome) params.append('cliente_nome', filtros.cliente_nome);
  if (filtros.cliente_telefone) params.append('cliente_telefone', filtros.cliente_telefone);
  if (filtros.mesa) params.append('mesa', filtros.mesa);
  
  const url = `https://[seu-projeto].supabase.co/functions/v1/reservas-api/reservas?${params}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Reservas encontradas:', data);
      return data;
    } else {
      console.error('Erro:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    return null;
  }
}

// Uso
buscarReservas({ 
  data_reserva: '2025-01-15',
  cliente_nome: 'João'
});
```

### 4. Atualizar Reserva

```javascript
async function atualizarReserva(reservaId, dadosAtualizacao) {
  const url = `https://[seu-projeto].supabase.co/functions/v1/reservas-api/reservas/${reservaId}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosAtualizacao)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Reserva atualizada:', data);
      return data;
    } else {
      console.error('Erro ao atualizar:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    return null;
  }
}

// Uso
atualizarReserva('123e4567-e89b-12d3-a456-426614174000', {
  horario_reserva: '19:30',
  observacoes: 'Horário alterado'
});
```

### 5. Cancelar Reserva

```javascript
async function cancelarReserva(reservaId) {
  const url = `https://[seu-projeto].supabase.co/functions/v1/reservas-api/reservas/${reservaId}`;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Reserva cancelada:', data);
      return data;
    } else {
      console.error('Erro ao cancelar:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    return null;
  }
}

// Uso
cancelarReserva('123e4567-e89b-12d3-a456-426614174000');
```

## 🐍 Exemplos com Python

### 1. Classe para Gerenciar Reservas

```python
import requests
import json
from datetime import datetime

class PizzariaAPI:
    def __init__(self, supabase_url, supabase_key):
        self.base_url = f"{supabase_url}/functions/v1/reservas-api"
        self.headers = {
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/json'
        }
    
    def consultar_disponibilidade(self, data_reserva, quantidade_mesas=1, horario=None):
        """Consulta disponibilidade de mesas"""
        params = {
            'data_reserva': data_reserva,
            'quantidade_mesas': quantidade_mesas
        }
        if horario:
            params['horario_reserva'] = horario
            
        response = requests.get(
            f"{self.base_url}/disponibilidade",
            headers=self.headers,
            params=params
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Erro: {response.json().get('error')}")
            return None
    
    def criar_reserva(self, nome_cliente, telefone_cliente, data_reserva, 
                     horario_reserva, mesas=None, id_mesa=None, observacoes=""):
        """Cria uma nova reserva"""
        dados = {
            'nome_cliente': nome_cliente,
            'telefone_cliente': telefone_cliente,
            'data_reserva': data_reserva,
            'horario_reserva': horario_reserva,
            'observacoes': observacoes
        }
        
        if mesas:
            dados['mesas'] = mesas
        elif id_mesa:
            dados['id_mesa'] = id_mesa
        else:
            raise ValueError("Deve especificar 'mesas' ou 'id_mesa'")
        
        response = requests.post(
            f"{self.base_url}/reservas",
            headers=self.headers,
            json=dados
        )
        
        if response.status_code == 201:
            return response.json()
        else:
            print(f"Erro: {response.json().get('error')}")
            return None
    
    def buscar_reservas(self, **filtros):
        """Busca reservas com filtros"""
        response = requests.get(
            f"{self.base_url}/reservas",
            headers=self.headers,
            params=filtros
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Erro: {response.json().get('error')}")
            return None
    
    def atualizar_reserva(self, reserva_id, **dados):
        """Atualiza uma reserva existente"""
        response = requests.put(
            f"{self.base_url}/reservas/{reserva_id}",
            headers=self.headers,
            json=dados
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Erro: {response.json().get('error')}")
            return None
    
    def cancelar_reserva(self, reserva_id):
        """Cancela uma reserva"""
        response = requests.delete(
            f"{self.base_url}/reservas/{reserva_id}",
            headers=self.headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Erro: {response.json().get('error')}")
            return None

# Uso da classe
api = PizzariaAPI(
    supabase_url="https://[seu-projeto].supabase.co",
    supabase_key="[SUPABASE_ANON_KEY]"
)

# Consultar disponibilidade
disponibilidade = api.consultar_disponibilidade('2025-01-15', 2)
print(disponibilidade)

# Criar reserva
reserva = api.criar_reserva(
    nome_cliente='João Silva',
    telefone_cliente='(11) 99999-9999',
    data_reserva='2025-01-15',
    horario_reserva='19:00',
    id_mesa=15,
    observacoes='Aniversário'
)
print(reserva)
```

## 📱 Exemplo com React Native

```javascript
// hooks/useReservasAPI.js
import { useState } from 'react';

const SUPABASE_URL = 'https://[seu-projeto].supabase.co';
const SUPABASE_ANON_KEY = '[SUPABASE_ANON_KEY]';

export const useReservasAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reservas-api${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição');
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const consultarDisponibilidade = (data, quantidade = 1) => {
    return apiCall(`/disponibilidade?data_reserva=${data}&quantidade_mesas=${quantidade}`);
  };

  const criarReserva = (dadosReserva) => {
    return apiCall('/reservas', {
      method: 'POST',
      body: JSON.stringify(dadosReserva)
    });
  };

  const buscarReservas = (filtros) => {
    const params = new URLSearchParams(filtros).toString();
    return apiCall(`/reservas?${params}`);
  };

  return {
    loading,
    error,
    consultarDisponibilidade,
    criarReserva,
    buscarReservas
  };
};

// Componente de exemplo
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useReservasAPI } from './hooks/useReservasAPI';

export const ReservaScreen = () => {
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [data, setData] = useState('2025-01-15');
  const [horario, setHorario] = useState('19:00');
  const [mesa, setMesa] = useState('15');
  
  const { loading, error, criarReserva } = useReservasAPI();

  const handleCriarReserva = async () => {
    try {
      const resultado = await criarReserva({
        nome_cliente: nomeCliente,
        telefone_cliente: telefone,
        data_reserva: data,
        horario_reserva: horario,
        id_mesa: parseInt(mesa),
        observacoes: ''
      });
      
      Alert.alert('Sucesso', 'Reserva criada com sucesso!');
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Nome do Cliente:</Text>
      <TextInput
        value={nomeCliente}
        onChangeText={setNomeCliente}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      
      <Text>Telefone:</Text>
      <TextInput
        value={telefone}
        onChangeText={setTelefone}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      
      <Text>Mesa:</Text>
      <TextInput
        value={mesa}
        onChangeText={setMesa}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      
      <Button
        title={loading ? "Criando..." : "Criar Reserva"}
        onPress={handleCriarReserva}
        disabled={loading}
      />
      
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
};
```

## 🌐 Exemplo com PHP

```php
<?php
class PizzariaAPI {
    private $baseUrl;
    private $headers;
    
    public function __construct($supabaseUrl, $supabaseKey) {
        $this->baseUrl = $supabaseUrl . '/functions/v1/reservas-api';
        $this->headers = [
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json'
        ];
    }
    
    private function makeRequest($endpoint, $method = 'GET', $data = null) {
        $curl = curl_init();
        
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->baseUrl . $endpoint,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $this->headers,
        ]);
        
        if ($data && in_array($method, ['POST', 'PUT'])) {
            curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        $result = json_decode($response, true);
        
        if ($httpCode >= 400) {
            throw new Exception($result['error'] ?? 'Erro na requisição');
        }
        
        return $result;
    }
    
    public function consultarDisponibilidade($dataReserva, $quantidadeMesas = 1) {
        $endpoint = "/disponibilidade?data_reserva={$dataReserva}&quantidade_mesas={$quantidadeMesas}";
        return $this->makeRequest($endpoint);
    }
    
    public function criarReserva($dadosReserva) {
        return $this->makeRequest('/reservas', 'POST', $dadosReserva);
    }
    
    public function buscarReservas($filtros = []) {
        $params = http_build_query($filtros);
        $endpoint = '/reservas' . ($params ? '?' . $params : '');
        return $this->makeRequest($endpoint);
    }
    
    public function atualizarReserva($reservaId, $dados) {
        return $this->makeRequest("/reservas/{$reservaId}", 'PUT', $dados);
    }
    
    public function cancelarReserva($reservaId) {
        return $this->makeRequest("/reservas/{$reservaId}", 'DELETE');
    }
}

// Uso
$api = new PizzariaAPI(
    'https://[seu-projeto].supabase.co',
    '[SUPABASE_ANON_KEY]'
);

try {
    // Consultar disponibilidade
    $disponibilidade = $api->consultarDisponibilidade('2025-01-15', 2);
    echo "Mesas disponíveis: " . $disponibilidade['total_mesas_disponiveis'] . "\n";
    
    // Criar reserva
    $reserva = $api->criarReserva([
        'nome_cliente' => 'João Silva',
        'telefone_cliente' => '(11) 99999-9999',
        'data_reserva' => '2025-01-15',
        'horario_reserva' => '19:00',
        'id_mesa' => 15,
        'observacoes' => 'Aniversário'
    ]);
    
    echo "Reserva criada: " . $reserva['message'] . "\n";
    
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage() . "\n";
}
?>
```

## 🔧 Testando a API

### Com cURL:

```bash
# Testar status da API
curl -X GET "https://[projeto].supabase.co/functions/v1/reservas-api/status" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"

# Consultar disponibilidade
curl -X GET "https://[projeto].supabase.co/functions/v1/reservas-api/disponibilidade?data_reserva=2025-01-15&quantidade_mesas=2" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"

# Criar reserva
curl -X POST "https://[projeto].supabase.co/functions/v1/reservas-api/reservas" \
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

### Com Postman:

1. **Criar Collection** "Pizzaria API"
2. **Adicionar variáveis de ambiente:**
   - `base_url`: `https://[projeto].supabase.co/functions/v1/reservas-api`
   - `auth_token`: `[SUPABASE_ANON_KEY]`
3. **Configurar Authorization:** Bearer Token com `{{auth_token}}`
4. **Criar requests** para cada endpoint

Estes exemplos cobrem os principais casos de uso da API e podem ser adaptados para diferentes linguagens e frameworks! 🚀