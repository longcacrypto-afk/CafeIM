export type Role = 'owner' | 'manager' | 'cashier' | 'barista'

export interface Product {
  id: string
  name: string
  price: number
  category: string
  soldOut?: boolean
}

export interface OrderItem {
  id: string
  product: Product
  size: 'S' | 'M' | 'L'
  quantity: number
  note?: string
  toppings: string[]
  status: 'pending' | 'brewing' | 'ready' | 'cancelled'
}

export interface TableInfo {
  id: string
  name: string
  seats: number
  area: string
  occupied: boolean
}
