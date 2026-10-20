import { describe, expect, it } from "vitest";
import { getNearDepletionProducts, getRecurringCustomers, isBackupDueToday, isLocalProductImage } from "../client/src/lib/operationalHelpers";
import { buildReceiptQrMarkup, buildReceiptQrPayload, makeReceiptQrDataUrl } from "../client/src/lib/receiptQr";
import { buildReceiptPrintHtml } from "../client/src/lib/receiptTemplate";
import { buildPriceChangeDrafts, isSettledDebt } from "../client/src/lib/storeHistory";
import { buildReceiptPdfLines } from "../client/src/lib/receiptPdf";
import { buildDebtReminderUrl, getStocktakeDifference, getWeeklySummary } from "../client/src/lib/weeklyOperations";
import { getWeekComparison, isWeeklyStocktakeDue } from "../client/src/lib/weeklyPlanning";
import { buildShelfLabelsPrintHtml } from "../client/src/lib/shelfLabels";
import { getPrintableBarcodeValue } from "../client/src/lib/labelBarcode";
import { getInactiveProducts, getMonthlyReport } from "../client/src/lib/monthlyOperations";
import { getExpiryStatus, getExpiringProducts, getSupplierPurchaseList } from "../client/src/lib/inventoryPlanning";
import { buildSupplierPurchaseOrderGroups, getSupplierPurchaseOrderUnits } from "../client/src/lib/supplierPurchaseOrder";
import { getLocalDecisionCenter } from "../client/src/lib/localDecisionCenter";
import { approveRequestedBatchWaste, cancelUnconsumedBatch, consumeBatchesFefo, getBatchHistory, getBatchRemainingTotal, getEarliestActiveExpiry, getExpirySortedBatchInventory, getExpiryWasteReport, getSupplierCreditStatusReport, getSupplierInventoryCostReport, reconcileBatchStocktake, requestExpiredBatchWaste, returnUnconsumedBatchToSupplier, updateUnconsumedBatch } from "../client/src/lib/productBatches";
import { buildSupplierReturnNoticeHtml } from "../client/src/lib/supplierReturnNotice";
import { getSupplierCreditStatus, getSupplierMonthlyStatement } from "../client/src/lib/supplierLedger";
import { getActiveCashDenominations, getCashClosingForDate, getCashDenominationTotal, getDailyCashSummary, getDailyExpenseLimitStatus, getMonthlyExpenseReport } from "../client/src/lib/cashOperations";
import { getSupplierDueDateStatuses } from "../client/src/lib/supplierDueDates";
import { getSupplierObligationReport, getSupplierPurchaseComparison, getSupplierPurchaseReport } from "../client/src/lib/supplierPurchases";
import { getCashFlowForecast, getProductDemandInsights, getPurchaseRecommendations } from "../client/src/lib/localAnalysis";
import { createBulkStocktakeRecords, createStocktakeRecord, getBulkStocktakeSummary, getDailyGoalProgress, getMonthlyGoalProgress, getSaleReturnableItems, getSaleReturnEligibility, getStocktakeRecordSummary, getStocktakeRunComparison } from "../client/src/lib/localOperations";
import { getProductProfitability } from "../client/src/lib/productProfitability";
import { isValidLocalPin } from "../client/src/lib/localActionLock";
import { getCartQuantityOfferSummary, getBestQuantityOffer } from "../client/src/lib/quantityOffers";
import { getCustomerStatement } from "../client/src/lib/customerStatement";
import { getInventoryCategorySummary } from "../client/src/lib/inventoryCategories";
import { getCustomerCreditStatus } from "../client/src/lib/customerCredit";
import { getStaffSalesReport } from "../client/src/lib/staffSales";
import { createBarcodeStocktakeDraft, getBarcodeStocktakeProgress, incrementBarcodeStocktakeCount, normaliseBarcodeStocktakeCounts } from "../client/src/lib/barcodeStocktake";
import { captureExternalBarcodeKey } from "../client/src/lib/externalBarcodeReader";
import { clampReturnCartQuantity, getReturnCartTotal } from "../client/src/lib/saleReturnCart";
import { buildReturnReceiptRows, searchReturnableSales } from "../client/src/lib/returnEnhancements";
import { filterReturnSales } from "../client/src/lib/returnAnalytics";
import { getHighReturnRateProducts, getMonthlyReturnComparison, getReturnReasonSummary } from "../client/src/lib/advancedReturnAnalytics";
import { getStaffReturnsReport } from "../client/src/lib/staffReturns";
import { createSuspendedSaleDraft, filterQuickSaleProducts, getQuickSaleCategories, normaliseFavoriteProductIds, normaliseSuspendedSaleDrafts, restoreSuspendedCartItems, sortQuickSaleProducts } from "../client/src/lib/quickSale";
import { getDailyPaymentSummary, getDailyPaymentSummaryTotals } from "../client/src/lib/dailyPaymentSummary";
import { getMinimumMarginViolations } from "../client/src/lib/profitProtection";
import { getCategorySalesReport } from "../client/src/lib/categorySalesReport";
import { rebuildRepeatSaleCart } from "../client/src/lib/repeatSale";
import { getAvailableAlternatives, getContainerBalances, getMonthlyContainerReport, getMonthlyReservationReport, getReservableQuantity, getReservationDueStatus, getReservedQuantity } from "../client/src/lib/localShopExtras";
import { appendBarcodeAlias, clampReceivingQuantity, findProductByBarcode } from "../client/src/lib/goodsReceiving";
import { getBarcodeFeedbackMessage, vibrateBarcodeFeedback } from "../client/src/lib/barcodeFeedback";
import { adjustReceivingQuantity, appendReceivingSessionEvent, appendSuccessfulReceivingScan, buildReceivingBarcodeLabelHtml, filterSuccessfulReceivingScans, filterSuccessfulReceivingScansAdvanced, getDailySuccessfulReceivingScans, getSuccessfulReceivingScanSummary, getSuccessfulReceivingSessionEvents } from "../client/src/lib/receivingExperience";
import { buildGoodsReceiptNoticeHtml, getReceivingCostReview } from "../client/src/lib/receivingCostReview";
import { getPreviousMonthKey, getRepeatedCostIncreaseProducts, getSupplierCostChanges, getSupplierMonthlyCostComparison } from "../client/src/lib/supplierCostChanges";
import { getReceivingBarcodeEmptyGuidance, getReceivingBarcodeReaderGuidance } from "../client/src/lib/receivingScanGuidance";

