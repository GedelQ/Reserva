# Sistema de Gestão de Reservas para Pizzaria

## Descrição do Projeto

Sistema web completo para **uso interno** da equipe de uma pizzaria (gerentes e atendentes). O objetivo é gerenciar as reservas de mesas com agilidade e controle. O cliente final não terá acesso ao sistema. O foco é em eficiência operacional.

O sistema possui uma interface visual para seleção de mesas, um painel de login para o administrador e uma lógica de banco de dados otimizada para integração com a API do Supabase.

## Checklist de Progresso

### Estrutura e Configuração Inicial
- [x] Estrutura básica do projeto (HTML, CSS, JS)
- [x] Definição do esquema da tabela `reservas` para o Supabase
- [x] Configuração inicial do Supabase
- [x] Estrutura de componentes e hooks

### Frontend (UI)
- [x] Página de login do administrador
- [x] Estrutura do Dashboard de Visão Geral
- [x] Layout principal com seletor de data
- [x] Renderização visual do mapa de mesas (11 fileiras)
- [x] Modal de reserva com todos os campos (Time Slots, Observações)
- [x] Aplicação do esquema de cores (vermelho e amarelo)
- [x] Status das mesas (verde/vermelho/amarelo)

### Backend (Lógica)
- [x] Implementação da função de login
- [x] Lógica para popular o Dashboard com dados da API
- [x] API (GET): Buscar e exibir mesas e reservas por data
- [x] API (POST): Criar uma nova reserva
- [x] API (PUT/PATCH): Editar uma reserva existente
- [x] API (DELETE): Cancelar uma reserva
- [x] Script para a rotina de limpeza automática de reservas

### Documentação
- [x] Criação e preenchimento inicial do arquivo PROJETO.md

## Especificações Técnicas

### Layout das Mesas
- **Fileiras 1 a 6:** 8 mesas em cada fileira
- **Fileiras 7 a 11:** 10 mesas em cada fileira
- **Capacidade:** Todas as mesas possuem 4 assentos
- **Total:** 94 mesas

### Status das Mesas
- **Verde:** Disponível
- **Vermelho:** Ocupada/Reservada
- **Amarelo:** Selecionada

### Esquema de Cores
- **Primária:** Vermelho (#DC2626)
- **Secundária:** Amarelo (#F59E0B)
- **Neutro:** Branco e cinza claro

### Estrutura do Banco de Dados
Tabela `reservas`:
- `id` (uuid, primary key)
- `created_at` (timestamp)
- `id_mesa` (integer)
- `nome_cliente` (text)
- `telefone_cliente` (text)
- `data_reserva` (date)
- `horario_reserva` (time)
- `observacoes` (text)
- `status` (text)

## Instruções de Configuração

1. **Conectar ao Supabase:**
   - Clique no botão "Connect to Supabase" no canto superior direito
   - Configure as variáveis de ambiente no arquivo `.env`

2. **Executar Migrações:**
   - As migrações serão aplicadas automaticamente
   - A tabela `reservas` será criada com RLS habilitado

3. **Credenciais de Teste:**
   - Email: admin@pizzaria.com
   - Senha: admin123

## Funcionalidades Implementadas

- ✅ Sistema de autenticação
- ✅ Dashboard administrativo com métricas
- ✅ Mapa visual de mesas
- ✅ Modal de reserva com time slots
- ✅ Filtro por data
- ✅ CRUD completo de reservas
- ✅ Rotina de limpeza automática
- ✅ Interface responsiva
- ✅ Esquema de cores da pizzaria