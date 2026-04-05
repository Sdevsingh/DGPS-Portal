"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type QuoteItem = { id: string; description: string; quantity: string; unitPrice: string; total: string };

type Props = {
  jobId: string;
  quoteStatus: string;
  quoteAmount: string;
  quoteGst: string;
  quoteTotalWithGst: string;
  quoteItems: QuoteItem[];
  role: string;
};

export default function QuotePanel({ jobId, quoteStatus, quoteAmount, quoteGst, quoteTotalWithGst, quoteItems, role }: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([{ description: "", quantity: "1", unitPrice: "" }]);

  const isOpsOrAdmin = role === "operations_manager" || role === "super_admin";

  function openForm() {
    if (quoteItems.length > 0) {
      setItems(quoteItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })));
    } else {
      setItems([{ description: "", quantity: "1", unitPrice: "" }]);
    }
    setShowForm(true);
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function updateItem(index: number, field: string, value: string) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const formSubtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
  const formGst = parseFloat((formSubtotal * 0.1).toFixed(2));
  const formTotal = parseFloat((formSubtotal + formGst).toFixed(2));

  async function sendQuote() {
    if (items.some((i) => !i.description || !i.unitPrice)) return;
    setSendError("");
    setSending(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            description: i.description,
            quantity: parseFloat(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSendError(data.error ?? "Failed to send quote — please try again");
        return;
      }
      setShowForm(false);
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  const hasQuote = quoteAmount && Number(quoteAmount) > 0;

  return (
    <div className="border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Quote</p>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          { pending: "bg-gray-100 text-gray-600", sent: "bg-blue-100 text-blue-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700" }[quoteStatus] ?? "bg-gray-100 text-gray-600"
        }`}>
          {quoteStatus}
        </span>
      </div>

      {/* Existing quote breakdown */}
      {hasQuote && (
        <div className="mb-4">
          {quoteItems.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {quoteItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.description} × {item.quantity}</span>
                  <span className="font-medium">${Number(item.total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${Number(quoteAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>GST (10%)</span>
              <span>${Number(quoteGst).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>Total incl. GST</span>
              <span>${Number(quoteTotalWithGst).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Ops: send/update quote form */}
      {isOpsOrAdmin && (quoteStatus === "pending" || quoteStatus === "rejected" || quoteStatus === "sent") && (
        <>
          {!showForm ? (
            <button onClick={openForm}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors">
              {quoteStatus === "sent" ? "Revise Quote" : hasQuote ? "Update Quote" : "Create & Send Quote"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <input placeholder="Description *" value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <div className="flex gap-2">
                        <input placeholder="Qty" type="number" min="1" value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input placeholder="Unit price *" type="number" min="0" value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(index)} className="text-gray-400 hover:text-red-500 mt-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Add line item</button>

              {/* Live total preview */}
              {formSubtotal > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span><span>${formSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>GST (10%)</span><span>${formGst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total incl. GST</span><span>${formTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {sendError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">{sendError}</div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setShowForm(false); setSendError(""); }}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={sendQuote} disabled={sending || items.some((i) => !i.description || !i.unitPrice)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl text-sm">
                  {sending ? "Sending..." : "Send Quote"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
