import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useI18n, formatMoney } from '../i18n'
import { fetchSettings } from '../lib/api'
import type { CafeSettings } from '../lib/api'
import type { ReceiptData } from './PosScreen'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  const { t, lang } = useI18n()
  const now = new Date()
  const [cfg, setCfg] = useState<CafeSettings | null>(null)

  useEffect(() => {
    fetchSettings().then((s) => setCfg(s)).catch(() => {})
  }, [])

  const storeName = cfg?.name || 'Quán Sáng Tạo'
  const footerText = cfg?.receipt_footer || t('thanks')
  const width = cfg?.receipt_width === '58' ? 58 : 80
  const paperPx = width === 58 ? 220 : 300

  const rows = receipt.items
    .map((i) => {
      const extras = [
        i.toppings.length ? `+ ${i.toppings.map((tp) => tp.name).join(', ')}` : '',
        i.note ? `${t('note')}: ${i.note}` : '',
      ].filter(Boolean)
      return `<tr>
        <td>${esc(i.name)} (${i.size})${extras.length ? `<br/><small>${esc(extras.join(' · '))}</small>` : ''} x${i.qty}</td>
        <td style="text-align:right">${(i.price * i.qty).toLocaleString('vi-VN')}</td>
      </tr>`
    })
    .join('')

  const meta = [
    `${t('receiptNo')}: ${esc(receipt.id)}`,
    now.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US'),
    receipt.tableName ? `${t('tables')}: ${esc(receipt.tableName)}` : '',
    receipt.cashier ? `${t('cashier')}: ${esc(receipt.cashier)}` : '',
    cfg?.hotline && cfg?.receipt_show_hotline !== false ? `${t('storeHotline')}: ${esc(cfg.hotline)}` : '',
    `${t('payment')}: ${receipt.paymentMethod === 'cash' ? t('cash') : receipt.paymentMethod === 'transfer' ? t('transfer') : receipt.paymentMethod === 'card' ? t('card') : t('printProvisional')}`,
  ].filter(Boolean).join('<br/>')

  const discountHtml = receipt.discountAmount > 0
    ? `<tr><td>${t('subtotalBeforeDiscount')}</td><td style="text-align:right;text-decoration:line-through">${receipt.subtotal.toLocaleString('vi-VN')}</td></tr>` +
      `<tr><td>${t('discount')}</td><td style="text-align:right;color:#c0392b">-${receipt.discountAmount.toLocaleString('vi-VN')}</td></tr>`
    : ''

  const bankHtml = cfg?.receipt_bank_info
    ? `<p class="bank">${esc(cfg.receipt_bank_info)}</p>`
    : ''

  const print = async () => {
    let qrDataUrl: string | null = null
    if (cfg?.receipt_show_qr && cfg?.receipt_qr_data) {
      try {
        qrDataUrl = await QRCode.toDataURL(cfg.receipt_qr_data, { width: 220, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      } catch {
        qrDataUrl = null
      }
    }
    const w = window.open('', '_blank', 'width=380,height=640')
    if (!w) return
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${t('receipt')} ${esc(receipt.id)}</title>
      <style>
        @page { size: ${width}mm auto; margin: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; width: ${paperPx}px; }
        h1 { font-size: ${width === 58 ? 14 : 16}px; text-align: center; margin: 0 0 2px; }
        .sub { text-align: center; font-size: 10px; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; vertical-align: top; }
        small { font-size: 9px; color: #444; }
        .total { font-weight: bold; font-size: 14px; border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; }
        .meta { font-size: 10px; margin-bottom: 8px; }
        .thanks { text-align: center; margin-top: 12px; }
        .bank { font-size: 10px; margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; white-space: pre-wrap; }
        .qr { display: block; margin: 10px auto 0; width: ${width === 58 ? 100 : 120}px; height: ${width === 58 ? 100 : 120}px; }
      </style></head><body>
      <h1>${esc(storeName)}</h1>
      ${cfg?.address && cfg?.receipt_show_address !== false ? `<p class="sub">${esc(cfg.address)}</p>` : ''}
      <p class="sub">CaPhe POS — ${t('receipt')}</p>
      <p class="meta">${meta}</p>
      <table>${rows}</table>
      ${discountHtml}
      <p class="total">${t('receiptTotal')}: ${receipt.total.toLocaleString('vi-VN')} VND</p>
      ${bankHtml}
      ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="QR" />` : ''}
      <p class="thanks">${esc(footerText)}</p>
      <script>window.onload = () => { window.print(); }</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <div className="modal-overlay z-[60]">
      <div className="modal-card pb-safe max-w-[340px]">
        <div className="text-center">
          <h3 className="text-base font-bold text-ink">{storeName}</h3>
          {cfg?.address && cfg?.receipt_show_address !== false && <p className="text-[11px] text-stone-400">{cfg.address}</p>}
          <p className="text-[11px] text-stone-400">
            {t('receipt')} · {now.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-400">
            {t('receiptNo')}: <b>{receipt.id}</b> · {receipt.tableName} · {receipt.cashier}
          </p>
        </div>

        <div className="my-3.5 border-t border-dashed border-stone-300" />

        <ul className="flex flex-col gap-2 text-[13px]">
          {receipt.items.map((i, idx) => (
            <li key={idx}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate font-medium text-ink">
                  {i.name} <span className="text-stone-400">({i.size})</span> ×{i.qty}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-ink">{formatMoney(i.price * i.qty, lang)}</span>
              </div>
              {i.toppings.length > 0 && (
                <p className="text-[11px] text-stone-400">+ {i.toppings.map((tp) => tp.name).join(', ')}</p>
              )}
              {i.note && <p className="text-[11px] italic text-warn">{t('note')}: {i.note}</p>}
            </li>
          ))}
        </ul>

        <div className="my-3.5 border-t border-dashed border-stone-300" />

        {receipt.discountAmount > 0 && (
          <>
            <div className="flex items-baseline justify-between text-[13px] text-stone-500">
              <span>{t('subtotalBeforeDiscount')}</span>
              <span className="tabular-nums line-through">{formatMoney(receipt.subtotal, lang)}</span>
            </div>
            <div className="flex items-baseline justify-between text-[13px] font-semibold text-danger">
              <span>{t('discount')}</span>
              <span className="tabular-nums">-{formatMoney(receipt.discountAmount, lang)}</span>
            </div>
          </>
        )}

        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-bold text-ink">{t('receiptTotal')}</span>
          <span className="text-[19px] font-bold tabular-nums text-brand-800">{formatMoney(receipt.total, lang)}</span>
        </div>

        {receipt.customerPaid != null && (
          <>
            <div className="mt-2.5 flex items-baseline justify-between text-[13px] text-stone-500">
              <span>{t('customerPaid')}</span>
              <span className="tabular-nums">{formatMoney(receipt.customerPaid ?? 0, lang)}</span>
            </div>
            <div className="flex items-baseline justify-between text-[13px] font-semibold text-ready">
              <span>{t('changeDue')}</span>
              <span className="tabular-nums">{formatMoney(receipt.changeDue ?? 0, lang)}</span>
            </div>
          </>
        )}

        <p className="mt-4 text-center text-[13px] font-medium text-stone-500">{footerText}</p>

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50"
          >
            {t('closeReceipt')}
          </button>
          <button
            onClick={print}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-800 py-2.5 text-sm font-semibold text-amber-50 transition-all hover:bg-brand-700 active:scale-[0.99]"
          >
            {t('printReceipt')}
          </button>
        </div>
      </div>
    </div>
  )
}
