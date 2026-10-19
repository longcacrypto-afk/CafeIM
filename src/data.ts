import type { Product, TableInfo } from './types'

export const CATEGORIES = ['Tất cả', 'Cà phê', 'Trà', 'Sinh tố', 'Đồ ăn nhẹ'] as const

export const MENU: Product[] = [
  { id: 'p1', name: 'Cà phê sữa đá', price: 25000, category: 'Cà phê' },
  { id: 'p2', name: 'Cà phê đen đá', price: 22000, category: 'Cà phê' },
  { id: 'p3', name: 'Bạc xỉu', price: 28000, category: 'Cà phê' },
  { id: 'p4', name: 'Cappuccino', price: 38000, category: 'Cà phê' },
  { id: 'p5', name: 'Espresso', price: 30000, category: 'Cà phê' },
  { id: 'p6', name: 'Cà phê muối', price: 35000, category: 'Cà phê' },
  { id: 'p7', name: 'Trà đào cam sả', price: 35000, category: 'Trà' },
  { id: 'p8', name: 'Trà vải', price: 32000, category: 'Trà' },
  { id: 'p9', name: 'Trà sữa trân châu', price: 34000, category: 'Trà' },
  { id: 'p10', name: 'Sinh tố bơ', price: 40000, category: 'Sinh tố' },
  { id: 'p11', name: 'Sinh tố xoài', price: 38000, category: 'Sinh tố', soldOut: true },
  { id: 'p12', name: 'Bánh mì que', price: 15000, category: 'Đồ ăn nhẹ' },
  { id: 'p13', name: 'Bánh flan', price: 18000, category: 'Đồ ăn nhẹ' },
  { id: 'p14', name: 'Khoai tây chiên', price: 30000, category: 'Đồ ăn nhẹ' },
]

export const TABLES: TableInfo[] = [
  { id: 't1', name: 'Bàn 1', seats: 2, area: 'Tầng 1', occupied: false },
  { id: 't2', name: 'Bàn 2', seats: 2, area: 'Tầng 1', occupied: false },
  { id: 't3', name: 'Bàn 3', seats: 4, area: 'Tầng 1', occupied: true },
  { id: 't4', name: 'Bàn 4', seats: 4, area: 'Tầng 1', occupied: false },
  { id: 't5', name: 'Bàn 5', seats: 6, area: 'Tầng 1', occupied: false },
  { id: 't6', name: 'Bàn 6', seats: 6, area: 'Tầng 1', occupied: false },
  { id: 't7', name: 'Bàn 7', seats: 2, area: 'Sân vườn', occupied: true },
  { id: 't8', name: 'Bàn 8', seats: 4, area: 'Sân vườn', occupied: false },
  { id: 't9', name: 'Bàn 9', seats: 4, area: 'Sân vườn', occupied: false },
  { id: 't10', name: 'Bàn 10', seats: 8, area: 'Sân vườn', occupied: false },
]

export const AREAS = ['Tất cả khu vực', 'Tầng 1', 'Sân vườn'] as const

export const TOPPINGS = ['Thêm shot', 'Kem', 'Trân châu', 'Thạch', 'Sữa tươi'] as const

export const formatVND = (n: number) =>
  n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