describe("تحسينات التشغيل المحلي", () => {
  it("يوفر إرشادًا واضحًا للمسح بالكاميرا والقارئ الخارجي", () => {
    expect(getReceivingBarcodeEmptyGuidance()).toContain("مسح بالكاميرا");
    expect(getReceivingBarcodeReaderGuidance()).toContain("Bluetooth");
  });

  it("يعرض آخر المنتجات التي تم التعرف عليها بنجاح دون أخطاء الجلسة", () => {
    const entries = [
      { id: "error", kind: "error" as const, barcode: "", productName: "", createdAt: "2026-08-25T08:00:00.000Z" },
      { id: "success-2", kind: "success" as const, barcode: "6222", productName: "عصير", createdAt: "2026-08-25T08:01:00.000Z" },
      { id: "received", kind: "received" as const, barcode: "6222", productName: "عصير", createdAt: "2026-08-25T08:02:00.000Z", quantity: 4 },
      { id: "success-1", kind: "success" as const, barcode: "6111", productName: "ماء", createdAt: "2026-08-25T08:03:00.000Z" },
    ];
    expect(getSuccessfulReceivingSessionEvents(entries)).toMatchObject([{ id: "success-2" }, { id: "success-1" }]);
  });

  it("يحفظ التعرفات الناجحة لليوم ويبحث بالاسم أو الباركود", () => {
    const scans = appendSuccessfulReceivingScan([], { id: "scan-1", productId: "p-1", productName: "ماء", barcode: "622001", scannedAt: "2026-08-25T09:00:00.000Z" });
    const withSecond = appendSuccessfulReceivingScan(scans, { id: "scan-2", productId: "p-2", productName: "حليب", barcode: "622002", scannedAt: "2026-08-25T10:00:00.000Z" });
    expect(getDailySuccessfulReceivingScans(withSecond, "2026-08-25")).toHaveLength(2);
    expect(filterSuccessfulReceivingScans(withSecond, "622001")).toMatchObject([{ productName: "ماء" }]);
    expect(filterSuccessfulReceivingScans(withSecond, "حليب")).toMatchObject([{ barcode: "622002" }]);
  });

  it("يفلتر سجل المسح حسب التصنيف والمورد وحالة المخزون", () => {
    const scans = [
      { id: "scan-1", productId: "p-1", productName: "ماء", barcode: "622001", scannedAt: "2026-08-25T09:00:00.000Z" },
      { id: "scan-2", productId: "p-2", productName: "حليب", barcode: "622002", scannedAt: "2026-08-25T10:00:00.000Z" },
    ];
    const products = [
      { id: "p-1", category: "مشروبات", supplierName: "مورد أ", quantity: 8, lowStockAt: 3 },
      { id: "p-2", category: "ألبان", supplierName: "مورد ب", quantity: 2, lowStockAt: 3 },
    ];
    expect(filterSuccessfulReceivingScansAdvanced(scans, products, { query: "", category: "ألبان", supplierName: "", stockStatus: "low" })).toMatchObject([{ productId: "p-2" }]);
  });

  it("يلخص عدد مرات مسح كل صنف ويرتب الأكثر تكرارًا أولًا", () => {
    const entries = [
      { id: "scan-1", productId: "p-1", productName: "ماء", barcode: "622001", scannedAt: "2026-08-25T09:00:00.000Z" },
      { id: "scan-2", productId: "p-2", productName: "حليب", barcode: "622002", scannedAt: "2026-08-25T10:00:00.000Z" },
      { id: "scan-3", productId: "p-1", productName: "ماء", barcode: "622001", scannedAt: "2026-08-25T11:00:00.000Z" },
    ];
    expect(getSuccessfulReceivingScanSummary(entries)).toMatchObject([{ productId: "p-1", scans: 2, lastScannedAt: "2026-08-25T11:00:00.000Z" }, { productId: "p-2", scans: 1 }]);
  });

  it("يذكّر بالنسخة الاحتياطية مرة في كل يوم جديد", () => {
    const now = new Date("2026-08-23T12:00:00");
    expect(isBackupDueToday("", now)).toBe(true);
    expect(isBackupDueToday("2026-08-22T21:00:00", now)).toBe(true);
    expect(isBackupDueToday("2026-08-23T08:00:00", now)).toBe(false);
  });

  it("يجمع الزبائن المتكررين والذمم القائمة", () => {
    expect(getRecurringCustomers(
      [{ paymentMethod: "credit", customerName: "أحمد" }, { paymentMethod: "credit", customerName: "أحمد" }, { paymentMethod: "cash", customerName: "سالم" }],
      [{ customerName: "أحمد", amount: 20, paid: 5 }, { customerName: "مريم", amount: 10, paid: 0 }],
    )).toEqual([
      { name: "أحمد", visits: 2, outstanding: 15 },
      { name: "مريم", visits: 0, outstanding: 10 },
    ]);
  });

  it("يقبل صور الأصناف المحلية المضغوطة فقط", () => {
    expect(isLocalProductImage("data:image/png;base64,AA==")).toBe(true);
    expect(isLocalProductImage("https://example.test/item.jpg")).toBe(false);
  });

  it("يميز الكميات القريبة من حد المخزون المنخفض قبل تجاوزه", () => {
    expect(getNearDepletionProducts([
      { id: "one", quantity: 1, lowStockAt: 5 },
      { id: "watch", quantity: 7, lowStockAt: 5 },
      { id: "empty", quantity: 0, lowStockAt: 5 },
    ]).map((product) => product.id)).toEqual(["watch"]);
  });

  it("يبني محتوى QR مختصرًا للفاتورة دون تفاصيل الأصناف", () => {
    expect(JSON.parse(buildReceiptQrPayload({ id: "sale-123456789", createdAt: "2026-08-23T12:00:00.000Z", total: 12.5, paymentMethod: "cash" }, "محل الندى", "0910000000"))).toEqual({
      s: "محل الندى", p: "0910000000", i: "23456789", d: "2026-08-23T12:00", t: 12.5, m: "cash",
    });
  });

  it("ينتج رمز QR كصورة محلية للطباعة", async () => {
    const payload = buildReceiptQrPayload({ id: "sale-123456789", createdAt: "2026-08-23T12:00:00.000Z", total: 12.5, paymentMethod: "cash" }, "محل الندى");
    await expect(makeReceiptQrDataUrl(payload)).resolves.toMatch(/^data:image\/png;base64,/);
  });

  it("يضم رمز QR داخل HTML الإيصال", () => {
    expect(buildReceiptQrMarkup("data:image/png;base64,qr-test")).toContain('class="receipt-qr"');
    expect(buildReceiptQrMarkup("data:image/png;base64,qr-test")).toContain('src="data:image/png;base64,qr-test"');
    expect(buildReceiptQrMarkup("data:image/png;base64,qr-test", "امسح لفتح موقع المحل")).toContain("امسح لفتح موقع المحل");
  });

  it("يمرر QR ضمن HTML الإيصال الكامل المعد للطباعة", () => {
    const printHtml = buildReceiptPrintHtml({
      brandHtml: "<header>محل الندى</header>", invoiceHtml: "<p>فاتورة</p>", rowsHtml: "<tr><td>صنف</td></tr>", subtotalHtml: "", discountHtml: "", totalHtml: "<strong>12.5</strong>", qrHtml: buildReceiptQrMarkup("data:image/png;base64,qr-test"), footerHtml: "<footer>شكرًا</footer>",
    });
    expect(printHtml).toContain('class="receipt-qr"');
    expect(printHtml).toContain('data:image/png;base64,qr-test');
  });

  it("يفصل الذمم المسددة ويحدد فروق الأسعار فقط عند التعديل", () => {
    expect(isSettledDebt({ amount: 10, paid: 10 })).toBe(true);
    expect(isSettledDebt({ amount: 10, paid: 9.5 })).toBe(false);
    expect(buildPriceChangeDrafts(
      { id: "p1", name: "زيت", purchasePrice: 5, salePrice: 8 },
      { id: "p1", name: "زيت", purchasePrice: 6, salePrice: 8.5 },
    )).toEqual([
      { field: "purchasePrice", previous: 5, next: 6 },
      { field: "salePrice", previous: 8, next: 8.5 },
    ]);
  });

  it("يبني محتوى PDF للإيصال مع الأسعار والإجمالي", () => {
    const lines = buildReceiptPdfLines({
      storeName: "محل الندى", invoiceNumber: "12345", orderReference: "W-204", createdAt: "23 أغسطس", paymentLabel: "نقدًا", items: [{ name: "زيت", quantity: 2, price: 4 }], subtotal: 8, discountAmount: 1, note: "طلب توصيل", staffMemberName: "أحمد البائع", total: 7,
    });
    expect(lines).toContain("الإجمالي: 7.00 د.ل");
    expect(lines).toContain("2 × 4.00 د.ل = 8.00 د.ل");
    expect(lines).toContain("ملاحظة: طلب توصيل");
    expect(lines).toContain("مرجع الطلب: W-204");
    expect(lines).toContain("البائع: أحمد البائع");
  });

  it("ينشئ رابط واتساب يدويًا وملخص ربح أسبوعي محليًا", () => {
    expect(buildDebtReminderUrl({ phone: "091 234 5678", customerName: "أحمد", remaining: 12.5, storeName: "محل الندى" })).toContain("https://wa.me/218912345678?text=");
    expect(getWeeklySummary([
      { createdAt: "2026-08-20T10:00:00.000Z", total: 10, profit: 3 },
      { createdAt: "2026-08-10T10:00:00.000Z", total: 40, profit: 15 },
    ], new Date("2026-08-23T12:00:00.000Z"))).toMatchObject({ revenue: 10, profit: 3, invoices: 1 });
    expect(getStocktakeDifference(8, 5)).toBe(-3);
  });

  it("يحدد موعد الجرد الأسبوعي ويقارن أسبوعين متتاليين محليًا", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    expect(isWeeklyStocktakeDue({ weekday: 0 }, now)).toBe(true);
    expect(isWeeklyStocktakeDue({ weekday: 0, lastCompletedAt: "2026-08-23T08:00:00.000Z" }, now)).toBe(false);
    expect(getWeekComparison([
      { createdAt: "2026-08-22T10:00:00.000Z", total: 30, profit: 10 },
      { createdAt: "2026-08-15T10:00:00.000Z", total: 20, profit: 6 },
    ], now)).toMatchObject({ revenueChange: 10, profitChange: 4, current: { invoices: 1 }, previous: { invoices: 1 } });
  });

  it("ينشئ ملصقات الرفوف من الأصناف المختارة فقط", () => {
    const html = buildShelfLabelsPrintHtml("محل الاختبار", [{ id: "p1", name: "حليب <طازج>", sku: "SKU-1", salePrice: 4.5 }], (value) => `${value} د.ل`, { p1: "<svg data-barcode=\"SKU-1\"></svg>" }, "large");
    expect(html).toContain("حليب &lt;طازج&gt;");
    expect(html).toContain("4.5 د.ل");
    expect(html).toContain("SKU-1");
    expect(html).toContain("data-barcode");
    expect(html).toContain("كبير 70 × 40 مم");
    expect(html).toContain("minmax(70mm,1fr)");
  });

  it("يكرر ملصق المنتج وفق الكمية المحددة للطباعة", () => {
    const html = buildShelfLabelsPrintHtml("محل الاختبار", [{ id: "water", name: "ماء", sku: "622002", salePrice: 2 }], (value) => `${value} د.ل`, {}, "standard", { water: 20 });
    expect(html.match(/>ماء</g)).toHaveLength(20);
  });

  it("يرصد الأصناف بلا حركة ويحسب التقرير الشهري من الفواتير المحلية", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    const sales = [{ id: "sale-1", createdAt: "2026-08-20T10:00:00.000Z", total: 30, profit: 10, paymentMethod: "cash" as const, items: [{ productId: "active", name: "نشط", quantity: 2, price: 15, cost: 10 }] }, { id: "sale-2", createdAt: "2026-07-01T10:00:00.000Z", total: 10, profit: 2, paymentMethod: "cash" as const, items: [{ productId: "inactive", name: "راكد", quantity: 1, price: 10, cost: 8 }] }];
    expect(getInactiveProducts([{ id: "active", name: "نشط", sku: "A-1", category: "عام", quantity: 2, purchasePrice: 10, salePrice: 15 }, { id: "inactive", name: "راكد", sku: "B-1", category: "عام", quantity: 3, purchasePrice: 8, salePrice: 10 }], sales, now).map((entry) => entry.product.id)).toEqual(["inactive"]);
    expect(getMonthlyReport(sales, now)).toMatchObject({ invoices: 1, revenue: 30, profit: 10, units: 2 });
    expect(getPrintableBarcodeValue("T-001")).toBe("T-001");
    expect(getPrintableBarcodeValue("رمز عربي")).toBe("");
  });

  it("يرصد الصلاحية وينشئ قائمة مشتريات مجمعة حسب المورد", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    expect(getExpiryStatus("2026-08-20", now).kind).toBe("expired");
    expect(getExpiryStatus("2026-08-30", now).kind).toBe("soon");
    const products = [
      { id: "p1", name: "حليب", sku: "M-1", supplierName: "مورد أ", expiryDate: "2026-08-30", quantity: 1, lowStockAt: 5 },
      { id: "p2", name: "عصير", sku: "J-1", supplierName: "مورد أ", expiryDate: "2026-10-30", quantity: 5, lowStockAt: 3 },
      { id: "p3", name: "أرز", sku: "R-1", quantity: 0, lowStockAt: 4 },
    ];
    expect(getExpiringProducts(products, now).map((entry) => entry.product.id)).toEqual(["p1"]);
    expect(getSupplierPurchaseList(products)).toMatchObject([{ supplierName: "بدون مورد محدد", products: [{ id: "p3", suggestedQuantity: 8 }] }, { supplierName: "مورد أ", products: [{ id: "p1", suggestedQuantity: 9 }] }]);
  });

  it("يجهز أمر شراء بكميات معدلة ويستبعد الكميات الصفرية", () => {
    const groups = buildSupplierPurchaseOrderGroups([{ supplierName: "مورد أ", products: [{ id: "p1", name: "ماء", sku: "622001", quantity: 1, suggestedQuantity: 9 }, { id: "p2", name: "عصير", sku: "622002", quantity: 0, suggestedQuantity: 6 }] }], { p1: "20", p2: "0" });
    expect(groups).toMatchObject([{ supplierName: "مورد أ", products: [{ id: "p1", requestedQuantity: 20 }] }]);
    expect(getSupplierPurchaseOrderUnits(groups)).toBe(20);
  });

  it("يبني قرارات محلية مرتبة لخطر النفاد والسيولة والذمم والمخزون الراكد", () => {
    const center = getLocalDecisionCenter({
      insights: [
        { productId: "water", productName: "ماء", sku: "622001", supplierName: "مورد أ", currentStock: 1, lowStockAt: 3, recentUnits: 14, priorUnits: 7, averageDailyDemand: 2, demandTrend: "rising", daysOfCover: 0.5, risk: "urgent", recommendedOrderQuantity: 27, estimatedOrderCost: 54, explanation: "خطر نفاد عاجل" },
        { productId: "slow", productName: "عصير راكد", sku: "622002", supplierName: "مورد ب", currentStock: 10, lowStockAt: 2, recentUnits: 0, priorUnits: 0, averageDailyDemand: 0, demandTrend: "no-data", daysOfCover: null, risk: "no-demand", recommendedOrderQuantity: 0, estimatedOrderCost: 0, explanation: "لا توجد حركة" },
      ],
      products: [{ id: "water", name: "ماء", quantity: 1, purchasePrice: 2, salePrice: 2 }, { id: "slow", name: "عصير راكد", quantity: 10, purchasePrice: 3, salePrice: 5 }],
      outstandingDebt: 100,
      cashFlow: { signal: "negative", projectedNet: -20, horizonDays: 7 },
    });
    expect(center.actions.map((action) => action.id)).toContain("restock-urgent");
    expect(center.actions.map((action) => action.id)).toContain("collect-debt");
    expect(center.actions.map((action) => action.id)).toContain("stagnant-stock");
    expect(center.actions.map((action) => action.id)).toContain("price-risk");
    expect(center.actions[0]?.priority).toBe("urgent");
  });

  it("يستهلك الدفعات بالأقرب صلاحية ويرتب جرد الدفعات", () => {
    const batches = [
      { id: "late", receivedAt: "2026-08-01T10:00:00.000Z", quantity: 5, remainingQuantity: 5, purchasePrice: 3, expiryDate: "2026-10-10", supplierName: "مورد", note: "" },
      { id: "early", receivedAt: "2026-08-02T10:00:00.000Z", quantity: 3, remainingQuantity: 3, purchasePrice: 3, expiryDate: "2026-09-01", supplierName: "مورد", note: "" },
    ];
    const consumed = consumeBatchesFefo(batches, 4);
    expect(consumed.consumedBatchIds).toEqual(["early", "late"]);
    expect(consumed.batches).toMatchObject([{ id: "late", remainingQuantity: 4 }, { id: "early", remainingQuantity: 0 }]);
    expect(getBatchRemainingTotal(consumed.batches)).toBe(4);
    expect(getEarliestActiveExpiry(consumed.batches)).toBe("2026-10-10");
    expect(getExpirySortedBatchInventory([{ id: "p", name: "زيت", sku: "O-1", batches: consumed.batches }])[0]?.batch.id).toBe("late");
    expect(getBatchHistory([{ id: "p", name: "زيت", sku: "O-1", batches: consumed.batches }]).map((entry) => entry.batch.id)).toEqual(["late", "early"]);
    expect(getBatchRemainingTotal(reconcileBatchStocktake(consumed.batches, 6, "2026-08-23T12:00:00.000Z", 3))).toBe(6);
  });

  it("يعدل ويلغي الدفعة غير المستهلكة ويحسب هدر الدفعات المنتهية", () => {
    const batches = [{ id: "editable", receivedAt: "2026-08-01T10:00:00.000Z", quantity: 3, remainingQuantity: 3, purchasePrice: 2, expiryDate: "2026-08-20", supplierName: "مورد", note: "" }, { id: "used", receivedAt: "2026-08-02T10:00:00.000Z", quantity: 3, remainingQuantity: 1, purchasePrice: 4, expiryDate: "2026-10-20", supplierName: "مورد", note: "" }];
    const updated = updateUnconsumedBatch(batches, "editable", { quantity: 4, purchasePrice: 2.5, expiryDate: "2026-08-21", supplierName: "مورد جديد", note: "تصحيح" });
    expect(updated.changed).toBe(true);
    expect(updated.batches.find((batch) => batch.id === "editable")).toMatchObject({ id: "editable", quantity: 4, remainingQuantity: 4, purchasePrice: 2.5 });
    expect(updateUnconsumedBatch(batches, "used", { quantity: 4, purchasePrice: 2, expiryDate: "", supplierName: "", note: "" }).changed).toBe(false);
    expect(cancelUnconsumedBatch(updated.batches, "editable").cancelled?.id).toBe("editable");
    expect(cancelUnconsumedBatch(batches, "used").cancelled).toBeUndefined();
    expect(getExpiryWasteReport([{ id: "p", name: "حليب", sku: "M-1", batches: updated.batches }], new Date("2026-08-23T12:00:00.000Z"))).toMatchObject({ units: 4, cost: 10, entries: [{ batch: { id: "editable" } }] });
  });

  it("يطلب الهدر ثم يعتمد بموافقة ثانية ويرجع الدفعة غير المستهلكة ويحسب ائتمان المورد", () => {
    const batches = [{ id: "expired", receivedAt: "2026-08-01T10:00:00.000Z", quantity: 2, remainingQuantity: 2, purchasePrice: 3, expiryDate: "2026-08-20", supplierName: "مورد أ", note: "" }, { id: "returnable", receivedAt: "2026-08-02T10:00:00.000Z", quantity: 4, remainingQuantity: 4, purchasePrice: 2, expiryDate: "2026-10-20", supplierName: "مورد ب", note: "" }];
    const requested = requestExpiredBatchWaste(batches, "expired", "انتهاء الصلاحية", "2026-08-23T12:00:00.000Z");
    expect(requested.requested).toMatchObject({ quantity: 2, cost: 6, reason: "انتهاء الصلاحية" });
    expect(requested.batches.find((batch) => batch.id === "expired")?.remainingQuantity).toBe(2);
    expect(approveRequestedBatchWaste(requested.batches, "expired", "غير مؤكد", "2026-08-23T12:02:00.000Z").approved).toBeUndefined();
    const wasted = approveRequestedBatchWaste(requested.batches, "expired", "اعتماد نهائي", "2026-08-23T12:03:00.000Z");
    expect(wasted.approved).toMatchObject({ quantity: 2, cost: 6, reason: "انتهاء الصلاحية" });
    expect(getExpiryWasteReport([{ id: "p", name: "حليب", sku: "M-1", batches: wasted.batches }], new Date("2026-08-23T12:00:00.000Z"))).toMatchObject({ units: 0, cost: 0 });
    const returned = returnUnconsumedBatchToSupplier(wasted.batches, "returnable", "خطأ في الاستلام", "2026-08-23T12:05:00.000Z");
    expect(returned.returned).toMatchObject({ quantity: 4, cost: 8, reason: "خطأ في الاستلام" });
    expect(getSupplierInventoryCostReport([{ id: "p", name: "حليب", sku: "M-1", batches }])).toMatchObject({ units: 6, cost: 14, groups: [{ supplierName: "مورد ب", cost: 8 }, { supplierName: "مورد أ", cost: 6 }] });
    expect(getSupplierCreditStatusReport([{ id: "p", name: "حليب", sku: "M-1", batches }], { "مورد أ": 5, "مورد ب": 10 }).groups).toMatchObject([{ supplierName: "مورد ب", exceeded: false }, { supplierName: "مورد أ", exceeded: true, availableCredit: 0 }]);
  });

  it("ينشئ إشعار إرجاع المورد متضمنًا سبب الإرجاع وقيمته", () => {
    const html = buildSupplierReturnNoticeHtml("محل الحي", { name: "حليب <طازج>", sku: "M-1" }, { supplierName: "مورد أ", expiryDate: "2026-10-20", supplierReturn: { returnedAt: "2026-08-24T10:00:00.000Z", reason: "تلف <تغليف>", quantity: 2, cost: 6 } }, (value) => `${value} د.ل`, () => "24 أغسطس", (value) => value.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    expect(html).toContain("إشعار إرجاع إلى المورد");
    expect(html).toContain("مورد أ");
    expect(html).toContain("2");
    expect(html).toContain("6 د.ل");
    expect(html).toContain("تلف &lt;تغليف&gt;");
  });

  it("يجمع كشف المورد الشهري ويعرض تنبيهًا مبكرًا قبل سقف الائتمان", () => {
    const batches = [{ id: "received", receivedAt: "2026-08-05T10:00:00.000Z", quantity: 4, remainingQuantity: 4, purchasePrice: 3, expiryDate: "", supplierName: "مورد أ", note: "" }, { id: "returned", receivedAt: "2026-08-10T10:00:00.000Z", quantity: 2, remainingQuantity: 0, purchasePrice: 2, expiryDate: "", supplierName: "مورد أ", note: "", supplierReturn: { returnedAt: "2026-08-12T10:00:00.000Z", reason: "خطأ", quantity: 2, cost: 4 } }];
    const payments = [{ id: "pay-1", supplierName: "مورد أ", amount: 2, paidAt: "2026-08-15T10:00:00.000Z", note: "تحويل" }];
    expect(getSupplierMonthlyStatement([{ id: "p", name: "أرز", sku: "R-1", batches }], payments, "مورد أ", "2026-08")).toMatchObject({ received: 16, returned: 4, paid: 2, net: 10, entries: [{ type: "دفع" }, { type: "إرجاع" }, { type: "استلام" }, { type: "استلام" }] });
    expect(getSupplierCreditStatus([{ id: "p", name: "أرز", sku: "R-1", batches }], payments, { "مورد أ": 12 }).groups).toMatchObject([{ supplierName: "مورد أ", outstanding: 10, nearing: true, exceeded: false }]);
  });

  it("يحسب مصروفات اليوم والنقد المتوقع وفارق إغلاق الوردية محليًا", () => {
    const sales = [
      { createdAt: "2026-08-24T09:00:00.000Z", total: 20, profit: 8, paymentMethod: "cash" as const },
      { createdAt: "2026-08-24T10:00:00.000Z", total: 10, profit: 4, paymentMethod: "credit" as const },
      { createdAt: "2026-08-23T10:00:00.000Z", total: 100, profit: 30, paymentMethod: "cash" as const },
    ];
    const expenses = [{ id: "e-1", amount: 5, category: "نقل", note: "توصيل", spentAt: "2026-08-24T11:00:00.000Z" }];
    const collections = [{ id: "c-1", debtId: "d-1", customerName: "أحمد", amount: 6, collectedAt: "2026-08-24T12:00:00.000Z", note: "" }];
    expect(getDailyCashSummary(sales, expenses, "2026-08-24", 7, 25, collections)).toMatchObject({ invoices: 2, cashSales: 20, creditSales: 10, debtCollections: 6, collectionCount: 1, revenue: 30, grossProfit: 12, expenses: 5, netOperatingProfit: 7, expectedCash: 28, actualCash: 25, variance: -3 });
    expect(getCashClosingForDate([{ id: "old", date: "2026-08-24", openingCash: 0, actualCash: 1, note: "", closedAt: "2026-08-24T12:00:00.000Z" }, { id: "new", date: "2026-08-24", openingCash: 0, actualCash: 2, note: "", closedAt: "2026-08-24T13:00:00.000Z" }], "2026-08-24")?.id).toBe("new");
    expect(getDailyExpenseLimitStatus(expenses, "2026-08-24", 6)).toMatchObject({ active: true, spent: 5, remaining: 1, nearing: true, exceeded: false });
    expect(getDailyExpenseLimitStatus(expenses, "2026-08-24", 4)).toMatchObject({ active: true, exceeded: true, remaining: 0 });
    expect(getMonthlyExpenseReport([...expenses, { id: "e-2", amount: 8, category: "نقل", note: "", spentAt: "2026-08-28T11:00:00.000Z" }, { id: "e-3", amount: 2, category: "صيانة", note: "", spentAt: "2026-08-30T11:00:00.000Z" }, { id: "e-4", amount: 30, category: "نقل", note: "", spentAt: "2026-09-01T11:00:00.000Z" }], "2026-08")).toMatchObject({ amount: 15, count: 3, groups: [{ category: "نقل", amount: 13, count: 2 }, { category: "صيانة", amount: 2, count: 1 }] });
    const denominations = [{ denomination: 20, count: 2 }, { denomination: 5, count: 3 }, { denomination: 0.5, count: 1 }, { denomination: 10, count: -2 }];
    expect(getCashDenominationTotal(denominations)).toBe(55.5);
    expect(getActiveCashDenominations(denominations)).toEqual([{ denomination: 20, count: 2 }, { denomination: 5, count: 3 }, { denomination: 0.5, count: 1 }]);
  });

  it("يرتب استحقاقات الموردين المحلية وينبه بالموعد القريب والمتأخر", () => {
    const statuses = getSupplierDueDateStatuses([{ supplierName: "مورد أ", outstanding: 12 }, { supplierName: "مورد ب", outstanding: 8 }, { supplierName: "مورد ج", outstanding: 0 }], { "مورد أ": "2026-08-24", "مورد ب": "2026-08-22", "مورد ج": "2026-08-20" }, "2026-08-23");
    expect(statuses).toEqual([{ supplierName: "مورد ب", outstanding: 8, dueDate: "2026-08-22", daysUntilDue: -1, overdue: true, nearing: false }, { supplierName: "مورد أ", outstanding: 12, dueDate: "2026-08-24", daysUntilDue: 1, overdue: false, nearing: true }]);
  });

  it("يجمع مشتريات الموردين وتصنيف التزاماتهم من سجلات الدفعات المحلية", () => {
    const products = [{ id: "p-1", name: "أرز", sku: "R-1", batches: [
      { id: "b-1", receivedAt: "2026-08-04T10:00:00.000Z", quantity: 4, remainingQuantity: 4, purchasePrice: 3, expiryDate: "", supplierName: "مورد أ", note: "" },
      { id: "b-2", receivedAt: "2026-08-06T10:00:00.000Z", quantity: 2, remainingQuantity: 0, purchasePrice: 5, expiryDate: "", supplierName: "مورد ب", note: "", supplierReturn: { returnedAt: "2026-08-09T10:00:00.000Z", reason: "خطأ", quantity: 2, cost: 10 } },
    ] }];
    expect(getSupplierPurchaseReport(products, "2026-08-01", "2026-08-31")).toMatchObject({ received: 22, returned: 10, net: 12, groups: [{ supplierName: "مورد أ", net: 12, receivedUnits: 4 }, { supplierName: "مورد ب", net: 0, returnedUnits: 2 }] });
    expect(getSupplierObligationReport([{ supplierName: "مورد أ", outstanding: 12 }, { supplierName: "مورد ب", outstanding: 6 }, { supplierName: "مورد ج", outstanding: 0 }], [{ supplierName: "مورد أ", dueDate: "2026-08-22", overdue: true, nearing: false }, { supplierName: "مورد ب", dueDate: "2026-08-25", overdue: false, nearing: true }])).toMatchObject({ overdueCount: 1, nearDueCount: 1, settledCount: 1, obligations: [{ supplierName: "مورد أ", status: "overdue" }, { supplierName: "مورد ب", status: "nearDue" }, { supplierName: "مورد ج", status: "settled" }] });
  });

  it("يحفظ مرجع فاتورة المورد ويقارن صافي مشترياته بين شهرين", () => {
    const products = [{ id: "p-1", name: "زيت", sku: "O-1", batches: [
      { id: "aug", receivedAt: "2026-08-04T10:00:00.000Z", quantity: 3, remainingQuantity: 3, purchasePrice: 4, expiryDate: "", supplierName: "مورد أ", purchaseInvoiceRef: "INV-AUG-1", note: "" },
      { id: "jul", receivedAt: "2026-07-04T10:00:00.000Z", quantity: 2, remainingQuantity: 2, purchasePrice: 4, expiryDate: "", supplierName: "مورد أ", purchaseInvoiceRef: "INV-JUL-1", note: "" },
      { id: "aug-b", receivedAt: "2026-08-05T10:00:00.000Z", quantity: 1, remainingQuantity: 1, purchasePrice: 5, expiryDate: "", supplierName: "مورد ب", note: "" },
    ] }];
    expect(getSupplierPurchaseReport(products, "2026-08-01", "2026-08-31").groups[0]?.entries[0]).toMatchObject({ invoiceRef: "INV-AUG-1" });
    expect(getSupplierPurchaseComparison(products, "2026-08")).toMatchObject({ previousMonth: "2026-07", currentNet: 17, previousNet: 8, difference: 9, groups: [{ supplierName: "مورد ب", currentNet: 5, previousNet: 0, difference: 5 }, { supplierName: "مورد أ", currentNet: 12, previousNet: 8, difference: 4 }] });
  });

  it("يتوقع الطلب وخطر النفاد وتوصية الشراء والسيولة من بيانات محلية", () => {
    const products = [{ id: "milk", name: "حليب", sku: "M-1", quantity: 3, lowStockAt: 2, purchasePrice: 2, supplierName: "مورد أ" }, { id: "rice", name: "أرز", sku: "R-1", quantity: 20, lowStockAt: 4, purchasePrice: 3, supplierName: "مورد ب" }];
    const sales = [
      { createdAt: "2026-08-23T10:00:00.000Z", paymentMethod: "cash" as const, total: 10, items: [{ productId: "milk", quantity: 4 }] },
      { createdAt: "2026-08-21T10:00:00.000Z", paymentMethod: "cash" as const, total: 10, items: [{ productId: "milk", quantity: 3 }] },
      { createdAt: "2026-08-15T10:00:00.000Z", paymentMethod: "cash" as const, total: 10, items: [{ productId: "milk", quantity: 1 }] },
    ];
    const insights = getProductDemandInsights(products, sales, new Date("2026-08-24T12:00:00.000Z"));
    expect(insights[0]).toMatchObject({ productId: "milk", risk: "urgent", demandTrend: "rising", recentUnits: 7, priorUnits: 1, recommendedOrderQuantity: 11, estimatedOrderCost: 22 });
    expect(getPurchaseRecommendations(insights)).toMatchObject([{ supplierName: "مورد أ", units: 11, estimatedCost: 22, urgentItems: 1 }]);
    expect(getCashFlowForecast(sales, [{ amount: 4, spentAt: "2026-08-22T12:00:00.000Z" }], [{ amount: 6, collectedAt: "2026-08-23T12:00:00.000Z" }], new Date("2026-08-24T12:00:00.000Z"), 7)).toMatchObject({ horizonDays: 7, projectedIncome: 18, projectedExpenses: 2, projectedNet: 16, signal: "positive" });
  });

  it("يتابع هدف المبيعات ويحفظ فروق الجرد ويمنع إرجاع البيع غير الآمن", () => {
    expect(getDailyGoalProgress({ date: "2026-08-24", target: 100, setAt: "2026-08-24T08:00:00.000Z" }, 125)).toMatchObject({ active: true, achievement: 125, remaining: 0, met: true });
    const stocktake = createStocktakeRecord({ id: "stock-1", productId: "p-1", productName: "حليب", sku: "M-1", recordedQuantity: 8, actualQuantity: 5, purchasePrice: 2, recordedAt: "2026-08-24T09:00:00.000Z", note: "عدّ رفوف" });
    expect(stocktake).toMatchObject({ difference: -3, valueDifference: -6, note: "عدّ رفوف" });
    expect(getStocktakeRecordSummary([stocktake, { ...stocktake, id: "stock-2", difference: 2, valueDifference: 4 }])).toMatchObject({ count: 2, shortageUnits: 3, surplusUnits: 2, shortageValue: 6, surplusValue: 4 });
    const cashSale = { id: "sale-12345", total: 12, paymentMethod: "cash" as const, items: [{ productId: "p-1", quantity: 2 }] };
    expect(getSaleReturnEligibility(cashSale, [cashSale], [])).toMatchObject({ allowed: true });
    expect(getSaleReturnEligibility(cashSale, [cashSale, { ...cashSale, id: "return-1", total: -12, isReturn: true, returnOfSaleId: "sale-12345", items: [{ productId: "p-1", quantity: -2 }] }], [])).toMatchObject({ allowed: false });
    const creditSale = { ...cashSale, id: "sale-54321", paymentMethod: "credit" as const };
    expect(getSaleReturnEligibility(creditSale, [creditSale], [{ note: "فاتورة رقم 54321", paid: 1 }])).toMatchObject({ allowed: false });
  });

  it("يعتمد الجرد الجماعي ويحسب المتبقي للإرجاع الجزئي وهدف الشهر محليًا", () => {
    const bulkRecords = createBulkStocktakeRecords([
      { productId: "p-1", productName: "حليب", sku: "M-1", recordedQuantity: 8, actualQuantity: 6, purchasePrice: 2 },
      { productId: "p-2", productName: "أرز", sku: "R-1", recordedQuantity: 3, actualQuantity: 5, purchasePrice: 4 },
    ], "bulk-1", "2026-08-24T10:00:00.000Z", "جرد نهاية الأسبوع");
    expect(getBulkStocktakeSummary(bulkRecords)).toMatchObject({ reviewedProducts: 2, adjustedProducts: 2, shortageUnits: 2, surplusUnits: 2, shortageValue: 4, surplusValue: 8 });
    expect(getMonthlyGoalProgress({ month: "2026-08", target: 1000, setAt: "2026-08-01T08:00:00.000Z" }, 850)).toMatchObject({ active: true, achievement: 85, remaining: 150, met: false });
    const sale = { id: "sale-partial", total: 20, paymentMethod: "cash" as const, items: [{ productId: "p-1", quantity: 3 }, { productId: "p-2", quantity: 1 }] };
    const partialReturn = { id: "return-partial", total: -5, paymentMethod: "cash" as const, isReturn: true, returnOfSaleId: "sale-partial", items: [{ productId: "p-1", quantity: -1 }] };
    expect(getSaleReturnableItems(sale, [sale, partialReturn])).toEqual([{ productId: "p-1", soldQuantity: 3, returnedQuantity: 1, remainingQuantity: 2 }, { productId: "p-2", soldQuantity: 1, returnedQuantity: 0, remainingQuantity: 1 }]);
    expect(getSaleReturnEligibility(sale, [sale, partialReturn], [])).toMatchObject({ allowed: true });
  });

  it("يحسب ربحية الصنف بعد الخصم والإرجاع ويتحقق من صيغة رمز القفل", () => {
    const report = getProductProfitability([
      { createdAt: "2026-08-20T10:00:00.000Z", total: 18, discountAmount: 2, items: [{ productId: "p-1", name: "حليب", quantity: 2, price: 10, cost: 6 }] },
      { createdAt: "2026-08-22T10:00:00.000Z", total: -9, discountAmount: -1, items: [{ productId: "p-1", name: "حليب", quantity: -1, price: 10, cost: 6 }] },
      { createdAt: "2026-07-22T10:00:00.000Z", total: 100, items: [{ productId: "p-1", name: "حليب", quantity: 10, price: 10, cost: 6 }] },
    ], "2026-08");
    expect(report.entries).toMatchObject([{ productId: "p-1", units: 1, grossRevenue: 10, discounts: 1, netRevenue: 9, costOfGoods: 6, profit: 3, marginPercent: 33.33333333333333, transactionCount: 2 }]);
    expect(report.totals).toMatchObject({ netRevenue: 9, profit: 3 });
    expect(isValidLocalPin("1234")).toBe(true);
    expect(isValidLocalPin("12a4")).toBe(false);
    expect(isValidLocalPin("123")).toBe(false);
  });

  it("يطبق أفضل عرض كمية ويجمع كشف الزبون وجرد الفئات محليًا", () => {
    expect(getBestQuantityOffer([{ minimumQuantity: 2, discountPercent: 5 }, { minimumQuantity: 4, discountPercent: 10 }], 4)).toEqual({ minimumQuantity: 4, discountPercent: 10 });
    expect(getCartQuantityOfferSummary([{ id: "p-1", name: "حليب", salePrice: 10, cartQuantity: 4, quantityOffers: [{ minimumQuantity: 3, discountPercent: 10 }] }])).toMatchObject({ discountAmount: 4, applied: [{ productId: "p-1", discountPercent: 10, discountAmount: 4 }] });
    const statement = getCustomerStatement("أحمد", [
      { id: "sale-1", createdAt: "2026-08-20T10:00:00.000Z", total: 20, paymentMethod: "credit" as const, customerName: "أحمد" },
      { id: "return-1", createdAt: "2026-08-21T10:00:00.000Z", total: -5, paymentMethod: "credit" as const, customerName: "أحمد", isReturn: true, returnOfSaleId: "sale-1", returnReason: "تالف" },
    ], [{ id: "collection-1", customerName: "أحمد", amount: 7, collectedAt: "2026-08-22T10:00:00.000Z" }]);
    expect(statement).toMatchObject({ invoiced: 20, returned: 5, collected: 7, balance: 8, entries: [{ type: "فاتورة آجل", balance: 20 }, { type: "إرجاع بيع", balance: 15 }, { type: "تحصيل", balance: 8 }] });
    expect(getInventoryCategorySummary([{ id: "p-1", category: "ألبان", quantity: 3, lowStockAt: 5, purchasePrice: 2, salePrice: 4 }, { id: "p-2", category: "ألبان", quantity: 6, lowStockAt: 2, purchasePrice: 1, salePrice: 2 }, { id: "p-3", category: "", quantity: 2, lowStockAt: 2, purchasePrice: 3, salePrice: 5 }])).toMatchObject([{ category: "ألبان", productCount: 2, units: 9, purchaseValue: 12, saleValue: 24, lowStockCount: 1 }, { category: "غير مصنف", productCount: 1, units: 2, purchaseValue: 6, saleValue: 10, lowStockCount: 1 }]);
  });

  it("يمنع تجاوز ائتمان الزبون ويحترم مدة عرض الكمية ويجمع مبيعات الموظفين", () => {
    expect(getCustomerCreditStatus("سالم", { "سالم": 100 }, [{ customerName: "سالم", amount: 70, paid: 10 }], 35)).toMatchObject({ outstanding: 60, projected: 95, warning: true, blocked: false });
    expect(getCustomerCreditStatus("سالم", { "سالم": 100 }, [{ customerName: "سالم", amount: 70, paid: 10 }], 45)).toMatchObject({ projected: 105, blocked: true });
    expect(getBestQuantityOffer([{ minimumQuantity: 2, discountPercent: 10, startDate: "2026-08-20", endDate: "2026-08-25" }], 2, "2026-08-24")).toMatchObject({ discountPercent: 10 });
    expect(getBestQuantityOffer([{ minimumQuantity: 2, discountPercent: 10, startDate: "2026-08-20", endDate: "2026-08-25" }], 2, "2026-08-26")).toBeUndefined();
    expect(getStaffSalesReport([{ createdAt: "2026-08-20T10:00:00.000Z", total: 30, profit: 8, staffMemberId: "staff-1", staffMemberName: "مريم" }, { createdAt: "2026-08-21T10:00:00.000Z", total: -5, profit: -2, staffMemberId: "staff-1", staffMemberName: "مريم", isReturn: true }, { createdAt: "2026-08-22T10:00:00.000Z", total: 20, profit: 4, staffMemberId: "staff-2", staffMemberName: "سالم" }], "2026-08")).toMatchObject({ entries: [{ staffMemberName: "مريم", invoices: 1, returns: 1, sales: 25, profit: 6 }, { staffMemberName: "سالم", invoices: 1, returns: 0, sales: 20, profit: 4 }], totals: { invoices: 2, returns: 1, sales: 45, profit: 10 } });
  });

  it("يحفظ جولة باركود مؤقتة ويزيد العدّ ويعرض الأصناف غير المعدودة والفروقات", () => {
    const products = [{ id: "p-1", quantity: 5, purchasePrice: 2 }, { id: "p-2", quantity: 3, purchasePrice: 4 }];
    const draft = createBarcodeStocktakeDraft("run-1", "2026-08-24T10:00:00.000Z");
    expect(draft).toMatchObject({ id: "run-1", note: "جرد سريع بالباركود", counts: {} });
    const counts = incrementBarcodeStocktakeCount(incrementBarcodeStocktakeCount(draft.counts, "p-1"), "p-1");
    expect(counts).toEqual({ "p-1": 2 });
    expect(normaliseBarcodeStocktakeCounts({ "p-1": 2.8, "p-2": -1, "missing": 9 }, products.map((product) => product.id))).toEqual({ "p-1": 2 });
    expect(getBarcodeStocktakeProgress(products, { "p-1": 2, "p-2": 3 })).toMatchObject({ countedProducts: 2, uncountedProducts: 0, scannedUnits: 5, differences: 1, completed: true, entries: [{ id: "p-1", actualQuantity: 2, difference: -3, valueDifference: -6 }, { id: "p-2", actualQuantity: 3, difference: 0 }] });
  });

  it("يلتقط قارئ الباركود الخارجي عند Enter ويقارن آخر جولتي جرد", () => {
    let buffer = { value: "", lastKeyAt: 0 };
    for (const [index, key] of ["T", "-", "0", "0", "1"].entries()) buffer = captureExternalBarcodeKey(buffer, key, 1_000 + index * 30).buffer;
    expect(captureExternalBarcodeKey(buffer, "Enter", 1_200)).toMatchObject({ barcode: "T-001", buffer: { value: "" } });
    expect(captureExternalBarcodeKey({ value: "OLD", lastKeyAt: 1_000 }, "N", 1_400).buffer).toMatchObject({ value: "N" });
    const previous = createBulkStocktakeRecords([{ productId: "p-1", productName: "حليب", sku: "T-001", recordedQuantity: 5, actualQuantity: 3, purchasePrice: 2 }], "run-old", "2026-08-20T10:00:00.000Z", "جرد سابق");
    const current = createBulkStocktakeRecords([{ productId: "p-1", productName: "حليب", sku: "T-001", recordedQuantity: 3, actualQuantity: 3, purchasePrice: 2 }], "run-new", "2026-08-24T10:00:00.000Z", "جرد حالي");
    expect(getStocktakeRunComparison([...previous, ...current])).toMatchObject({ current: { runId: "run-new", adjustedProducts: 0 }, previous: { runId: "run-old", adjustedProducts: 1, shortageValue: 4 }, adjustedProductChange: -1, shortageValueChange: -4 });
  });

  it("يحسب سلة الإرجاع بعد خصم الفاتورة ويحد الكمية بالمتاح", () => {
    const sale = { discountAmount: 4, items: [{ productId: "p-1", name: "حليب", quantity: 2, price: 10, cost: 6 }, { productId: "p-2", name: "ماء", quantity: 2, price: 5, cost: 2 }] };
    expect(clampReturnCartQuantity(1, 3, 2)).toBe(2);
    expect(clampReturnCartQuantity(1, -4, 2)).toBe(0);
    expect(getReturnCartTotal(sale, [{ ...sale.items[0], quantity: 1 }])).toBe(8.666666666666666);
  });

  it("يبحث في الفواتير القابلة للإرجاع ويبني صفوف إيصال الإرجاع بأمان", () => {
    const sales = [{ id: "sale-ABC12", total: 20, customerName: "سالم" }, { id: "sale-XYZ99", total: 15, customerName: "مريم" }, { id: "return-123", total: -5, isReturn: true, customerName: "سالم" }];
    expect(searchReturnableSales(sales, "سالم")).toEqual([sales[0]]);
    expect(searchReturnableSales(sales, "XYZ99")).toEqual([sales[1]]);
    expect(buildReturnReceiptRows({ id: "return-1", createdAt: "2026-08-24", total: -10, items: [{ name: "حليب <كبير>", quantity: -1, price: 10 }] })).toContain("حليب &lt;كبير&gt;");
  });

  it("يصفّي الإرجاعات ويحسب نسبة الإرجاع للصنف من الوحدات المباعة", () => {
    const returns = [{ id: "return-1", isReturn: true, createdAt: "2026-08-10T10:00:00.000Z", returnReason: "خطأ في الفاتورة" }, { id: "return-2", isReturn: true, createdAt: "2026-08-20T10:00:00.000Z", returnReason: "إرجاع الزبون" }, { id: "sale-1", createdAt: "2026-08-20T10:00:00.000Z" }];
    expect(filterReturnSales(returns, { fromDate: "2026-08-15", reason: "إرجاع الزبون" }).map((sale) => sale.id)).toEqual(["return-2"]);
    const report = getProductProfitability([{ createdAt: "2026-08-01", total: 50, items: [{ productId: "p-1", name: "شاي", quantity: 5, price: 10, cost: 6 }] }, { createdAt: "2026-08-02", total: -20, discountAmount: 0, items: [{ productId: "p-1", name: "شاي", quantity: -2, price: 10, cost: 6 }] }]);
    expect(report.entries[0]).toMatchObject({ soldUnits: 5, returnedUnits: 2, returnRatePercent: 40, units: 3 });
  });

  it("يلخص أسباب الإرجاع ويقارن الأشهر وينبه عن النسب المرتفعة", () => {
    const sales = [{ isReturn: true, createdAt: "2026-08-10T10:00:00.000Z", total: -20, returnReason: "خطأ في الفاتورة", items: [{ quantity: -2 }] }, { isReturn: true, createdAt: "2026-08-15T10:00:00.000Z", total: -10, returnReason: "خطأ في الفاتورة", items: [{ quantity: -1 }] }, { isReturn: true, createdAt: "2026-07-10T10:00:00.000Z", total: -5, returnReason: "إرجاع الزبون", items: [{ quantity: -1 }] }];
    expect(getReturnReasonSummary(sales)[0]).toMatchObject({ reason: "خطأ في الفاتورة", receipts: 2, units: 3, value: 30 });
    expect(getMonthlyReturnComparison(sales, "2026-08")).toMatchObject({ previousMonth: "2026-07", current: { receipts: 2, value: 30 }, previous: { receipts: 1, value: 5 }, receiptChange: 1, valueChange: 25 });
    const profitability = [{ productId: "p-1", productName: "شاي", soldUnits: 10, returnedUnits: 2, returnRatePercent: 20 }, { productId: "p-2", productName: "ماء", soldUnits: 10, returnedUnits: 0, returnRatePercent: 0 }];
    expect(getHighReturnRateProducts(profitability)).toMatchObject([{ productId: "p-1" }]);
    expect(getHighReturnRateProducts(profitability, 25)).toEqual([]);
  });

  it("يجمع إرجاعات الشهر حسب الموظف دون افتراض اسم للفاتورة غير المسندة", () => {
    const report = getStaffReturnsReport([
      { createdAt: "2026-08-10T10:00:00.000Z", isReturn: true, total: -12, staffMemberId: "staff-1", staffMemberName: "مريم", items: [{ quantity: -2 }] },
      { createdAt: "2026-08-12T10:00:00.000Z", isReturn: true, total: -5, staffMemberId: "staff-1", staffMemberName: "مريم", items: [{ quantity: -1 }] },
      { createdAt: "2026-08-13T10:00:00.000Z", isReturn: true, total: -7, items: [{ quantity: -1 }] },
      { createdAt: "2026-07-13T10:00:00.000Z", isReturn: true, total: -99, staffMemberName: "قديم", items: [{ quantity: -9 }] },
      { createdAt: "2026-08-14T10:00:00.000Z", total: 20, staffMemberName: "مريم", items: [{ quantity: 2 }] },
    ], "2026-08");
    expect(report).toMatchObject({ entries: [{ staffMemberName: "مريم", receipts: 2, units: 3, value: 17 }, { staffMemberName: "غير محدد", receipts: 1, units: 1, value: 7 }], totals: { receipts: 3, units: 4, value: 24 } });
  });

  it("يعلق السلة محليًا ويستأنفها وفق الكميات الحالية دون الاحتفاظ بصنف غير متاح", () => {
    const draft = createSuspendedSaleDraft({ id: "hold-1", createdAt: "2026-08-24T12:00:00.000Z", label: "زبون التوصيل", items: [{ id: "p-1", cartQuantity: 3 }, { id: "p-2", cartQuantity: 1 }], paymentMethod: "credit", customerName: "سالم", customerPhone: "0910000000", customerCategoryId: "regular", staffMemberId: "staff-1", discountPercent: 7.5, note: "بدون أكياس", orderReference: "W-204" });
    expect(draft).toMatchObject({ label: "زبون التوصيل", items: [{ productId: "p-1", quantity: 3 }, { productId: "p-2", quantity: 1 }], paymentMethod: "credit", discountPercent: 7.5, note: "بدون أكياس", orderReference: "W-204" });
    expect(normaliseSuspendedSaleDrafts([{ ...draft }, { id: "bad", createdAt: "", items: [] }])).toEqual([draft]);
    expect(restoreSuspendedCartItems([{ id: "p-1", quantity: 2, name: "حليب" }, { id: "p-2", quantity: 0, name: "ماء" }], draft)).toMatchObject({ items: [{ id: "p-1", cartQuantity: 2 }], skipped: 1 });
    expect(normaliseFavoriteProductIds(["p-1", "p-1", "missing"], [{ id: "p-1" }, { id: "p-2" }])).toEqual(["p-1"]);
    const products = [{ id: "p-1", name: "حليب", sku: "M-1", category: "ألبان" }, { id: "p-2", name: "أرز", sku: "R-1", category: "مواد جافة" }, { id: "p-3", name: "ماء", sku: "W-1", category: "" }];
    expect(getQuickSaleCategories(products)).toEqual(["ألبان", "غير مصنف", "مواد جافة"]);
    expect(filterQuickSaleProducts(products, "R-1", "مواد جافة").map((product) => product.id)).toEqual(["p-2"]);
    expect(sortQuickSaleProducts([{ id: "p-1", name: "حليب", salePrice: 4 }, { id: "p-2", name: "أرز", salePrice: 8 }], [{ items: [{ productId: "p-1", quantity: 3 }] }, { items: [{ productId: "p-2", quantity: 5 }] }, { isReturn: true, items: [{ productId: "p-2", quantity: 1 }] }], "popular").map((product) => product.id)).toEqual(["p-2", "p-1"]);
  });

  it("يفصل ملخص طرق الدفع اليومي بين مبيعات اليوم وإرجاعاتها", () => {
    const rows = getDailyPaymentSummary([
      { createdAt: "2026-08-24T08:00:00.000Z", paymentMethod: "cash", total: 30 },
      { createdAt: "2026-08-24T09:00:00.000Z", paymentMethod: "cash", total: -5, isReturn: true },
      { createdAt: "2026-08-24T10:00:00.000Z", paymentMethod: "credit", total: 20 },
      { createdAt: "2026-08-24T11:00:00.000Z", paymentMethod: "card", total: 14 },
      { createdAt: "2026-08-24T12:00:00.000Z", paymentMethod: "transfer", total: 16 },
      { createdAt: "2026-08-23T10:00:00.000Z", paymentMethod: "cash", total: 99 },
    ], "2026-08-24");
    expect(rows).toEqual([
      { paymentMethod: "cash", label: "نقدًا", saleReceipts: 1, returnReceipts: 1, grossSales: 30, returnedValue: 5, netSales: 25 },
      { paymentMethod: "card", label: "بطاقة مصرفية", saleReceipts: 1, returnReceipts: 0, grossSales: 14, returnedValue: 0, netSales: 14 },
      { paymentMethod: "transfer", label: "تحويل مصرفي", saleReceipts: 1, returnReceipts: 0, grossSales: 16, returnedValue: 0, netSales: 16 },
      { paymentMethod: "credit", label: "آجل / ذمة", saleReceipts: 1, returnReceipts: 0, grossSales: 20, returnedValue: 0, netSales: 20 },
    ]);
    expect(getDailyPaymentSummaryTotals(rows)).toEqual({ saleReceipts: 4, returnReceipts: 1, grossSales: 80, returnedValue: 5, netSales: 75 });
  });

  it("يمنع الخصم الذي يخفض هامش الصنف دون الحد المحدد", () => {
    expect(getMinimumMarginViolations([{ id: "p-1", name: "حليب", cartQuantity: 2, salePrice: 10, purchasePrice: 7, minimumMarginPercent: 25 }], 2)).toMatchObject([{ productId: "p-1", actualMarginPercent: 22.22222222222222 }]);
    expect(getMinimumMarginViolations([{ id: "p-1", name: "حليب", cartQuantity: 1, salePrice: 10, purchasePrice: 7, minimumMarginPercent: 25 }], 0)).toEqual([]);
  });

  it("يجمع مبيعات الفئات ويعيد تجهيز الفاتورة بالمتاح حاليًا", () => {
    const report = getCategorySalesReport([
      { discountAmount: 2, items: [{ productId: "p-1", name: "حليب", category: "ألبان", quantity: 2, price: 10, cost: 6 }] },
      { isReturn: true, items: [{ productId: "p-1", name: "حليب", category: "ألبان", quantity: 1, price: 10, cost: 6 }] },
    ], [{ id: "p-1", category: "ألبان" }]);
    expect(report).toMatchObject({ entries: [{ category: "ألبان", soldUnits: 2, returnedUnits: 1, netUnits: 1, revenue: 8, cost: 6, profit: 2 }] });
    expect(rebuildRepeatSaleCart([{ id: "p-1", quantity: 1, name: "حليب" }, { id: "p-2", quantity: 0, name: "ماء" }], { items: [{ productId: "p-1", quantity: 3 }, { productId: "p-2", quantity: 1 }] })).toMatchObject({ items: [{ id: "p-1", cartQuantity: 1 }], skipped: 1 });
  });

  it("يحسب الحجز القابل للتسجيل ورصيد العبوات وبدائل الصنف المتاحة", () => {
    const reservations = [{ productId: "p-1", quantity: 2 }, { productId: "p-1", quantity: 1 }, { productId: "p-2", quantity: 4 }];
    expect(getReservedQuantity(reservations, "p-1")).toBe(3);
    expect(getReservableQuantity(5, reservations, "p-1")).toBe(2);
    expect(getContainerBalances([{ customerName: "أحمد", containerName: "صندوق ماء", quantity: 3, direction: "out" }, { customerName: "أحمد", containerName: "صندوق ماء", quantity: 1, direction: "in" }, { customerName: "سالم", containerName: "قارورة غاز", quantity: 1, direction: "out" }])).toEqual([{ customerName: "أحمد", containerName: "صندوق ماء", quantity: 2 }, { customerName: "سالم", containerName: "قارورة غاز", quantity: 1 }]);
    expect(getAvailableAlternatives({ alternativeProductIds: ["p-2", "p-3"] }, [{ id: "p-1", quantity: 0 }, { id: "p-2", quantity: 2 }, { id: "p-3", quantity: 0 }]).map((entry) => entry.id)).toEqual(["p-2"]);
  });

  it("يفرز الحجوزات المنتهية ويجمع حركة العبوات للشهر", () => {
    expect(getReservationDueStatus([{ expiresOn: "2026-08-23" }, { expiresOn: "2026-08-24" }, { expiresOn: "2026-08-25" }, {}], "2026-08-24")).toMatchObject({ overdue: [{ expiresOn: "2026-08-23" }], dueToday: [{ expiresOn: "2026-08-24" }] });
    expect(getMonthlyContainerReport([{ customerName: "أحمد", containerName: "صندوق ماء", quantity: 4, direction: "out", createdAt: "2026-08-10T10:00:00.000Z" }, { customerName: "أحمد", containerName: "صندوق ماء", quantity: 1, direction: "in", createdAt: "2026-08-12T10:00:00.000Z" }, { customerName: "سالم", containerName: "قارورة غاز", quantity: 2, direction: "out", createdAt: "2026-07-10T10:00:00.000Z" }], "2026-08")).toEqual({ rows: [{ containerName: "صندوق ماء", delivered: 4, returned: 1, netChange: 3 }], totals: { delivered: 4, returned: 1, netChange: 3 } });
  });

  it("يلخص الحجوزات الشهرية حسب الحالة مع الاحتفاظ بالوحدات", () => {
    const report = getMonthlyReservationReport([{ id: "r-1", createdAt: "2026-08-02T08:00:00.000Z", status: "active" as const, quantity: 2 }, { id: "r-2", createdAt: "2026-08-05T08:00:00.000Z", status: "fulfilled" as const, quantity: 4 }, { id: "r-3", createdAt: "2026-08-06T08:00:00.000Z", status: "cancelled" as const, quantity: 3 }, { id: "r-4", createdAt: "2026-07-31T08:00:00.000Z", status: "active" as const, quantity: 8 }], "2026-08");
    expect(report.summary).toEqual({ active: 1, fulfilled: 1, cancelled: 1, units: 9 });
    expect(report.reservations.map((reservation) => reservation.id)).toEqual(["r-3", "r-2", "r-1"]);
  });

  it("يتعرف على الصنف بالباركود دون حساسية للأحرف ويمنع كمية استلام غير صالحة", () => {
    const products = [{ id: "p-1", sku: "ABC-123" }, { id: "p-2", sku: "00991" }];
    expect(findProductByBarcode(products, " abc-123 ")).toEqual(products[0]);
    expect(findProductByBarcode(products, "غير موجود")).toBeUndefined();
    expect(clampReceivingQuantity(3.8)).toBe(3);
    expect(clampReceivingQuantity(-1)).toBe(0);
    expect(clampReceivingQuantity(Number.NaN)).toBe(0);
  });

  it("يطابق باركود الجرد عبر رمز بديل ويتجاوز اختلاف المسافات والشرطات", () => {
    const products = [{ id: "p-1", sku: "V9E-0846601", barcodeAliases: appendBarcodeAlias([], "802") }];
    expect(findProductByBarcode(products, "v9e 0846601")?.id).toBe("p-1");
    expect(findProductByBarcode(products, "802")?.id).toBe("p-1");
  });

  it("يبني رسالة مرئية صحيحة لنجاح الباركود والرمز غير المسجل والخطأ", () => {
    expect(getBarcodeFeedbackMessage("success", "ماء صغير")).toContain("ماء صغير");
    expect(getBarcodeFeedbackMessage("not-found")).toContain("غير مسجل");
    expect(getBarcodeFeedbackMessage("error")).toContain("تعذر");
  });

  it("يتجاهل الاهتزاز بأمان عندما يكون معطلاً", () => {
    expect(() => vibrateBarcodeFeedback("success", false)).not.toThrow();
  });

  it("يحافظ على سجل جلسة استلام محدود ويضبط أزرار الكمية ضمن الحدود", () => {
    const event = { id: "scan-1", kind: "success" as const, barcode: "SKU-1", productName: "حليب", createdAt: "2026-08-25T10:00:00.000Z" };
    expect(appendReceivingSessionEvent([event], { ...event, id: "scan-2" }, 1)).toEqual([{ ...event, id: "scan-2" }]);
    expect(adjustReceivingQuantity("", 5)).toBe(6);
    expect(adjustReceivingQuantity(1, -8)).toBe(1);
  });

  it("يبني ملصق باركود استقبال عربيًا دون تمرير اسم الصنف كـ HTML", () => {
    const html = buildReceivingBarcodeLabelHtml({ storeName: "محل <الندى>", productName: "حليب <طازج>", barcode: "M-1", price: "4.00 د.ل", barcodeSvg: '<svg data-code="M-1"></svg>' });
    expect(html).toContain("محل &lt;الندى&gt;");
    expect(html).toContain("حليب &lt;طازج&gt;");
    expect(html).toContain('data-code="M-1"');
  });

  it("يراجع فرق تكلفة الاستلام ويبني إيصالًا محليًا آمنًا للطباعة", () => {
    const review = getReceivingCostReview(4, 5);
    expect(review).toMatchObject({ difference: 1, percentChange: 25, direction: "up" });
    expect(getReceivingCostReview(0, 3)).toMatchObject({ percentChange: null, direction: "up" });
    const html = buildGoodsReceiptNoticeHtml({ storeName: "محل <الندى>", productName: "حليب <طازج>", barcode: "M-1", quantity: 2, unitCost: "5.00 د.ل", totalCost: "10.00 د.ل", supplierName: "مورد أ", invoiceRef: "INV-1", expiryDate: "2026-10-10", receivedAt: "25 أغسطس", internalReference: "R-100", costReview: review, staffMemberName: "أحمد البائع" });
    expect(html).toContain("محل &lt;الندى&gt;");
    expect(html).toContain("حليب &lt;طازج&gt;");
    expect(html).toContain("ارتفاع 1");
    expect(html).toContain("R-100");
    expect(html).toContain("أحمد البائع");
  });

  it("يجمع تغيرات تكلفة المورد من سجل الاستلام الشهري دون احتساب أول تكلفة", () => {
    const report = getSupplierCostChanges([
      { id: "r1", productId: "p1", productName: "حليب", supplierName: "المورد أ", purchasePrice: 4, receivedAt: "2026-07-30T08:00:00Z" },
      { id: "r2", productId: "p1", productName: "حليب", supplierName: "المورد أ", purchasePrice: 5, receivedAt: "2026-08-02T08:00:00Z" },
      { id: "r3", productId: "p2", productName: "ماء", supplierName: "المورد ب", purchasePrice: 2, receivedAt: "2026-08-03T08:00:00Z" },
      { id: "r4", productId: "p1", productName: "حليب", supplierName: "المورد أ", purchasePrice: 4.5, receivedAt: "2026-08-04T08:00:00Z" },
    ], "2026-08");
    expect(report.changes).toHaveLength(2);
    expect(report.changes[0]).toMatchObject({ productName: "حليب", difference: -0.5, percentChange: -10 });
    expect(report.suppliers[0]).toMatchObject({ supplierName: "المورد أ", increases: 1, decreases: 1 });
    const repeated = getRepeatedCostIncreaseProducts([...report.changes, { ...report.changes[0], receiptId: "r5", difference: 0.2, nextCost: 4.7, receivedAt: "2026-08-05T08:00:00Z" }]);
    expect(repeated[0]).toMatchObject({ productName: "حليب", increases: 2, totalIncrease: 1.2 });
    expect(getPreviousMonthKey("2026-01")).toBe("2025-12");
    const comparison = getSupplierMonthlyCostComparison([
      { id: "c1", productId: "p1", productName: "حليب", supplierName: "المورد أ", purchasePrice: 3, receivedAt: "2026-06-30T08:00:00Z" },
      { id: "c2", productId: "p1", productName: "حليب", supplierName: "المورد أ", purchasePrice: 4, receivedAt: "2026-07-03T08:00:00Z" },
      { id: "c3", productId: "p1", productName: "حليب", supplierName: "المورد أ", purchasePrice: 5, receivedAt: "2026-08-03T08:00:00Z" },
    ], "2026-08");
    expect(comparison.suppliers[0]).toMatchObject({ supplierName: "المورد أ", currentChanges: 1, previousChanges: 1, currentIncreases: 1 });
  });
});
