import { Document, Page, View, Text, StyleSheet, pdf } from "@react-pdf/renderer";

export interface InvoicePDFData {
  invoiceNumber?: string | null;
  issuedAt?: string | null;
  dueDate?: string | null;
  // Seller (cleaning company)
  sellerCompanyName: string;
  sellerCui: string;
  sellerRegNumber?: string | null;
  sellerAddress: string;
  sellerCity: string;
  sellerCounty: string;
  sellerIsVatPayer: boolean;
  sellerBankName?: string | null;
  sellerIban?: string | null;
  // Buyer (client)
  buyerName: string;
  buyerCui?: string | null;
  buyerAddress?: string | null;
  buyerCity?: string | null;
  buyerCounty?: string | null;
  buyerIsVatPayer?: boolean | null;
  // Amounts (in bani — divide by 100 for RON)
  subtotalAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  notes?: string | null;
  lineItems: Array<{
    descriptionRo: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatAmount: number;
    lineTotal: number;
    lineTotalWithVat: number;
  }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRON(bani: number): string {
  return (bani / 100).toFixed(2);
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
    paddingHorizontal: 36,
    paddingVertical: 32,
    backgroundColor: "#ffffff",
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#2563EB",
    paddingBottom: 12,
  },
  docTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#2563EB",
    letterSpacing: 1,
  },
  docMeta: {
    textAlign: "right",
    lineHeight: 1.5,
  },
  docMetaLabel: { color: "#6B7280", fontSize: 8 },
  docMetaValue: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  // Parties
  partiesRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 18,
  },
  partyBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#2563EB",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 4,
  },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 3 },
  partyRow: { flexDirection: "row", marginBottom: 2 },
  partyKey: { color: "#6B7280", width: 55, fontSize: 8 },
  partyVal: { flex: 1, fontSize: 8 },
  // Line items table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    color: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableRowAlt: { backgroundColor: "#F9FAFB" },
  colNo: { width: 24, fontFamily: "Helvetica-Bold", fontSize: 8, color: "#ffffff" },
  colNoBody: { width: 24, fontSize: 8, color: "#6B7280" },
  colDesc: { flex: 1, fontSize: 8 },
  colDescHead: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 8, color: "#ffffff" },
  colUM: { width: 28, textAlign: "center", fontSize: 8 },
  colUMHead: { width: 28, textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 8, color: "#ffffff" },
  colQty: { width: 28, textAlign: "right", fontSize: 8 },
  colQtyHead: { width: 28, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 8, color: "#ffffff" },
  colPrice: { width: 55, textAlign: "right", fontSize: 8 },
  colPriceHead: { width: 55, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 8, color: "#ffffff" },
  colVatPct: { width: 32, textAlign: "right", fontSize: 8 },
  colVatPctHead: { width: 32, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 8, color: "#ffffff" },
  colTotal: { width: 55, textAlign: "right", fontSize: 8, fontFamily: "Helvetica-Bold" },
  colTotalHead: { width: 55, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 8, color: "#ffffff" },
  // Totals
  totalsBox: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  totalsInner: {
    width: 220,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "#2563EB",
  },
  totalLabel: { fontSize: 8, color: "#6B7280" },
  totalValue: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  totalLabelFinal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  totalValueFinal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  // Notes
  notesBox: {
    marginTop: 16,
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
    borderRadius: 2,
  },
  notesLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#2563EB", marginBottom: 3 },
  notesText: { fontSize: 8, color: "#374151" },
  // Footer
  footer: {
    marginTop: "auto",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerText: { fontSize: 7, color: "#9CA3AF", textAlign: "center", lineHeight: 1.5 },
  footerBrand: { fontSize: 7, color: "#2563EB", textAlign: "center", fontFamily: "Helvetica-Bold" },
});

// ── PDF Document ──────────────────────────────────────────────────────────────

