export interface InventarioItem {
  id: number // Mapped from Product ID
  codigo_barras: string | null
  codigo_produto: number | null
  mercadoria: string
  tipo: string | null
  preco: number
  saldo_inicial: number
  entrada_estoque_carro: number
  entrada_cliente_carro: number
  saida_carro_estoque: number
  saida_carro_cliente: number
  saldo_final: number
  estoque_contagem_carro: number
  diferenca_quantidade: number
  diferenca_valor: number
}
