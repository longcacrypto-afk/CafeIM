import { useEffect, useState } from 'react'
import { useI18n, formatMoney } from '../i18n'
import { fetchSettings } from '../lib/api'
import type { CafeSettings } from '../lib/api'
import type { ReceiptData } from './PosScreen'

export default function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  const { t, lang } = useI18n()
  const now = new Date()
  const [cfg, setCfg] = useState<CafeSettings | null>(null)

  useEffect(() => {
    fetchSettings().then((s) => setCfg(s)).catch(() => {})
  }, [])

  const storeName = cfg?.name || 'Quán Sáng Tạo'
  const footerText = cfg?.receipt_footer || t('thanks')

  const print = () => {
    const w = window.open('', '_blank', 'width=380,height=640')
    if (!w) return
    const rows = receipt.items
      .map(
        (i) => `<tr>
          <td>${i.name} (${i.size})${i.toppings.length ? `<br/><small>${i.toppings.map((tp) => tp.name).join(', ')}</small>` : ''} x${i.qty}</td>
          <td style="text-align:right">${(i.price * i.qty).toLocaleString('vi-VN')}</td>
        </tr>`,
      )
      .join('')
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const meta = [
      `${t('receiptNo')}: ${esc(receipt.id)}`,
      now.toLocaleString('vi-VN'),
      `${t('tables')}: ${esc(receipt.tableName)}`,
      `${t('cashier')}: ${esc(receipt.cashier)}`,
      cfg?.hotline ? `${t('storeHotline')}: ${esc(cfg.hotline)}` : '',
      `${t('payment')}: ${receipt.paymentMethod === 'cash' ? t('cash') : receipt.paymentMethod === 'transfer' ? t('transfer') : receipt.paymentMethod === 'card' ? t('card') : t('printProvisional')}`,
    ].filter(Boolean).join('<br/>')
    const discountHtml = receipt.discountAmount > 0
      ? `<tr><td>${t('subtotalBeforeDiscount')}</td><td style="text-align:right;text-decoration:line-through">${receipt.subtotal.toLocaleString('vi-VN')}</td></tr>` +
        `<tr><td>${t('discount')}</td><td style="text-align:right;color:#c0392b">-${receipt.discountAmount.toLocaleString('vi-VN')}</td></tr>`
      : ''
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${t('receipt')} ${esc(receipt.id)}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 12px; width: 300px; }
        h1 { font-size: 16px; text-align: center; margin: 0 0 2px; }
        .sub { text-align: center; font-size: 10px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; vertical-align: top; }
        .total { font-weight: bold; font-size: 14px; border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; }
        .meta { font-size: 10px; margin-bottom: 8px; }
        .thanks { text-align: center; margin-top: 12px; }
      </style></head><body>
      <h1>${esc(storeName)}</h1>
      ${cfg?.address ? `<p class="sub">${esc(cfg.address)}</p>` : ''}
      <p class="sub">CaPhe POS — ${t('receipt')}</p>
      <p class="meta">${meta}</p>
      <table>${rows}</table>
      ${discountHtml}
      <p class="total">${t('receiptTotal')}: ${receipt.total.toLocaleString('vi-VN')} VND</p>
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
          {cfg?.address && <p className="text-[11px] text-stone-400">{cfg.address}</p>}
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
