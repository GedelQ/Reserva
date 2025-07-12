import React, { useState, useEffect } from 'react'
import { X, Settings, Webhook, Save, TestTube, CheckCircle, AlertTriangle, Globe } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface WebhookConfig {
  id?: string
  endpoint_url: string
  enabled: boolean
  secret_key?: string
  events: string[]
  created_at?: string
  updated_at?: string
}

interface ConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    endpoint_url: '',
    enabled: false,
    secret_key: '',
    events: ['reserva_criada']
  })
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadWebhookConfig()
    }
  }, [isOpen])

  const loadWebhookConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_config')
        .select('*')
        .limit(1)

      if (error) {
        console.error('Erro ao carregar configuração:', error)
        return
      }

      if (data && data.length > 0) {
        const config = data[0]
        setWebhookConfig({
          id: config.id,
          endpoint_url: config.endpoint_url || '',
          enabled: config.enabled || false,
          secret_key: config.secret_key || '',
          events: config.events || ['reserva_criada']
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
    }
  }

  const saveWebhookConfig = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const configData = {
        endpoint_url: webhookConfig.endpoint_url,
        enabled: webhookConfig.enabled,
        secret_key: webhookConfig.secret_key,
        events: webhookConfig.events,
        updated_at: new Date().toISOString()
      }

      let result
      if (webhookConfig.id) {
        // Atualizar configuração existente
        result = await supabase
          .from('webhook_config')
          .update(configData)
          .eq('id', webhookConfig.id)
          .select()
          .single()
      } else {
        // Criar nova configuração
        result = await supabase
          .from('webhook_config')
          .insert([{ ...configData, created_at: new Date().toISOString() }])
          .select()
          .single()
      }

      if (result.error) {
        throw result.error
      }

      setWebhookConfig(prev => ({ ...prev, id: result.data.id }))
      setMessage({ type: 'success', text: 'Configuração salva com sucesso!' })
      
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar configuração: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  const testWebhook = async () => {
    if (!webhookConfig.endpoint_url) {
      setMessage({ type: 'error', text: 'URL do endpoint é obrigatória para teste' })
      return
    }

    setTestLoading(true)
    setTestResult(null)

    try {
      // Dados de teste
      const testData = {
        event: 'test_webhook',
        timestamp: new Date().toISOString(),
        data: {
          reserva: {
            id: 'test-id-123',
            nome_cliente: 'Cliente Teste',
            telefone_cliente: '(11) 99999-9999',
            data_reserva: new Date().toISOString().split('T')[0],
            horario_reserva: '19:00',
            id_mesa: 15,
            observacoes: 'Teste de webhook'
          }
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Pizzaria-Webhook/1.0'
      }

      // Adicionar assinatura se houver secret key
      if (webhookConfig.secret_key) {
        const signature = await generateSignature(JSON.stringify(testData), webhookConfig.secret_key)
        headers['X-Webhook-Signature'] = signature
      }

      const response = await fetch(webhookConfig.endpoint_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testData)
      })

      if (response.ok) {
        setTestResult({ 
          success: true, 
          message: `Teste enviado com sucesso! Status: ${response.status}` 
        })
      } else {
        setTestResult({ 
          success: false, 
          message: `Erro no teste: ${response.status} - ${response.statusText}` 
        })
      }
    } catch (error: any) {
      setTestResult({ 
        success: false, 
        message: `Erro ao enviar teste: ${error.message}` 
      })
    } finally {
      setTestLoading(false)
    }
  }

  const generateSignature = async (payload: string, secret: string): Promise<string> => {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    return 'sha256=' + Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  const generateSecretKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setWebhookConfig(prev => ({ ...prev, secret_key: result }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Configurações</h2>
              <p className="text-sm text-gray-600">Webhook e integrações</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Mensagens */}
        {message && (
          <div className={`mx-6 mt-4 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start space-x-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <p className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Seção Webhook */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Webhook className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-800">Configuração de Webhook</h3>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm">
                <p className="font-medium text-blue-800">Como funciona o Webhook:</p>
                <ul className="text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Quando uma reserva é criada, os dados são enviados para sua URL</li>
                  <li>Formato JSON com informações do cliente e reserva</li>
                  <li>Assinatura HMAC-SHA256 para segurança (opcional)</li>
                  <li>Retry automático em caso de falha</li>
                </ul>
              </div>
            </div>

            {/* Toggle Ativo/Inativo */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Webhook Ativo</h4>
                <p className="text-sm text-gray-600">Enviar dados quando reservas forem criadas</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={webhookConfig.enabled}
                  onChange={(e) => setWebhookConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* URL do Endpoint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                URL do Endpoint
              </label>
              <input
                type="url"
                value={webhookConfig.endpoint_url}
                onChange={(e) => setWebhookConfig(prev => ({ ...prev, endpoint_url: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="https://seu-site.com/webhook/reservas"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                URL onde os dados da reserva serão enviados via POST
              </p>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chave Secreta (Opcional)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={webhookConfig.secret_key}
                  onChange={(e) => setWebhookConfig(prev => ({ ...prev, secret_key: e.target.value }))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Chave para assinatura HMAC-SHA256"
                />
                <button
                  type="button"
                  onClick={generateSecretKey}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Gerar
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Usada para assinar as requisições (header X-Webhook-Signature)
              </p>
            </div>

            {/* Eventos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Eventos para Enviar
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={webhookConfig.events.includes('reserva_criada')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setWebhookConfig(prev => ({ 
                          ...prev, 
                          events: [...prev.events, 'reserva_criada'] 
                        }))
                      } else {
                        setWebhookConfig(prev => ({ 
                          ...prev, 
                          events: prev.events.filter(event => event !== 'reserva_criada') 
                        }))
                      }
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Reserva Criada</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={webhookConfig.events.includes('reserva_atualizada')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setWebhookConfig(prev => ({ 
                          ...prev, 
                          events: [...prev.events, 'reserva_atualizada'] 
                        }))
                      } else {
                        setWebhookConfig(prev => ({ 
                          ...prev, 
                          events: prev.events.filter(event => event !== 'reserva_atualizada') 
                        }))
                      }
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Reserva Atualizada</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={webhookConfig.events.includes('reserva_cancelada')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setWebhookConfig(prev => ({ 
                          ...prev, 
                          events: [...prev.events, 'reserva_cancelada'] 
                        }))
                      } else {
                        setWebhookConfig(prev => ({ 
                          ...prev, 
                          events: prev.events.filter(event => event !== 'reserva_cancelada') 
                        }))
                      }
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Reserva Cancelada</span>
                </label>
              </div>
            </div>

            {/* Teste de Webhook */}
            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start space-x-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Resultado do Teste
                    </p>
                    <p className={`text-sm ${
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {testResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={testWebhook}
            disabled={testLoading || !webhookConfig.endpoint_url}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              testLoading || !webhookConfig.endpoint_url
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {testLoading ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <TestTube className="w-4 h-4" />
            )}
            <span>Testar</span>
          </button>

          <button
            onClick={saveWebhookConfig}
            disabled={loading}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
              loading 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfigModal