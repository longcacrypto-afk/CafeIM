# Spec: App Quản Lý & Bán Hàng Quán Cafe

Phiên bản: 1.0 — MVP
Ngôn ngữ giao diện: Tiếng Việt
Nền tảng chạy: Cloudflare Workers (Free tier) + PWA (dùng được trên điện thoại/tablet, không cần cài từ App Store)

---

## 1. Mục tiêu

Xây dựng hệ thống quản lý, bán hàng dành cho quán cafe từ quy mô nhỏ (1 quầy, 1 nhân viên) tới chuỗi lớn (nhiều quán, nhiều ca, nhiều nhân viên), chạy hoàn toàn trên Cloudflare Workers free tier.

Nguyên tắc thiết kế:
- **Đơn giản trước hết**: nhân viên bán được hàng trong 3 chạm (chọn món → chọn bàn → xác nhận).
- **Hoạt động tốt trên tablet/điện thoại**: nút to, thao tác 1 tay, tối ưu cho màn hình dọc lẫn ngang.
- **Số liệu luôn đúng**: mọi đơn hàng đều ghi vết (ai bán, lúc nào, tại quầy nào), không sửa được lịch sử sau khi chốt ca.
- **Rẻ**: tận dụng tối đa free tier — 100k request/ngày, D1 5 triệu dòng đọc / 100k dòng ghi mỗi ngày — dư cho 1 quán vài trăm món/ngày, và scale được lên chuỗi.

## 2. Vai trò người dùng (Phân quyền)

| Vai trò | Quyền |
|---|---|
| **Chủ quán (Owner)** | Toàn bộ: cấu hình quán, menu, giá, kho, nhân viên, báo cáo, xuất dữ liệu |
| **Quản lý ca (Manager)** | Bán hàng, xem báo cáo trong ca, nhập kho, quản lý bàn, duyệt hủy món |
| **Thu ngân (Cashier)** | Bán hàng, thu tiền, in hóa đơn, xem đơn trong ca của mình |
| **Pha chế (Barista)** | Xem màn hình pha chế (hàng chờ), bấm "đã xong", không thấy giá tiền |
| **Khách (Customer, optional)** | Tự order qua QR trên bàn, chỉ thấy menu của quán mình |

## 3. Phạm vi MVP (Phase 1)

### 3.1. Đăng nhập & phân quyền
- Đăng nhập bằng tài khoản (email/số điện thoại + mật khẩu), mỗi nhân viên 1 tài khoản do chủ quán tạo.
- Sau đăng nhập, app mở đúng màn hình theo vai trò:
  - Cashier → thẳng màn POS bán hàng
  - Barista → thẳng màn pha chế
  - Owner/Manager → có thêm mục Quản lý & Báo cáo
- Ghi nhớ đăng nhập trên thiết bị (để quầy không phải đăng nhập lại mỗi ca).

### 3.2. Cấu hình quán
- Tên quán, logo, địa chỉ, hotline, dòng chữ cuối hóa đơn.
- **Hỗ trợ nhiều quán (multi-tenant)** ngay từ đầu: mỗi quán có ID riêng, toàn bộ dữ liệu (menu, đơn, nhân viên) gắn theo quán. Chủ chuỗi đăng 1 tài khoản, chuyển giữa các quán bằng menu chọn nhanh.
- Tầng/khu vực bàn: thêm/sửa/xóa tầng (Tầng 1, Sân vườn...), thêm/sửa/xóa bàn (số bàn, sức chứa).

### 3.3. Menu & sản phẩm
- Danh mục món (Cà phê, Trà, Sinh tố...) — thêm/sửa/xóa, sắp xếp thứ tự.
- Sản phẩm: tên, giá bán, danh mục, ảnh, mô tả, trạng thái (đang bán / ẩn / hết món hôm nay).
- Topping/phụ kiện: danh sách topping gắn với sản phẩm hoặc dùng chung (thêm sữa, ít đá...), mỗi topping có giá cộng thêm.
- Biến thể size (S/M/L) với giá khác nhau — lựa chọn size trên POS.
- Menu theo dõi trạng thái "hết món" để POS làm mờ món, tránh nhân viên nhận đơn rồi mới báo khách.

### 3.4. Bán hàng (POS) — màn hình chính
- Chọn bàn (hoặc bán mang đi / giao hàng) → màn chia đôi: trái là lưới món (lọc theo danh mục + tìm kiếm nhanh), phải là đơn đang soạn.
- Thêm món vào đơn: chọn size, topping, ghi chú riêng cho từng món ("ít đá", "đá riêng"...), số lượng ±.
- Đơn hàng có: mã đơn, bàn, thu ngân, giờ vào, ghi chú chung, trạng thái.
- **Trạng thái đơn**: `pending` (mới chốt) → `brewing` (đang pha) → `ready` (xong) → `completed` (khách đã thanh toán). Hủy đơn phải ghi lý do, chỉ Manager/Owner hủy được khi đơn đã pha.
- Thanh toán: tiền mặt / chuyển khoản / quẹt thẻ. Tự tính tổng, hỗ trợ giảm giá (giảm tiền mặt hoặc %), xuất hóa đơn.
- In hóa đơn qua trình duyệt (kích thước giấy 80mm, render sẵn — máy in thermal cắm vào tablet/máy tính sẽ nhận lệnh in từ trình duyệt).
- Tách đơn/gộp bàn: chuyển món giữa 2 bàn (kéo thả hoặc chọn đích).

### 3.5. Màn hình pha chế (Barista / Kitchen Display)
- Hàng chờ các món cần pha, sắp theo giờ vào, cũ nhất lên đầu.
- Mỗi thẻ đơn: số bàn, danh sách món + size + topping + ghi chú, thời gian chờ (đổi màu cảnh báo nếu quá 5 phút).
- Bấm từng món "đã pha xong" hoặc cả đơn "đã xong" → cập nhật trạng thái cho POS biết.
- Không hiển thị giá tiền trên màn này (tránh phân tán, đúng vai trò barista).

### 3.6. Quản lý ca làm việc (Shift)
- Mở ca: nhập tiền mặt đầu ca (thu ngân + quản lý xác nhận), ghi giờ mở.
- Trong ca: hệ thống tự cộng doanh thu theo phương thức thanh toán (tiền mặt / chuyển khoản / thẻ), số đơn, số món bán.
- Chốt ca: tổng kết tiền quỹ cuối ca, so với số hệ thống, ghi chênh lệch (nếu có), lưu vết — **không ai sửa được số liệu ca đã chốt**.
- Báo cáo theo ca dùng cho bàn giao giữa 2 nhân viên.

### 3.7. Báo cáo (dành cho Owner/Manager)
- Bảng điều khiển hôm nay: doanh thu, số đơn, số món bán, tiền mặt vs chuyển khoản, doanh thu trung bình/đơn.
- Biểu đồ doanh thu 7 ngày gần nhất (cột), giờ cao điểm (theo khung giờ).
- Top 10 món bán chạy, top món ế (bán ít nhất).
- Lọc theo: khoảng ngày, theo quán (nếu là chuỗi).
- Xuất CSV tải về máy.
- Không xóa/sửa được số liệu trong quá khứ — báo cáo luôn đọc từ đơn đã hoàn tất.

## 4. Ngoài phạm vi MVP (Phase 2+, ghi lại để làm sau)

- Quản lý kho nguyên liệu, nhập hàng, cảnh báo hết hàng.
- Khách hàng thân thiết, tích điểm, voucher.
- Order qua QR trên bàn cho khách (màn hình khách xem menu, tự gửi đơn vào quầy).
- Thông báo đẩy (đơn mới, món sẵn sàng).
- Kết nối máy in trực tiếp qua LAN/Bluetooth.
- Chương trình khuyến mãi theo khung giờ (happy hour).
- Đa ngôn ngữ (Anh/Việt), đa tiền tệ.

## 4.5. Phase 2 — Quản lý kho & nguyên liệu (prioritized)

Xây dựng ngay sau MVP, đây là phần giúp chủ quán **kiểm soát chi phí** — lợi ích lớn nhất sau khi có doanh thu.

### 4.5.1. Quản lý sản phẩm (nâng cấp)
- Sản phẩm nâng cao: **biến thể** (1 món có nhiều size/version, mỗi biến thể 1 giá), nhóm topping theo danh mục, giới hạn topping tối đa.
- **Công thức nấu (BOM - Bill of Materials)**: mỗi biến thể món gắn với danh sách nguyên liệu + định lượng (vd: Cà phê sữa đá size M = 15g cà phê + 20ml sữa đặc + 120ml đá).
- Ẩn món tự động khi 1 nguyên liệu trong công thức hết → POS hiện "Hết món", không cho nhận đơn.
- **Tính giá vốn (COGS)** từng món tự động từ giá nguyên liệu → biết ngay lợi nhuận/gộp từng món, báo cáo món nào lãi nhiều nhất.

### 4.5.2. Quản lý kho nguyên liệu
- **Danh mục nguyên liệu**: tên, đơn vị (gram, ml, cái, gói...), giá mua gần nhất, số lượng tồn, ngưỡng cảnh báo.
- **Tự động trừ kho**: khi 1 đơn chuyển sang "Hoàn tất" → hệ thống trừ đúng định lượng nguyên liệu theo công thức từng món. Đây là điểm quan trọng nhất, phải chạy chuẩn.
- **Nhập kho**: tạo phiếu nhập (ai nhập, từ nhà cung cấp nào, số lượng, giá), ghi lịch sử. Tồn kho tăng tương ứng.
- **Kiểm kê / điều chỉnh**: bấm "Kiểm kê" nhập số đếm thực tế, hệ thống tính **hao hụt** (chênh lệch giữa số lý thuyết và thực tế) — phát hiện lãng phí, mất mát.
- **Cảnh báo**: nguyên liệu dưới ngưỡng → bôi đỏ trong kho, gửi thông báo Telegram (xem 4.6).
- Báo cáo tồn kho theo thời gian, báo cáo hao hụt theo nhân viên/ca.

## 4.6. Phase 2 — Telegram Bot (báo cáo & cảnh báo)

Chủ quán/Kỹ sư cấu hình **Telegram Bot** để nhận báo cáo tự động và cảnh báo trong lúc vận hành — miễn phí, không cần app riêng, chủ quán theo dõi quán từ xa qua Telegram cá nhân.

### 4.6.1. Thiết lập
- Tạo bot qua @BotFather → nhận `TELEGRAM_BOT_TOKEN`.
- Chủ quán nhấn "Start" với bot → bot lưu `chat_id` của chủ quán (mỗi quán có thể bind nhiều chat, gồm cá nhân + nhóm quản lý).
- Token lưu trong biến môi trường (secret) của Cloudflare Worker, KHÔNG hardcode.

### 4.6.2. Báo cáo tự động
- **Báo cáo cuối ngày (21:00 hằng ngày, cron trigger của Cloudflare Workers - free)**:
  ```
  📊 BÁO CÁO NGÀY 17/10 - Quán Cà phê Sáng Tạo
  ━━━━━━━━━━━━━━━━━━━━━━
  💰 Doanh thu: 4,520,000đ
  🧾 Số đơn: 86 (trung bình 52,558đ/đơn)
  ☕ Món bán chạy: Cà phê sữa đá (24 ly)
  ━━━━━━━━━━━━━━━━━━━━━━
  💵 Tiền mặt: 2,100,000đ
  🏦 Chuyển khoản: 2,420,000đ
  ━━━━━━━━━━━━━━━━━━━━━━
  📈 So với T6: +8.4%
  🥇 Ca sáng: 2,120,000đ · Ca chiều: 2,400,000đ
  ```
