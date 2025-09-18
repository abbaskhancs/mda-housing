"use client";

import React from "react";
import { useForm } from "react-hook-form";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

type FormValues = {
  // Seller information
  sellerName: string;
  sellerCnic: string;
  sellerFatherName: string;
  sellerAddress: string;
  sellerPhone: string;
  sellerEmail: string;

  // Buyer information
  buyerName: string;
  buyerCnic: string;
  buyerFatherName: string;
  buyerAddress: string;
  buyerPhone: string;
  buyerEmail: string;

  // Attorney information (optional)
  attorneyName?: string;
  attorneyCnic?: string;
  attorneyFatherName?: string;
  attorneyAddress?: string;
  attorneyPhone?: string;
  attorneyEmail?: string;

  // Plot information
  plotNumber: string;
  blockNumber: string;
  sectorNumber: string;
  plotArea: string;
  plotLocation: string;

  // Water NOC requirement
  waterNocRequired: boolean;
};

type AttachmentRow = {
  id: string;
  file: File | null;
  docType: string;
  isOriginalSeen: boolean;
};

const allowedDocTypes = [
  { value: "AllotmentLetter", label: "Allotment Letter / الاٹمنٹ لیٹر" },
  { value: "PrevTransferDeed", label: "Previous Transfer Deed / سابقہ منتقلی ڈید" },
  { value: "AttorneyDeed", label: "Attorney Deed / اٹارنی ڈید" },
  { value: "GiftDeed", label: "Gift Deed / گفٹ ڈید" },
  { value: "CNIC_Seller", label: "CNIC (Seller) / شناختی کارڈ (فروخت کنندہ)" },
  { value: "CNIC_Buyer", label: "CNIC (Buyer) / شناختی کارڈ (خریدار)" },
  { value: "CNIC_Attorney", label: "CNIC (Attorney) / شناختی کارڈ (اٹارنی)" },
  { value: "UtilityBill_Latest", label: "Latest Utility Bill / حالیہ یوٹیلیٹی بل" },
  { value: "NOC_BuiltStructure", label: "NOC Built Structure / تعمیر کا این او سی" },
  { value: "Photo_Seller", label: "Photo (Seller) / تصویر (فروخت کنندہ)" },
  { value: "Photo_Buyer", label: "Photo (Buyer) / تصویر (خریدار)" },
  { value: "PrevChallan", label: "Previous Challan / سابقہ چالان" },
  { value: "NOC_Water", label: "Water NOC / پانی کا این او سی" }
];