export function ClientInvoicePDF({ invoice }: { invoice: InvoicePDFData }) {
  const vatPctDisplay = `${Math.round(invoice.vatRate)}%`;

  return (
    <Document title={`Factură ${invoice.invoiceNumber ?? ""}`} author="Go2Fix">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.docTitle}>FACTURĂ FISCALĂ</Text>
            {invoice.invoiceNumber && (
              <Text style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>
                Nr. {invoice.invoiceNumber}
              </Text>
            )}
          </View>
          <View style={s.docMeta}>
            <Text style={s.docMetaLabel}>Data emiterii</Text>
            <Text style={s.docMetaValue}>{formatDate(invoice.issuedAt)}</Text>
            {invoice.dueDate && (
              <>
                <Text style={[s.docMetaLabel, { marginTop: 4 }]}>Scadentă</Text>
                <Text style={s.docMetaValue}>{formatDate(invoice.dueDate)}</Text>
              </>
            )}
            <Text style={[s.docMetaLabel, { marginTop: 4 }]}>Monedă</Text>
            <Text style={s.docMetaValue}>{invoice.currency}</Text>
          </View>
        </View>

        {/* ── Parties ── */}
        <View style={s.partiesRow}>
          {/* Seller */}
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Furnizor (Vânzător)</Text>
            <Text style={s.partyName}>{invoice.sellerCompanyName}</Text>
            <View style={s.partyRow}>
              <Text style={s.partyKey}>CUI:</Text>
              <Text style={s.partyVal}>{invoice.sellerCui}</Text>
            </View>
            {invoice.sellerRegNumber && (
              <View style={s.partyRow}>
                <Text style={s.partyKey}>Reg. Com.:</Text>
                <Text style={s.partyVal}>{invoice.sellerRegNumber}</Text>
              </View>
            )}
            <View style={s.partyRow}>
              <Text style={s.partyKey}>Adresă:</Text>
              <Text style={s.partyVal}>
                {invoice.sellerAddress}, {invoice.sellerCity}, {invoice.sellerCounty}
              </Text>
            </View>
            {invoice.sellerBankName && (
              <View style={s.partyRow}>
                <Text style={s.partyKey}>Bancă:</Text>
                <Text style={s.partyVal}>{invoice.sellerBankName}</Text>
              </View>
            )}
            {invoice.sellerIban && (
              <View style={s.partyRow}>
                <Text style={s.partyKey}>IBAN:</Text>
                <Text style={s.partyVal}>{invoice.sellerIban}</Text>
              </View>
            )}
            <View style={s.partyRow}>
              <Text style={s.partyKey}>Pl. TVA:</Text>
              <Text style={s.partyVal}>{invoice.sellerIsVatPayer ? "Da" : "Nu"}</Text>
            </View>
          </View>

          {/* Buyer */}
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Client (Cumpărător)</Text>
            <Text style={s.partyName}>{invoice.buyerName}</Text>
            {invoice.buyerCui && (
              <View style={s.partyRow}>
                <Text style={s.partyKey}>CUI/CNP:</Text>
                <Text style={s.partyVal}>{invoice.buyerCui}</Text>
              </View>
            )}
            {(invoice.buyerAddress || invoice.buyerCity) && (
              <View style={s.partyRow}>
                <Text style={s.partyKey}>Adresă:</Text>
                <Text style={s.partyVal}>
                  {[invoice.buyerAddress, invoice.buyerCity, invoice.buyerCounty]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
            )}
            {invoice.buyerIsVatPayer && (
              <View style={s.partyRow}>
                <Text style={s.partyKey}>Pl. TVA:</Text>
                <Text style={s.partyVal}>Da</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Line items table ── */}
        <View style={s.tableHeader}>
          <Text style={s.colNo}>Nr.</Text>
          <Text style={s.colDescHead}>Denumire serviciu / produs</Text>
          <Text style={s.colUMHead}>UM</Text>
          <Text style={s.colQtyHead}>Cant.</Text>
          <Text style={s.colPriceHead}>Preț unit.\n(fără TVA)</Text>
          <Text style={s.colVatPctHead}>TVA\n%</Text>
          <Text style={s.colTotalHead}>Total\n(cu TVA)</Text>
        </View>

        {invoice.lineItems.map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={s.colNoBody}>{i + 1}</Text>
            <Text style={s.colDesc}>{item.descriptionRo}</Text>
            <Text style={s.colUM}>buc</Text>
            <Text style={s.colQty}>{item.quantity.toFixed(0)}</Text>
            <Text style={s.colPrice}>{formatRON(item.unitPrice)} RON</Text>
            <Text style={s.colVatPct}>{Math.round(item.vatRate)}%</Text>
            <Text style={s.colTotal}>{formatRON(item.lineTotalWithVat)} RON</Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={s.totalsBox}>
          <View style={s.totalsInner}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Bază impozabilă (fără TVA)</Text>
              <Text style={s.totalValue}>{formatRON(invoice.subtotalAmount)} RON</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>TVA {vatPctDisplay}</Text>
              <Text style={s.totalValue}>{formatRON(invoice.vatAmount)} RON</Text>
            </View>
            <View style={s.totalRowFinal}>
              <Text style={s.totalLabelFinal}>TOTAL DE PLATĂ</Text>
              <Text style={s.totalValueFinal}>{formatRON(invoice.totalAmount)} RON</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {invoice.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>MENȚIUNI</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerBrand}>go2fix.ro</Text>
          <Text style={s.footerText}>
            Document generat prin platforma Go2Fix.ro.{"\n"}
            Această factură reprezintă obligația fiscală a furnizorului de servicii.{"\n"}
            Factura a fost emisă electronic și este valabilă fără semnătură și ștampilă conform legii.
          </Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Download helper ───────────────────────────────────────────────────────────

export async function downloadClientInvoicePDF(invoice: InvoicePDFData): Promise<void> {
  const blob = await pdf(<ClientInvoicePDF invoice={invoice} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `factura-${invoice.invoiceNumber ?? "go2fix"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