- **Báo cáo chốt ca**: gửi ngay khi thu ngân chốt ca, gồm: doanh thu, số đơn, tiền đầu/cuối ca, chênh lệch (nếu có).
- **Báo cáo tuần**: mỗi tối thứ 2 gửi tổng hợp tuần trước (doanh thu, tăng trưởng, top món, nguyên liệu sắp hết).

### 4.6.3. Cảnh báo real-time
- ⚠️ Nguyên liệu dưới ngưỡng: "Cảnh báo: Cà phê chỉ còn 250g (ngưỡng 500g)"
- 🚨 Hủy món bất thường: 1 ca hủy > 5 món → báo ngay cho chủ quán
- 🔔 Đơn mới (optional, cho quán nhỏ không có màn pha chế riêng)
- ✅ Báo chốt ca xong với chữ ký (tên thu ngân + giờ chốt)

### 4.6.4. Điều khiển đơn giản (sau này mở rộng)
- Chủ quán gõ `/doanhthu` → bot trả doanh thu hôm nay.
- Gõ `/tonkho` → bot trả danh sách nguyên liệu dưới ngưỡng.
- Gõ `/ca` → bot trả tình trạng ca hiện tại.

Kiến trúc: Cloudflare Worker nhận webhook từ Telegram (HTTPS mặc định) → xử lý lệnh hoặc trigger theo cron → gọi `api.telegram.org/sendMessage`. Toàn bộ nằm trong free tier, KHÔNG cần server riêng.

## 5. Kiến trúc kỹ thuật

```
PWA (React + TypeScript + Tailwind)
  ├── POS (bán hàng)      ├── Pha chế      ├── Báo cáo      ├── Quản lý
  │        Đăng nhập (token session, ghi nhớ thiết bị)
  ▼
Cloudflare Worker (API, Hono)
  ├── Xác thực + phân quyền theo vai trò
  ├── REST API cho mọi chức năng
  ▼
Cloudflare D1 (SQLite)  +  KV (cache menu, session)  +  R2 (ảnh menu, logo)
```

### 5.1. Sơ đồ dữ liệu (bảng chính trong D1)

- `cafes` — thông tin quán (tên, logo, địa chỉ, hotline, ghi chú cuối hóa đơn, telegram_chat_ids)
- `users` — tài khoản nhân viên (họ tên, email, mật khẩu đã băm, vai trò, quán gắn với)
- `categories` — danh mục món (theo quán, thứ tự sắp xếp)
- `products` — món (tên, giá, danh mục, ảnh, trạng thái bán)
- `product_variants` — biến thể món (size S/M/L, giá riêng)
- `product_options` — topping/phụ kiện gắn với sản phẩm (tên, giá cộng thêm)
- `ingredients` — nguyên liệu (tên, đơn vị, giá mua, tồn kho, ngưỡng cảnh báo)
- `recipe_items` — công thức: 1 biến thể món = N nguyên liệu với định lượng
- `stock_movements` — lịch sử nhập/xuất/điều chỉnh kho (loại, số lượng, ai thao tác, lúc nào, gắn với đơn nếu là xuất tự động)
- `suppliers` — nhà cung cấp (tên, số điện thoại, ghi chú)
- `tables` — bàn (tên, số chỗ, tầng/khu vực)
- `orders` — đơn (mã, quán, bàn, thu ngân, trạng thái, giảm giá, tổng tiền, phương thức thanh toán, ghi chú, thời gian tạo/thanh toán)
- `order_items` — từng món trong đơn (biến thể sản phẩm, số lượng, giá chốt tại thời điểm bán, topping, ghi chú, trạng thái pha)
- `shifts` — ca làm việc (ai mở, tiền đầu ca, tiền cuối ca, doanh thu tổng hợp, giờ mở/đóng, chênh lệch)
- `expenses` — chi phí (thu chi ngoài nguyên liệu: tiền điện, nước, sửa chữa, lương...)

### 5.2. Chiến lược hoạt động trên free tier

