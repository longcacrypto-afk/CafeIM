import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'vi' | 'en'

const dict = {
  // Login
  loginTitle: { vi: 'CaPhe POS', en: 'CaPhe POS' },
  loginSubtitle: { vi: 'Đăng nhập để bắt đầu ca làm việc', en: 'Sign in to start your shift' },
  username: { vi: 'Tài khoản', en: 'Username' },
  password: { vi: 'Mật khẩu', en: 'Password' },
  signIn: { vi: 'Đăng nhập', en: 'Sign in' },
  forgotPassword: { vi: 'Quên mật khẩu?', en: 'Forgot password?' },

  // Nav
  navPos: { vi: 'Bán hàng', en: 'Sell' },
  navKitchen: { vi: 'Pha chế', en: 'Bar' },
  navReports: { vi: 'Báo cáo', en: 'Reports' },
  navSettings: { vi: 'Cài đặt', en: 'Settings' },
  navMenu: { vi: 'Menu', en: 'Menu' },
  owner: { vi: 'Chủ quán', en: 'Owner' },
  manager: { vi: 'Quản lý', en: 'Manager' },

  // POS
  tables: { vi: 'Bàn', en: 'Tables' },
  allAreas: { vi: 'Tất cả khu vực', en: 'All areas' },
  seats: { vi: 'chỗ', en: 'seats' },
  takeaway: { vi: 'Mang về', en: 'Takeaway' },
  searchPlaceholder: { vi: 'Tìm món...', en: 'Search items...' },
  all: { vi: 'Tất cả', en: 'All' },
  soldOut: { vi: 'Hết món', en: 'Sold out' },
  currentOrder: { vi: 'Đơn hiện tại', en: 'Current order' },
  noTable: { vi: 'Chưa chọn bàn', en: 'No table selected' },
  clearOrder: { vi: 'Xóa đơn', en: 'Clear' },
  emptyCart: { vi: 'Chọn món để tạo đơn', en: 'Pick items to build an order' },
  note: { vi: 'Ghi chú', en: 'Note' },
  notePlaceholder: { vi: 'VD: ít đá, đá riêng, thêm sữa...', en: 'e.g. less ice, extra milk...' },
  subtotal: { vi: 'Tạm tính', en: 'Subtotal' },
  items: { vi: 'món', en: 'items' },
  sendAndPay: { vi: 'Gửi đơn & Thanh toán', en: 'Send & Pay' },
  size: { vi: 'Size', en: 'Size' },
  payment: { vi: 'Thanh toán', en: 'Payment' },
  cash: { vi: 'Tiền mặt', en: 'Cash' },
  transfer: { vi: 'Chuyển khoản', en: 'Bank transfer' },
  card: { vi: 'Thẻ', en: 'Card' },
  customerPaid: { vi: 'Tiền khách đưa', en: 'Customer paid' },
  customerPaidPlaceholder: { vi: 'Tiền khách đưa (VNĐ)', en: 'Customer paid (VND)' },
  calcChange: { vi: 'Tính thối', en: 'Change' },
  changeDue: { vi: 'Tiền thối lại khách', en: 'Change due' },
  notEnough: { vi: 'Chưa đủ tiền', en: 'Not enough' },
  saveWithoutPay: { vi: 'Lưu, chưa thu tiền', en: 'Save, unpaid' },
  complete: { vi: 'Hoàn tất', en: 'Complete' },
  printProvisional: { vi: 'In hóa đơn tạm tính', en: 'Print provisional bill' },

  // Kitchen
  brewQueue: { vi: 'Hàng chờ pha chế', en: 'Brew queue' },
  waitingOrders: { vi: 'đơn đang chờ', en: 'orders waiting' },
  autoRefresh: { vi: 'tự cập nhật mỗi 10 giây', en: 'auto-refresh every 10s' },
  live: { vi: 'Trực tiếp', en: 'Live' },
  noOrders: { vi: 'Không có đơn nào đang chờ', en: 'No orders waiting' },
  completeOrder: { vi: 'Hoàn tất đơn', en: 'Complete order' },
  minutes: { vi: 'p', en: 'm' },

  // Reports
  reports: { vi: 'Báo cáo', en: 'Reports' },
  today: { vi: 'Hôm nay', en: 'Today' },
  last7: { vi: '7 ngày', en: '7 days' },
  last30: { vi: '30 ngày', en: '30 days' },
  exportCsv: { vi: 'Xuất CSV', en: 'Export CSV' },
  revenue: { vi: 'Doanh thu', en: 'Revenue' },
  orderCount: { vi: 'Số đơn', en: 'Orders' },
  avgPerOrder: { vi: 'Trung bình / đơn', en: 'Avg / order' },
  cashVsTransfer: { vi: 'Tiền mặt / chuyển khoản', en: 'Cash / transfer' },
  revenue7d: { vi: 'Doanh thu 7 ngày', en: 'Revenue · 7 days' },
  unitVnd: { vi: 'đơn vị: VND', en: 'unit: VND' },
  topItems: { vi: 'Top món bán chạy', en: 'Top sellers' },
  cups: { vi: 'ly', en: 'cups' },
  hourlyRevenue: { vi: 'Doanh thu theo khung giờ', en: 'Revenue by hour' },
  peakHint: {
    vi: 'Khung giờ cao điểm: 8h–10h sáng. Nên xếp thêm 1 nhân viên ca sáng.',
    en: 'Peak hour: 8–10 AM. Consider one extra staff in the morning shift.',
  },
  updated: { vi: 'cập nhật lúc', en: 'updated at' },

  // Menu management
  menuManage: { vi: 'Quản lý menu', en: 'Menu management' },
  addItem: { vi: 'Thêm món', en: 'Add item' },
  editItem: { vi: 'Sửa món', en: 'Edit item' },
  itemName: { vi: 'Tên món', en: 'Item name' },
  itemPrice: { vi: 'Giá (VNĐ)', en: 'Price (VND)' },
  itemCategory: { vi: 'Nhóm món', en: 'Category' },
  saveChanges: { vi: 'Lưu thay đổi', en: 'Save changes' },
  newCategory: { vi: 'Nhóm mới...', en: 'New category...' },

  // Customization (POS)
  chooseSize: { vi: 'Chọn size', en: 'Choose size' },
  chooseToppings: { vi: 'Topping thêm', en: 'Add toppings' },
  addToOrder: { vi: 'Thêm vào đơn', en: 'Add to order' },
  customize: { vi: 'Tùy chọn', en: 'Customize' },

  // Tables management
  addTable: { vi: 'Thêm bàn', en: 'Add table' },
  tableName: { vi: 'Tên bàn', en: 'Table name' },
  area: { vi: 'Khu vực', en: 'Area' },
  tableSeats: { vi: 'Số chỗ', en: 'Seats' },
  editTable: { vi: 'Sửa bàn', en: 'Edit table' },

  // Inventory
  navInventory: { vi: 'Kho', en: 'Inventory' },
  inventory: { vi: 'Kho nguyên liệu', en: 'Ingredients' },
  addIngredient: { vi: 'Thêm nguyên liệu', en: 'Add ingredient' },
  ingredientName: { vi: 'Tên nguyên liệu', en: 'Ingredient name' },
  ingredientUnit: { vi: 'Đơn vị', en: 'Unit' },
  currentStock: { vi: 'Tồn kho', en: 'In stock' },
  minStock: { vi: 'Tối thiểu', en: 'Min' },
  restock: { vi: 'Nhập thêm', en: 'Restock' },
  restockAmount: { vi: 'Số lượng nhập', en: 'Amount to add' },
  lowStock: { vi: 'Sắp hết', en: 'Low stock' },
  stockOk: { vi: 'Đủ', en: 'OK' },
  editIngredient: { vi: 'Sửa nguyên liệu', en: 'Edit ingredient' },

  // Recipes
  recipes: { vi: 'Công thức pha chế', en: 'Recipes' },
  recipeFor: { vi: 'Công thức cho', en: 'Recipe for' },
  addIngredientToRecipe: { vi: 'Thêm nguyên liệu vào công thức', en: 'Add ingredient' },
  qtyPerCup: { vi: 'SL / ly', en: 'Qty / cup' },
  noRecipe: { vi: 'Chưa có công thức — sẽ không tự trừ kho', en: 'No recipe — stock will not deduct' },
  saveRecipe: { vi: 'Lưu công thức', en: 'Save recipe' },

  // Receipt
  receipt: { vi: 'Hóa đơn', en: 'Receipt' },
  printReceipt: { vi: 'In hóa đơn', en: 'Print receipt' },
  cashier: { vi: 'Thu ngân', en: 'Cashier' },
  thanks: { vi: 'Cảm ơn quý khách!', en: 'Thank you!' },
  receiptTotal: { vi: 'TỔNG CỘNG', en: 'TOTAL' },
  receiptNo: { vi: 'Số HĐ', en: 'Receipt no' },
  closeReceipt: { vi: 'Đóng', en: 'Close' },

  // Reports extra
  orderDetail: { vi: 'Đơn hàng chi tiết', en: 'Order details' },
  totalInPeriod: { vi: 'Tổng trong kỳ', en: 'Period total' },
  noOrdersInPeriod: { vi: 'Không có đơn trong kỳ này', en: 'No orders in this period' },
  revenueTrend: { vi: 'Xu hướng doanh thu', en: 'Revenue trend' },
  lowStockAlert: { vi: 'Cảnh báo nguyên liệu sắp hết', en: 'Low stock alert' },
  soldQty: { vi: 'SL bán', en: 'Sold' },
  revenueCol: { vi: 'Doanh thu', en: 'Revenue' },
  ingredientUsage: { vi: 'Nguyên liệu đã dùng (kỳ này)', en: 'Ingredients used (this period)' },

  // Shifts
  navShift: { vi: 'Ca làm việc', en: 'Shift' },
  shiftTitle: { vi: 'Ca làm việc', en: 'Shift' },
  shiftHint: { vi: 'Mở ca đầu giờ, chốt ca cuối giờ — số liệu chốt ca không sửa được', en: 'Open at shift start, close at end — closed shifts are immutable' },
  openShift: { vi: 'Mở ca', en: 'Open shift' },
  openShiftHint: { vi: 'Nhập số tiền mặt quỹ đầu ca để bắt đầu', en: 'Enter the opening cash float to start' },
  openingCashPlaceholder: { vi: 'Tiền mặt đầu ca (VNĐ)', en: 'Opening cash (VND)' },
  openingCash: { vi: 'Quỹ đầu ca', en: 'Opening cash' },
  shiftRevenue: { vi: 'Doanh thu ca', en: 'Shift revenue' },
  closeShift: { vi: 'Chốt ca', en: 'Close shift' },
  closeShiftWarning: { vi: 'Ca đã chốt sẽ khóa vĩnh viễn — không ai sửa được số liệu.', en: 'A closed shift is locked forever — nobody can edit its numbers.' },
  countedCash: { vi: 'Tiền đếm được trong quỹ', en: 'Counted cash in drawer' },
  expectedCash: { vi: 'Tiền quỹ dự kiến', en: 'Expected cash' },
  difference: { vi: 'Chênh lệch', en: 'Difference' },
  pastShifts: { vi: 'Ca đã chốt (7 ngày)', en: 'Closed shifts (7 days)' },
  shiftOpenedAt: { vi: 'Mở ca lúc', en: 'Opened at' },

  // Expenses
  addExpense: { vi: 'Thêm chi phí', en: 'Add expense' },
  expenses: { vi: 'Chi phí trong ca', en: 'Expenses this shift' },
  expenseTitle: { vi: 'Nội dung (VD: tiền đá, giao hàng...)', en: 'Title (e.g. ice delivery)' },
  expenseAmount: { vi: 'Số tiền (VNĐ)', en: 'Amount (VND)' },

  // Staff
  navStaff: { vi: 'Nhân viên', en: 'Staff' },
  staff: { vi: 'Nhân viên', en: 'Staff' },
  addStaff: { vi: 'Thêm nhân viên', en: 'Add staff' },
  staffName: { vi: 'Họ tên', en: 'Full name' },
  staffEmail: { vi: 'Email đăng nhập', en: 'Login email' },
  staffRole: { vi: 'Vai trò', en: 'Role' },

  // Table photo/note
  tablePhoto: { vi: 'Ảnh bàn / không gian', en: 'Table photo' },
  takeTablePhoto: { vi: 'Chụp hoặc chọn ảnh bàn', en: 'Take or pick a photo' },
  tableNote: { vi: 'Ghi chú vị trí', en: 'Location note' },
  tableNotePlaceholder: { vi: 'VD: góc cửa sổ, gần quầy pha, chỗ yên tĩnh...', en: 'e.g. by the window, near the bar...' },

  // Cancel flow
  cancelItem: { vi: 'Hủy món', en: 'Cancel item' },
  cancelReason: { vi: 'Lý do hủy (bắt buộc)', en: 'Cancellation reason (required)' },
  cancelReasonPlaceholder: { vi: 'VD: khách đổi món, pha nhầm...', en: 'e.g. customer changed mind, wrong order' },
  requestCancel: { vi: 'Gửi yêu cầu hủy', en: 'Request cancellation' },
  cancelPending: { vi: 'Chờ duyệt hủy', en: 'Cancel pending' },
  cancelRequests: { vi: 'Yêu cầu hủy món', en: 'Cancel requests' },
  approve: { vi: 'Duyệt', en: 'Approve' },
  reject: { vi: 'Từ chối', en: 'Reject' },
  noCancelRequests: { vi: 'Không có yêu cầu hủy nào', en: 'No cancel requests' },
  cancelApproved: { vi: 'Đã duyệt hủy', en: 'Cancelled' },

  // Merge/move orders
  mergeTable: { vi: 'Chuyển / gộp bàn', en: 'Move / merge table' },
  pickOrderToMove: { vi: '1. Chọn đơn cần chuyển', en: '1. Pick the order to move' },
  noOpenOrdersToMove: { vi: 'Không có đơn nào đang mở', en: 'No open orders' },
  targetTable: { vi: '2. Chọn bàn đích', en: '2. Pick the target table' },
  confirmMove: { vi: 'Chuyển đơn', en: 'Move order' },

  // Store settings
  storeSettings: { vi: 'Cấu hình quán', en: 'Store settings' },
  storeSettingsHint: { vi: 'Thông tin này hiện trên hóa đơn in', en: 'Shown on printed receipts' },
  storeName: { vi: 'Tên quán', en: 'Store name' },
  storeAddress: { vi: 'Địa chỉ', en: 'Address' },
  storeHotline: { vi: 'Hotline', en: 'Hotline' },
  receiptFooter: { vi: 'Lời cuối hóa đơn', en: 'Receipt footer' },
  receiptCustomize: { vi: 'Tùy chỉnh hóa đơn in', en: 'Receipt customization' },
  receiptWidth: { vi: 'Khổ giấy in', en: 'Paper width' },
  receiptWidth58: { vi: '58mm (máy in nhỏ)', en: '58mm (small printer)' },
  receiptWidth80: { vi: '80mm (máy in chuẩn)', en: '80mm (standard printer)' },
  receiptShowAddress: { vi: 'In địa chỉ quán', en: 'Print store address' },
  receiptShowHotline: { vi: 'In hotline', en: 'Print hotline' },
  receiptShowQr: { vi: 'In mã QR cuối hóa đơn', en: 'Print QR code at the bottom' },
  receiptQrData: { vi: 'Nội dung mã QR (link)', en: 'QR content (link)' },
  receiptQrDataPlaceholder: { vi: 'VD: link đánh giá, link chuyển khoản...', en: 'e.g. review page, payment link...' },
  receiptBankInfo: { vi: 'Thông tin tài khoản ngân hàng', en: 'Bank account info' },
  receiptBankInfoPlaceholder: { vi: 'VD: Vietcombank 0123456789 - CA PHE A', en: 'e.g. Vietcombank 0123456789 - CA PHE A' },
  receiptSavedHint: { vi: 'Áp dụng cho mọi hóa đơn in ra sau khi lưu', en: 'Applies to every receipt printed after saving' },
  saved: { vi: 'Đã lưu', en: 'Saved' },
  receiptFooterPlaceholder: { vi: 'VD: Cảm ơn quý khách — hẹn gặp lại!', en: 'e.g. Thank you — see you soon!' },
  receiptFooterHint: { vi: 'Hiện ở phần chân hóa đơn in ra', en: 'Displayed at the bottom of printed receipts' },

  // QR ordering
  qrHint: { vi: 'Khách quét mã này để tự gọi món tại bàn', en: 'Guests scan this to order at the table' },
  printQr: { vi: 'In QR', en: 'Print QR' },
  qrOrderBadge: { vi: 'QR', en: 'QR' },
  newQrOrder: { vi: 'Đơn mới từ QR', en: 'New QR order' },
  confirmQr: { vi: 'Xác nhận đơn', en: 'Confirm order' },

  // Unpaid orders / daily history
  unpaidOrders: { vi: 'Chờ thu tiền', en: 'Unpaid' },
  todayHistory: { vi: 'Hôm nay', en: 'Today' },
  noUnpaid: { vi: 'Không có đơn chờ thanh toán', en: 'No unpaid orders' },
  noHistory: { vi: 'Chưa có đơn hoàn tất nào hôm nay', en: 'No completed orders today' },
  reopenOrder: { vi: 'Đang bổ sung món', en: 'Appending items' },
  appendingHint: { vi: 'thêm món rồi bấm lưu/thu tiền', en: 'add items then save/pay' },
  allStaff: { vi: 'Tất cả nhân viên', en: 'All staff' },
  staffPerformance: { vi: 'Doanh thu theo nhân viên', en: 'Revenue by staff' },
  unknownStaff: { vi: 'Không rõ', en: 'Unknown' },

  // Orders management
  navOrders: { vi: 'Đơn hàng', en: 'Orders' },
  ordersManageHint: { vi: 'Tất cả đơn hàng theo khoảng thời gian', en: 'All orders by time range' },
  ordersRangeToday: { vi: 'Hôm nay', en: 'Today' },
  ordersRange7: { vi: '7 ngày', en: '7 days' },
  ordersRange30: { vi: '30 ngày', en: '30 ngày' },
  orderStatusOpen: { vi: 'Đang mở', en: 'Open' },
  orderStatusCompleted: { vi: 'Đã thu', en: 'Paid' },
  orderStatusCancelled: { vi: 'Đã hủy', en: 'Cancelled' },
  ordersSummaryRevenue: { vi: 'Đã thu tiền', en: 'Collected' },
  ordersSummaryPending: { vi: 'Chưa thu', en: 'Unpaid' },
  createdAtCol: { vi: 'Tạo lúc', en: 'Created at' },
  completedAtCol: { vi: 'Thu tiền lúc', en: 'Paid at' },
  soldBy: { vi: 'Người bán', en: 'Sold by' },
  payNow: { vi: 'Thu tiền đơn này', en: 'Collect payment' },
  noOrdersInList: { vi: 'Không có đơn hàng nào trong khoảng này', en: 'No orders in this range' },
  searchOrdersPlaceholder: { vi: 'Tìm theo bàn hoặc số HĐ...', en: 'Search by table or receipt no...' },

  // Discount
  discount: { vi: 'Giảm giá', en: 'Discount' },
  discountNone: { vi: 'Không', en: 'None' },
  discountAmount: { vi: 'Giảm tiền', en: 'Amount off' },
  discountPercent: { vi: 'Giảm %', en: 'Percent off' },
  discountValue: { vi: 'Giá trị giảm', en: 'Discount value' },
  discountApplied: { vi: 'Đã giảm', en: 'Discount applied' },
  subtotalBeforeDiscount: { vi: 'Tạm tính', en: 'Subtotal' },
  // Split / move items
  splitItems: { vi: 'Tách món', en: 'Split items' },
  splitHint: { vi: 'Chọn món cần chuyển sang đơn khác', en: 'Pick items to move to another order' },
  pickTargetOrder: { vi: 'Chọn đơn đích', en: 'Pick target order' },
  moveItem: { vi: 'Chuyển món', en: 'Move item' },
  moveItemConfirm: { vi: 'Xác nhận chuyển', en: 'Confirm move' },
  noItemsToMove: { vi: 'Không có món nào để chuyển', en: 'No items to move' },
  sameOrder: { vi: 'Cùng đơn — chọn đơn khác', en: 'Same order — pick another' },
  reprint: { vi: 'In lại', en: 'Reprint' },
  discountCol: { vi: 'Giảm giá', en: 'Discount' },
  totalDiscount: { vi: 'Tổng giảm giá', en: 'Total discount' },

  // Advanced modules
  advancedModules: { vi: 'Module nâng cao', en: 'Advanced modules' },
  advancedModulesHint: { vi: 'Bật tắt từng module — thay đổi áp dụng cho mọi người dùng', en: 'Toggle each module — applies to all users' },
  moduleEnabled: { vi: 'Đang bật', en: 'On' },
  moduleDisabled: { vi: 'Đang tắt', en: 'Off' },
  installLink: { vi: 'Sinh link install', en: 'Generate install link' },
  installLinkHint: { vi: 'Chọn gói module và subdomain — link install tự động áp dụng đúng gói đó', en: 'Pick a profile and subdomain — the install link applies that preset' },
  profileMini: { vi: 'Mini — 1 tài khoản order + doanh thu + báo cáo', en: 'Mini — 1 ordering account + revenue + reports' },
  profileStandard: { vi: 'Tiêu chuẩn — thêm pha chế, QR, menu', en: 'Standard — adds kitchen, QR, menu' },
  profileFull: { vi: 'Đầy đủ — tất cả module nâng cao', en: 'Full — every advanced module' },
  installSubdomain: { vi: 'Subdomain', en: 'Subdomain' },
  installAppUrl: { vi: 'Đã xuất bản app tại (URL)', en: 'App published at (URL)' },
  installGenerate: { vi: 'Sinh link', en: 'Generate' },
  installCopied: { vi: 'Đã copy link', en: 'Link copied' },
  installCopy: { vi: 'Copy', en: 'Copy' },
  installHintPwa: { vi: 'Mở link trên tablet/điện thoại quầy và chọn "Add to Home Screen" để dùng như PWA', en: 'Open on the counter tablet and choose "Add to Home Screen" to install as PWA' },
} as const

export type DictKey = keyof typeof dict

interface I18n {
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: DictKey) => string
}

const I18nContext = createContext<I18n>({ lang: 'vi', setLang: () => {}, t: (k) => k })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('vi')
  const t = (k: DictKey) => dict[k][lang]
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}

export function formatMoney(n: number, lang: Lang) {
  return lang === 'vi'
    ? n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
    : `₫${n.toLocaleString('en-US')}`
}