export default function NewApplicationPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      sellerName: "", sellerCnic: "", sellerFatherName: "", sellerAddress: "", sellerPhone: "", sellerEmail: "",
      buyerName: "", buyerCnic: "", buyerFatherName: "", buyerAddress: "", buyerPhone: "", buyerEmail: "",
      attorneyName: "", attorneyCnic: "", attorneyFatherName: "", attorneyAddress: "", attorneyPhone: "", attorneyEmail: "",
      plotNumber: "", blockNumber: "", sectorNumber: "", plotArea: "", plotLocation: "",
      waterNocRequired: false
    }
  });
  const [attachments, setAttachments] = React.useState<AttachmentRow[]>([
    { id: crypto.randomUUID(), file: null, docType: "", isOriginalSeen: false }
  ]);
  const [error, setError] = React.useState<string | null>(null);
  const [successData, setSuccessData] = React.useState<{
    applicationNumber: string;
    applicationId: string;
    receiptUrl: string | null;
  } | null>(null);

  const addRow = React.useCallback(() => {
    setAttachments(prev => [...prev, { id: crypto.randomUUID(), file: null, docType: "", isOriginalSeen: false }]);
  }, []);

  const removeRow = React.useCallback((id: string) => {
    setAttachments(prev => prev.length === 1 ? prev : prev.filter(r => r.id !== id));
  }, []);

  const updateRow = React.useCallback((id: string, patch: Partial<AttachmentRow>) => {
    setAttachments(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }, []);

  const onSubmit = React.useCallback(async (values: FormValues) => {
    setError(null);
    try {
      // First, create or find the seller
      const sellerRes = await fetch("http://localhost:3001/api/persons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          cnic: values.sellerCnic.trim(),
          name: values.sellerName.trim(),
          fatherName: values.sellerFatherName.trim(),
          address: values.sellerAddress.trim(),
          phone: values.sellerPhone.trim(),
          email: values.sellerEmail.trim()
        })
      });

      if (!sellerRes.ok) {
        const data = await sellerRes.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create seller");
      }
      const seller = await sellerRes.json();

      // Create or find the buyer
      const buyerRes = await fetch("http://localhost:3001/api/persons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          cnic: values.buyerCnic.trim(),
          name: values.buyerName.trim(),
          fatherName: values.buyerFatherName.trim(),
          address: values.buyerAddress.trim(),
          phone: values.buyerPhone.trim(),
          email: values.buyerEmail.trim()
        })
      });

      if (!buyerRes.ok) {
        const data = await buyerRes.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create buyer");
      }
      const buyer = await buyerRes.json();

      // Create or find attorney if provided
      let attorney = null;
      if (values.attorneyName && values.attorneyCnic) {
        const attorneyRes = await fetch("http://localhost:3001/api/persons", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({
            cnic: values.attorneyCnic.trim(),
            name: values.attorneyName.trim(),
            fatherName: values.attorneyFatherName?.trim() || "",
            address: values.attorneyAddress?.trim() || "",
            phone: values.attorneyPhone?.trim() || "",
            email: values.attorneyEmail?.trim() || ""
          })
        });

        if (!attorneyRes.ok) {
          const data = await attorneyRes.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to create attorney");
        }
        attorney = await attorneyRes.json();
      }

      // Create or find the plot
      const plotRes = await fetch("http://localhost:3001/api/plots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          plotNumber: values.plotNumber.trim(),
          blockNumber: values.blockNumber.trim(),
          sectorNumber: values.sectorNumber.trim(),
          area: parseFloat(values.plotArea),
          location: values.plotLocation.trim()
        })
      });

      if (!plotRes.ok) {
        const data = await plotRes.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create plot");
      }
      const plot = await plotRes.json();

      // Now create the application
      const appRes = await fetch("http://localhost:3001/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          sellerId: seller.person.id,
          buyerId: buyer.person.id,
          attorneyId: attorney?.person?.id,
          plotId: plot.plot.id,
          waterNocRequired: data.waterNocRequired
        })
      });

      if (!appRes.ok) {
        const data = await appRes.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create application");
      }
      const created = await appRes.json();
      const appId: string = created?.application?.id;
      if (!appId) throw new Error("Application ID missing in response");

      // Upload attachments if any
      const filtered = attachments.filter(a => a.file && a.docType);
      if (filtered.length > 0) {
        for (const row of filtered) {
          const singleForm = new FormData();
          singleForm.append("attachments", row.file as Blob, (row.file as File).name);
          singleForm.append("docType", row.docType);
          singleForm.append("isOriginalSeen_attachments", row.isOriginalSeen ? "true" : "false");

          const up = await fetch(`http://localhost:3001/api/applications/${appId}/attachments`, {
            method: "POST",
            headers: {
              "Authorization": token ? `Bearer ${token}` : ""
            },
            body: singleForm
          });
          if (!up.ok) {
            const data = await up.json().catch(() => ({}));
            throw new Error(data?.error || "Attachment upload failed");
          }
        }
      }

      // Show success toast with application details
      setSuccessData({
        applicationNumber: created.application.applicationNumber,
        applicationId: appId,
        receiptUrl: created.receiptUrl
      });
      setError(null);

      // Redirect after a short delay to allow user to see the toast
      setTimeout(() => {
        router.replace(`/applications/${appId}`);
      }, 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error");
      setSuccessData(null);
    }
  }, [attachments, router, token]);

  return (
    <AuthGuard>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <h2 style={{ marginBottom: 12 }}>New Application / نئی درخواست</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Seller Information */}
          <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3 style={{ marginBottom: 16, color: "#333" }}>Seller Information / فروخت کنندہ کی معلومات</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Name / نام *</label>
                <input {...register("sellerName", { required: true })} placeholder="Full name" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.sellerName && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div>
                <label>CNIC / شناختی کارڈ *</label>
                <input {...register("sellerCnic", { required: true, pattern: /^\d{5}-\d{7}-\d{1}$/ })} placeholder="12345-1234567-1" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.sellerCnic && <span style={{ color: "#c00" }}>Valid CNIC required (12345-1234567-1)</span>}
              </div>
              <div>
                <label>Father&apos;s Name / والد کا نام *</label>
                <input {...register("sellerFatherName", { required: true })} placeholder="Father&apos;s name" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.sellerFatherName && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div>
                <label>Phone / فون *</label>
                <input {...register("sellerPhone", { required: true })} placeholder="+92-300-1234567" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.sellerPhone && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Address / پتہ *</label>
                <input {...register("sellerAddress", { required: true })} placeholder="Complete address" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.sellerAddress && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div>
                <label>Email / ای میل</label>
                <input {...register("sellerEmail", { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })} placeholder="email@example.com" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.sellerEmail && <span style={{ color: "#c00" }}>Valid email required</span>}
              </div>
            </div>
          </div>

          {/* Buyer Information */}
          <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3 style={{ marginBottom: 16, color: "#333" }}>Buyer Information / خریدار کی معلومات</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Name / نام *</label>
                <input {...register("buyerName", { required: true })} placeholder="Full name" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.buyerName && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div>
                <label>CNIC / شناختی کارڈ *</label>
                <input {...register("buyerCnic", { required: true, pattern: /^\d{5}-\d{7}-\d{1}$/ })} placeholder="12345-1234567-2" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.buyerCnic && <span style={{ color: "#c00" }}>Valid CNIC required (12345-1234567-1)</span>}
              </div>
              <div>
                <label>Father&apos;s Name / والد کا نام *</label>
                <input {...register("buyerFatherName", { required: true })} placeholder="Father&apos;s name" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.buyerFatherName && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div>
                <label>Phone / فون *</label>
                <input {...register("buyerPhone", { required: true })} placeholder="+92-301-7654321" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.buyerPhone && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Address / پتہ *</label>
                <input {...register("buyerAddress", { required: true })} placeholder="Complete address" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.buyerAddress && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div>
                <label>Email / ای میل</label>
                <input {...register("buyerEmail", { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })} placeholder="email@example.com" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.buyerEmail && <span style={{ color: "#c00" }}>Valid email required</span>}
              </div>
            </div>
          </div>

          {/* Attorney Information */}
          <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3 style={{ marginBottom: 16, color: "#333" }}>Attorney Information (Optional) / اٹارنی کی معلومات (اختیاری)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Name / نام</label>
                <input {...register("attorneyName")} placeholder="Full name" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
              </div>
              <div>
                <label>CNIC / شناختی کارڈ</label>
                <input {...register("attorneyCnic", { pattern: /^\d{5}-\d{7}-\d{1}$/ })} placeholder="12345-1234567-3" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.attorneyCnic && <span style={{ color: "#c00" }}>Valid CNIC required (12345-1234567-1)</span>}
              </div>
              <div>
                <label>Father&apos;s Name / والد کا نام</label>
                <input {...register("attorneyFatherName")} placeholder="Father&apos;s name" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
              </div>
              <div>
                <label>Phone / فون</label>
                <input {...register("attorneyPhone")} placeholder="+92-302-9876543" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Address / پتہ</label>
                <input {...register("attorneyAddress")} placeholder="Complete address" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
              </div>
              <div>
                <label>Email / ای میل</label>
                <input {...register("attorneyEmail", { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })} placeholder="email@example.com" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.attorneyEmail && <span style={{ color: "#c00" }}>Valid email required</span>}
              </div>
            </div>
          </div>

          {/* Plot Information */}
          <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3 style={{ marginBottom: 16, color: "#333" }}>Property Information / جائیداد کی معلومات</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label>Plot Number / پلاٹ نمبر *</label>
                <input {...register("plotNumber", { required: true })} placeholder="P-001" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.plotNumber && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div>
                <label>Block Number / بلاک نمبر *</label>
                <input {...register("blockNumber", { required: true })} placeholder="B-01" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.blockNumber && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div>
                <label>Sector Number / سیکٹر نمبر *</label>
                <input {...register("sectorNumber", { required: true })} placeholder="S-01" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.sectorNumber && <span style={{ color: "#c00" }}>Required</span>}
              </div>
              <div>
                <label>Area (sq ft) / رقبہ (مربع فٹ) *</label>
                <input {...register("plotArea", { required: true, pattern: /^\d+(\.\d+)?$/ })} placeholder="500" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.plotArea && <span style={{ color: "#c00" }}>Valid area required</span>}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Location / مقام *</label>
                <input {...register("plotLocation", { required: true })} placeholder="Sector 1, Block 1, Plot 1" style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }} />
                {errors.plotLocation && <span style={{ color: "#c00" }}>Required</span>}
              </div>
            </div>
          </div>

          {/* Water NOC Requirement */}
          <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8, backgroundColor: "#f8f9fa" }}>
            <h3 style={{ marginBottom: 16, color: "#333" }}>Water NOC Requirement / واٹر NOC کی ضرورت</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                {...register("waterNocRequired")}
                id="waterNocRequired"
                style={{ width: 18, height: 18 }}
              />
              <label htmlFor="waterNocRequired" style={{ fontSize: 16, cursor: "pointer" }}>
                Water NOC required? / کیا واٹر NOC درکار ہے؟
              </label>
            </div>
            <p style={{ marginTop: 8, fontSize: 14, color: "#666", fontStyle: "italic" }}>
              Check this box if the property requires Water Department clearance /
              اگر پراپرٹی کو واٹر ڈیپارٹمنٹ کلیئرنس کی ضرورت ہے تو یہ باکس چیک کریں
            </p>
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 8 }}>Attachments / منسلکات</h3>
            <div role="table" style={{ width: "100%", border: "1px solid #ddd" }}>
              <div role="row" style={{ display: "grid", gridTemplateColumns: "2fr 3fr 1fr 60px", gap: 8, padding: 8, background: "#f8f8f8", fontWeight: 600 }}>
                <div>Doc Type / دستاویز</div>
                <div>File / فائل</div>
                <div>Original seen / اصلی دیکھا گیا</div>
                <div></div>
              </div>
              {attachments.map(row => (
                <div key={row.id} role="row" style={{ display: "grid", gridTemplateColumns: "2fr 3fr 1fr 60px", gap: 8, padding: 8, alignItems: "center" }}>
                  <div>
                    <select value={row.docType} onChange={(e) => updateRow(row.id, { docType: e.target.value })} style={{ width: "100%" }}>
                      <option value="">Select / منتخب کریں</option>
                      {allowedDocTypes.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input type="file" onChange={(e) => updateRow(row.id, { file: e.target.files && e.target.files[0] ? e.target.files[0] : null })} />
                  </div>
                  <div>
                    <input type="checkbox" checked={row.isOriginalSeen} onChange={(e) => updateRow(row.id, { isOriginalSeen: e.target.checked })} />
                  </div>
                  <div>
                    <button type="button" onClick={() => removeRow(row.id)} disabled={attachments.length === 1}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={addRow}>+ Add row / قطار شامل کریں</button>
            </div>
          </div>

          {error && <div style={{ color: "#c00", marginTop: 12 }}>{error}</div>}

          {successData && (
            <div style={{
              backgroundColor: "#d4edda",
              color: "#155724",
              padding: 16,
              borderRadius: 8,
              marginTop: 12,
              border: "1px solid #c3e6cb"
            }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: 16 }}>
                ✅ Application Created Successfully! / درخواست کامیابی سے بن گئی!
              </h4>
              <p style={{ margin: "4px 0", fontSize: 14 }}>
                <strong>Application No:</strong> {successData.applicationNumber}
              </p>
              {successData.receiptUrl && (
                <p style={{ margin: "8px 0 0 0" }}>
                  <a
                    href={successData.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#0066cc",
                      textDecoration: "underline",
                      fontSize: 14
                    }}
                  >
                    📄 Download Intake Receipt PDF / رسید ڈاؤن لوڈ کریں
                  </a>
                </p>
              )}
              <p style={{ margin: "8px 0 0 0", fontSize: 12, fontStyle: "italic" }}>
                Redirecting to application details in 3 seconds...
              </p>
            </div>
          )}

          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Create Application / درخواست بنائیں"}
            </button>
            <button type="button" onClick={() => router.back()} disabled={isSubmitting}>Cancel / منسوخ کریں</button>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}