- **Cache menu trong KV**: menu ít đổi, đọc từ cache (không đếm vào D1 rows read), chỉ gọi D1 khi menu thay đổi.
- **Gộp ghi**: 1 đơn hàng = 1 record `orders` + N record `order_items` ghi 1 lần duy nhất.
- **Báo cáo bằng query tổng hợp** (SUM/GROUP BY) chứ không tải từng đơn về frontend.
- **Ảnh lưu R2**, không nhét base64 vào database.
- **Throttle trên client**: màn pha chế chỉ tự làm mới mỗi 10 giây, không poll liên tục.

### 5.3. Bảo mật
- Mật khẩu băm (bcrypt), session token lưu trong cookie HttpOnly.
- Mọi API đều kiểm tra vai trò trước khi trả dữ liệu (thu ngân không sửa giá, barista không thấy tiền).
- Mỗi quán chỉ đọc/ghi dữ liệu quán của mình (multi-tenant isolation ngay tầng API).
- Không lưu thông tin thanh toán thẻ khách (chỉ ghi "đã thanh toán bằng thẻ").

## 6. Luồng nghiệp vụ chính

### Luồng 1: Một ca bán hàng điển hình
1. Thu ngân đăng nhập → mở ca (nhập tiền đầu ca).
2. Khách vào bàn 5 → thu ngân chọn "Bàn 5" → thêm 2 ly Cà phê sữa (size M, 1 ly ít đá) + 1 Trà đào.
3. Bấm "Gửi đơn" → đơn chuyển `brewing`, hiện lên màn pha chế của barista.
4. Barista pha xong từng món, bấm "xong" → POS hiện trạng thái "sẵn sàng".
5. Khách gọi thêm → thu ngân mở lại đơn, thêm món, gửi tiếp (chỉ thêm món mới vào hàng pha).
6. Khách thanh toán tiền mặt → thu ngân nhập tiền khách đưa, hệ thống tính tiền thối lại → bấm "Hoàn tất" → đơn `completed`, in hóa đơn.
7. Cuối ngày: chốt ca, so tiền quỹ, hệ thống ghi nhận doanh thu ca.

### Luồng 2: Hủy món sau khi đã gửi pha
1. Nhân viên chọn món trong đơn → bấm "Hủy món" → bắt buộc nhập lý do.
2. Đơn đã `brewing`: phải xin quản lý duyệt (quản lý thấy yêu cầu chờ duyệt ngay trên màn pha chế hoặc màn thông báo).
3. Duyệt xong, món bị đánh dấu `cancelled` (vẫn giữ trong lịch sử đơn để đối soát cuối ngày, KHÔNG xóa).

### Luồng 3: Mở quán mới trong chuỗi
1. Owner tạo quán mới (tên, địa chỉ) → hệ thống sinh bộ menu rỗng + bàn rỗng.
2. Owner copy menu từ quán cũ (1 nút) hoặc nhập tay.
3. Owner tạo tài khoản thu ngân cho quán mới, gán vai trò.

## 7. Thiết kế trải nghiệm (UX principles)

- **Màu sắc**: tông nâu/caramel ấm (hợp cà phê), nền sáng sạch. Trạng thái dùng màu riêng: đơn chờ (vàng), đang pha (xanh dương), sẵn sàng (xanh lá), hoàn tất (xám).
- **Kích thước chạm**: mọi nút bấm tối thiểu 48px, phù hợp tay ướt/môi trường quán.
- **Font**: 1 font sans-serif hiện đại (Inter), 3 mức độ đậm.
- **Phản hồi tức thì**: bấm thêm món có animation nhẹ + rung haptic (trên mobile), tổng tiền nhấp nháy khi thay đổi.
- **Chống lỗi**: nút hủy luôn cần xác nhận; nút "Thanh toán" đổi màu nổi bật khi đơn không rỗng; không cho gửi đơn rỗng.
- **Offline-ready (Phase 2)**: thiết kế sẵn API idempotent (mỗi đơn có ID client sinh trước) để sau này lưu tạm offline rồi đồng bộ.
