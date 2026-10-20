/**
 * فلسفة «دفتر الحي المعاصر»: واجهة عربية دافئة تشبه دفتر تشغيل منظم؛
 * مساحات ورقية، أخضر زيتوني، وأفعال تشغيل كبيرة وواضحة لصاحب المحل.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import "./posRedesign.css";
import "./erpInvoiceExtras.css";
import "./salesResponsiveOverride.css";
import "./cartOnlySales.css";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  BarChart3,
  BellRing,
  Camera,
  Bluetooth,
  Box,
  CalendarDays,
  CheckCircle2,
  Check,
  ChevronLeft,
  CircleAlert,
  CircleDollarSign,
  CreditCard,
  ClipboardList,
  Copy,
  Download,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MonitorSmartphone,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  Pencil,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  TrendingUp,
  Undo2,
  Upload,
  UserRound,
  WalletCards,
  HandCoins,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getLocalStorageFailureGuidance, readLocalRecord, writeLocalRecord } from "@/lib/localDb";
import { createLocalSyncOutbox, createSyncOperation, enqueueSyncOperation } from "@/lib/syncEngine";
import { validateStoreBackup } from "@/lib/backupValidation";
import { getPrintLayout } from "@/lib/printLayout";
import { inferThermalPaperWidth, makeDetectedPrinterProfile } from "@/lib/printerProfile";
import { getNearDepletionProducts, getRecurringCustomers, isBackupDueToday, isLocalProductImage } from "@/lib/operationalHelpers";
import { getReceiptLogoSizing, getReceiptLogoSource, isReceiptLogoDataUrl } from "@/lib/receiptLogo";
import { buildReceiptQrMarkup, buildReceiptQrPayload, makeReceiptQrDataUrl } from "@/lib/receiptQr";
import { activateDevice, canDeactivateDevice, createActivationPayload, createDeactivationPayload, createDeviceRequest, createOwnerProfile, decodeLocalAccessCode, encodeLocalAccessCode, getAccessExpiryNotice, isAccessExpired, isOwnerSetupPhone, type DeactivationPayload, type DeviceRequest, type LocalAccessProfile, verifyLocalAccessLogin } from "@/lib/localAccess";
import { getIssuedDeviceStatus, getIssuedDeviceVisualState, upsertIssuedDevice, type IssuedDeviceRecord } from "@/lib/issuedDevices";
import { addDeviceActivity, getDeviceActivityLabel, searchDeviceRecords, type DeviceActivityRecord } from "@/lib/deviceActivity";
import { readQrCodeFromImage } from "@/lib/qrImage";
import { fetchPublishedAppVersion, getUpdateStatus } from "@/lib/appUpdate";
import { buildReceiptPrintHtml } from "@/lib/receiptTemplate";
import { getThermalReceiptStyleOverrides } from "@/lib/thermalReceiptStyle";
import { buildSupportRequestMessage, isSupportButtonVisible, keepSupportRequests, LOCAL_SUPPORT_REQUESTS_KEY, LOCAL_SUPPORT_VISIBILITY_KEY, parseSupportRequests, SUPPORT_CATEGORY_LABELS, SUPPORT_STATUS_LABELS, SUPPORT_VISIBILITY_EVENT, type SupportCategory, type SupportRequest, type SupportRequestStatus } from "@/lib/customerSupport";
import { CASHIER_CART_IMAGE_SCALE_LABELS, CASHIER_CART_WIDTH_LABELS, CASHIER_FONT_SCALE_LABELS, CASHIER_SHORTCUT_ACTION_LABELS, CASHIER_SHORTCUT_OPTIONS, DEFAULT_CASHIER_SETTINGS, getDesktopInvoiceFunctionKey, LOCAL_CASHIER_SETTINGS_KEY, matchesCashierShortcut, parseCashierSettings, updateCashierShortcut, type CashierCartImageScale, type CashierCartWidth, type CashierFontScale, type CashierShortcut, type CashierShortcutAction } from "@/lib/cashierSettings";
import { cycleInvoiceTableScale, DEFAULT_INVOICE_TABLE_SETTINGS, INVOICE_TABLE_COLUMN_LABELS, INVOICE_TABLE_SCALE_LABELS, LOCAL_INVOICE_TABLE_SETTINGS_KEY, parseInvoiceTableSettings, type InvoiceTableColumn } from "@/lib/invoiceTableSettings";
import { getUsbBarcodeValue } from "@/lib/usbBarcodeScan";
import { addScannedProductToCart } from "@/lib/scannedCartQuantity";
import { buildReceiptPdfLines } from "@/lib/receiptPdf";
import { getDailyPaymentSummary, getDailyPaymentSummaryTotals } from "@/lib/dailyPaymentSummary";
import { getDigitalPaymentSummary } from "@/lib/digitalPaymentSummary";
import { filterReconciliationHistory } from "@/lib/reconciliationHistory";
import { getPaymentSplitsTotal, getPaymentSplitsLabel, normalizePaymentSplits, type PaymentSplit } from "@/lib/paymentSplits";
import { getMinimumMarginViolations } from "@/lib/profitProtection";
import { getCategorySalesReport } from "@/lib/categorySalesReport";
import { rebuildRepeatSaleCart } from "@/lib/repeatSale";
import { getAvailableAlternatives, getContainerBalances, getMonthlyContainerReport, getMonthlyReservationReport, getReservableQuantity, getReservedQuantity, getReservationDueStatus } from "@/lib/localShopExtras";
import { appendBarcodeAlias, clampReceivingQuantity, findProductByBarcode } from "@/lib/goodsReceiving";
import { getBarcodeFeedbackMessage, getCartBarcodeFeedbackMessage, playBarcodeFeedback, vibrateBarcodeFeedback, type BarcodeFeedbackKind } from "@/lib/barcodeFeedback";
import { adjustReceivingQuantity, appendReceivingSessionEvent, appendSuccessfulReceivingScan, buildReceivingBarcodeLabelHtml, filterSuccessfulReceivingScansAdvanced, getDailySuccessfulReceivingScans, getSuccessfulReceivingScanSummary, getSuccessfulReceivingSessionEvents, type ReceivingSessionEvent, type ReceivingSessionEventKind, type SuccessfulReceivingScan } from "@/lib/receivingExperience";
import { buildGoodsReceiptNoticeHtml, getReceivingCostReview } from "@/lib/receivingCostReview";
import { getReceivingBarcodeEmptyGuidance, getReceivingBarcodeReaderGuidance } from "@/lib/receivingScanGuidance";
import { getRepeatedCostIncreaseProducts, getSupplierCostChanges, getSupplierMonthlyCostComparison } from "@/lib/supplierCostChanges";
import { buildDebtReminderUrl, getStocktakeDifference, getWeeklySummary } from "@/lib/weeklyOperations";
import { getWeekComparison, isWeeklyStocktakeDue } from "@/lib/weeklyPlanning";
import { buildShelfLabelsPrintHtml, getShelfLabelQuantity, labelSizePresets, type LabelSize } from "@/lib/shelfLabels";
import "@/components/shelfLabelQuantities.css";
import { createCode128Svg, getPrintableBarcodeValue } from "@/lib/labelBarcode";
import { getInactiveProducts, getMonthlyReport } from "@/lib/monthlyOperations";
import { getExpiryStatus, getExpiringProducts, getSupplierPurchaseList } from "@/lib/inventoryPlanning";
import { buildSupplierPurchaseOrderGroups, getSupplierPurchaseOrderUnits } from "@/lib/supplierPurchaseOrder";
import { approveRequestedBatchWaste, cancelUnconsumedBatch, consumeBatchesFefo, getActiveBatches, getBatchHistory, getBatchRemainingTotal, getEarliestActiveExpiry, getExpirySortedBatchInventory, getExpiryWasteReport, getSupplierInventoryCostReport, isBatchEditable, reconcileBatchStocktake, requestExpiredBatchWaste, returnUnconsumedBatchToSupplier, updateUnconsumedBatch, type ProductBatch } from "@/lib/productBatches";
import { calculateSaleTotals } from "@/lib/saleTotals";
import { buildPriceChangeDrafts, isSettledDebt, type PriceChangeField } from "@/lib/storeHistory";
import { buildSupplierReturnNoticeHtml } from "@/lib/supplierReturnNotice";
import { getSupplierCreditStatus, getSupplierMonthlyStatement, type SupplierPayment } from "@/lib/supplierLedger";
import { CASH_DENOMINATIONS, getActiveCashDenominations, getCashClosingForDate, getCashDenominationTotal, getDailyCashSummary, getDailyExpenseLimitStatus, getMonthlyExpenseReport, type CashClosing, type CashDenominationCount, type CashExpense, type DebtCollection } from "@/lib/cashOperations";
import { getSupplierDueDateStatuses } from "@/lib/supplierDueDates";
import { getSupplierObligationReport, getSupplierPurchaseComparison, getSupplierPurchaseReport } from "@/lib/supplierPurchases";
import { filterPayrollRecords, getNextPayrollMonth, getPayrollNet, getPayrollOutstandingByStaff, getPayrollSummary, type PayrollChange, type PayrollPaymentMethod, type PayrollRecord } from "@/lib/payroll";
import { getOperatingExpenseReport } from "@/lib/operatingExpenseReport";
import { filterEmployeeAdvances, getEmployeeAdvanceTotal, isValidPayrollMonth, type EmployeeAdvance, type EmployeeAdvanceType } from "@/lib/employeeAdvances";
import { getEmployeeStatement } from "@/lib/employeeStatement";
import { getCashFlowForecast, getProductDemandInsights, getPurchaseRecommendations } from "@/lib/localAnalysis";
import { getLocalDecisionCenter } from "@/lib/localDecisionCenter";
import { createBulkStocktakeRecords, createStocktakeRecord, getBulkStocktakeSummary, getDailyGoalProgress, getMonthlyGoalProgress, getSaleReturnableItems, getSaleReturnEligibility, getStocktakeRecordSummary, getStocktakeRunComparison, type DailySalesGoal, type MonthlySalesGoal, type StocktakeRecord } from "@/lib/localOperations";
import { getProductProfitability } from "@/lib/productProfitability";
import { emptyLocalActionLockSettings, hashLocalPin, isMatchingLocalPin, isValidLocalPin, makeLocalLockSalt, type LocalActionLockSettings } from "@/lib/localActionLock";
import { getCartQuantityOfferSummary, type QuantityOffer } from "@/lib/quantityOffers";
import { getCustomerStatement } from "@/lib/customerStatement";
import { getPaymentMethodLabel, type PaymentMethod } from "@/lib/paymentMethods";
import { getCurrentStaffDailySummary } from "@/lib/currentStaffDailySummary";
import { getInventoryCategorySummary } from "@/lib/inventoryCategories";
import { getCustomerCreditStatus, normaliseCustomerCreditLimits } from "@/lib/customerCredit";
import { getStaffSalesReport } from "@/lib/staffSales";
import { getStaffReturnsReport } from "@/lib/staffReturns";
import { createBarcodeStocktakeDraft, getBarcodeStocktakeProgress, incrementBarcodeStocktakeCount, normaliseBarcodeStocktakeCounts, type BarcodeStocktakeDraft } from "@/lib/barcodeStocktake";
import { clampReturnCartQuantity, getReturnCartTotal } from "@/lib/saleReturnCart";
import { buildReturnReceiptRows, RETURN_REASON_PRESETS, searchReturnableSales } from "@/lib/returnEnhancements";
import { filterReturnSales, getReturnReasons } from "@/lib/returnAnalytics";
import { getHighReturnRateProducts, getMonthlyReturnComparison, getReturnReasonSummary } from "@/lib/advancedReturnAnalytics";
import { captureExternalBarcodeKey, type ExternalBarcodeBuffer } from "@/lib/externalBarcodeReader";
import { TRAINING_MODE_LABEL, getTrainingModeMessage, shouldPersistStoreChange } from "@/lib/trainingMode";
import { createSuspendedSaleDraft, filterQuickSaleProducts, getQuickSaleCategories, normaliseFavoriteProductIds, normaliseSuspendedSaleDrafts, restoreSuspendedCartItems, sortQuickSaleProducts, type SuspendedSaleDraft } from "@/lib/quickSale";
import { appendPriceLookupHistory, findPriceLookupProduct, type PriceLookupEntry } from "@/lib/priceLookup";
import BarcodeScanner from "@/components/BarcodeScanner";

type Page = "dashboard" | "sale" | "returns" | "closing" | "payroll" | "advances" | "inventory" | "debts" | "reports" | "settings";

const REMEMBERED_STAFF_MEMBER_KEY = "souqna-remembered-staff-member";
const readRememberedStaffMemberId = () => {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(REMEMBERED_STAFF_MEMBER_KEY) || ""; } catch { return ""; }
};
const rememberStaffMemberId = (id: string) => {
  try { if (id) window.localStorage.setItem(REMEMBERED_STAFF_MEMBER_KEY, id); else window.localStorage.removeItem(REMEMBERED_STAFF_MEMBER_KEY); } catch { /* التخزين المحلي قد يكون محظورًا في وضع الخصوصية */ }
};
type NotificationKind = "critical" | "warning" | "info";

type NotificationPreferences = {
  stock: boolean;
  debts: boolean;
  backup: boolean;
  cash: boolean;
  goals: boolean;
};

type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  page: Page;
};

type PrinterSettings = {
  paperWidth: "58" | "80" | "A4";
  deviceName: string;
  model: string;
  connection: "system" | "usb" | "bluetooth" | "network";
};

type StocktakeSettings = {
  weekday: number;
  lastCompletedAt: string;
};

type BluetoothCapableNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: { acceptAllDevices: boolean; optionalServices?: string[] }) => Promise<{ name?: string }>;
  };
};

type UsbCapableNavigator = Navigator & {
  usb?: {
    requestDevice: (options: { filters: Array<Record<string, never>> }) => Promise<{ productName?: string; vendorId?: number; productId?: number }>;
  };
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  imageDataUrl?: string;
  quantity: number;
  lowStockAt: number;
  purchasePrice: number;
  salePrice: number;
  barcodeAliases?: string[];
  shelfLocation?: string;
  supplierName?: string;
  expiryDate?: string;
  batches?: ProductBatch[];
  quantityOffers?: QuantityOffer[];
  minimumMarginPercent?: number;
  alternativeProductIds?: string[];
};

type CartItem = Product & { cartQuantity: number };

type CustomerCategory = {
  id: string;
  name: string;
  discountPercent: number;
};

type LocalStaffMember = {
  id: string;
  name: string;
};

type PaymentReconciliationRecord = {
  id: string;
  date: string;
  paymentMethod: "card" | "transfer";
  posTotal: number;
  bankStatementTotal: number;
  difference: number;
  note: string;
  reviewedAt: string;
};

type Sale = {
  id: string;
  createdAt: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number; cost: number; category?: string }>;
  total: number;
  profit: number;
  subtotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  quantityOfferDiscountAmount?: number;
  paymentMethod: PaymentMethod;
  paymentSplits?: PaymentSplit[];
  bankName?: string;
  posTerminalType?: string;
  customerName?: string;
  customerPhone?: string;
  customerCategoryId?: string;
  customerCategoryName?: string;
  staffMemberId?: string;
  staffMemberName?: string;
  employeePurchaseStaffMemberId?: string;
  employeePurchaseStaffMemberName?: string;
  employeePurchaseAdvanceId?: string;
  isReturn?: boolean;
  returnOfSaleId?: string;
  returnReason?: string;
  note?: string;
  orderReference?: string;
  costCenter?: string;
};

type Debt = {
  id: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  paid: number;
  createdAt: string;
  dueDate: string;
  note: string;
};

type ProductReservation = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  customerName: string;
  customerPhone?: string;
  note: string;
  createdAt: string;
  expiresOn?: string;
  status: "active" | "fulfilled" | "cancelled";
  resolvedAt?: string;
};

type ReturnableContainerEntry = {
  id: string;
  customerName: string;
  containerName: string;
  quantity: number;
  direction: "out" | "in";
  createdAt: string;
  note: string;
};

type GoodsReceipt = {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  purchasePrice: number;
  supplierName: string;
  expiryDate: string;
  purchaseInvoiceRef: string;
  receivedAt: string;
  note: string;
  staffMemberId?: string;
  staffMemberName?: string;
};

type PriceHistoryEntry = {
  id: string;
  productId: string;
  productName: string;
  field: PriceChangeField;
  previous: number;
  next: number;
  createdAt: string;
};

type StoreData = {
  products: Product[];
  sales: Sale[];
  debts: Debt[];
  priceHistory: PriceHistoryEntry[];
  supplierPayments: SupplierPayment[];
  cashExpenses: CashExpense[];
  payrollRecords: PayrollRecord[];
  payrollChanges: PayrollChange[];
  employeeAdvances: EmployeeAdvance[];
  employeeCreditLimits: Record<string, number>;
  cashClosings: CashClosing[];
  debtCollections: DebtCollection[];
  customerCategories: CustomerCategory[];
  customerCreditLimits: Record<string, number>;
  localStaff: LocalStaffMember[];
  dailySalesGoals: Record<string, DailySalesGoal>;
  monthlySalesGoals: Record<string, MonthlySalesGoal>;
  stocktakeRecords: StocktakeRecord[];
  barcodeStocktakeDraft: BarcodeStocktakeDraft | null;
  dailyExpenseLimit: number;
  supplierDueDates: Record<string, string>;
  returnRateAlertThreshold: number;
  favoriteProductIds: string[];
  suspendedSaleDrafts: SuspendedSaleDraft[];
  productReservations: ProductReservation[];
  returnableContainerEntries: ReturnableContainerEntry[];
  goodsReceipts: GoodsReceipt[];
  dailySuccessfulReceivingScans: SuccessfulReceivingScan[];
  priceLookupHistory: PriceLookupEntry[];
  paymentReconciliations: PaymentReconciliationRecord[];
  storeName: string;
  storePhone: string;
  receiptLogo: string;
  receiptQrContent: string;
  receiptTextSize: "small" | "normal" | "large";
  receiptPrintClarity: "standard" | "high" | "maximum";
  defaultDiscountPercent: number;
  initialized: boolean;
};

const normalizeCashDenominations = (value: unknown): CashDenominationCount[] => Array.isArray(value)
  ? value.filter((entry): entry is CashDenominationCount => Boolean(entry && typeof entry === "object" && Number.isFinite((entry as { denomination?: unknown }).denomination) && Number((entry as { denomination?: number }).denomination) > 0 && Number.isFinite((entry as { count?: unknown }).count) && Number((entry as { count?: number }).count) > 0)).map((entry) => ({ denomination: Number(entry.denomination), count: Math.floor(Number(entry.count)) }))
  : [];

const STORAGE_KEY = "souqna-local-store-v1";
const NOTIFICATION_SETTINGS_KEY = "souqna-notification-settings-v1";
const NOTIFICATION_READ_KEY = "souqna-read-notifications-v1";
const PRINTER_SETTINGS_KEY = "souqna-printer-settings-v1";
const BACKUP_EXPORTED_AT_KEY = "souqna-backup-exported-at-v1";
const STOCKTAKE_SETTINGS_KEY = "souqna-stocktake-settings-v1";
const SUPPLIER_CREDIT_LIMITS_KEY = "souqna-supplier-credit-limits-v1";
const BARCODE_FEEDBACK_SOUND_KEY = "souqna-barcode-feedback-sound-v1";
const BARCODE_FEEDBACK_VIBRATION_KEY = "souqna-barcode-feedback-vibration-v1";
const COST_INCREASE_ALERT_THRESHOLD_KEY = "souqna-cost-increase-alert-threshold-v1";
const LOCAL_ACTION_LOCK_KEY = "souqna-local-action-lock-v1";
const LOCAL_ACCESS_DEVICE_KEY = "souqna-local-access-device-v1";
const LOCAL_ACCESS_PROFILE_KEY = "souqna-local-access-profile-v1";
const LOCAL_ACCESS_SESSION_KEY = "souqna-local-access-session-v1";
const LOCAL_OWNER_BOOTSTRAP_KEY = "souqna-local-owner-bootstrap-v1";
const LOCAL_ISSUED_DEVICES_KEY = "souqna-local-issued-devices-v1";
const LOCAL_DEVICE_ACTIVITY_KEY = "souqna-local-device-activity-v1";
const LOCAL_ACCESS_DISABLED_KEY = "souqna-local-access-disabled-v1";
const LOCAL_ACCESS_DISABLED_REASON_KEY = "souqna-local-access-disabled-reason-v1";
const LOCAL_APP_VERSION_KEY = "souqna-local-app-version-v1";
const LOCAL_STORE_RECORD_KEY = "active-store";
const logoUrl = "/manus-storage/souqna-logo_8eb5e872.png";
const ledgerTextureUrl = "/manus-storage/souqna-ledger-texture_5ff659ed.jpg";
const counterImageUrl = "/manus-storage/souqna-store-counter_0b8a8486.jpg";
const receiptPatternUrl = "/manus-storage/souqna-receipt-pattern_1ca66f66.jpg";

type LocalDeviceIdentity = { deviceId: string; deviceProof: string; deviceSecret: string };

const readLocalAccessProfile = (): LocalAccessProfile | null => {
  try { const candidate = JSON.parse(localStorage.getItem(LOCAL_ACCESS_PROFILE_KEY) || "null") as LocalAccessProfile | null; return candidate && candidate.version === 1 && typeof candidate.username === "string" && typeof candidate.passwordHash === "string" && typeof candidate.deviceId === "string" ? candidate : null; } catch { return null; }
};

const readLocalDeviceIdentity = (): LocalDeviceIdentity | null => {
  try { const candidate = JSON.parse(localStorage.getItem(LOCAL_ACCESS_DEVICE_KEY) || "null") as LocalDeviceIdentity | null; return candidate && typeof candidate.deviceId === "string" && typeof candidate.deviceProof === "string" && typeof candidate.deviceSecret === "string" ? candidate : null; } catch { return null; }
};

const readIssuedDevices = (): IssuedDeviceRecord[] => {
  try { const candidate = JSON.parse(localStorage.getItem(LOCAL_ISSUED_DEVICES_KEY) || "[]"); return Array.isArray(candidate) ? candidate.filter((entry): entry is IssuedDeviceRecord => Boolean(entry && typeof entry.deviceId === "string" && typeof entry.deviceProof === "string" && typeof entry.username === "string" && typeof entry.expiresAt === "string" && typeof entry.issuedAt === "string")) : []; } catch { return []; }
};

const readDeviceActivity = (): DeviceActivityRecord[] => {
  try { const candidate = JSON.parse(localStorage.getItem(LOCAL_DEVICE_ACTIVITY_KEY) || "[]"); return Array.isArray(candidate) ? candidate.filter((entry): entry is DeviceActivityRecord => Boolean(entry && typeof entry.id === "string" && typeof entry.deviceId === "string" && typeof entry.username === "string" && typeof entry.action === "string" && typeof entry.createdAt === "string")) : []; } catch { return []; }
};

const emptyStoreData: StoreData = {
  products: [],
  sales: [],
  debts: [],
  priceHistory: [],
  supplierPayments: [],
  cashExpenses: [],
  payrollRecords: [],
  payrollChanges: [],
  employeeAdvances: [],
  employeeCreditLimits: {},
  cashClosings: [],
  debtCollections: [],
  customerCategories: [],
  customerCreditLimits: {},
  localStaff: [],
  dailySalesGoals: {},
  monthlySalesGoals: {},
  stocktakeRecords: [],
  barcodeStocktakeDraft: null,
  dailyExpenseLimit: 0,
  supplierDueDates: {},
  returnRateAlertThreshold: 10,
  favoriteProductIds: [],
  suspendedSaleDrafts: [],
  productReservations: [],
  returnableContainerEntries: [],
  goodsReceipts: [],
  dailySuccessfulReceivingScans: [],
  priceLookupHistory: [],
  paymentReconciliations: [],
  storeName: "محل جديد",
  storePhone: "",
  receiptLogo: "",
  receiptQrContent: "",
  receiptTextSize: "normal",
  receiptPrintClarity: "high",
  defaultDiscountPercent: 0,
  initialized: false,
};

const demoProductIds = new Set(["water", "milk", "juice", "biscuits", "rice"]);

const navItems: Array<{ id: Page; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "لوحة اليوم", icon: LayoutDashboard },
  { id: "sale", label: "بيع جديد", icon: ShoppingBag },
  { id: "returns", label: "إرجاع بيع", icon: Undo2 },
  { id: "closing", label: "إغلاق الوردية", icon: WalletCards },
  { id: "payroll", label: "رواتب الموظفين", icon: UserRound },
  { id: "advances", label: "السلف والعهد", icon: HandCoins },
  { id: "inventory", label: "المخزون", icon: Archive },
  { id: "debts", label: "دفتر الذمم", icon: WalletCards },
  { id: "reports", label: "التقارير", icon: BarChart3 },
];

const money = (value: number) => `${new Intl.NumberFormat("ar-LY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} د.ل`;
const compactMoney = (value: number) => new Intl.NumberFormat("ar-LY", { maximumFractionDigits: 0 }).format(value);
const todayKey = () => new Date().toISOString().slice(0, 10);
const isToday = (date: string) => date.slice(0, 10) === todayKey();
const isCurrentMonth = (date: string) => date.slice(0, 7) === new Date().toISOString().slice(0, 7);
const formatDate = (date: string) => new Intl.DateTimeFormat("ar-LY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character] ?? character));
const pickColumn = (row: Record<string, unknown>, keys: string[]) => keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== "");
const excelText = (value: unknown) => String(value ?? "").trim();
const excelNumber = (value: unknown) => Number(String(value ?? "").replace(",", ".").trim());

const readLocalActionLockSettings = (): LocalActionLockSettings => {
  try {
    const candidate = JSON.parse(localStorage.getItem(LOCAL_ACTION_LOCK_KEY) || "null") as Partial<LocalActionLockSettings> | null;
    return candidate && typeof candidate.enabled === "boolean" && typeof candidate.salt === "string" && typeof candidate.pinHash === "string" ? { enabled: candidate.enabled, salt: candidate.salt, pinHash: candidate.pinHash } : emptyLocalActionLockSettings;
  } catch {
    return emptyLocalActionLockSettings;
  }
};

function normalizeStore(input: Partial<StoreData> | null): StoreData {
  if (!input) return emptyStoreData;
  const realProducts = Array.isArray(input.products) ? input.products.filter((product) => !demoProductIds.has(product.id)).map((product) => ({ ...product, imageDataUrl: isLocalProductImage(product.imageDataUrl) ? product.imageDataUrl : undefined, supplierName: typeof product.supplierName === "string" ? product.supplierName.trim() : "", expiryDate: typeof product.expiryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(product.expiryDate) ? product.expiryDate : "", quantityOffers: Array.isArray(product.quantityOffers) ? product.quantityOffers.filter((offer): offer is QuantityOffer => Boolean(offer && Number.isFinite(offer.minimumQuantity) && Number(offer.minimumQuantity) >= 1 && Number.isFinite(offer.discountPercent) && Number(offer.discountPercent) > 0)).map((offer) => { const startDate = typeof offer.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(offer.startDate) ? offer.startDate : ""; const rawEndDate = typeof offer.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(offer.endDate) ? offer.endDate : ""; return { minimumQuantity: Math.max(1, Math.floor(Number(offer.minimumQuantity))), discountPercent: Math.min(100, Math.max(0, Number(offer.discountPercent))), startDate, endDate: rawEndDate && (!startDate || rawEndDate >= startDate) ? rawEndDate : "" }; }).sort((left, right) => left.minimumQuantity - right.minimumQuantity) : [], batches: Array.isArray(product.batches) ? product.batches.filter((batch): batch is ProductBatch => Boolean(batch && typeof batch.id === "string" && typeof batch.receivedAt === "string" && Number.isFinite(batch.quantity) && Number.isFinite(batch.remainingQuantity) && Number.isFinite(batch.purchasePrice) && typeof batch.expiryDate === "string" && typeof batch.supplierName === "string" && typeof batch.note === "string")).map((batch) => ({ ...batch, purchaseInvoiceRef: typeof batch.purchaseInvoiceRef === "string" ? batch.purchaseInvoiceRef.trim().slice(0, 100) : "", remainingQuantity: Math.max(0, batch.remainingQuantity) })) : [] })) : [];
  const productIds = new Set(realProducts.map((product) => product.id));
  const normalizedProducts = realProducts.map((product) => ({ ...product, barcodeAliases: Array.isArray(product.barcodeAliases) ? product.barcodeAliases.filter((barcode): barcode is string => typeof barcode === "string" && barcode.trim().length > 0).map((barcode) => barcode.trim().slice(0, 120)).filter((barcode, index, entries) => entries.findIndex((entry) => entry.toLocaleLowerCase("ar") === barcode.toLocaleLowerCase("ar")) === index).slice(0, 8) : [], alternativeProductIds: Array.isArray(product.alternativeProductIds) ? product.alternativeProductIds.filter((id): id is string => typeof id === "string" && id !== product.id && productIds.has(id)).slice(0, 8) : [] }));
  const realSales = Array.isArray(input.sales) ? input.sales
    .map((sale) => ({ ...sale, items: Array.isArray(sale.items) ? sale.items.filter((item) => !demoProductIds.has(item.productId)) : [] }))
    .filter((sale) => sale.items.length > 0) : [];
  return {
    products: normalizedProducts,
    sales: realSales,
    debts: Array.isArray(input.debts) ? input.debts : [],
    priceHistory: Array.isArray(input.priceHistory) ? input.priceHistory.filter((entry): entry is PriceHistoryEntry => Boolean(entry && typeof entry.productId === "string" && typeof entry.productName === "string" && (entry.field === "purchasePrice" || entry.field === "salePrice") && Number.isFinite(entry.previous) && Number.isFinite(entry.next) && typeof entry.createdAt === "string")) : [],
    supplierPayments: Array.isArray(input.supplierPayments) ? input.supplierPayments.filter((payment): payment is SupplierPayment => Boolean(payment && typeof payment.id === "string" && typeof payment.supplierName === "string" && Number.isFinite(payment.amount) && payment.amount > 0 && typeof payment.paidAt === "string" && typeof payment.note === "string")) : [],
    cashExpenses: Array.isArray(input.cashExpenses) ? input.cashExpenses.filter((expense): expense is CashExpense => Boolean(expense && typeof expense.id === "string" && Number.isFinite(expense.amount) && expense.amount > 0 && typeof expense.category === "string" && typeof expense.note === "string" && typeof expense.spentAt === "string")) : [],
    payrollRecords: Array.isArray(input.payrollRecords) ? input.payrollRecords.filter((record): record is PayrollRecord => Boolean(record && typeof record.id === "string" && typeof record.staffMemberId === "string" && typeof record.staffMemberName === "string" && /^\d{4}-\d{2}$/.test(record.month) && Number.isFinite(record.baseSalary) && Number.isFinite(record.advances) && Number.isFinite(record.deductions) && Number.isFinite(record.paidAmount) && (record.paymentMethod === "cash" || record.paymentMethod === "card" || record.paymentMethod === "transfer") && typeof record.note === "string" && typeof record.paidAt === "string")) : [],
    payrollChanges: Array.isArray(input.payrollChanges) ? input.payrollChanges.filter((change): change is PayrollChange => Boolean(change && typeof change.id === "string" && typeof change.payrollId === "string" && typeof change.staffMemberId === "string" && typeof change.staffMemberName === "string" && ["salary", "advance", "deduction", "payment"].includes(change.type) && Number.isFinite(change.amount) && change.amount >= 0 && typeof change.reason === "string" && typeof change.createdAt === "string")) : [],
    employeeAdvances: Array.isArray(input.employeeAdvances) ? input.employeeAdvances.filter((advance): advance is EmployeeAdvance => Boolean(advance && typeof advance.id === "string" && typeof advance.staffMemberId === "string" && typeof advance.staffMemberName === "string" && ["cash", "clothing", "goods", "employee_purchase"].includes(advance.type) && typeof advance.description === "string" && Number.isFinite(advance.amount) && advance.amount > 0 && /^\d{4}-\d{2}$/.test(advance.month) && typeof advance.createdAt === "string" && Number.isFinite(advance.settled) && advance.settled >= 0 && typeof advance.note === "string")) : [],
    employeeCreditLimits: Object.fromEntries(Object.entries(input.employeeCreditLimits ?? {}).filter(([staffMemberId, limit]) => typeof staffMemberId === "string" && staffMemberId && Number.isFinite(limit) && Number(limit) > 0).map(([staffMemberId, limit]) => [staffMemberId, Number(limit)])),
    cashClosings: Array.isArray(input.cashClosings) ? input.cashClosings.filter((closing): closing is CashClosing => Boolean(closing && typeof closing.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(closing.date) && Number.isFinite(closing.openingCash) && closing.openingCash >= 0 && Number.isFinite(closing.actualCash) && closing.actualCash >= 0 && typeof closing.note === "string" && typeof closing.closedAt === "string")).map((closing) => ({ ...closing, responsibleName: typeof closing.responsibleName === "string" ? closing.responsibleName.trim().slice(0, 80) : "", denominations: normalizeCashDenominations(closing.denominations) })) : [],
    debtCollections: Array.isArray(input.debtCollections) ? input.debtCollections.filter((collection): collection is DebtCollection => Boolean(collection && typeof collection.id === "string" && typeof collection.debtId === "string" && typeof collection.customerName === "string" && Number.isFinite(collection.amount) && collection.amount > 0 && typeof collection.collectedAt === "string" && typeof collection.note === "string")) : [],
    customerCategories: Array.isArray(input.customerCategories) ? input.customerCategories.filter((category): category is CustomerCategory => Boolean(category && typeof category.id === "string" && category.id.trim() && typeof category.name === "string" && category.name.trim() && Number.isFinite(category.discountPercent))).map((category) => ({ id: category.id, name: category.name.trim().slice(0, 60), discountPercent: Math.min(100, Math.max(0, Number(category.discountPercent))) })) : [],
    customerCreditLimits: normaliseCustomerCreditLimits(input.customerCreditLimits),
    localStaff: Array.isArray(input.localStaff) ? input.localStaff.filter((member): member is LocalStaffMember => Boolean(member && typeof member.id === "string" && member.id.trim() && typeof member.name === "string" && member.name.trim())).map((member) => ({ id: member.id, name: member.name.trim().slice(0, 60) })) : [],
    dailySalesGoals: Object.fromEntries(Object.entries(input.dailySalesGoals ?? {}).flatMap(([date, goal]) => {
      const candidate = goal as Partial<DailySalesGoal>;
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(candidate?.target) && Number(candidate.target) > 0 && typeof candidate.setAt === "string" ? [[date, { date, target: Number(candidate.target), setAt: candidate.setAt }]] : [];
    })),
    monthlySalesGoals: Object.fromEntries(Object.entries(input.monthlySalesGoals ?? {}).flatMap(([month, goal]) => {
      const candidate = goal as Partial<MonthlySalesGoal>;
      return /^\d{4}-\d{2}$/.test(month) && Number.isFinite(candidate?.target) && Number(candidate.target) > 0 && typeof candidate.setAt === "string" ? [[month, { month, target: Number(candidate.target), setAt: candidate.setAt }]] : [];
    })),
    stocktakeRecords: Array.isArray(input.stocktakeRecords) ? input.stocktakeRecords.filter((record): record is StocktakeRecord => Boolean(record && typeof record.id === "string" && typeof record.productId === "string" && typeof record.productName === "string" && typeof record.sku === "string" && Number.isFinite(record.recordedQuantity) && Number.isFinite(record.actualQuantity) && Number.isFinite(record.difference) && Number.isFinite(record.valueDifference) && typeof record.recordedAt === "string" && typeof record.note === "string")) : [],
    barcodeStocktakeDraft: input.barcodeStocktakeDraft && typeof input.barcodeStocktakeDraft === "object" && typeof input.barcodeStocktakeDraft.id === "string" && typeof input.barcodeStocktakeDraft.createdAt === "string" && typeof input.barcodeStocktakeDraft.updatedAt === "string" && typeof input.barcodeStocktakeDraft.note === "string" ? {
      id: input.barcodeStocktakeDraft.id,
      createdAt: input.barcodeStocktakeDraft.createdAt,
      updatedAt: input.barcodeStocktakeDraft.updatedAt,
      note: input.barcodeStocktakeDraft.note.trim().slice(0, 160) || "جرد سريع بالباركود",
      counts: normaliseBarcodeStocktakeCounts(input.barcodeStocktakeDraft.counts, realProducts.map((product) => product.id)),
    } : null,
    dailyExpenseLimit: Math.max(0, Number(input.dailyExpenseLimit) || 0),
    supplierDueDates: Object.fromEntries(Object.entries(input.supplierDueDates ?? {}).filter(([supplierName, dueDate]) => Boolean(supplierName.trim() && typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)))),
    returnRateAlertThreshold: Math.min(100, Math.max(1, Number(input.returnRateAlertThreshold) || 10)),
    favoriteProductIds: normaliseFavoriteProductIds(input.favoriteProductIds, normalizedProducts),
    suspendedSaleDrafts: normaliseSuspendedSaleDrafts(input.suspendedSaleDrafts),
    productReservations: Array.isArray(input.productReservations) ? input.productReservations.filter((entry): entry is ProductReservation => Boolean(entry && typeof entry.id === "string" && typeof entry.productId === "string" && productIds.has(entry.productId) && typeof entry.productName === "string" && Number.isFinite(entry.quantity) && Number(entry.quantity) > 0 && typeof entry.customerName === "string" && entry.customerName.trim() && typeof entry.note === "string" && typeof entry.createdAt === "string")).map((entry) => ({ ...entry, quantity: Math.floor(Number(entry.quantity)), customerName: entry.customerName.trim().slice(0, 80), customerPhone: typeof entry.customerPhone === "string" ? entry.customerPhone.trim().slice(0, 30) : "", note: entry.note.trim().slice(0, 180), expiresOn: typeof entry.expiresOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.expiresOn) ? entry.expiresOn : "", status: entry.status === "fulfilled" || entry.status === "cancelled" ? entry.status : "active", resolvedAt: typeof entry.resolvedAt === "string" ? entry.resolvedAt : "" })) : [],
    returnableContainerEntries: Array.isArray(input.returnableContainerEntries) ? input.returnableContainerEntries.filter((entry): entry is ReturnableContainerEntry => Boolean(entry && typeof entry.id === "string" && typeof entry.customerName === "string" && entry.customerName.trim() && typeof entry.containerName === "string" && entry.containerName.trim() && Number.isFinite(entry.quantity) && Number(entry.quantity) > 0 && (entry.direction === "out" || entry.direction === "in") && typeof entry.createdAt === "string" && typeof entry.note === "string")).map((entry) => ({ ...entry, customerName: entry.customerName.trim().slice(0, 80), containerName: entry.containerName.trim().slice(0, 60), quantity: Math.floor(Number(entry.quantity)), note: entry.note.trim().slice(0, 180) })) : [],
    goodsReceipts: Array.isArray(input.goodsReceipts) ? input.goodsReceipts.filter((entry): entry is GoodsReceipt => Boolean(entry && typeof entry.id === "string" && typeof entry.productId === "string" && productIds.has(entry.productId) && typeof entry.productName === "string" && typeof entry.barcode === "string" && Number.isFinite(entry.quantity) && Number(entry.quantity) > 0 && Number.isFinite(entry.purchasePrice) && Number(entry.purchasePrice) >= 0 && typeof entry.supplierName === "string" && typeof entry.expiryDate === "string" && typeof entry.purchaseInvoiceRef === "string" && typeof entry.receivedAt === "string" && typeof entry.note === "string")).map((entry) => ({ ...entry, quantity: Math.floor(Number(entry.quantity)), purchasePrice: Math.max(0, Number(entry.purchasePrice)), barcode: entry.barcode.trim().slice(0, 120), supplierName: entry.supplierName.trim().slice(0, 80), expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(entry.expiryDate) ? entry.expiryDate : "", purchaseInvoiceRef: entry.purchaseInvoiceRef.trim().slice(0, 100), note: entry.note.trim().slice(0, 180), staffMemberId: typeof entry.staffMemberId === "string" ? entry.staffMemberId.trim().slice(0, 80) : undefined, staffMemberName: typeof entry.staffMemberName === "string" ? entry.staffMemberName.trim().slice(0, 120) : undefined })) : [],
    dailySuccessfulReceivingScans: Array.isArray(input.dailySuccessfulReceivingScans) ? input.dailySuccessfulReceivingScans.filter((entry): entry is SuccessfulReceivingScan => Boolean(entry && typeof entry.id === "string" && typeof entry.productId === "string" && productIds.has(entry.productId) && typeof entry.productName === "string" && entry.productName.trim() && typeof entry.barcode === "string" && entry.barcode.trim() && typeof entry.scannedAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(entry.scannedAt))).map((entry) => ({ id: entry.id, productId: entry.productId, productName: entry.productName.trim().slice(0, 120), barcode: entry.barcode.trim().slice(0, 120), scannedAt: entry.scannedAt })).slice(0, 240) : [],
    priceLookupHistory: Array.isArray(input.priceLookupHistory) ? input.priceLookupHistory.filter((entry): entry is PriceLookupEntry => Boolean(entry && typeof entry.id === "string" && typeof entry.query === "string" && typeof entry.productId === "string" && typeof entry.productName === "string" && typeof entry.found === "boolean" && typeof entry.lookedUpAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(entry.lookedUpAt))).map((entry) => ({ ...entry, query: entry.query.trim().slice(0, 120), productName: entry.productName.trim().slice(0, 120) })).slice(0, 8) : [],
    paymentReconciliations: Array.isArray(input.paymentReconciliations) ? input.paymentReconciliations.filter((entry): entry is PaymentReconciliationRecord => Boolean(entry && typeof entry.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && (entry.paymentMethod === "card" || entry.paymentMethod === "transfer") && Number.isFinite(entry.posTotal) && Number.isFinite(entry.bankStatementTotal) && Number.isFinite(entry.difference) && typeof entry.note === "string" && typeof entry.reviewedAt === "string")).map((entry) => ({ ...entry, posTotal: Math.max(0, entry.posTotal), bankStatementTotal: Math.max(0, entry.bankStatementTotal), note: entry.note.trim().slice(0, 240) })).slice(0, 500) : [],
    storeName: input.storeName && input.storeName !== "بقالة الحي" ? input.storeName : emptyStoreData.storeName,
    storePhone: typeof input.storePhone === "string" ? input.storePhone : "",
    receiptLogo: isReceiptLogoDataUrl(input.receiptLogo) ? input.receiptLogo : "",
    receiptQrContent: typeof input.receiptQrContent === "string" ? input.receiptQrContent.trim().slice(0, 300) : "",
    receiptTextSize: input.receiptTextSize === "small" || input.receiptTextSize === "large" ? input.receiptTextSize : "normal",
    receiptPrintClarity: input.receiptPrintClarity === "standard" || input.receiptPrintClarity === "maximum" ? input.receiptPrintClarity : "high",
    defaultDiscountPercent: Math.min(100, Math.max(0, Number(input.defaultDiscountPercent) || 0)),
    initialized: Boolean(input.initialized && input.storeName && input.storeName !== "بقالة الحي"),
  };
}

function readLegacyStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeStore(raw ? JSON.parse(raw) as Partial<StoreData> : null);
  } catch {
    return emptyStoreData;
  }
}

function readNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return { stock: true, debts: true, backup: true, cash: true, goals: true, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { stock: true, debts: true, backup: true, cash: true, goals: true };
  }
}

function readNotificationIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATION_READ_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function readPrinterSettings(): PrinterSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRINTER_SETTINGS_KEY) || "{}");
    return {
      paperWidth: parsed.paperWidth === "80" || parsed.paperWidth === "A4" ? parsed.paperWidth : "58",
      deviceName: typeof parsed.deviceName === "string" ? parsed.deviceName : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
      connection: ["system", "usb", "bluetooth", "network"].includes(parsed.connection) ? parsed.connection : "system",
    };
  } catch {
    return { paperWidth: "58", deviceName: "", model: "", connection: "system" };
  }
}

function readStocktakeSettings(): StocktakeSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(STOCKTAKE_SETTINGS_KEY) || "{}");
    return {
      weekday: Number.isInteger(parsed.weekday) && parsed.weekday >= 0 && parsed.weekday <= 6 ? parsed.weekday : 0,
      lastCompletedAt: typeof parsed.lastCompletedAt === "string" ? parsed.lastCompletedAt : "",
    };
  } catch {
    return { weekday: 0, lastCompletedAt: "" };
  }
}

function readSupplierCreditLimits(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(SUPPLIER_CREDIT_LIMITS_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).flatMap(([supplier, limit]) => typeof supplier === "string" && Number.isFinite(limit) && Number(limit) >= 0 ? [[supplier, Number(limit)]] : []));
  } catch {
    return {};
  }
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof CircleDollarSign; tone: "olive" | "apricot" | "blue" | "sand" }) {
  return (
    <section className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__icon"><Icon size={22} strokeWidth={2.1} /></div>
      <div>
        <p>{label}</p>
        <strong dir="ltr">{value}</strong>
        <small>{detail}</small>
      </div>
    </section>
  );
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof Archive; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span><Icon size={28} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

async function enqueueSaleForCloudSync(sale: Sale) {
  const outbox = createLocalSyncOutbox(readLocalRecord, writeLocalRecord);
  const operation = createSyncOperation(sale.isReturn ? "sale.return" : "sale.create", sale.id, sale);
  return enqueueSyncOperation(outbox, operation);
}

export default function Home({ initialPage = "dashboard" }: { initialPage?: Page }) {
  const [store, setStore] = useState<StoreData>(emptyStoreData);
  const [dataReady, setDataReady] = useState(false);
  const [deviceIdentity, setDeviceIdentity] = useState<LocalDeviceIdentity | null>(() => readLocalDeviceIdentity());
  const [accessProfile, setAccessProfile] = useState<LocalAccessProfile | null>(() => readLocalAccessProfile());
  const [accessAuthenticated, setAccessAuthenticated] = useState(() => { const profile = readLocalAccessProfile(); return Boolean(profile && !isAccessExpired(profile) && localStorage.getItem(LOCAL_ACCESS_SESSION_KEY) === profile.username); });
  const [supportButtonVisible, setSupportButtonVisible] = useState(() => isSupportButtonVisible(localStorage.getItem(LOCAL_SUPPORT_VISIBILITY_KEY)));
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>(() => parseSupportRequests(localStorage.getItem(LOCAL_SUPPORT_REQUESTS_KEY)));
  const [supportCategory, setSupportCategory] = useState<SupportCategory>("technical");
  const [supportDetails, setSupportDetails] = useState("");
  const [supportScreenshotDataUrl, setSupportScreenshotDataUrl] = useState("");
  const [ownerBootstrapState, setOwnerBootstrapState] = useState(() => localStorage.getItem(LOCAL_OWNER_BOOTSTRAP_KEY) || "");
  const [accessMode, setAccessMode] = useState<"owner" | "activate" | "deactivate" | "login">("login");
  const [accessUsername, setAccessUsername] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [accessPasswordConfirm, setAccessPasswordConfirm] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [deactivationCode, setDeactivationCode] = useState("");
  const [accessQrScannerMode, setAccessQrScannerMode] = useState<"activation" | "deactivation" | "request" | null>(null);
  const [deviceRequestQr, setDeviceRequestQr] = useState("");
  const [issueRequestCode, setIssueRequestCode] = useState("");
  const [issueUsername, setIssueUsername] = useState("");
  const [issuePassword, setIssuePassword] = useState("");
  const [issueDurationDays, setIssueDurationDays] = useState("30");
  const [issuedActivationCode, setIssuedActivationCode] = useState("");
  const [issuedActivationQr, setIssuedActivationQr] = useState("");
  const [issuedDeactivationCode, setIssuedDeactivationCode] = useState("");
  const [issuedDeactivationQr, setIssuedDeactivationQr] = useState("");
  const [issuedDevices, setIssuedDevices] = useState<IssuedDeviceRecord[]>(() => readIssuedDevices());
  const [issuedDeviceFilter, setIssuedDeviceFilter] = useState<"all" | "active" | "near" | "warning" | "urgent" | "expired">("all");
  const [issuedDeviceQuery, setIssuedDeviceQuery] = useState("");
  const [deviceActivity, setDeviceActivity] = useState<DeviceActivityRecord[]>(() => readDeviceActivity());
  const activationImageInputRef = useRef<HTMLInputElement>(null);
  const requestImageInputRef = useRef<HTMLInputElement>(null);
  const supportScreenshotInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState<Page>(initialPage);
  const [deviceDisabled, setDeviceDisabled] = useState(() => Boolean(localStorage.getItem(LOCAL_ACCESS_DISABLED_KEY)));
  const [deviceDisabledReason, setDeviceDisabledReason] = useState(() => localStorage.getItem(LOCAL_ACCESS_DISABLED_REASON_KEY) || "");
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [availableAppVersion, setAvailableAppVersion] = useState<string | null>(null);
  const [accessClock, setAccessClock] = useState(() => Date.now());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartAdditionPulse, setCartAdditionPulse] = useState(0);
  const [query, setQuery] = useState("");
  const [showPriceLookup, setShowPriceLookup] = useState(false);
  const [showPriceLookupScanner, setShowPriceLookupScanner] = useState(false);
  const [priceLookupQuery, setPriceLookupQuery] = useState("");
  const [priceLookupResult, setPriceLookupResult] = useState<Product | null>(null);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showGoodsReceiving, setShowGoodsReceiving] = useState(false);
  const [receivingBarcode, setReceivingBarcode] = useState("");
  const [receivingProductId, setReceivingProductId] = useState("");
  const [receivingQuantity, setReceivingQuantity] = useState("1");
  const [receivingPurchasePrice, setReceivingPurchasePrice] = useState("");
  const [receivingStaffMemberId, setReceivingStaffMemberId] = useState("");
  const [latestGoodsReceipt, setLatestGoodsReceipt] = useState<GoodsReceipt | null>(null);
  const [latestGoodsReceiptReview, setLatestGoodsReceiptReview] = useState<ReturnType<typeof getReceivingCostReview> | null>(null);
  const [receivingFeedback, setReceivingFeedback] = useState<{ kind: BarcodeFeedbackKind; message: string } | null>(null);
  const [cartBarcodeFeedback, setCartBarcodeFeedback] = useState<{ kind: "success" | "error"; mode: "sale" | "return"; productName?: string; message: string } | null>(null);
  const [returnStockFeedback, setReturnStockFeedback] = useState<Array<{ productName: string; quantity: number }> | null>(null);
  const [barcodeFeedbackSoundEnabled, setBarcodeFeedbackSoundEnabled] = useState(() => localStorage.getItem(BARCODE_FEEDBACK_SOUND_KEY) !== "off");
  const [barcodeFeedbackVibrationEnabled, setBarcodeFeedbackVibrationEnabled] = useState(() => localStorage.getItem(BARCODE_FEEDBACK_VIBRATION_KEY) !== "off");
  const [costIncreaseAlertThreshold, setCostIncreaseAlertThreshold] = useState(() => {
    const value = Number(localStorage.getItem(COST_INCREASE_ALERT_THRESHOLD_KEY));
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 10;
  });
  const [costReportSupplierFilter, setCostReportSupplierFilter] = useState("");
  const [costReportProductFilter, setCostReportProductFilter] = useState("");
  const [receivingSession, setReceivingSession] = useState({ scans: 0, found: 0, notFound: 0, receivedUnits: 0 });
  const [receivingSessionHistory, setReceivingSessionHistory] = useState<ReceivingSessionEvent[]>([]);
  const [dailySuccessfulScanQuery, setDailySuccessfulScanQuery] = useState("");
  const [dailySuccessfulScanDate, setDailySuccessfulScanDate] = useState(todayKey());
  const [dailySuccessfulScanCategory, setDailySuccessfulScanCategory] = useState("");
  const [dailySuccessfulScanSupplier, setDailySuccessfulScanSupplier] = useState("");
  const [dailySuccessfulScanStockStatus, setDailySuccessfulScanStockStatus] = useState<"all" | "available" | "low" | "out">("all");
  const localSaveErrorShownRef = useRef(false);
  const successfulReceivingSessionEvents = useMemo(() => getSuccessfulReceivingSessionEvents(receivingSessionHistory), [receivingSessionHistory]);
  const dailySuccessfulReceivingScans = useMemo(() => getDailySuccessfulReceivingScans(store.dailySuccessfulReceivingScans, dailySuccessfulScanDate), [store.dailySuccessfulReceivingScans, dailySuccessfulScanDate]);
  const successfulScanCategories = useMemo(() => Array.from(new Set(store.products.map((product) => product.category?.trim() || "عام"))).sort((left, right) => left.localeCompare(right, "ar")), [store.products]);
  const successfulScanSuppliers = useMemo(() => Array.from(new Set(store.products.map((product) => product.supplierName?.trim() || "").filter(Boolean))).sort((left, right) => left.localeCompare(right, "ar")), [store.products]);
  const filteredDailySuccessfulReceivingScans = useMemo(() => filterSuccessfulReceivingScansAdvanced(dailySuccessfulReceivingScans, store.products, { query: dailySuccessfulScanQuery, category: dailySuccessfulScanCategory, supplierName: dailySuccessfulScanSupplier, stockStatus: dailySuccessfulScanStockStatus }), [dailySuccessfulReceivingScans, store.products, dailySuccessfulScanQuery, dailySuccessfulScanCategory, dailySuccessfulScanSupplier, dailySuccessfulScanStockStatus]);
  const dailySuccessfulReceivingScanSummary = useMemo(() => getSuccessfulReceivingScanSummary(dailySuccessfulReceivingScans), [dailySuccessfulReceivingScans]);

  useEffect(() => {
    if (deviceIdentity) return;
    void createDeviceRequest().then(({ deviceId, deviceSecret, request }) => {
      const identity = { deviceId, deviceSecret, deviceProof: request.deviceProof };
      localStorage.setItem(LOCAL_ACCESS_DEVICE_KEY, JSON.stringify(identity));
      setDeviceIdentity(identity);
    });
  }, [deviceIdentity]);

  useEffect(() => {
    if (!deviceIdentity) return;
    const code = encodeLocalAccessCode({ version: 1, deviceId: deviceIdentity.deviceId, deviceProof: deviceIdentity.deviceProof, createdAt: new Date().toISOString() });
    void makeReceiptQrDataUrl(code).then(setDeviceRequestQr).catch(() => setDeviceRequestQr(""));
  }, [deviceIdentity]);

  useEffect(() => {
    if (!dataReady || ownerBootstrapState) return;
    const state = !accessProfile && store.initialized ? "allow" : "locked";
    localStorage.setItem(LOCAL_OWNER_BOOTSTRAP_KEY, state);
    setOwnerBootstrapState(state);
  }, [accessProfile, dataReady, ownerBootstrapState, store.initialized]);

  useEffect(() => {
    localStorage.setItem(LOCAL_ISSUED_DEVICES_KEY, JSON.stringify(issuedDevices));
  }, [issuedDevices]);

  useEffect(() => {
    localStorage.setItem(LOCAL_DEVICE_ACTIVITY_KEY, JSON.stringify(deviceActivity));
  }, [deviceActivity]);

  useEffect(() => {
    localStorage.setItem(LOCAL_SUPPORT_REQUESTS_KEY, JSON.stringify(supportRequests));
  }, [supportRequests]);

  const checkForAppUpdate = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const remote = await fetchPublishedAppVersion();
      if (!remote) return;
      const running = localStorage.getItem(LOCAL_APP_VERSION_KEY);
      const status = getUpdateStatus(running, remote.version);
      if (status === "available") {
        setAvailableAppVersion(remote.version);
        setUpdateAvailable(true);
      } else {
        localStorage.setItem(LOCAL_APP_VERSION_KEY, remote.version);
        setUpdateAvailable(false);
      }
    } catch {
      // يبقى التطبيق صالحًا للعمل محليًا إذا لم تتوفر الشبكة أو ملف النسخة.
    }
  }, []);

  const applyAvailableAppUpdate = () => {
    if (availableAppVersion) localStorage.setItem(LOCAL_APP_VERSION_KEY, availableAppVersion);
    window.location.reload();
  };

  useEffect(() => {
    void checkForAppUpdate();
    const onOnline = () => void checkForAppUpdate();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [checkForAppUpdate]);

  useEffect(() => {
    if (!accessProfile?.expiresAt) return;
    const verifyExpiry = () => {
      setAccessClock(Date.now());
      if (!isAccessExpired(accessProfile)) return;
      localStorage.removeItem(LOCAL_ACCESS_SESSION_KEY);
      setAccessAuthenticated(false);
      toast.error("انتهت صلاحية الحساب. تواصل مع المالك لإصدار تفعيل جديد.");
    };
    verifyExpiry();
    const timer = window.setInterval(verifyExpiry, 60_000);
    return () => window.clearInterval(timer);
  }, [accessProfile]);

  const accessExpiryNotice = accessProfile?.role === "user" ? getAccessExpiryNotice(accessProfile, accessClock) : null;
  const issuedDeviceVisualSummary = useMemo(() => issuedDevices.reduce((summary, record) => {
    summary[getIssuedDeviceVisualState(record).state] += 1;
    return summary;
  }, { active: 0, near: 0, warning: 0, urgent: 0, expired: 0 }), [issuedDevices]);
  const filteredIssuedDevices = useMemo(() => searchDeviceRecords(issuedDevices.filter((record) => issuedDeviceFilter === "all" || getIssuedDeviceVisualState(record).state === issuedDeviceFilter), issuedDeviceQuery), [issuedDeviceFilter, issuedDeviceQuery, issuedDevices]);
  const filteredDeviceActivity = useMemo(() => searchDeviceRecords(deviceActivity, issuedDeviceQuery), [deviceActivity, issuedDeviceQuery]);

  useEffect(() => {
    localStorage.setItem(BARCODE_FEEDBACK_SOUND_KEY, barcodeFeedbackSoundEnabled ? "on" : "off");
  }, [barcodeFeedbackSoundEnabled]);

  useEffect(() => {
    localStorage.setItem(BARCODE_FEEDBACK_VIBRATION_KEY, barcodeFeedbackVibrationEnabled ? "on" : "off");
  }, [barcodeFeedbackVibrationEnabled]);

  useEffect(() => {
    if (!cartBarcodeFeedback) return;
    const timer = window.setTimeout(() => setCartBarcodeFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [cartBarcodeFeedback]);

  useEffect(() => {
    if (!returnStockFeedback) return;
    const timer = window.setTimeout(() => setReturnStockFeedback(null), 5200);
    return () => window.clearTimeout(timer);
  }, [returnStockFeedback]);

  useEffect(() => {
    localStorage.setItem(COST_INCREASE_ALERT_THRESHOLD_KEY, String(costIncreaseAlertThreshold));
  }, [costIncreaseAlertThreshold]);

  useEffect(() => {
    if (!showGoodsReceiving) return;
    const syncReceivingPrice = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.name === "purchasePrice") setReceivingPurchasePrice(target.value);
    };
    document.addEventListener("input", syncReceivingPrice);
    return () => document.removeEventListener("input", syncReceivingPrice);
  }, [showGoodsReceiving]);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showContainerForm, setShowContainerForm] = useState(false);
  const [containerStatementCustomer, setContainerStatementCustomer] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pendingProductImage, setPendingProductImage] = useState("");
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showSettledDebts, setShowSettledDebts] = useState(false);
  const [collectionDebt, setCollectionDebt] = useState<Debt | null>(null);
  const [customerStatementName, setCustomerStatementName] = useState("");
  const [collectionAmount, setCollectionAmount] = useState("");
  const [priceHistoryProductId, setPriceHistoryProductId] = useState<string | null>(null);
  const [showStoreSetup, setShowStoreSetup] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showReceivingBarcodeScanner, setShowReceivingBarcodeScanner] = useState(false);
  const [showStocktakeScanner, setShowStocktakeScanner] = useState(false);
  const [showBarcodeStocktake, setShowBarcodeStocktake] = useState(false);
  const [showBarcodeStocktakeScanner, setShowBarcodeStocktakeScanner] = useState(false);
  const [unmatchedBarcodeStocktakeValue, setUnmatchedBarcodeStocktakeValue] = useState("");
  const [externalBarcodeReaderActive, setExternalBarcodeReaderActive] = useState(false);
  const [barcodeStocktakeQuery, setBarcodeStocktakeQuery] = useState("");
  const [barcodeStocktakeOnlyPending, setBarcodeStocktakeOnlyPending] = useState(false);
  const [barcodeStocktakeShelfFilter, setBarcodeStocktakeShelfFilter] = useState("");
  const [stocktakeProduct, setStocktakeProduct] = useState<Product | null>(null);
  const [stocktakeQuantity, setStocktakeQuantity] = useState("");
  const [showBulkStocktake, setShowBulkStocktake] = useState(false);
  const [actionLockSettings, setActionLockSettings] = useState<LocalActionLockSettings>(readLocalActionLockSettings);
  const [pendingProtectedAction, setPendingProtectedAction] = useState<{ title: string; action: () => void } | null>(null);
  const [actionLockPin, setActionLockPin] = useState("");
  const [bulkStocktakeQuantities, setBulkStocktakeQuantities] = useState<Record<string, string>>({});
  const [receivingProduct, setReceivingProduct] = useState<Product | null>(null);
  const [editingBatch, setEditingBatch] = useState<{ product: Product; batch: ProductBatch } | null>(null);
  const [wasteApprovalBatch, setWasteApprovalBatch] = useState<{ product: Product; batch: ProductBatch } | null>(null);
  const [finalWasteApprovalBatch, setFinalWasteApprovalBatch] = useState<{ product: Product; batch: ProductBatch } | null>(null);
  const [supplierReturnBatch, setSupplierReturnBatch] = useState<{ product: Product; batch: ProductBatch } | null>(null);
  const [supplierPaymentSupplier, setSupplierPaymentSupplier] = useState<string | null>(null);
  const [showCashExpenseForm, setShowCashExpenseForm] = useState(false);
  const [showCashClosingForm, setShowCashClosingForm] = useState(false);
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [showEmployeeAdvanceForm, setShowEmployeeAdvanceForm] = useState(false);
  const [showEmployeePurchaseForm, setShowEmployeePurchaseForm] = useState(false);
  const [employeePurchaseReturnSale, setEmployeePurchaseReturnSale] = useState<Sale | null>(null);
  const [employeePurchaseReturnQuantities, setEmployeePurchaseReturnQuantities] = useState<Record<string, string>>({});
  const [employeeStatementStaffId, setEmployeeStatementStaffId] = useState("");
  const [advanceMonth, setAdvanceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [advanceQuery, setAdvanceQuery] = useState("");
  const [payrollMonth, setPayrollMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payrollQuery, setPayrollQuery] = useState("");
  const [showDailyGoalForm, setShowDailyGoalForm] = useState(false);
  const [showMonthlyGoalForm, setShowMonthlyGoalForm] = useState(false);
  const [returningSale, setReturningSale] = useState<Sale | null>(null);
  const [returnCartSale, setReturnCartSale] = useState<Sale | null>(null);
  const [returnScreenSale, setReturnScreenSale] = useState<Sale | null>(null);
  const [showReturnBarcodeScanner, setShowReturnBarcodeScanner] = useState(false);
  const [showDirectReturnBarcodeScanner, setShowDirectReturnBarcodeScanner] = useState(false);
  const [directReturnMode, setDirectReturnMode] = useState(false);
  const [directReturnQuery, setDirectReturnQuery] = useState("");
  const [directReturnQuantities, setDirectReturnQuantities] = useState<Record<string, string>>({});
  const [directReturnReason, setDirectReturnReason] = useState("");
  const [directReturnPaymentMethod, setDirectReturnPaymentMethod] = useState<PaymentMethod>("cash");
  const [returnCartReason, setReturnCartReason] = useState("");
  const [returnStaffMemberId, setReturnStaffMemberId] = useState(readRememberedStaffMemberId);
  const [showReturnReasonPicker, setShowReturnReasonPicker] = useState(false);
  const [returnInvoiceQuery, setReturnInvoiceQuery] = useState("");
  const [returnFilterFromDate, setReturnFilterFromDate] = useState("");
  const [returnFilterToDate, setReturnFilterToDate] = useState("");
  const [returnReasonFilter, setReturnReasonFilter] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [cashDenominationCounts, setCashDenominationCounts] = useState<Record<number, string>>({});
  const [supplierPurchasesMonth, setSupplierPurchasesMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [supplierCreditLimits, setSupplierCreditLimits] = useState<Record<string, number>>(readSupplierCreditLimits);
  const [stocktakeSettings, setStocktakeSettings] = useState<StocktakeSettings>(readStocktakeSettings);
  const [showShelfLabels, setShowShelfLabels] = useState(false);
  const [selectedLabelProductIds, setSelectedLabelProductIds] = useState<string[]>([]);
  const [labelQuantities, setLabelQuantities] = useState<Record<string, string>>({});
  const [labelSize, setLabelSize] = useState<LabelSize>("standard");
  const [pendingBarcode, setPendingBarcode] = useState("");
  const [inventoryShelfFilter, setInventoryShelfFilter] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [bankName, setBankName] = useState("");
  const [posTerminalType, setPosTerminalType] = useState("");
  const [mixedPaymentEnabled, setMixedPaymentEnabled] = useState(false);
  const [paymentSplitAmounts, setPaymentSplitAmounts] = useState<Record<PaymentMethod, string>>({ cash: "", card: "", transfer: "", credit: "" });
  const [mixedBankName, setMixedBankName] = useState("");
  const [mixedPosTerminalType, setMixedPosTerminalType] = useState("");
  const [reconciliationDate, setReconciliationDate] = useState(todayKey());
  const [reconciliationStatements, setReconciliationStatements] = useState<Record<"card" | "transfer", string>>({ card: "", transfer: "" });
  const [reconciliationNote, setReconciliationNote] = useState("");
  const [reconciliationHistoryQuery, setReconciliationHistoryQuery] = useState("");
  const [reconciliationHistoryMethod, setReconciliationHistoryMethod] = useState<"all" | "card" | "transfer">("all");
  const [reconciliationHistoryStatus, setReconciliationHistoryStatus] = useState<"all" | "matched" | "difference">("all");
  const [selectedReconciliation, setSelectedReconciliation] = useState<PaymentReconciliationRecord | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomerCategoryId, setSelectedCustomerCategoryId] = useState("");
  const [selectedStaffMemberId, setSelectedStaffMemberId] = useState(readRememberedStaffMemberId);
  const [saleDiscountPercent, setSaleDiscountPercent] = useState("0");
  const [saleNote, setSaleNote] = useState("");
  const [saleOrderReference, setSaleOrderReference] = useState("");
  const [saleCostCenter, setSaleCostCenter] = useState("");
  const [saleCategoryFilter, setSaleCategoryFilter] = useState("");
  const [saleProductSort, setSaleProductSort] = useState<"popular" | "name" | "price-low" | "price-high">("popular");
  const [suspendedSaleLabel, setSuspendedSaleLabel] = useState("");
  const [debtQuery, setDebtQuery] = useState("");
  const [latestSale, setLatestSale] = useState<Sale | null>(null);
  const [previewSale, setPreviewSale] = useState<Sale | null>(null);
  const [isCashierFullscreen, setIsCashierFullscreen] = useState(false);
  const [saleFocusMode, setSaleFocusMode] = useState(false);
  const [cashierSettings, setCashierSettings] = useState(() => parseCashierSettings(localStorage.getItem(LOCAL_CASHIER_SETTINGS_KEY)));
  const [showSuspendedSales, setShowSuspendedSales] = useState(true);
  const [trainingMode, setTrainingMode] = useState(false);
  const trainingStoreRef = useRef<StoreData | null>(null);
  const [barcodeReaderTestActive, setBarcodeReaderTestActive] = useState(false);
  const [barcodeReaderTestResult, setBarcodeReaderTestResult] = useState<{ value: string; receivedAt: string } | null>(null);
  const [invoiceTableSettings, setInvoiceTableSettings] = useState(() => parseInvoiceTableSettings(localStorage.getItem(LOCAL_INVOICE_TABLE_SETTINGS_KEY)));
  const [isOnline, setIsOnline] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(readNotificationPreferences);
  const [readNotificationKeys, setReadNotificationKeys] = useState<string[]>(readNotificationIds);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(readPrinterSettings);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string>(() => localStorage.getItem(BACKUP_EXPORTED_AT_KEY) ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const saleSearchInputRef = useRef<HTMLInputElement>(null);
  const externalBarcodeBufferRef = useRef<ExternalBarcodeBuffer>({ value: "", lastKeyAt: 0 });

  useEffect(() => {
    let active = true;
    const loadStore = async () => {
      const stored = await readLocalRecord<Partial<StoreData>>(LOCAL_STORE_RECORD_KEY);
      const nextStore = normalizeStore(stored ?? readLegacyStore());
      if (!active) return;
      setStore(nextStore);
      setDataReady(true);
      setShowStoreSetup(!nextStore.initialized);
    };
    void loadStore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LOCAL_CASHIER_SETTINGS_KEY, JSON.stringify(cashierSettings)); } catch { /* تظل الإعدادات فعالة حتى إن تعذر الحفظ. */ }
  }, [cashierSettings]);

  useEffect(() => {
    try { localStorage.setItem(LOCAL_INVOICE_TABLE_SETTINGS_KEY, JSON.stringify(invoiceTableSettings)); } catch { /* تظل الإعدادات فعالة حتى إن تعذر الحفظ. */ }
  }, [invoiceTableSettings]);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const clearInstallPrompt = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!dataReady || !shouldPersistStoreChange(trainingMode)) return;
    void writeLocalRecord(LOCAL_STORE_RECORD_KEY, store).then(() => {
      localSaveErrorShownRef.current = false;
    }).catch((error) => {
      console.error("تعذر حفظ بيانات سوقنا محليًا", error);
      if (localSaveErrorShownRef.current) return;
      localSaveErrorShownRef.current = true;
      toast.error(getLocalStorageFailureGuidance(error), { duration: 10_000 });
    });
  }, [dataReady, store, trainingMode]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(notificationPreferences));
  }, [notificationPreferences]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(readNotificationKeys));
  }, [readNotificationKeys]);

  useEffect(() => {
    localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(printerSettings));
  }, [printerSettings]);

  useEffect(() => {
    localStorage.setItem(STOCKTAKE_SETTINGS_KEY, JSON.stringify(stocktakeSettings));
  }, [stocktakeSettings]);

  useEffect(() => {
    localStorage.setItem(LOCAL_ACTION_LOCK_KEY, JSON.stringify(actionLockSettings));
  }, [actionLockSettings]);

  useEffect(() => {
    const syncConnection = () => setIsOnline(navigator.onLine);
    syncConnection();
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);
    return () => {
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
    };
  }, []);

  const todaySales = useMemo(() => store.sales.filter((sale) => isToday(sale.createdAt)), [store.sales]);
  const containerBalances = useMemo(() => getContainerBalances(store.returnableContainerEntries), [store.returnableContainerEntries]);
  const containerStatementCustomers = useMemo(() => Array.from(new Set(store.returnableContainerEntries.map((entry) => entry.customerName))).sort((left, right) => left.localeCompare(right, "ar")), [store.returnableContainerEntries]);
  const containerStatementEntries = useMemo(() => containerStatementCustomer ? store.returnableContainerEntries.filter((entry) => entry.customerName === containerStatementCustomer).sort((left, right) => left.createdAt.localeCompare(right.createdAt)) : [], [containerStatementCustomer, store.returnableContainerEntries]);
  const activeProductReservations = useMemo(() => store.productReservations.filter((entry) => entry.status === "active"), [store.productReservations]);
  const totalReservedUnits = useMemo(() => activeProductReservations.reduce((total, entry) => total + entry.quantity, 0), [activeProductReservations]);
  const reservationDueStatus = useMemo(() => getReservationDueStatus(activeProductReservations, todayKey()), [activeProductReservations]);
  const monthlyContainerReport = useMemo(() => getMonthlyContainerReport(store.returnableContainerEntries, new Date().toISOString().slice(0, 7)), [store.returnableContainerEntries]);
  const monthlyReservationReport = useMemo(() => getMonthlyReservationReport(store.productReservations, new Date().toISOString().slice(0, 7)), [store.productReservations]);
  const lastRepeatableSale = useMemo(() => store.sales.find((sale) => !sale.isReturn), [store.sales]);
  const monthSales = useMemo(() => store.sales.filter((sale) => isCurrentMonth(sale.createdAt)), [store.sales]);
  const weeklySummary = useMemo(() => getWeeklySummary(store.sales), [store.sales]);
  const weekComparison = useMemo(() => getWeekComparison(store.sales), [store.sales]);
  const monthlySummary = useMemo(() => getMonthlyReport(store.sales), [store.sales]);
  const stocktakeDue = useMemo(() => isWeeklyStocktakeDue(stocktakeSettings), [stocktakeSettings]);
  const salesTodayTotal = useMemo(() => todaySales.reduce((total, sale) => total + sale.total, 0), [todaySales]);
  const todayReturns = useMemo(() => todaySales.filter((sale) => sale.isReturn), [todaySales]);
  const dailyReturnTotal = useMemo(() => todayReturns.reduce((total, sale) => total + Math.abs(sale.total), 0), [todayReturns]);
  const dailyReturnUnits = useMemo(() => todayReturns.reduce((total, sale) => total + sale.items.reduce((units, item) => units + Math.abs(item.quantity), 0), 0), [todayReturns]);
  const dailyReturnReasonSummary = useMemo(() => getReturnReasonSummary(todayReturns), [todayReturns]);
  const categorySalesReport = useMemo(() => getCategorySalesReport(store.sales, store.products), [store.sales, store.products]);
  const dailyPaymentSummary = useMemo(() => getDailyPaymentSummary(store.sales, todayKey()), [store.sales]);
  const dailyPaymentSummaryTotals = useMemo(() => getDailyPaymentSummaryTotals(dailyPaymentSummary), [dailyPaymentSummary]);
  const digitalPaymentSummary = useMemo(() => getDigitalPaymentSummary(store.sales, todayKey()), [store.sales]);
  const reconciliationRows = useMemo(() => (["card", "transfer"] as const).map((paymentMethod) => {
    const summary = getDailyPaymentSummary(store.sales, reconciliationDate).find((entry) => entry.paymentMethod === paymentMethod);
    const posTotal = summary?.netSales || 0;
    const bankStatementTotal = Math.max(0, Number(reconciliationStatements[paymentMethod]) || 0);
    const difference = bankStatementTotal - posTotal;
    return { paymentMethod, label: getPaymentMethodLabel(paymentMethod), posTotal, bankStatementTotal, difference, matched: Math.abs(difference) < 0.01 };
  }), [reconciliationDate, reconciliationStatements, store.sales]);
  const filteredReconciliationHistory = useMemo(() => filterReconciliationHistory(store.paymentReconciliations, reconciliationHistoryQuery, reconciliationHistoryMethod, reconciliationHistoryStatus), [reconciliationHistoryMethod, reconciliationHistoryQuery, reconciliationHistoryStatus, store.paymentReconciliations]);
  const dailyGoalProgress = useMemo(() => getDailyGoalProgress(store.dailySalesGoals[todayKey()], salesTodayTotal), [salesTodayTotal, store.dailySalesGoals]);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const supplierCostChangesFullReport = useMemo(() => getSupplierCostChanges(store.goodsReceipts, currentMonthKey), [currentMonthKey, store.goodsReceipts]);
  const supplierCostChangesReport = useMemo(() => ({ ...supplierCostChangesFullReport, changes: supplierCostChangesFullReport.changes.filter((change) => (!costReportSupplierFilter || change.supplierName === costReportSupplierFilter) && (!costReportProductFilter || change.productId === costReportProductFilter)) }), [costReportProductFilter, costReportSupplierFilter, supplierCostChangesFullReport]);
  const costIncreaseAlerts = useMemo(() => supplierCostChangesReport.changes.filter((change) => change.percentChange !== null && change.percentChange >= costIncreaseAlertThreshold), [costIncreaseAlertThreshold, supplierCostChangesReport.changes]);
  const repeatedCostIncreaseProducts = useMemo(() => getRepeatedCostIncreaseProducts(supplierCostChangesFullReport.changes), [supplierCostChangesFullReport.changes]);
  const supplierMonthlyCostComparison = useMemo(() => getSupplierMonthlyCostComparison(store.goodsReceipts, currentMonthKey), [currentMonthKey, store.goodsReceipts]);
  const costChangeProductOptions = useMemo(() => Array.from(new Map(supplierCostChangesFullReport.changes.map((change) => [change.productId, change.productName])).entries()).sort((left, right) => left[1].localeCompare(right[1], "ar")), [supplierCostChangesFullReport.changes]);
  const monthlyGoalProgress = useMemo(() => getMonthlyGoalProgress(store.monthlySalesGoals[currentMonthKey], monthlySummary.revenue), [currentMonthKey, monthlySummary.revenue, store.monthlySalesGoals]);
  const profitToday = useMemo(() => todaySales.reduce((total, sale) => total + sale.profit, 0), [todaySales]);
  const todayCashClosing = useMemo(() => getCashClosingForDate(store.cashClosings, todayKey()), [store.cashClosings]);
  const countedCashEntries = useMemo(() => getActiveCashDenominations(CASH_DENOMINATIONS.map((denomination) => ({ denomination, count: Number(cashDenominationCounts[denomination]) || 0 }))), [cashDenominationCounts]);
  const countedCashTotal = useMemo(() => getCashDenominationTotal(countedCashEntries), [countedCashEntries]);
  const todayCashSummary = useMemo(() => getDailyCashSummary(store.sales, store.cashExpenses, todayKey(), todayCashClosing?.openingCash ?? 0, todayCashClosing?.actualCash, store.debtCollections), [store.cashClosings, store.cashExpenses, store.debtCollections, store.sales, todayCashClosing]);
  const todayExpenses = useMemo(() => store.cashExpenses.filter((expense) => isToday(expense.spentAt)).sort((left, right) => right.spentAt.localeCompare(left.spentAt)), [store.cashExpenses]);
  const todayExpenseLimitStatus = useMemo(() => getDailyExpenseLimitStatus(store.cashExpenses, todayKey(), store.dailyExpenseLimit), [store.cashExpenses, store.dailyExpenseLimit]);
  const monthlyExpenseReport = useMemo(() => getMonthlyExpenseReport(store.cashExpenses, new Date().toISOString().slice(0, 7)), [store.cashExpenses]);
  const monthlyOperatingExpenses = useMemo(() => getOperatingExpenseReport(store.cashExpenses, payrollMonth), [payrollMonth, store.cashExpenses]);
  const monthlyPayrollRecords = useMemo(() => filterPayrollRecords(store.payrollRecords, payrollQuery, payrollMonth), [payrollMonth, payrollQuery, store.payrollRecords]);
  const monthlyEmployeeAdvances = useMemo(() => filterEmployeeAdvances(store.employeeAdvances, advanceQuery, advanceMonth), [advanceMonth, advanceQuery, store.employeeAdvances]);
  const monthlyAdvanceTotal = useMemo(() => monthlyEmployeeAdvances.reduce((total, advance) => total + Math.max(0, advance.amount - advance.settled), 0), [monthlyEmployeeAdvances]);
  const employeeStatement = useMemo(() => employeeStatementStaffId ? getEmployeeStatement(employeeStatementStaffId, store.sales, store.employeeAdvances) : null, [employeeStatementStaffId, store.employeeAdvances, store.sales]);
  const employeeStatementSalary = useMemo(() => employeeStatementStaffId ? store.payrollRecords.filter((record) => record.staffMemberId === employeeStatementStaffId).sort((left, right) => right.paidAt.localeCompare(left.paidAt))[0]?.baseSalary ?? 0 : 0, [employeeStatementStaffId, store.payrollRecords]);
  const employeeStatementAboveLimit = Boolean(employeeStatement && employeeStatementSalary > 0 && employeeStatement.outstanding > employeeStatementSalary * 0.5);
  const employeeStatementCreditLimit = Math.max(0, Number(store.employeeCreditLimits[employeeStatementStaffId]) || 0);
  const employeeStatementOverCreditLimit = Boolean(employeeStatement && employeeStatementCreditLimit > 0 && employeeStatement.outstanding > employeeStatementCreditLimit);
  const monthlyPayrollSummary = useMemo(() => getPayrollSummary(store.payrollRecords, payrollMonth), [payrollMonth, store.payrollRecords]);
  const monthlyPayrollCost = monthlyPayrollSummary.netDue;
  const monthlySalesProfit = useMemo(() => store.sales.filter((sale) => sale.createdAt.slice(0, 7) === payrollMonth).reduce((total, sale) => total + Math.max(0, sale.profit), 0), [payrollMonth, store.sales]);
  const monthlyOperatingExpenseTotal = monthlyOperatingExpenses.reduce((total, entry) => total + entry.total, 0);
  const monthlyNetProfitAfterCosts = monthlySalesProfit - monthlyOperatingExpenseTotal - monthlyPayrollCost;
  const todayDebtCollections = useMemo(() => store.debtCollections.filter((collection) => isToday(collection.collectedAt)).sort((left, right) => right.collectedAt.localeCompare(left.collectedAt)), [store.debtCollections]);
  const totalOutstanding = useMemo(() => store.debts.reduce((total, debt) => total + Math.max(0, debt.amount - debt.paid), 0), [store.debts]);
  const filteredDebts = useMemo(() => {
    const nameQuery = debtQuery.trim().toLocaleLowerCase("ar");
    const phoneQuery = debtQuery.replace(/\s+/g, "");
    if (!nameQuery && !phoneQuery) return store.debts;
    return store.debts.filter((debt) => debt.customerName.toLocaleLowerCase("ar").includes(nameQuery) || (debt.customerPhone || "").replace(/\s+/g, "").includes(phoneQuery));
  }, [debtQuery, store.debts]);
  const activeDebts = useMemo(() => filteredDebts.filter((debt) => !isSettledDebt(debt)), [filteredDebts]);
  const settledDebts = useMemo(() => filteredDebts.filter(isSettledDebt), [filteredDebts]);
  const selectedProductPriceHistory = useMemo(() => priceHistoryProductId ? store.priceHistory.filter((entry) => entry.productId === priceHistoryProductId) : [], [priceHistoryProductId, store.priceHistory]);
  const lowStock = useMemo(() => store.products.filter((product) => product.quantity <= product.lowStockAt), [store.products]);
  const nearDepletion = useMemo(() => getNearDepletionProducts(store.products), [store.products]);
  const inactiveProducts = useMemo(() => getInactiveProducts(store.products, store.sales), [store.products, store.sales]);
  const expiringProducts = useMemo(() => getExpiringProducts(store.products), [store.products]);
  const supplierPurchaseList = useMemo(() => getSupplierPurchaseList(store.products), [store.products]);
  const expirySortedBatches = useMemo(() => getExpirySortedBatchInventory(store.products), [store.products]);
  const batchHistory = useMemo(() => getBatchHistory(store.products), [store.products]);
  const expiryWasteReport = useMemo(() => getExpiryWasteReport(store.products), [store.products]);
  const supplierInventoryCostReport = useMemo(() => getSupplierInventoryCostReport(store.products), [store.products]);
  const supplierCreditStatus = useMemo(() => getSupplierCreditStatus(store.products, store.supplierPayments, supplierCreditLimits), [store.products, store.supplierPayments, supplierCreditLimits]);
  const supplierDueDateStatuses = useMemo(() => getSupplierDueDateStatuses(supplierCreditStatus.groups, store.supplierDueDates, todayKey()), [store.supplierDueDates, supplierCreditStatus.groups]);
  const supplierOperatingSummary = useMemo(() => {
    const inventoryBySupplier = new Map(supplierInventoryCostReport.groups.map((group) => [group.supplierName, group.cost]));
    const monthPaymentsBySupplier = new Map<string, number>();
    store.supplierPayments.filter((payment) => isCurrentMonth(payment.paidAt)).forEach((payment) => monthPaymentsBySupplier.set(payment.supplierName, (monthPaymentsBySupplier.get(payment.supplierName) ?? 0) + payment.amount));
    return supplierCreditStatus.groups.map((group) => ({ supplierName: group.supplierName, outstanding: group.outstanding, inventoryCost: inventoryBySupplier.get(group.supplierName) ?? 0, monthlyPayments: monthPaymentsBySupplier.get(group.supplierName) ?? 0 }));
  }, [store.supplierPayments, supplierCreditStatus.groups, supplierInventoryCostReport.groups]);
  const supplierPurchaseReport = useMemo(() => {
    const [year, month] = supplierPurchasesMonth.split("-").map(Number);
    const lastDay = Number.isFinite(year) && Number.isFinite(month) ? new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) : todayKey();
    return getSupplierPurchaseReport(store.products, `${supplierPurchasesMonth}-01`, lastDay);
  }, [store.products, supplierPurchasesMonth]);
  const supplierPurchaseComparison = useMemo(() => getSupplierPurchaseComparison(store.products, supplierPurchasesMonth), [store.products, supplierPurchasesMonth]);
  const supplierObligationReport = useMemo(() => getSupplierObligationReport(supplierCreditStatus.groups, supplierDueDateStatuses), [supplierCreditStatus.groups, supplierDueDateStatuses]);
  const operationalInsights = useMemo(() => getProductDemandInsights(store.products, store.sales), [store.products, store.sales]);
  const purchaseRecommendations = useMemo(() => getPurchaseRecommendations(operationalInsights), [operationalInsights]);
  const cashFlowForecast = useMemo(() => getCashFlowForecast(store.sales, store.cashExpenses, store.debtCollections), [store.cashExpenses, store.debtCollections, store.sales]);
  const operationalRiskInsights = useMemo(() => operationalInsights.filter((entry) => entry.risk === "urgent" || entry.risk === "watch"), [operationalInsights]);
  const localDecisionCenter = useMemo(() => getLocalDecisionCenter({ insights: operationalInsights, products: store.products, outstandingDebt: store.debts.reduce((total, debt) => total + Math.max(0, debt.amount - debt.paid), 0), cashFlow: cashFlowForecast }), [cashFlowForecast, operationalInsights, store.debts, store.products]);
  const stocktakeRecordSummary = useMemo(() => getStocktakeRecordSummary(store.stocktakeRecords), [store.stocktakeRecords]);
  const recentStocktakeRecords = useMemo(() => [...store.stocktakeRecords].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt)).slice(0, 8), [store.stocktakeRecords]);
  const barcodeStocktakeProgress = useMemo(() => getBarcodeStocktakeProgress(store.products, store.barcodeStocktakeDraft?.counts ?? {}), [store.barcodeStocktakeDraft?.counts, store.products]);
  const filteredBarcodeStocktakeEntries = useMemo(() => {
    const needle = barcodeStocktakeQuery.trim().toLocaleLowerCase("ar");
    return barcodeStocktakeProgress.entries.filter((entry) => (!barcodeStocktakeOnlyPending || !entry.counted) && (!barcodeStocktakeShelfFilter || (entry.shelfLocation || "").trim() === barcodeStocktakeShelfFilter) && (!needle || `${entry.name} ${entry.sku} ${entry.category} ${entry.shelfLocation || ""}`.toLocaleLowerCase("ar").includes(needle))).sort((left, right) => (left.shelfLocation || "~").localeCompare(right.shelfLocation || "~", "ar") || left.name.localeCompare(right.name, "ar"));
  }, [barcodeStocktakeOnlyPending, barcodeStocktakeProgress.entries, barcodeStocktakeQuery, barcodeStocktakeShelfFilter]);
  const shelfLocations = useMemo(() => Array.from(new Set(store.products.map((product) => product.shelfLocation?.trim()).filter((location): location is string => Boolean(location)))).sort((left, right) => left.localeCompare(right, "ar")), [store.products]);
  const stocktakeRunComparison = useMemo(() => getStocktakeRunComparison(store.stocktakeRecords), [store.stocktakeRecords]);
  const saleReturns = useMemo(() => store.sales.filter((sale) => sale.isReturn), [store.sales]);
  const returnReasons = useMemo(() => getReturnReasons(store.sales), [store.sales]);
  const filteredSaleReturns = useMemo(() => filterReturnSales(store.sales, { fromDate: returnFilterFromDate, toDate: returnFilterToDate, reason: returnReasonFilter }), [returnFilterFromDate, returnFilterToDate, returnReasonFilter, store.sales]);
  const recentReturnableSales = useMemo(() => store.sales.filter((sale) => !sale.isReturn && sale.total > 0).slice(0, 8), [store.sales]);
  const filteredReturnableSales = useMemo(() => searchReturnableSales(store.sales, returnInvoiceQuery).slice(0, 20), [returnInvoiceQuery, store.sales]);
  const filteredDirectReturnProducts = useMemo(() => { const query = directReturnQuery.trim().toLocaleLowerCase("ar"); return store.products.filter((product) => !query || `${product.name} ${product.sku} ${product.category} ${(product.barcodeAliases || []).join(" ")}`.toLocaleLowerCase("ar").includes(query)); }, [directReturnQuery, store.products]);
  const directReturnItems = useMemo(() => store.products.flatMap((product) => { const quantity = Math.floor(Number(directReturnQuantities[product.id]) || 0); return quantity > 0 ? [{ productId: product.id, name: product.name, quantity, price: product.salePrice, cost: product.purchasePrice, category: product.category }] : []; }), [directReturnQuantities, store.products]);
  const directReturnTotal = useMemo(() => directReturnItems.reduce((total, item) => total + item.quantity * item.price, 0), [directReturnItems]);
  const activeReturnSale = returnScreenSale ?? returnCartSale;
  const returnCartAvailableItems = useMemo(() => activeReturnSale ? getSaleReturnableItems(activeReturnSale, store.sales) : [], [activeReturnSale, store.sales]);
  const returnCartItems = useMemo(() => {
    if (!activeReturnSale) return [];
    const availableByProductId = new Map(returnCartAvailableItems.map((item) => [item.productId, item.remainingQuantity]));
    return activeReturnSale.items.flatMap((item) => {
      const quantity = Math.min(availableByProductId.get(item.productId) ?? 0, Math.max(0, Math.floor(Number(returnQuantities[item.productId]) || 0)));
      return quantity > 0 ? [{ ...item, quantity }] : [];
    });
  }, [activeReturnSale, returnCartAvailableItems, returnQuantities]);
  const returnCartTotal = useMemo(() => activeReturnSale ? getReturnCartTotal(activeReturnSale, returnCartItems) : 0, [activeReturnSale, returnCartItems]);
  const recurringCustomers = useMemo(() => getRecurringCustomers(store.sales, store.debts), [store.sales, store.debts]);
  const productProfitabilityReport = useMemo(() => getProductProfitability(store.sales, currentMonthKey), [currentMonthKey, store.sales]);
  const highReturnRateProducts = useMemo(() => getHighReturnRateProducts(productProfitabilityReport.entries, store.returnRateAlertThreshold), [productProfitabilityReport.entries, store.returnRateAlertThreshold]);
  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    if (notificationPreferences.stock) {
      nearDepletion.forEach((product) => {
        items.push({
          id: `near-stock-${product.id}-${product.quantity}`,
          kind: "info",
          title: `قارب «${product.name}» على حد التنبيه`,
          description: `المتوفر ${product.quantity} وحدات؛ جهّز إعادة الطلب قبل أن ينخفض عن الحد ${product.lowStockAt}.`,
          page: "inventory",
        });
      });
      lowStock.forEach((product) => {
        const exhausted = product.quantity === 0;
        items.push({
          id: `stock-${product.id}-${product.quantity}`,
          kind: exhausted ? "critical" : "warning",
          title: exhausted ? `نفد صنف «${product.name}»` : `مخزون منخفض: ${product.name}`,
          description: exhausted ? "لا توجد أي وحدات متاحة للبيع الآن." : `المتوفر ${product.quantity} وحدات، وحد التنبيه ${product.lowStockAt}.`,
          page: "inventory",
        });
      });
      inactiveProducts.forEach(({ product, lastSoldAt }) => {
        items.push({
          id: `inactive-product-${product.id}-${lastSoldAt || "never"}`,
          kind: "info",
          title: `صنف بلا حركة: ${product.name}`,
          description: lastSoldAt ? `لم يسجل بيع للصنف خلال آخر 30 يومًا. آخر بيع: ${formatDate(lastSoldAt)}.` : "لم يسجل لهذا الصنف أي بيع بعد.",
          page: "inventory",
        });
      });
      expiringProducts.forEach(({ product, status }) => {
        const expired = status.kind === "expired";
        items.push({
          id: `expiry-${product.id}-${product.expiryDate}`,
          kind: expired ? "critical" : "warning",
          title: expired ? `انتهت صلاحية «${product.name}»` : `صلاحية قريبة: ${product.name}`,
          description: expired ? `تاريخ الصلاحية ${product.expiryDate}. أوقف بيع الصنف وراجعه.` : `تنتهي الصلاحية في ${product.expiryDate} بعد ${status.daysRemaining ?? 0} يوم.`,
          page: "inventory",
        });
      });
      reservationDueStatus.overdue.forEach((reservation) => {
        items.push({
          id: `reservation-overdue-${reservation.id}-${reservation.expiresOn}`,
          kind: "critical",
          title: `حجز منتهٍ: ${reservation.productName}`,
          description: `حجز ${reservation.quantity} وحدة للزبون ${reservation.customerName} انتهى في ${reservation.expiresOn}. استكمله أو ألغِه من المخزون.`,
          page: "inventory",
        });
      });
      reservationDueStatus.dueToday.forEach((reservation) => {
        items.push({
          id: `reservation-today-${reservation.id}-${reservation.expiresOn}`,
          kind: "warning",
          title: `حجز يستحق اليوم: ${reservation.productName}`,
          description: `حجز ${reservation.quantity} وحدة للزبون ${reservation.customerName} ينتهي اليوم. راجعه قبل إغلاق المتجر.`,
          page: "inventory",
        });
      });
      highReturnRateProducts.forEach((entry) => {
        items.push({
          id: `high-return-rate-${currentMonthKey}-${entry.productId}-${entry.returnRatePercent.toFixed(1)}`,
          kind: "warning",
          title: `نسبة إرجاع مرتفعة: ${entry.productName}`,
          description: `أُرجع ${entry.returnedUnits} من ${entry.soldUnits} وحدات مباعة هذا الشهر (${entry.returnRatePercent.toFixed(1)}%). راجع سبب الإرجاع والصنف.`,
          page: "reports",
        });
      });
    }
    if (notificationPreferences.stock) {
      supplierCreditStatus.groups.filter((group) => group.exceeded || group.nearing).forEach((group) => {
        items.push({
          id: `supplier-credit-${group.supplierName}-${group.outstanding}-${group.creditLimit}`,
          kind: group.exceeded ? "critical" : "warning",
          title: group.exceeded ? `تجاوز ائتمان المورد: ${group.supplierName}` : `اقتربت من سقف ائتمان ${group.supplierName}`,
          description: `الرصيد المستحق ${money(group.outstanding)} من سقف ${money(group.creditLimit)}${group.exceeded ? "؛ راجع دفعة للمورد." : "؛ جهّز دفعة قبل التجاوز."}`,
          page: "reports",
        });
      });
      supplierDueDateStatuses.filter((status) => status.overdue || status.nearing).forEach((status) => {
        items.push({
          id: `supplier-due-${status.supplierName}-${status.dueDate}-${status.outstanding}`,
          kind: status.overdue ? "critical" : "warning",
          title: status.overdue ? `استحقاق مورد متأخر: ${status.supplierName}` : `استحقاق مورد قريب: ${status.supplierName}`,
          description: status.overdue ? `تأخر استحقاق ${money(status.outstanding)} منذ ${Math.abs(status.daysUntilDue)} يوم. راجع دفعة المورد.` : `يستحق ${money(status.outstanding)} في ${status.dueDate} بعد ${status.daysUntilDue} ${status.daysUntilDue === 1 ? "يوم" : "أيام"}.`,
          page: "reports",
        });
      });
    }
    if (notificationPreferences.debts) {
      store.debts.filter((debt) => debt.amount > debt.paid).forEach((debt) => {
        const overdue = Boolean(debt.dueDate && debt.dueDate <= todayKey());
        items.push({
          id: `debt-${debt.id}-${debt.paid}`,
          kind: overdue ? "critical" : "info",
          title: overdue ? `ذمة مستحقة من ${debt.customerName}` : `ذمة تحتاج متابعة: ${debt.customerName}`,
          description: `${overdue ? "تجاوزت" : "المتبقي لدى الزبون"} ${money(Math.max(0, debt.amount - debt.paid))}${debt.dueDate ? ` · استحقاق ${debt.dueDate}` : ""}`,
          page: "debts",
        });
      });
    }
    if (notificationPreferences.cash && todayExpenseLimitStatus.active && (todayExpenseLimitStatus.nearing || todayExpenseLimitStatus.exceeded)) {
      items.push({
        id: `expense-limit-${todayKey()}-${todayExpenseLimitStatus.spent}-${todayExpenseLimitStatus.limit}`,
        kind: todayExpenseLimitStatus.exceeded ? "critical" : "warning",
        title: todayExpenseLimitStatus.exceeded ? "تجاوزت سقف مصروفات اليوم" : "اقتربت من سقف مصروفات اليوم",
        description: `سُجل ${money(todayExpenseLimitStatus.spent)} من سقف ${money(todayExpenseLimitStatus.limit)}${todayExpenseLimitStatus.exceeded ? "؛ راجع المصروفات قبل إغلاق الوردية." : `؛ المتبقي ${money(todayExpenseLimitStatus.remaining)}.`}`,
        page: "reports",
      });
    }
    if (notificationPreferences.goals && dailyGoalProgress.met) {
      items.push({
        id: `sales-goal-${todayKey()}-${dailyGoalProgress.target}`,
        kind: "info",
        title: "تم تحقيق هدف مبيعات اليوم",
        description: `المبيعات ${money(dailyGoalProgress.revenue)} بلغت أو تجاوزت هدف ${money(dailyGoalProgress.target)}.`,
        page: "dashboard",
      });
    }
    if (notificationPreferences.goals && monthlyGoalProgress.met) {
      items.push({
        id: `monthly-sales-goal-${currentMonthKey}-${monthlyGoalProgress.target}`,
        kind: "info",
        title: "تم تحقيق هدف مبيعات الشهر",
        description: `مبيعات الشهر ${money(monthlyGoalProgress.revenue)} بلغت أو تجاوزت هدف ${money(monthlyGoalProgress.target)}.`,
        page: "dashboard",
      });
    }
    if (notificationPreferences.backup && isBackupDueToday(lastBackupAt)) {
      items.push({
        id: `backup-${todayKey()}`,
        kind: "warning",
        title: "صدّر نسخة احتياطية اليوم",
        description: "احتفظ بنسخة من مبيعاتك ومخزونك وذممك قبل نهاية يوم العمل.",
        page: "settings",
      });
    }
    const priority: Record<NotificationKind, number> = { critical: 0, warning: 1, info: 2 };
    return items.sort((a, b) => priority[a.kind] - priority[b.kind]);
  }, [currentMonthKey, dailyGoalProgress, expiringProducts, highReturnRateProducts, inactiveProducts, lastBackupAt, lowStock, monthlyGoalProgress, nearDepletion, notificationPreferences, reservationDueStatus, store.debts, supplierCreditStatus, supplierDueDateStatuses, todayExpenseLimitStatus]);
  const unreadNotificationCount = useMemo(() => notifications.filter((notification) => !readNotificationKeys.includes(notification.id)).length, [notifications, readNotificationKeys]);
  const selectedCustomerCategory = useMemo(() => store.customerCategories.find((category) => category.id === selectedCustomerCategoryId), [selectedCustomerCategoryId, store.customerCategories]);
  const selectedStaffMember = useMemo(() => store.localStaff.find((member) => member.id === selectedStaffMemberId), [selectedStaffMemberId, store.localStaff]);
  const selectedReturnStaffMember = useMemo(() => store.localStaff.find((member) => member.id === returnStaffMemberId), [returnStaffMemberId, store.localStaff]);
  useEffect(() => {
    const rememberedId = readRememberedStaffMemberId();
    if (!store.localStaff.some((member) => member.id === selectedStaffMemberId) && store.localStaff.some((member) => member.id === rememberedId)) setSelectedStaffMemberId(rememberedId);
    if (!store.localStaff.some((member) => member.id === returnStaffMemberId) && store.localStaff.some((member) => member.id === rememberedId)) setReturnStaffMemberId(rememberedId);
  }, [returnStaffMemberId, selectedStaffMemberId, store.localStaff]);
  const activeSaleDiscountPercent = Math.min(100, Math.max(0, Number(saleDiscountPercent) || 0));
  const quantityOfferSummary = useMemo(() => getCartQuantityOfferSummary(cart.map((item) => ({ id: item.id, name: item.name, salePrice: item.salePrice, cartQuantity: item.cartQuantity, quantityOffers: item.quantityOffers }))), [cart]);
  const cartGrossSubtotal = cart.reduce((total, item) => total + item.salePrice * item.cartQuantity, 0);
  const saleTotals = useMemo(() => calculateSaleTotals(
    Math.max(0, cartGrossSubtotal - quantityOfferSummary.discountAmount),
    cart.reduce((total, item) => total + item.purchasePrice * item.cartQuantity, 0),
    activeSaleDiscountPercent,
  ), [activeSaleDiscountPercent, cart, cartGrossSubtotal, quantityOfferSummary.discountAmount]);
  const { discountPercent: cartDiscountPercent, discountAmount: manualCartDiscountAmount, total: cartTotal, profit: cartProfit } = saleTotals;
  const cartSubtotal = cartGrossSubtotal;
  const cartDiscountAmount = quantityOfferSummary.discountAmount + manualCartDiscountAmount;
  const paymentSplitTotal = useMemo(() => Object.values(paymentSplitAmounts).reduce((total, amount) => total + Math.max(0, Number(amount) || 0), 0), [paymentSplitAmounts]);
  const paymentSplitRemaining = cartTotal - paymentSplitTotal;
  const customerCreditStatus = useMemo(() => customerName.trim() ? getCustomerCreditStatus(customerName, store.customerCreditLimits, store.debts, paymentMethod === "credit" ? cartTotal : 0) : { outstanding: 0, pendingCredit: 0, projected: 0, limit: null, ratio: 0, blocked: false, warning: false }, [cartTotal, customerName, paymentMethod, store.customerCreditLimits, store.debts]);
  const filteredSaleProducts = useMemo(() => {
    return sortQuickSaleProducts(filterQuickSaleProducts(store.products.filter((product) => product.quantity > 0 && getExpiryStatus(product.expiryDate).kind !== "expired"), query, saleCategoryFilter), store.sales, saleProductSort);
  }, [store.products, store.sales, query, saleCategoryFilter, saleProductSort]);
  const searchedOutOfStockProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ar");
    if (!normalizedQuery) return [];
    return store.products.filter((product) => product.quantity <= 0 && (product.name.toLocaleLowerCase("ar").includes(normalizedQuery) || product.sku.toLocaleLowerCase("ar").includes(normalizedQuery))).slice(0, 2);
  }, [store.products, query]);
  const outOfStockAlternatives = useMemo(() => searchedOutOfStockProducts.flatMap((source) => {
    const selected = getAvailableAlternatives(source, store.products);
    const fallback = store.products.filter((product) => product.id !== source.id && product.category === source.category && product.quantity > 0 && getExpiryStatus(product.expiryDate).kind !== "expired");
    return (selected.length ? selected : fallback).slice(0, 4).map((product) => ({ sourceName: source.name, product }));
  }), [searchedOutOfStockProducts, store.products]);
  const saleCategories = useMemo(() => getQuickSaleCategories(store.products), [store.products]);
  const favoriteSaleProducts = useMemo(() => store.favoriteProductIds.map((id) => store.products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product && product.quantity > 0 && getExpiryStatus(product.expiryDate).kind !== "expired")), [store.favoriteProductIds, store.products]);
  const filteredInventory = useMemo(() => store.products.filter((product) => (product.name.includes(inventoryQuery.trim()) || product.sku.includes(inventoryQuery.trim()) || (product.shelfLocation || "").includes(inventoryQuery.trim())) && (!inventoryShelfFilter || product.shelfLocation === inventoryShelfFilter)).sort((left, right) => (left.shelfLocation || "~").localeCompare(right.shelfLocation || "~", "ar") || left.name.localeCompare(right.name, "ar")), [store.products, inventoryQuery, inventoryShelfFilter]);
  const itemSales = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    monthSales.forEach((sale) => sale.items.forEach((item) => {
      const existing = map.get(item.productId) ?? { name: item.name, quantity: 0, revenue: 0 };
      map.set(item.productId, { name: item.name, quantity: existing.quantity + item.quantity, revenue: existing.revenue + item.quantity * item.price });
    }));
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [monthSales]);
  const returnReasonSummary = useMemo(() => getReturnReasonSummary(store.sales), [store.sales]);
  const monthlyReturnComparison = useMemo(() => getMonthlyReturnComparison(store.sales, currentMonthKey), [currentMonthKey, store.sales]);
  const staffSalesReport = useMemo(() => getStaffSalesReport(store.sales, currentMonthKey), [currentMonthKey, store.sales]);
  const staffReturnsReport = useMemo(() => getStaffReturnsReport(store.sales, currentMonthKey), [currentMonthKey, store.sales]);
  const staffPerformanceReport = useMemo(() => {
    const entries = new Map<string, { staffMemberId: string; staffMemberName: string; salesInvoices: number; salesValue: number; returnInvoices: number; returnUnits: number; returnValue: number }>();
    store.sales.filter((sale) => sale.createdAt.slice(0, 7) === currentMonthKey).forEach((sale) => {
      const staffMemberId = sale.staffMemberId || "unassigned";
      const staffMemberName = sale.staffMemberName?.trim() || "غير محدد";
      const entry = entries.get(staffMemberId) ?? { staffMemberId, staffMemberName, salesInvoices: 0, salesValue: 0, returnInvoices: 0, returnUnits: 0, returnValue: 0 };
      if (sale.isReturn) {
        entry.returnInvoices += 1;
        entry.returnUnits += sale.items.reduce((total, item) => total + Math.abs(item.quantity), 0);
        entry.returnValue += Math.abs(Number(sale.total) || 0);
      } else {
        entry.salesInvoices += 1;
        entry.salesValue += Number(sale.total) || 0;
      }
      entries.set(staffMemberId, entry);
    });
    return Array.from(entries.values()).map((entry) => ({ ...entry, netValue: entry.salesValue - entry.returnValue })).sort((left, right) => right.netValue - left.netValue || right.salesValue - left.salesValue || left.staffMemberName.localeCompare(right.staffMemberName, "ar"));
  }, [currentMonthKey, store.sales]);
  const currentStaffMemberId = selectedStaffMemberId || returnStaffMemberId;
  const currentStaffMember = useMemo(() => store.localStaff.find((member) => member.id === currentStaffMemberId), [currentStaffMemberId, store.localStaff]);
  const currentStaffTodaySummary = useMemo(() => currentStaffMemberId ? getCurrentStaffDailySummary(todaySales, currentStaffMemberId) : { salesInvoices: 0, salesValue: 0, returnInvoices: 0, returnUnits: 0, returnValue: 0 }, [currentStaffMemberId, todaySales]);
  const inventoryCategorySummary = useMemo(() => getInventoryCategorySummary(store.products), [store.products]);
  const customerStatementNames = useMemo(() => Array.from(new Set([...store.sales.filter((sale) => sale.paymentMethod === "credit" && sale.customerName).map((sale) => sale.customerName as string), ...store.debtCollections.map((collection) => collection.customerName)])), [store.debtCollections, store.sales]);
  const customerStatement = useMemo(() => customerStatementName ? getCustomerStatement(customerStatementName, store.sales, store.debtCollections) : null, [customerStatementName, store.debtCollections, store.sales]);

  const setActivePage = (next: Page) => {
    setPage(next);
    setMobileNav(false);
  };

  const openSale = () => {
    if (!store.products.length) {
      setShowProductForm(true);
      toast.info("أضف أول صنف حقيقي من مخزون محلك قبل بدء البيع.");
      return;
    }
    setSelectedCustomerCategoryId("");
    setSaleDiscountPercent(String(store.defaultDiscountPercent));
    setActivePage("sale");
  };

  const markNotificationRead = (id: string) => {
    setReadNotificationKeys((current) => current.includes(id) ? current : [...current, id]);
  };

  const openNotification = (notification: NotificationItem) => {
    markNotificationRead(notification.id);
    setActivePage(notification.page);
    setNotificationsOpen(false);
  };

  const markAllNotificationsRead = () => {
    setReadNotificationKeys((current) => Array.from(new Set([...current, ...notifications.map((notification) => notification.id)])));
    toast.success("تم تعليم كل الإشعارات كمقروءة.");
  };

  const addToCart = (product: Product) => {
    if (getExpiryStatus(product.expiryDate).kind === "expired") {
      toast.error(`لا يمكن بيع «${product.name}» لأن تاريخ صلاحيته منتهٍ.`);
      return;
    }
    setCart((current) => {
      const update = addScannedProductToCart(current, product);
      if (!update.added) {
        toast.error("لا تتوفر كمية إضافية من هذا الصنف.");
        return current;
      }
      return update.cart;
    });
  };

  const toggleFavoriteProduct = (productId: string) => {
    if (trainingMode) { toast.info("المفضلة لا تتغير أثناء وضع التدريب."); return; }
    setStore((current) => ({ ...current, favoriteProductIds: current.favoriteProductIds.includes(productId) ? current.favoriteProductIds.filter((id) => id !== productId) : [productId, ...current.favoriteProductIds] }));
  };

  const resetSaleDraft = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedCustomerCategoryId("");
    setSaleDiscountPercent(String(store.defaultDiscountPercent));
    setSaleNote("");
    setSaleOrderReference("");
    setSaleCostCenter("");
    setPaymentMethod("cash");
    setBankName("");
    setMixedPaymentEnabled(false);
    setPaymentSplitAmounts({ cash: "", card: "", transfer: "", credit: "" });
    setMixedBankName("");
    setMixedPosTerminalType("");
    setPosTerminalType("");
  };

  const startTrainingMode = () => {
    if (trainingMode) return;
    if (cart.length && !window.confirm("سيتم تفريغ السلة الحالية للدخول إلى وضع التدريب. لن تُحفظ أي عملية تدريب. هل تريد المتابعة؟")) return;
    trainingStoreRef.current = store;
    resetSaleDraft();
    setTrainingMode(true);
    setPage("sale");
    setMobileNav(false);
    toast.info(getTrainingModeMessage(true));
  };

  const stopTrainingMode = () => {
    if (!trainingMode) return;
    resetSaleDraft();
    const originalStore = trainingStoreRef.current;
    trainingStoreRef.current = null;
    setTrainingMode(false);
    if (originalStore) setStore(originalStore);
    toast.success("تم الخروج من وضع التدريب. بقيت بيانات المحل كما هي.");
  };

  const suspendCurrentSale = () => {
    if (trainingMode) { toast.info("لا يمكن تعليق سلة أثناء التدريب لأنها لا تُحفظ."); return; }
    if (!cart.length) {
      toast.error("أضف صنفًا واحدًا على الأقل قبل تعليق السلة.");
      return;
    }
    const draft = createSuspendedSaleDraft({ id: makeId("sale-hold"), createdAt: new Date().toISOString(), label: suspendedSaleLabel, items: cart, paymentMethod, bankName, posTerminalType, customerName, customerPhone, customerCategoryId: selectedCustomerCategoryId, staffMemberId: selectedStaffMemberId, discountPercent: activeSaleDiscountPercent, note: saleNote, orderReference: saleOrderReference });
    setStore((current) => ({ ...current, suspendedSaleDrafts: [draft, ...current.suspendedSaleDrafts].slice(0, 30) }));
    setSuspendedSaleLabel("");
    resetSaleDraft();
    toast.success(`تم تعليق «${draft.label}» محليًا دون تعديل المخزون.`);
  };

  const resumeSuspendedSale = (draft: SuspendedSaleDraft) => {
    const { items, skipped } = restoreSuspendedCartItems(store.products.filter((product) => getExpiryStatus(product.expiryDate).kind !== "expired"), draft);
    if (!items.length) {
      toast.error("لا يمكن استئناف هذه السلة لأن أصنافها لم تعد متاحة للبيع.");
      return;
    }
    setCart(items);
    setPaymentMethod(draft.paymentMethod);
    setBankName(draft.bankName || "");
    setPosTerminalType(draft.posTerminalType || "");
    setCustomerName(draft.customerName);
    setCustomerPhone(draft.customerPhone);
    setSelectedCustomerCategoryId(store.customerCategories.some((category) => category.id === draft.customerCategoryId) ? draft.customerCategoryId : "");
    setSelectedStaffMemberId(store.localStaff.some((member) => member.id === draft.staffMemberId) ? draft.staffMemberId : "");
    setSaleDiscountPercent(String(draft.discountPercent));
    setSaleNote(draft.note);
    setSaleOrderReference(draft.orderReference);
    setStore((current) => ({ ...current, suspendedSaleDrafts: current.suspendedSaleDrafts.filter((entry) => entry.id !== draft.id) }));
    if (skipped) toast.info(`استؤنفت السلة بعد استبعاد ${skipped} أصناف غير متاحة وتحديث الكميات وفق المخزون الحالي.`);
    else toast.success("تم استئناف السلة وتحديثها وفق المخزون الحالي.");
  };

  const deleteSuspendedSale = (draft: SuspendedSaleDraft) => {
    if (!window.confirm(`سيُحذف تعليق «${draft.label}» دون إنشاء فاتورة. هل تريد المتابعة؟`)) return;
    setStore((current) => ({ ...current, suspendedSaleDrafts: current.suspendedSaleDrafts.filter((entry) => entry.id !== draft.id) }));
    toast.success("تم حذف السلة المعلقة محليًا.");
  };

  const repeatSale = (source: Sale) => {
    if (cart.length && !window.confirm("سيُستبدل محتوى السلة الحالية بالفاتورة السابقة. هل تريد المتابعة؟")) return;
    const { items, skipped } = rebuildRepeatSaleCart(store.products.filter((product) => getExpiryStatus(product.expiryDate).kind !== "expired"), source);
    if (!items.length) {
      toast.error("لا يمكن تكرار الفاتورة لأن أصنافها لم تعد متاحة للبيع.");
      return;
    }
    setCart(items);
    setPaymentMethod(source.paymentMethod);
    setBankName(source.bankName || "");
    setPosTerminalType(source.posTerminalType || "");
    setCustomerName(source.customerName || "");
    setCustomerPhone(source.customerPhone || "");
    setSelectedCustomerCategoryId(store.customerCategories.some((category) => category.id === source.customerCategoryId) ? source.customerCategoryId || "" : "");
    setSelectedStaffMemberId(store.localStaff.some((member) => member.id === source.staffMemberId) ? source.staffMemberId || "" : "");
    setSaleDiscountPercent(String(source.discountPercent || store.defaultDiscountPercent));
    setSaleNote(source.note || "");
    setSaleOrderReference("");
    setLatestSale(null);
    setActivePage("sale");
    if (skipped) toast.info(`تمت إعادة تجهيز السلة بعد استبعاد ${skipped} أصناف غير متاحة وتحديث الكميات والأسعار الحالية.`);
    else toast.success("تمت إعادة تجهيز الفاتورة بالأسعار والكميات الحالية. راجع السلة قبل التأكيد.");
  };

  const openPriceLookup = () => {
    if (!store.products.length) {
      toast.info("أضف صنفًا واحدًا على الأقل قبل استخدام استعلام السعر.");
      return;
    }
    setPriceLookupQuery("");
    setPriceLookupResult(null);
    setShowPriceLookup(true);
  };

  const lookupProductPrice = useCallback((value: string) => {
    const queryValue = value.trim();
    if (!queryValue) return;
    const product = findPriceLookupProduct(store.products, queryValue);
    const lookedUpAt = new Date().toISOString();
    setPriceLookupQuery(queryValue);
    setPriceLookupResult(product ?? null);
    setStore((current) => ({
      ...current,
      priceLookupHistory: appendPriceLookupHistory(current.priceLookupHistory, {
        id: makeId("price-lookup"),
        query: queryValue,
        productId: product?.id || `not-found:${queryValue.toLocaleLowerCase("ar")}`,
        productName: product?.name || "باركود غير مسجل",
        found: Boolean(product),
        lookedUpAt,
      }),
    }));
    if (product) toast.success(`سعر «${product.name}»: ${money(product.salePrice)}.`);
    else toast.error(`لا يوجد صنف مسجل للرمز أو البحث «${queryValue}».`);
  }, [store.products]);

  const handleBarcodeDetected = useCallback((barcode: string, shouldPlaySuccessFeedback = true) => {
    setShowBarcodeScanner(false);
    const product = findProductByBarcode(store.products, barcode);
    if (product) {
      if (getExpiryStatus(product.expiryDate).kind === "expired") {
        playBarcodeFeedback("error", barcodeFeedbackSoundEnabled);
        vibrateBarcodeFeedback("error", barcodeFeedbackVibrationEnabled);
        const message = `تم مسح «${product.name}» لكن صلاحيته منتهية ولا يمكن إضافته للبيع.`;
        setCartBarcodeFeedback({ kind: "error", mode: "sale", productName: product.name, message });
        toast.error(message, { className: "barcode-toast barcode-toast--error" });
        return;
      }
      const nextQuantity = (cart.find((item) => item.id === product.id)?.cartQuantity ?? 0) + 1;
      if (nextQuantity > product.quantity) {
        playBarcodeFeedback("error", barcodeFeedbackSoundEnabled);
        vibrateBarcodeFeedback("error", barcodeFeedbackVibrationEnabled);
        const message = `لا تتوفر كمية إضافية من «${product.name}» في المخزون.`;
        setCartBarcodeFeedback({ kind: "error", mode: "sale", productName: product.name, message });
        toast.error(message, { className: "barcode-toast barcode-toast--error" });
        return;
      }
      addToCart(product);
      const message = getCartBarcodeFeedbackMessage("sale", product.name, nextQuantity);
      setCartBarcodeFeedback({ kind: "success", mode: "sale", productName: product.name, message });
      setCartAdditionPulse((current) => current + 1);
      if (shouldPlaySuccessFeedback) {
        playBarcodeFeedback("success", barcodeFeedbackSoundEnabled);
        vibrateBarcodeFeedback("success", barcodeFeedbackVibrationEnabled);
      }
      toast.success(message, { className: "barcode-toast barcode-toast--success" });
      return;
    }
    playBarcodeFeedback("not-found", barcodeFeedbackSoundEnabled);
    vibrateBarcodeFeedback("not-found", barcodeFeedbackVibrationEnabled);
    setCartBarcodeFeedback({ kind: "error", mode: "sale", message: `الرمز ${barcode} غير مسجل. أضف بيانات الصنف لحفظه.` });
    setPendingBarcode(barcode);
    setShowProductForm(true);
    toast.error(`الرمز ${barcode} غير مسجل. أضف بيانات الصنف لحفظه.`, { className: "barcode-toast barcode-toast--error" });
  }, [barcodeFeedbackSoundEnabled, barcodeFeedbackVibrationEnabled, cart, store.products]);

  const addPriceLookupResultToCart = () => {
    if (!priceLookupResult) return;
    const cartQuantity = cart.find((item) => item.id === priceLookupResult.id)?.cartQuantity ?? 0;
    const canAdd = getExpiryStatus(priceLookupResult.expiryDate).kind !== "expired" && cartQuantity < priceLookupResult.quantity;
    if (!canAdd) {
      handleBarcodeDetected(priceLookupResult.sku);
      return;
    }
    handleBarcodeDetected(priceLookupResult.sku, false);
    playBarcodeFeedback("success", barcodeFeedbackSoundEnabled);
    vibrateBarcodeFeedback("success", barcodeFeedbackVibrationEnabled);
    setShowPriceLookup(false);
    setShowPriceLookupScanner(false);
  };

  const handleStocktakeBarcodeDetected = useCallback((barcode: string) => {
    setShowStocktakeScanner(false);
    const product = findProductByBarcode(store.products, barcode);
    if (!product) {
      toast.error("هذا الباركود غير مسجل في المخزون. أضف الصنف أولًا.");
      return;
    }
    setStocktakeProduct(product);
    setStocktakeQuantity(String(product.quantity));
  }, [store.products]);

  const recordReceivingSessionEvent = (kind: ReceivingSessionEventKind, barcode: string, productName = "", quantity?: number) => {
    setReceivingSessionHistory((current) => appendReceivingSessionEvent(current, { id: makeId("receiving-scan"), kind, barcode, productName, createdAt: new Date().toISOString(), quantity }));
  };

  const reviewReceivingSessionProduct = (barcode: string) => {
    const product = findProductByBarcode(store.products, barcode);
    if (!product) {
      toast.error("لم يعد هذا الباركود مرتبطًا بصنف محفوظ.");
      return;
    }
    setReceivingBarcode(barcode);
    setReceivingProductId(product.id);
    setReceivingQuantity("1");
    setReceivingPurchasePrice(String(product.purchasePrice));
    toast.info(`تم فتح «${product.name}» لمراجعة الاستلام.`);
  };

  const setQuickReceivingQuantity = (change: number) => {
    if (!receivingProductId) {
      toast.info("تعرّف على صنف أولًا لتحديد كمية الاستلام.");
      return;
    }
    setReceivingQuantity((current) => String(adjustReceivingQuantity(current, change)));
  };

  const detectReceivingBarcode = (rawBarcode: string) => {
    const barcode = rawBarcode.trim();
    if (!barcode) {
      const message = getReceivingBarcodeEmptyGuidance();
      setReceivingFeedback({ kind: "error", message });
      playBarcodeFeedback("error", barcodeFeedbackSoundEnabled);
      vibrateBarcodeFeedback("error", barcodeFeedbackVibrationEnabled);
      toast.error(message);
      return;
    }
    const product = findProductByBarcode(store.products, barcode);
    setReceivingBarcode(barcode);
    if (product) {
      const scannedAt = new Date().toISOString();
      setReceivingProductId(product.id);
      setReceivingQuantity("1");
      setReceivingPurchasePrice(String(product.purchasePrice));
      const message = getBarcodeFeedbackMessage("success", product.name);
      setReceivingFeedback({ kind: "success", message });
      playBarcodeFeedback("success", barcodeFeedbackSoundEnabled);
      vibrateBarcodeFeedback("success", barcodeFeedbackVibrationEnabled);
      setReceivingSession((current) => ({ ...current, scans: current.scans + 1, found: current.found + 1 }));
      recordReceivingSessionEvent("success", barcode, product.name);
      setStore((current) => ({ ...current, dailySuccessfulReceivingScans: appendSuccessfulReceivingScan(current.dailySuccessfulReceivingScans, { id: makeId("receiving-daily-scan"), productId: product.id, productName: product.name, barcode, scannedAt }) }));
      toast.success(`تم التعرف على «${product.name}». أدخل كمية الاستلام ثم اعتمدها.`);
      return;
    }
    const message = getBarcodeFeedbackMessage("not-found");
    setReceivingFeedback({ kind: "not-found", message });
    playBarcodeFeedback("not-found", barcodeFeedbackSoundEnabled);
    vibrateBarcodeFeedback("not-found", barcodeFeedbackVibrationEnabled);
    setReceivingSession((current) => ({ ...current, scans: current.scans + 1, notFound: current.notFound + 1 }));
    recordReceivingSessionEvent("not-found", barcode);
    setPendingBarcode(barcode);
    setEditingProduct(null);
    setPendingProductImage("");
    setShowGoodsReceiving(false);
    setShowProductForm(true);
    toast.info(`الباركود ${barcode} غير مسجل. أضف بيانات الصنف الجديد وسيُحفظ الباركود تلقائيًا.`);
  };

  const saveGoodsReceipt = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const product = store.products.find((item) => item.id === receivingProductId);
    const quantity = clampReceivingQuantity(Number(data.get("quantity")));
    const purchasePrice = Number(data.get("purchasePrice"));
    const supplierName = String(data.get("supplierName") || "").trim();
    const expiryDate = String(data.get("expiryDate") || "").trim();
    const purchaseInvoiceRef = String(data.get("purchaseInvoiceRef") || "").trim();
    const note = String(data.get("note") || "").trim();
    const receivingStaffMember = store.localStaff.find((member) => member.id === receivingStaffMemberId);
    if (!product || !receivingBarcode || quantity < 1 || !Number.isFinite(quantity) || !Number.isFinite(purchasePrice) || purchasePrice < 0 || (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate))) {
      toast.error("تحقق من الصنف والكمية وسعر الشراء وتاريخ الصلاحية.");
      return;
    }
    const receivedAt = new Date().toISOString();
    const receipt: GoodsReceipt = { id: makeId("receipt"), productId: product.id, productName: product.name, barcode: receivingBarcode, quantity, purchasePrice, supplierName, expiryDate, purchaseInvoiceRef, receivedAt, note, staffMemberId: receivingStaffMember?.id, staffMemberName: receivingStaffMember?.name };
    const costReview = getReceivingCostReview(product.purchasePrice, purchasePrice);
    setStore((current) => ({
      ...current,
      products: current.products.map((item) => {
        if (item.id !== product.id) return item;
        const openingBatches = item.batches?.length ? item.batches : item.quantity > 0 ? [{ id: makeId("batch"), receivedAt, quantity: item.quantity, remainingQuantity: item.quantity, purchasePrice: item.purchasePrice, expiryDate: item.expiryDate || "", supplierName: item.supplierName || "رصيد سابق", note: "رصيد سابق قبل الاستلام" }] : [];
        const batches = [...openingBatches, { id: makeId("batch"), receivedAt, quantity, remainingQuantity: quantity, purchasePrice, expiryDate, supplierName, purchaseInvoiceRef, note: note || "استلام بالباركود", staffMemberId: receivingStaffMember?.id, staffMemberName: receivingStaffMember?.name }];
        return { ...item, quantity: item.quantity + quantity, purchasePrice, supplierName: supplierName || item.supplierName, batches, expiryDate: getEarliestActiveExpiry(batches) || item.expiryDate };
      }),
      goodsReceipts: [receipt, ...current.goodsReceipts],
    }));
    setReceivingProductId("");
    setReceivingBarcode("");
    setReceivingQuantity("1");
    setReceivingPurchasePrice("");
    setReceivingStaffMemberId("");
    setShowGoodsReceiving(false);
    setLatestGoodsReceipt(receipt);
    setLatestGoodsReceiptReview(costReview);
    setReceivingSession((current) => ({ ...current, receivedUnits: current.receivedUnits + quantity }));
    recordReceivingSessionEvent("received", receipt.barcode, receipt.productName, quantity);
    toast.success(`تم استلام ${quantity} من «${product.name}» وإضافتها إلى المخزون.`);
  };

  const openBarcodeStocktake = () => {
    if (!store.products.length) {
      toast.info("أضف صنفًا واحدًا على الأقل قبل بدء جولة الجرد بالباركود.");
      return;
    }
    if (!store.barcodeStocktakeDraft) {
      const now = new Date().toISOString();
      setStore((current) => ({ ...current, barcodeStocktakeDraft: createBarcodeStocktakeDraft(makeId("barcode-stocktake"), now) }));
    }
    setBarcodeStocktakeQuery("");
    setBarcodeStocktakeOnlyPending(false);
    setBarcodeStocktakeShelfFilter(inventoryShelfFilter);
    setExternalBarcodeReaderActive(true);
    setShowBarcodeStocktake(true);
    toast.info("قارئ USB أو بلوتوث جاهز: امسح الرمز ثم أرسل Enter. تبقى حقول العدّ اليدوية مستقلة.");
  };

  const updateBarcodeStocktakeCount = (productId: string, value: string) => {
    if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || !Number.isInteger(Number(value)))) return;
    setStore((current) => {
      const now = new Date().toISOString();
      const draft = current.barcodeStocktakeDraft ?? createBarcodeStocktakeDraft(makeId("barcode-stocktake"), now);
      const counts = { ...draft.counts };
      if (value === "") delete counts[productId];
      else counts[productId] = Math.max(0, Math.floor(Number(value)));
      return { ...current, barcodeStocktakeDraft: { ...draft, updatedAt: now, counts } };
    });
  };

  const updateProductShelfLocation = (productId: string, value: string) => {
    const shelfLocation = value.trim().slice(0, 50);
    setStore((current) => ({ ...current, products: current.products.map((product) => product.id === productId ? { ...product, shelfLocation } : product) }));
  };

  const handleBarcodeStocktakeDetected = useCallback((barcode: string) => {
    const product = findProductByBarcode(store.products, barcode);
    if (!product) {
      setShowBarcodeStocktakeScanner(false);
      setUnmatchedBarcodeStocktakeValue(barcode.trim());
      setBarcodeStocktakeQuery("");
      toast.info("لم يطابق الرمز صنفًا محفوظًا. اختر الصنف الصحيح أدناه لربطه ثم يُحسب المسح.");
      return;
    }
    setStore((current) => {
      const now = new Date().toISOString();
      const draft = current.barcodeStocktakeDraft ?? createBarcodeStocktakeDraft(makeId("barcode-stocktake"), now);
      return { ...current, barcodeStocktakeDraft: { ...draft, updatedAt: now, counts: incrementBarcodeStocktakeCount(draft.counts, product.id) } };
    });
  }, [store.products]);

  const linkUnmatchedBarcodeToStocktakeProduct = (productId: string) => {
    const barcode = unmatchedBarcodeStocktakeValue.trim();
    const selectedProduct = store.products.find((product) => product.id === productId);
    if (!barcode || !selectedProduct) return;
    const matchedProduct = findProductByBarcode(store.products, barcode);
    if (matchedProduct && matchedProduct.id !== productId) {
      toast.error(`هذا الرمز مرتبط بالفعل بالصنف «${matchedProduct.name}».`);
      return;
    }
    setStore((current) => {
      const now = new Date().toISOString();
      const draft = current.barcodeStocktakeDraft ?? createBarcodeStocktakeDraft(makeId("barcode-stocktake"), now);
      return {
        ...current,
        products: current.products.map((product) => product.id === productId ? { ...product, barcodeAliases: appendBarcodeAlias(product.barcodeAliases, barcode) } : product),
        barcodeStocktakeDraft: { ...draft, updatedAt: now, counts: incrementBarcodeStocktakeCount(draft.counts, productId) },
      };
    });
    setUnmatchedBarcodeStocktakeValue("");
    toast.success(`تم ربط «${barcode}» بالصنف «${selectedProduct.name}» وحُسبت وحدة في الجولة.`);
  };

  useEffect(() => {
    if (!showBarcodeStocktake || !externalBarcodeReaderActive) return;
    const handleExternalReaderKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']") || event.ctrlKey || event.metaKey || event.altKey) return;
      const capture = captureExternalBarcodeKey(externalBarcodeBufferRef.current, event.key, Date.now());
      externalBarcodeBufferRef.current = capture.buffer;
      if (!capture.barcode) return;
      event.preventDefault();
      handleBarcodeStocktakeDetected(capture.barcode);
    };
    window.addEventListener("keydown", handleExternalReaderKey);
    return () => window.removeEventListener("keydown", handleExternalReaderKey);
  }, [externalBarcodeReaderActive, handleBarcodeStocktakeDetected, showBarcodeStocktake]);

  const connectThermalPrinter = async () => {
    const bluetooth = (navigator as BluetoothCapableNavigator).bluetooth;
    if (!bluetooth) {
      toast.info("اربط الطابعة الحرارية من إعدادات الهاتف أو الكمبيوتر، ثم اخترها من نافذة الطباعة.");
      return;
    }
    try {
      const device = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [] });
      setPrinterSettings((current) => ({ ...current, ...makeDetectedPrinterProfile(device.name || "طابعة بلوتوث مرتبطة", "bluetooth") }));
      toast.success(`تم اختيار ${device.name || "الطابعة"}. استخدم زر طباعة الفاتورة لإرسالها عبر نافذة النظام.`);
    } catch {
      toast.info("لم يتم اختيار طابعة. يمكنك المحاولة لاحقًا من الإعدادات.");
    }
  };

  const detectUsbThermalPrinter = async () => {
    const usb = (navigator as UsbCapableNavigator).usb;
    if (!usb) {
      toast.info("لا يدعم هذا المتصفح كشف USB. استخدم «اختبار الطباعة» لاختيار الطابعة من نظام أندرويد.");
      return;
    }
    try {
      const device = await usb.requestDevice({ filters: [] });
      const detectedName = device.productName || `طابعة USB (${device.vendorId ?? ""}:${device.productId ?? ""})`;
      const detectedWidth = inferThermalPaperWidth(detectedName);
      setPrinterSettings((current) => ({ ...current, ...makeDetectedPrinterProfile(detectedName, "usb"), paperWidth: detectedWidth }));
      toast.success(`تم التعرف على ${detectedName}. راجع مقاس الورق ثم نفّذ اختبار الطباعة.`);
    } catch {
      toast.info("لم يتم اختيار طابعة USB. يمكنك استخدام اختبار الطباعة من نظام أندرويد.");
    }
  };

  const changeCartQuantity = (id: string, change: number) => {
    setCart((current) => current.flatMap((item) => {
      const available = store.products.find((product) => product.id === id)?.quantity ?? item.quantity;
      const nextQuantity = item.cartQuantity + change;
      if (nextQuantity <= 0) return [];
      if (nextQuantity > available) {
        toast.error("الكمية المطلوبة أكبر من المتوفر.");
        return [item];
      }
      return [{ ...item, cartQuantity: nextQuantity }];
    }));
  };

  const setCartQuantity = (id: string, quantity: number) => {
    setCart((current) => current.flatMap((item) => {
      const available = store.products.find((product) => product.id === id)?.quantity ?? item.quantity;
      const nextQuantity = Math.floor(quantity);
      if (nextQuantity <= 0) return [];
      if (nextQuantity > available) {
        toast.error(`المتاح من هذا الصنف ${available} فقط.`);
        return [{ ...item, cartQuantity: available }];
      }
      return [{ ...item, cartQuantity: nextQuantity }];
    }));
  };

  const openSystemPrint = (title: string, content: string, targetWindow?: Window | null) => {
    const receiptWindow = targetWindow ?? window.open("", "_blank", "width=390,height=650");
    if (!receiptWindow) {
      toast.error("تعذّر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.");
      return false;
    }
    const { isA4, pageSize, contentWidth, padding, fontSize } = getPrintLayout(printerSettings.paperWidth);
    const logoSizing = getReceiptLogoSizing(printerSettings.paperWidth);
    receiptWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:${pageSize};margin:${isA4 ? "8mm" : "0"}}*{box-sizing:border-box}body{font-family:Arial,"Noto Sans Arabic",sans-serif;width:${contentWidth};box-sizing:border-box;margin:0 auto;color:#173c31;padding:${padding};font-size:${fontSize};background:#fff}.receipt-brand{text-align:center;margin:0 0 5px}.receipt-brand img{display:block;width:auto!important;height:auto!important;max-width:${logoSizing.maxWidthMm}mm!important;max-height:${logoSizing.maxHeightMm}mm!important;margin:0 auto 4px;object-fit:${logoSizing.objectFit}}h1{font-size:${isA4 ? "24px" : "18px"};margin:0 0 4px;text-align:center}p{text-align:center;color:#617066;margin:3px 0 10px}table{width:100%;border-collapse:collapse}th{text-align:right;color:#547065;font-size:.9em;padding:5px 0;border-bottom:1px solid #bfc9bf}td{padding:5px 0;border-bottom:1px dashed #bfc9bf}td:nth-child(2),td:nth-child(3),th:nth-child(2),th:nth-child(3){text-align:left;white-space:nowrap}.total{font-size:1.3em;font-weight:bold;border-top:2px solid #173c31;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between}.foot{font-size:.82em;margin-top:12px}.tag{display:inline-block;background:#edf2e8;padding:3px 7px;border-radius:999px;font-size:.9em}.receipt-qr{margin:10px auto 0;text-align:center}.receipt-qr img{width:${isA4 ? "32mm" : "24mm"};height:${isA4 ? "32mm" : "24mm"};display:block;margin:0 auto}.receipt-qr small{display:block;margin-top:2px;color:#687b70;font-size:.72em}.test-rule{border-top:1px dashed #173c31;margin:10px 0}.test-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;text-align:center}.test-grid span{padding:5px;background:#f2f5ef;border-radius:4px;font-size:.9em}.payment-summary{margin-top:10px;padding:8px;background:#f4f7f1;border:1px solid #cbd8c9;border-radius:5px}.payment-summary>strong{display:block;margin-bottom:4px;color:#173c31}.payment-summary-line,.payment-summary-total{display:flex;justify-content:space-between;gap:8px;padding:3px 0}.payment-summary-total{margin-top:4px;padding-top:5px;border-top:1px dashed #8da493;font-weight:bold}@media print{button{display:none}}</style></head><body>${content}<script>window.onload=()=>window.print()<\/script></body></html>`);
    const thermalOverrides = getThermalReceiptStyleOverrides(isA4, { textSize: store.receiptTextSize, clarity: store.receiptPrintClarity });
    if (thermalOverrides) receiptWindow.document.head.insertAdjacentHTML("beforeend", thermalOverrides);
    receiptWindow.document.close();
    return true;
  };

  const printReceivingBarcodeLabel = (product: Product) => {
    const barcode = getPrintableBarcodeValue(product.sku);
    if (!barcode) {
      toast.error("لا يمكن طباعة ملصق باركود لهذا الصنف لأن الرمز غير صالح للطباعة.");
      return;
    }
    const barcodeSvg = createCode128Svg(barcode);
    if (!barcodeSvg) {
      toast.error("تعذر تجهيز الباركود للطباعة على هذا الجهاز.");
      return;
    }
    openSystemPrint(`ملصق باركود ${product.name}`, buildReceivingBarcodeLabelHtml({ storeName: store.storeName, productName: product.name, barcode, price: money(product.salePrice), barcodeSvg }));
  };

  const printReceipt = async (sale: Sale) => {
    const receiptWindow = window.open("", "_blank", "width=390,height=650");
    if (!receiptWindow) {
      toast.error("تعذّر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.");
      return;
    }
    const rows = sale.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${money(item.price * item.quantity)}</td></tr>`).join("");
    const discountLine = sale.discountAmount ? `<div class="summary-line"><span>الخصم${sale.discountPercent ? ` (${sale.discountPercent}%)` : ""}</span><span>- ${money(sale.discountAmount)}</span></div>` : "";
    const phoneLine = store.storePhone ? `<br/>هاتف: ${escapeHtml(store.storePhone)}` : "";
    const receiptLogo = getReceiptLogoSource(store.receiptLogo, logoUrl);
    const customQrContent = store.receiptQrContent.trim();
    const qrDataUrl = await makeReceiptQrDataUrl(customQrContent || buildReceiptQrPayload(sale, store.storeName, store.storePhone)).catch(() => "");
    const qrBlock = buildReceiptQrMarkup(qrDataUrl, customQrContent ? "امسح لفتح معلومات المحل" : "امسح لعرض ملخص الفاتورة");
    const receiptPaymentSplits = sale.paymentSplits?.length ? sale.paymentSplits : [{ paymentMethod: sale.paymentMethod, amount: Math.abs(sale.total), bankName: sale.bankName, posTerminalType: sale.posTerminalType }];
    const paymentDetailsHtml = `<div class="payment-summary"><strong>${sale.paymentSplits?.length ? "تفاصيل الدفع المختلط" : "طريقة الدفع"}</strong>${receiptPaymentSplits.map((split) => `<div class="payment-summary-line"><span>${getPaymentMethodLabel(split.paymentMethod)}</span><b>${money(split.amount)}</b></div>`).join("")}<div class="payment-summary-total"><span>إجمالي المدفوع</span><b>${money(receiptPaymentSplits.reduce((sum, split) => sum + split.amount, 0))}</b></div></div>`;
    const receiptContent = buildReceiptPrintHtml({
      brandHtml: `<div class="receipt-brand"><img src="${receiptLogo}" alt="شعار ${escapeHtml(store.storeName)}" /><h1>${escapeHtml(store.storeName)}</h1></div>`,
      invoiceHtml: `<p>فاتورة رقم ${sale.id.slice(-5)} · ${formatDate(sale.createdAt)}${sale.orderReference ? `<br/>مرجع الطلب: ${escapeHtml(sale.orderReference)}` : ""}${sale.staffMemberName ? `<br/>البائع: ${escapeHtml(sale.staffMemberName)}` : ""}${sale.note ? `<br/>ملاحظة: ${escapeHtml(sale.note)}` : ""}</p>`,
      rowsHtml: rows,
      subtotalHtml: sale.subtotal !== undefined ? `<div class="summary-line"><span>المجموع</span><span>${money(sale.subtotal)}</span></div>` : "",
      discountHtml: discountLine,
      totalHtml: `<div class="total"><span>الإجمالي</span><span>${money(sale.total)}</span></div>`,
      qrHtml: qrBlock,
      footerHtml: `${paymentDetailsHtml}<p class="foot">شكرًا لتسوقكم معنا${phoneLine}</p>`,
    });
    openSystemPrint(`فاتورة ${sale.id.slice(-5)}`, receiptContent, receiptWindow);
  };

  const printReturnReceipt = (returnSale: Sale) => {
    const originalInvoiceNumber = returnSale.returnOfSaleId?.slice(-5) || "غير محدد";
    const receiptLogo = getReceiptLogoSource(store.receiptLogo, logoUrl);
    const phoneLine = store.storePhone ? `<br/>هاتف: ${escapeHtml(store.storePhone)}` : "";
    const receiptContent = buildReceiptPrintHtml({
      brandHtml: `<div class="receipt-brand"><img src="${receiptLogo}" alt="شعار ${escapeHtml(store.storeName)}" /><h1>${escapeHtml(store.storeName)}</h1></div>`,
      invoiceHtml: `<p>إيصال إرجاع رقم ${returnSale.id.slice(-5)} · ${formatDate(returnSale.createdAt)}<br/>مرجع الفاتورة ${escapeHtml(originalInvoiceNumber)}${returnSale.staffMemberName ? `<br/>الموظف: ${escapeHtml(returnSale.staffMemberName)}` : ""}</p>`,
      rowsHtml: buildReturnReceiptRows(returnSale),
      subtotalHtml: returnSale.subtotal !== undefined ? `<div class="summary-line"><span>قيمة الأصناف</span><span>${money(Math.abs(returnSale.subtotal))}</span></div>` : "",
      discountHtml: returnSale.discountAmount ? `<div class="summary-line"><span>تسوية الخصم</span><span>${money(Math.abs(returnSale.discountAmount))}</span></div>` : "",
      totalHtml: `<div class="total"><span>إجمالي الإرجاع</span><span>${money(Math.abs(returnSale.total))}</span></div>`,
      qrHtml: "",
      footerHtml: `<p class="foot"><span class="tag">تسوية الإرجاع: ${getPaymentMethodLabel(returnSale.paymentMethod)}</span><br/>السبب: ${escapeHtml(returnSale.returnReason || "غير محدد")}${phoneLine}</p>`,
    });
    openSystemPrint(`إيصال إرجاع ${returnSale.id.slice(-5)}`, receiptContent);
  };

  const printReservationReceipt = (reservation: ProductReservation) => {
    const receiptLogo = getReceiptLogoSource(store.receiptLogo, logoUrl);
    const phoneLine = store.storePhone ? `<br/>هاتف: ${escapeHtml(store.storePhone)}` : "";
    const receiptContent = buildReceiptPrintHtml({
      brandHtml: `<div class="receipt-brand"><img src="${receiptLogo}" alt="شعار ${escapeHtml(store.storeName)}" /><h1>${escapeHtml(store.storeName)}</h1></div>`,
      invoiceHtml: `<p>إيصال حجز رقم ${reservation.id.slice(-5)} · ${formatDate(reservation.createdAt)}</p>`,
      rowsHtml: `<tr><td>${escapeHtml(reservation.productName)}</td><td>${reservation.quantity}</td><td>محجوز</td></tr>`,
      subtotalHtml: "",
      discountHtml: "",
      totalHtml: `<div class="total"><span>الزبون</span><span>${escapeHtml(reservation.customerName)}</span></div>`,
      qrHtml: "",
      footerHtml: `<p class="foot"><span class="tag">حجز محلي بلا فاتورة</span>${reservation.customerPhone ? `<br/>هاتف الزبون: ${escapeHtml(reservation.customerPhone)}` : ""}${reservation.expiresOn ? `<br/>حتى: ${escapeHtml(reservation.expiresOn)}` : ""}${reservation.note ? `<br/>ملاحظة: ${escapeHtml(reservation.note)}` : ""}${phoneLine}<br/>يُستكمل الحجز من شاشة البيع عند التسليم.</p>`,
    });
    if (openSystemPrint(`حجز ${reservation.id.slice(-5)}`, receiptContent)) toast.success("فُتح إيصال الحجز للطباعة أو الحفظ من نافذة النظام.");
  };

  const printContainerStatement = () => {
    if (!containerStatementCustomer || !containerStatementEntries.length) {
      toast.error("اختر زبونًا لديه حركة عبوات أولًا.");
      return;
    }
    const rows = containerStatementEntries.map((entry) => `<tr><td>${formatDate(entry.createdAt)}</td><td>${escapeHtml(entry.containerName)}</td><td>${entry.direction === "out" ? "تسليم للزبون" : "استرجاع من الزبون"}</td><td>${entry.quantity}</td><td>${escapeHtml(entry.note || "—")}</td></tr>`).join("");
    const totalOut = containerStatementEntries.filter((entry) => entry.direction === "out").reduce((total, entry) => total + entry.quantity, 0);
    const totalIn = containerStatementEntries.filter((entry) => entry.direction === "in").reduce((total, entry) => total + entry.quantity, 0);
    const content = `<main dir="rtl" style="font-family:Arial,sans-serif;color:#173f31;padding:18px"><h1 style="margin:0 0 6px">${escapeHtml(store.storeName)}</h1><p style="margin:0 0 18px">كشف عبوات الزبون: ${escapeHtml(containerStatementCustomer)} · ${formatDate(new Date().toISOString())}</p><table style="width:100%;border-collapse:collapse;text-align:right"><thead><tr><th>التاريخ</th><th>العبوة</th><th>الحركة</th><th>الكمية</th><th>ملاحظة</th></tr></thead><tbody>${rows}<tr><th colspan="3">الإجمالي</th><th colspan="2">سُلّم ${totalOut} · استُرجع ${totalIn} · المتبقي ${totalOut - totalIn}</th></tr></tbody></table><style>th,td{border-bottom:1px solid #d9d4c8;padding:8px 5px;font-size:12px}th{background:#f5f0e5}</style></main>`;
    openSystemPrint(`كشف عبوات ${containerStatementCustomer}`, content);
  };

  const printMonthlyReturnsSummary = () => {
    const reasonRows = returnReasonSummary.slice(0, 5).map((entry) => `<tr><td>${escapeHtml(entry.reason)}</td><td>${entry.receipts}</td><td>${entry.units}</td><td dir="ltr">${money(entry.value)}</td></tr>`).join("");
    const staffRows = staffReturnsReport.entries.map((entry) => `<tr><td>${escapeHtml(entry.staffMemberName)}</td><td>${entry.receipts}</td><td>${entry.units}</td><td dir="ltr">${money(entry.value)}</td></tr>`).join("");
    const content = `<h1>ملخص الإرجاعات الشهري</h1><p>${escapeHtml(store.storeName)} · ${currentMonthKey}</p><table><tbody><tr><th>إيصالات الإرجاع</th><td>${monthlyReturnComparison.current.receipts}</td></tr><tr><th>وحدات مرتجعة</th><td>${monthlyReturnComparison.current.units}</td></tr><tr><th>قيمة الإرجاع</th><td dir="ltr">${money(monthlyReturnComparison.current.value)}</td></tr><tr><th>مقارنة بالقيمة السابقة</th><td dir="ltr">${money(monthlyReturnComparison.valueChange)}</td></tr><tr><th>حد تنبيه نسبة الإرجاع</th><td>${store.returnRateAlertThreshold}%</td></tr></tbody></table><h2>أسباب الإرجاع</h2><table><thead><tr><th>السبب</th><th>الإيصالات</th><th>الوحدات</th><th>القيمة</th></tr></thead><tbody>${reasonRows || "<tr><td colspan=\"4\">لا توجد إرجاعات لهذا الشهر.</td></tr>"}</tbody></table><h2>الإرجاعات حسب الموظف</h2><table><thead><tr><th>الموظف</th><th>الإيصالات</th><th>الوحدات</th><th>القيمة</th></tr></thead><tbody>${staffRows || "<tr><td colspan=\"4\">لا توجد إرجاعات مرتبطة بموظف.</td></tr>"}</tbody></table><p class="foot">هذا الملخص مبني من الإرجاعات المسجلة محليًا على هذا الجهاز.</p>`;
    if (openSystemPrint(`ملخص الإرجاعات ${currentMonthKey}`, content)) toast.success("فُتح ملخص الإرجاعات الشهري للطباعة أو الحفظ من نافذة النظام.");
  };

  const downloadReceiptPdf = async (sale: Sale) => {
    try {
      const { jsPDF } = await import("jspdf");
      const receiptLines = buildReceiptPdfLines({
        storeName: store.storeName,
        storePhone: store.storePhone,
        invoiceNumber: sale.id.slice(-5),
        createdAt: formatDate(sale.createdAt),
        paymentLabel: sale.paymentSplits?.length ? getPaymentSplitsLabel(sale.paymentSplits) : getPaymentMethodLabel(sale.paymentMethod),
        items: sale.items,
        subtotal: sale.subtotal,
        discountAmount: sale.discountAmount,
        note: sale.note,
        orderReference: sale.orderReference,
        staffMemberName: sale.staffMemberName,
        total: sale.total,
      });
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas unavailable");
      context.font = "24px Arial";
      const maxLineWidth = 700;
      const wrappedLines = receiptLines.flatMap((line) => {
        const words = line.split(" ");
        const rows: string[] = [];
        let row = "";
        words.forEach((word) => {
          const candidate = row ? `${row} ${word}` : word;
          if (row && context.measureText(candidate).width > maxLineWidth) { rows.push(row); row = word; } else row = candidate;
        });
        if (row) rows.push(row);
        return rows;
      });
      const qrDataUrl = await makeReceiptQrDataUrl(buildReceiptQrPayload(sale, store.storeName, store.storePhone)).catch(() => "");
      const qrHeight = qrDataUrl ? 210 : 0;
      canvas.height = Math.max(420, 90 + wrappedLines.length * 38 + qrHeight + 60);
      context.fillStyle = "#fffdf8";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.direction = "rtl";
      context.textAlign = "right";
      context.fillStyle = "#173c31";
      let y = 54;
      wrappedLines.forEach((line, index) => {
        context.font = index === 0 ? "bold 31px Arial" : line.startsWith("الإجمالي") ? "bold 28px Arial" : "24px Arial";
        context.fillText(line, 750, y);
        y += 38;
      });
      if (qrDataUrl) {
        const qrImage = new Image();
        await new Promise<void>((resolve, reject) => { qrImage.onload = () => resolve(); qrImage.onerror = () => reject(new Error("qr image")); qrImage.src = qrDataUrl; });
        context.drawImage(qrImage, 310, y + 10, 180, 180);
      }
      const heightMm = Math.min(297, Math.max(100, canvas.height / 10));
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, heightMm] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 80, heightMm);
      pdf.save(`souqna-invoice-${sale.id.slice(-5)}.pdf`);
      toast.success("تم تنزيل الإيصال كملف PDF.");
    } catch {
      toast.error("تعذّر إنشاء ملف PDF للإيصال. جرّب مرة أخرى.");
    }
  };

  const printTestReceipt = () => {
    const receiptLogo = getReceiptLogoSource(store.receiptLogo, logoUrl);
    const printed = openSystemPrint("اختبار طابعة سوقنا", `<div class="receipt-brand"><img src="${receiptLogo}" alt="شعار ${escapeHtml(store.storeName)}" /><h1>${escapeHtml(store.storeName)}</h1></div><p>اختبار طباعة سوقنا · ${formatDate(new Date().toISOString())}</p><div class="test-rule"></div><div class="test-grid"><span>العربية: سوقنا</span><span>1234567890</span><span>58/80/A4</span><span>د.ل 12,50</span></div><div class="test-rule"></div><p class="foot">إذا ظهر الشعار والحروف والأرقام بوضوح، اختر هذه الطابعة من نافذة النظام كطابعة افتراضية عند الحاجة.</p>`);
    if (printed) toast.success("فُتحت نافذة اختبار الطباعة. اختر أي طابعة ظاهرة في نظام جهازك.");
  };

  const printShelfLabels = () => {
    const products = store.products.filter((product) => selectedLabelProductIds.includes(product.id));
    if (!products.length) {
      toast.info("اختر صنفًا واحدًا على الأقل لطباعة ملصق سعره.");
      return;
    }
    const barcodeSvgs = Object.fromEntries(products.map((product) => [product.id, createCode128Svg(getPrintableBarcodeValue(product.sku))]));
    const printed = openSystemPrint(`ملصقات أسعار ${store.storeName}`, buildShelfLabelsPrintHtml(store.storeName, products, money, barcodeSvgs, labelSize, labelQuantities));
    if (printed) {
      setShowShelfLabels(false);
      toast.success("فُتحت نافذة طباعة الملصقات. اختر طابعتك ومقاس الورق من النظام.");
    }
  };

  const printSupplierPurchaseList = () => {
    if (!supplierPurchaseList.length) {
      toast.success("لا توجد أصناف وصلت إلى حد إعادة الطلب الآن.");
      return;
    }
    const groupsHtml = supplierPurchaseList.map((group) => `<section style="margin:0 0 12px;break-inside:avoid"><h2 style="font-size:1.1em;margin:0 0 4px">${escapeHtml(group.supplierName)}</h2><table><thead><tr><th>الصنف</th><th>الرمز</th><th>المتوفر</th><th>الكمية المقترحة</th></tr></thead><tbody>${group.products.map((product) => `<tr><td>${escapeHtml(product.name)}</td><td dir="ltr">${escapeHtml(product.sku)}</td><td>${product.quantity}</td><td><strong>${product.suggestedQuantity}</strong></td></tr>`).join("")}</tbody></table></section>`).join("");
    const printed = openSystemPrint(`قائمة مشتريات ${store.storeName}`, `<h1>قائمة مشتريات الموردين</h1><p>${escapeHtml(store.storeName)} · ${todayKey()}</p>${groupsHtml}`);
    if (printed) toast.success("فُتحت قائمة المشتريات للطباعة أو الحفظ من نافذة النظام.");
  };
  const openSupplierPurchaseOrder = () => {
    if (!supplierPurchaseList.length) {
      toast.info("لا توجد أصناف وصلت إلى حد إعادة الطلب الآن.");
      return;
    }
    const quantities: Record<string, string> = {};
    for (const group of supplierPurchaseList) {
      for (const product of group.products) {
        const value = window.prompt(`كمية الطلب من ${product.name} للمورد ${group.supplierName} (اكتب 0 لاستبعاده):`, String(product.suggestedQuantity));
        if (value === null) {
          toast.info("أُلغي تجهيز طلب الشراء دون طباعة.");
          return;
        }
        quantities[product.id] = value;
      }
    }
    printSupplierPurchaseOrder(quantities);
  };
  const printSupplierPurchaseOrder = (quantities: Record<string, string>) => {
    const groups = buildSupplierPurchaseOrderGroups(supplierPurchaseList, quantities);
    if (!groups.length) {
      toast.info("أدخل كمية واحدة على الأقل لطلب الشراء.");
      return;
    }
    const groupsHtml = groups.map((group) => `<section style="margin:0 0 12px;break-inside:avoid"><h2 style="font-size:1.1em;margin:0 0 4px">${escapeHtml(group.supplierName)}</h2><table><thead><tr><th>الصنف</th><th>الرمز</th><th>المتوفر</th><th>المطلوب</th></tr></thead><tbody>${group.products.map((product) => `<tr><td>${escapeHtml(product.name)}</td><td dir="ltr">${escapeHtml(product.sku)}</td><td>${product.quantity}</td><td><strong>${product.requestedQuantity}</strong></td></tr>`).join("")}</tbody></table></section>`).join("");
    if (openSystemPrint(`طلب شراء ${store.storeName}`, `<h1>طلب شراء للموردين</h1><p>${escapeHtml(store.storeName)} · ${todayKey()} · ${getSupplierPurchaseOrderUnits(groups)} وحدة</p>${groupsHtml}`)) {
      toast.success("فُتح طلب الشراء بالكميات التي حددتها للطباعة أو الحفظ.");
    }
  };

  const printLocalDecisionCenter = () => {
    const actions = localDecisionCenter.actions;
    const rows = actions.map((action, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(action.title)}</td><td>${escapeHtml(action.detail)}</td><td>${escapeHtml(action.metric)}</td></tr>`).join("");
    const content = `<h1>مركز قرارات المحل</h1><p>${escapeHtml(store.storeName)} · ${todayKey()} · حسابات محلية دون إنترنت</p>${actions.length ? `<table><thead><tr><th>#</th><th>الإجراء</th><th>السبب</th><th>المؤشر</th></tr></thead><tbody>${rows}</tbody></table>` : "<p>لا توجد إجراءات عاجلة حاليًا؛ راجع التقارير بعد تسجيل مبيعات ومخزون فعلي.</p>"}`;
    if (openSystemPrint(`مركز قرارات ${store.storeName}`, content)) toast.success("فُتح ملخص القرارات للطباعة أو الحفظ من نافذة النظام.");
  };
  const printSupplierReceivingNotice = (product: Product, batch: ProductBatch) => {
    const content = `<h1>إشعار استلام مورد</h1><p>${escapeHtml(store.storeName)} · ${formatDate(batch.receivedAt)}</p><table><tbody><tr><th>الصنف</th><td>${escapeHtml(product.name)}</td></tr><tr><th>رمز الصنف</th><td dir="ltr">${escapeHtml(product.sku)}</td></tr><tr><th>المورد</th><td>${escapeHtml(batch.supplierName || "غير محدد")}</td></tr>${batch.staffMemberName ? `<tr><th>الموظف المسؤول</th><td>${escapeHtml(batch.staffMemberName)}</td></tr>` : ""}${batch.purchaseInvoiceRef ? `<tr><th>مرجع فاتورة الشراء</th><td dir="ltr">${escapeHtml(batch.purchaseInvoiceRef)}</td></tr>` : ""}<tr><th>الكمية المستلمة</th><td>${batch.quantity}</td></tr><tr><th>سعر شراء الوحدة</th><td dir="ltr">${money(batch.purchasePrice)}</td></tr><tr><th>تاريخ الصلاحية</th><td dir="ltr">${escapeHtml(batch.expiryDate || "غير محدد")}</td></tr>${batch.note ? `<tr><th>ملاحظة</th><td>${escapeHtml(batch.note)}</td></tr>` : ""}</tbody></table><p class="foot">تم إنشاء هذا الإشعار محليًا من سجل استلام المورد.</p>`;
    if (openSystemPrint(`استلام ${product.name}`, content)) toast.success("فُتح إشعار الاستلام للطباعة أو الحفظ من نافذة النظام.");
  };

  const printGoodsReceiptNotice = (receipt: GoodsReceipt, costReview: ReturnType<typeof getReceivingCostReview>) => {
    const content = buildGoodsReceiptNoticeHtml({
      storeName: store.storeName,
      productName: receipt.productName,
      barcode: receipt.barcode,
      quantity: receipt.quantity,
      unitCost: money(receipt.purchasePrice),
      totalCost: money(receipt.quantity * receipt.purchasePrice),
      supplierName: receipt.supplierName,
      invoiceRef: receipt.purchaseInvoiceRef,
      expiryDate: receipt.expiryDate,
      receivedAt: formatDate(receipt.receivedAt),
      internalReference: receipt.id.slice(-6).toUpperCase(),
      costReview,
      staffMemberName: receipt.staffMemberName,
    });
    if (openSystemPrint(`إيصال استلام ${receipt.productName}`, content)) toast.success("فُتح إيصال الاستلام للطباعة أو الحفظ من نافذة النظام.");
  };

  const printSupplierReturnNotice = (product: Product, batch: ProductBatch) => {
    if (!batch.supplierReturn) {
      toast.info("سجّل إرجاع الدفعة أولًا لإتاحة إشعار المورد.");
      return;
    }
    const content = buildSupplierReturnNoticeHtml(store.storeName, product, batch, money, formatDate, escapeHtml);
    if (openSystemPrint(`إرجاع ${product.name}`, content)) toast.success("فُتح إشعار إرجاع المورد للطباعة أو الحفظ من نافذة النظام.");
  };

  const submitBatchEdit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingBatch) return;
    const data = new FormData(event.currentTarget);
    const changes = { quantity: Number(data.get("quantity")), purchasePrice: Number(data.get("purchasePrice")), expiryDate: String(data.get("expiryDate") || "").trim(), supplierName: String(data.get("supplierName") || "").trim(), purchaseInvoiceRef: String(data.get("purchaseInvoiceRef") || "").trim().slice(0, 100), note: String(data.get("note") || "").trim() };
    if (!Number.isFinite(changes.quantity) || changes.quantity <= 0 || !Number.isFinite(changes.purchasePrice) || changes.purchasePrice < 0 || (changes.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(changes.expiryDate))) {
      toast.error("راجع كمية الدفعة وسعرها وتاريخ صلاحيتها.");
      return;
    }
    setStore((current) => ({ ...current, products: current.products.map((product) => {
      if (product.id !== editingBatch.product.id) return product;
      const result = updateUnconsumedBatch(product.batches ?? [], editingBatch.batch.id, changes);
      if (!result.changed) return product;
      return { ...product, quantity: product.quantity + changes.quantity - editingBatch.batch.quantity, batches: result.batches, expiryDate: getEarliestActiveExpiry(result.batches) || product.expiryDate };
    }) }));
    setEditingBatch(null);
    toast.success("تم تعديل الدفعة غير المستهلكة وتحديث المخزون.");
  };

  const cancelBatch = (product: Product, batch: ProductBatch) => {
    if (!isBatchEditable(batch)) {
      toast.error("لا يمكن إلغاء دفعة استُهلك جزء منها؛ حفاظًا على دقة الفواتير والمخزون.");
      return;
    }
    if (!window.confirm(`سيُلغى استلام دفعة «${product.name}» بكمية ${batch.quantity} وحدة. هل تريد المتابعة؟`)) return;
    setStore((current) => ({ ...current, products: current.products.map((item) => {
      if (item.id !== product.id) return item;
      const result = cancelUnconsumedBatch(item.batches ?? [], batch.id);
      if (!result.cancelled) return item;
      return { ...item, quantity: Math.max(0, item.quantity - result.cancelled.quantity), batches: result.batches, expiryDate: getEarliestActiveExpiry(result.batches) || "" };
    }) }));
    toast.success("تم إلغاء الدفعة غير المستهلكة وتحديث المخزون.");
  };

  const exportExpiryWasteExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = expiryWasteReport.entries.map(({ product, batch, cost }) => ({ "الصنف": product.name, "الرمز": product.sku, "المورد": batch.supplierName || "غير محدد", "تاريخ الصلاحية": batch.expiryDate, "الكمية المهدرة": batch.remainingQuantity, "سعر الشراء": batch.purchasePrice, "تكلفة الهدر": cost, "ملاحظة الدفعة": batch.note }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد دفعات منتهية صالحة للحساب حاليًا" }]), "هدر الصلاحية");
    XLSX.writeFile(workbook, `souqna-expiry-waste-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير هدر الصلاحية.");
  };

  const submitWasteApproval = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!wasteApprovalBatch) return;
    const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
    const requestedAt = new Date().toISOString();
    setStore((current) => ({ ...current, products: current.products.map((product) => {
      if (product.id !== wasteApprovalBatch.product.id) return product;
      const result = requestExpiredBatchWaste(product.batches ?? [], wasteApprovalBatch.batch.id, reason, requestedAt);
      return result.requested ? { ...product, batches: result.batches } : product;
    }) }));
    setWasteApprovalBatch(null);
    toast.success("تم تسجيل طلب الهدر. يلزم الآن اعتماد نهائي قبل خصم المخزون.");
  };

  const submitFinalWasteApproval = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!finalWasteApprovalBatch) return;
    const confirmation = String(new FormData(event.currentTarget).get("confirmation") || "").trim();
    const approvedAt = new Date().toISOString();
    setStore((current) => ({ ...current, products: current.products.map((product) => {
      if (product.id !== finalWasteApprovalBatch.product.id) return product;
      const result = approveRequestedBatchWaste(product.batches ?? [], finalWasteApprovalBatch.batch.id, confirmation, approvedAt);
      if (!result.approved) return product;
      return { ...product, quantity: Math.max(0, product.quantity - result.approved.quantity), batches: result.batches, expiryDate: getEarliestActiveExpiry(result.batches) || "" };
    }) }));
    if (confirmation !== "اعتماد نهائي") {
      toast.error("اكتب «اعتماد نهائي» لإتمام الموافقة الثانية.");
      return;
    }
    setFinalWasteApprovalBatch(null);
    toast.success("تم اعتماد هدر الدفعة نهائيًا وتحديث المخزون.");
  };

  const submitSupplierReturn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplierReturnBatch) return;
    const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
    const returnedAt = new Date().toISOString();
    setStore((current) => ({ ...current, products: current.products.map((product) => {
      if (product.id !== supplierReturnBatch.product.id) return product;
      const result = returnUnconsumedBatchToSupplier(product.batches ?? [], supplierReturnBatch.batch.id, reason, returnedAt);
      if (!result.returned) return product;
      return { ...product, quantity: Math.max(0, product.quantity - result.returned.quantity), batches: result.batches, expiryDate: getEarliestActiveExpiry(result.batches) || "" };
    }) }));
    setSupplierReturnBatch(null);
    toast.success("تم تسجيل إرجاع الدفعة إلى المورد وتحديث المخزون.");
  };

  const exportSupplierInventoryCostExcel = async () => {
    const XLSX = await import("xlsx");
    const totals = supplierInventoryCostReport.groups.map((group) => ({ "المورد": group.supplierName, "عدد الدفعات": group.batchCount, "الوحدات المتبقية": group.units, "تكلفة المخزون": group.cost }));
    const details = supplierInventoryCostReport.groups.flatMap((group) => group.products.map(({ product, batch, cost }) => ({ "المورد": group.supplierName, "الصنف": product.name, "الرمز": product.sku, "الدفعة": batch.id, "الكمية المتبقية": batch.remainingQuantity, "سعر الشراء": batch.purchasePrice, "تكلفة الدفعة": cost, "تاريخ الصلاحية": batch.expiryDate || "غير محدد" })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(totals.length ? totals : [{ "ملاحظة": "لا توجد دفعات نشطة لها تكلفة مخزون حاليًا" }]), "ملخص الموردين");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(details.length ? details : [{ "ملاحظة": "لا توجد تفاصيل دفعات نشطة" }]), "تفاصيل الدفعات");
    XLSX.writeFile(workbook, `souqna-supplier-inventory-cost-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير تكلفة المخزون حسب المورد.");
  };

  const exportSupplierPurchasesExcel = async () => {
    const XLSX = await import("xlsx");
    const obligations = supplierObligationReport.obligations.map((item) => ({ "المورد": item.supplierName, "الرصيد المستحق": item.outstanding, "الحالة": item.status === "overdue" ? "متأخر" : item.status === "nearDue" ? "قريب" : item.status === "payable" ? "مستحق" : "بلا رصيد", "تاريخ الاستحقاق": item.dueDate || "غير محدد" }));
    const totals = supplierPurchaseReport.groups.map((group) => ({ "المورد": group.supplierName, "قيمة الاستلام": group.received, "قيمة الإرجاع": group.returned, "صافي المشتريات": group.net, "وحدات مستلمة": group.receivedUnits, "وحدات مرجعة": group.returnedUnits, "عدد الحركات": group.entryCount }));
    const details = supplierPurchaseReport.groups.flatMap((group) => group.entries.map((entry) => ({ "المورد": entry.supplierName, "التاريخ": entry.date, "العملية": entry.type, "الصنف": entry.productName, "الرمز": entry.sku, "مرجع الفاتورة": entry.invoiceRef || "غير محدد", "الدفعة": entry.batchId, "الكمية": entry.quantity, "القيمة": entry.amount })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(obligations.length ? obligations : [{ "ملاحظة": "لا توجد التزامات موردين مسجلة" }]), "الالتزامات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(totals.length ? totals : [{ "ملاحظة": "لا توجد مشتريات في الفترة المختارة" }]), "ملخص المشتريات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(details.length ? details : [{ "ملاحظة": "لا توجد تفاصيل مشتريات في الفترة المختارة" }]), "تفاصيل الحركات");
    XLSX.writeFile(workbook, `souqna-supplier-purchases-${supplierPurchasesMonth}.xlsx`);
    toast.success("تم تنزيل تقرير مشتريات الموردين والتزاماتهم.");
  };

  const exportLocalAnalysisExcel = async () => {
    const XLSX = await import("xlsx");
    const productRows = operationalInsights.map((entry) => ({ "الصنف": entry.productName, "الرمز": entry.sku, "المورد": entry.supplierName, "المخزون الحالي": entry.currentStock, "متوسط الطلب اليومي": Number(entry.averageDailyDemand.toFixed(2)), "أيام التغطية": entry.daysOfCover === null ? "غير متاح" : Number(entry.daysOfCover.toFixed(1)), "اتجاه الطلب": entry.demandTrend === "rising" ? "متصاعد" : entry.demandTrend === "falling" ? "متراجع" : entry.demandTrend === "new" ? "جديد" : entry.demandTrend === "stable" ? "مستقر" : "لا بيانات كافية", "حالة المخزون": entry.risk === "urgent" ? "عاجل" : entry.risk === "watch" ? "متابعة" : entry.risk === "healthy" ? "مطمئن" : "بلا حركة حديثة", "كمية الشراء المقترحة": entry.recommendedOrderQuantity, "تكلفة الشراء التقديرية": entry.estimatedOrderCost, "التفسير": entry.explanation }));
    const supplierRows = purchaseRecommendations.map((group) => ({ "المورد": group.supplierName, "الوحدات المقترحة": group.units, "تكلفة تقديرية": group.estimatedCost, "أصناف عاجلة": group.urgentItems, "عدد الأصناف": group.entries.length }));
    const cashRows = [{ "الأفق المتوقع بالأيام": cashFlowForecast.horizonDays, "متوسط دخل نقدي يومي": cashFlowForecast.averageDailyIncome, "متوسط مصروف يومي": cashFlowForecast.averageDailyExpenses, "دخل متوقع": cashFlowForecast.projectedIncome, "مصروفات متوقعة": cashFlowForecast.projectedExpenses, "صافي سيولة متوقع": cashFlowForecast.projectedNet, "الحالة": cashFlowForecast.signal === "positive" ? "موجب" : cashFlowForecast.signal === "watch" ? "يحتاج متابعة" : "سلبي", "التفسير": cashFlowForecast.explanation }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows.length ? productRows : [{ "ملاحظة": "لا توجد أصناف كافية للتحليل بعد" }]), "طلب الأصناف");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(supplierRows.length ? supplierRows : [{ "ملاحظة": "لا توجد توصيات شراء حاليًا" }]), "توصيات الموردين");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cashRows), "توقع السيولة");
    XLSX.writeFile(workbook, `souqna-local-analysis-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير التحليل التشغيلي المحلي.");
  };

  const exportLocalOperationsExcel = async () => {
    const XLSX = await import("xlsx");
    const goalRows = Object.values(store.dailySalesGoals).sort((left, right) => right.date.localeCompare(left.date)).map((goal) => {
      const revenue = store.sales.filter((sale) => sale.createdAt.slice(0, 10) === goal.date).reduce((total, sale) => total + sale.total, 0);
      const progress = getDailyGoalProgress(goal, revenue);
      return { "التاريخ": goal.date, "هدف المبيعات": goal.target, "المبيعات المسجلة": progress.revenue, "نسبة الإنجاز": Number(progress.achievement.toFixed(1)), "المتبقي": progress.remaining, "الحالة": progress.met ? "تم تحقيق الهدف" : "قيد المتابعة", "ضبط الهدف في": goal.setAt };
    });
    const monthlyGoalRows = Object.values(store.monthlySalesGoals).sort((left, right) => right.month.localeCompare(left.month)).map((goal) => {
      const revenue = store.sales.filter((sale) => sale.createdAt.slice(0, 7) === goal.month).reduce((total, sale) => total + sale.total, 0);
      const progress = getMonthlyGoalProgress(goal, revenue);
      return { "الشهر": goal.month, "هدف المبيعات": goal.target, "المبيعات المسجلة": progress.revenue, "نسبة الإنجاز": Number(progress.achievement.toFixed(1)), "المتبقي": progress.remaining, "الحالة": progress.met ? "تم تحقيق الهدف" : "قيد المتابعة", "ضبط الهدف في": goal.setAt };
    });
    const stocktakeRows = store.stocktakeRecords.map((record) => ({ "نوع الجرد": record.id.startsWith("barcode-stocktake-") ? "جولة باركود" : record.id.startsWith("bulk-stocktake-") ? "جرد جماعي" : "جرد فردي", "التاريخ": record.recordedAt, "الصنف": record.productName, "الرمز": record.sku, "الكمية المسجلة": record.recordedQuantity, "الكمية الفعلية": record.actualQuantity, "الفارق": record.difference, "قيمة الفارق بسعر الشراء": record.valueDifference, "ملاحظة": record.note }));
    const stocktakeComparisonRows = stocktakeRunComparison.runs.map((run, index) => ({ "ترتيب الجولة": index === 0 ? "الأحدث" : index === 1 ? "السابقة" : `قبلها بـ${index - 1}`, "تاريخ الاعتماد": run.recordedAt, "ملاحظة": run.note, "أصناف مراجعة": run.products, "أصناف بفروقات": run.adjustedProducts, "وحدات عجز": run.shortageUnits, "وحدات زيادة": run.surplusUnits, "قيمة العجز": run.shortageValue, "قيمة الزيادة": run.surplusValue }));
    const returnRows = saleReturns.flatMap((sale) => sale.items.map((item) => ({ "تاريخ الإرجاع": sale.createdAt, "مرجع الفاتورة": sale.returnOfSaleId?.slice(-5) || "غير محدد", "نوع الإرجاع": "جزئي أو كامل بحسب الكمية المختارة", "الصنف": item.name, "الكمية المرتجعة": Math.abs(item.quantity), "قيمة الإرجاع": Math.abs(item.quantity * item.price), "سبب الإرجاع": sale.returnReason || "غير محدد", "طريقة التسوية": getPaymentMethodLabel(sale.paymentMethod) })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(goalRows.length ? goalRows : [{ "ملاحظة": "لا توجد أهداف مبيعات محفوظة بعد" }]), "أهداف المبيعات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlyGoalRows.length ? monthlyGoalRows : [{ "ملاحظة": "لا توجد أهداف شهرية محفوظة بعد" }]), "أهداف الشهر");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stocktakeRows.length ? stocktakeRows : [{ "ملاحظة": "لا توجد فروقات جرد محفوظة بعد" }]), "سجل الجرد");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stocktakeComparisonRows.length ? stocktakeComparisonRows : [{ "ملاحظة": "تحتاج إلى اعتماد جولة جرد واحدة على الأقل لعرض المقارنة" }]), "مقارنة الجرد");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(returnRows.length ? returnRows : [{ "ملاحظة": "لا توجد إرجاعات بيع محفوظة بعد" }]), "إرجاعات البيع");
    XLSX.writeFile(workbook, `souqna-local-operations-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير الأهداف والجرد والإرجاعات الموسع.");
  };

  const exportProductProfitabilityExcel = async () => {
    const XLSX = await import("xlsx");
    const profitabilityRows = productProfitabilityReport.entries.map((entry) => ({ "الصنف": entry.productName, "وحدات مباعة": entry.soldUnits, "وحدات مرتجعة": entry.returnedUnits, "نسبة الإرجاع (%)": Number(entry.returnRatePercent.toFixed(1)), "الوحدات الصافية": entry.units, "الإيراد قبل الخصم": entry.grossRevenue, "الخصومات": entry.discounts, "الإيراد الصافي": entry.netRevenue, "تكلفة البضاعة": entry.costOfGoods, "الربح": entry.profit, "هامش الربح (%)": Number(entry.marginPercent.toFixed(1)), "عدد الحركات": entry.transactionCount }));
    const summaryRows = [{ "الفترة": currentMonthKey, "وحدات مباعة": productProfitabilityReport.totals.soldUnits, "وحدات مرتجعة": productProfitabilityReport.totals.returnedUnits, "نسبة الإرجاع الإجمالية (%)": productProfitabilityReport.totals.soldUnits ? Number(((productProfitabilityReport.totals.returnedUnits / productProfitabilityReport.totals.soldUnits) * 100).toFixed(1)) : 0, "الوحدات الصافية": productProfitabilityReport.totals.units, "الإيراد قبل الخصم": productProfitabilityReport.totals.grossRevenue, "الخصومات": productProfitabilityReport.totals.discounts, "الإيراد الصافي": productProfitabilityReport.totals.netRevenue, "تكلفة البضاعة": productProfitabilityReport.totals.costOfGoods, "الربح": productProfitabilityReport.totals.profit }];
    const categoryRows = store.customerCategories.map((category) => ({ "فئة الزبون": category.name, "الخصم الافتراضي (%)": category.discountPercent, "عدد الفواتير": store.sales.filter((sale) => sale.customerCategoryId === category.id).length, "مبيعات الفئة": store.sales.filter((sale) => sale.customerCategoryId === category.id).reduce((total, sale) => total + sale.total, 0) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(profitabilityRows.length ? profitabilityRows : [{ "ملاحظة": "لا توجد مبيعات كافية لحساب ربحية الأصناف" }]), "ربحية الأصناف");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "ملخص الربحية");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categoryRows.length ? categoryRows : [{ "ملاحظة": "لا توجد فئات زبائن محفوظة" }]), "فئات الزبائن");
    XLSX.writeFile(workbook, `souqna-product-profitability-${currentMonthKey}.xlsx`);
    toast.success("تم تنزيل تقرير ربحية الأصناف وفئات الزبائن.");
  };

  const exportFilteredReturnsExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = filteredSaleReturns.flatMap((sale) => sale.items.map((item) => ({ "تاريخ الإرجاع": sale.createdAt, "رقم إيصال الإرجاع": sale.id.slice(-5), "مرجع الفاتورة": sale.returnOfSaleId?.slice(-5) || "غير محدد", "الصنف": item.name, "الكمية المرتجعة": Math.abs(item.quantity), "قيمة الإرجاع": Math.abs(item.quantity * item.price), "سبب الإرجاع": sale.returnReason || "غير محدد", "طريقة التسوية": getPaymentMethodLabel(sale.paymentMethod) })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد إرجاعات تطابق التصفية الحالية" }]), "الإرجاعات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ "من تاريخ": returnFilterFromDate || "بلا حد", "إلى تاريخ": returnFilterToDate || "بلا حد", "سبب الإرجاع": returnReasonFilter || "كل الأسباب", "عدد إيصالات الإرجاع": filteredSaleReturns.length, "إجمالي قيمة الإرجاع": filteredSaleReturns.reduce((total, sale) => total + Math.abs(sale.total), 0) }]), "ملخص التصفية");
    XLSX.writeFile(workbook, `souqna-returns-${todayKey()}.xlsx`);
    toast.success("تم تنزيل سجل الإرجاعات المفلتر.");
  };

  const exportAdvancedReturnAnalyticsExcel = async () => {
    const XLSX = await import("xlsx");
    const reasonRows = returnReasonSummary.map((entry) => ({ "سبب الإرجاع": entry.reason, "عدد الإيصالات": entry.receipts, "الوحدات المرتجعة": entry.units, "قيمة الإرجاع": entry.value }));
    const comparisonRows = [{ "الشهر الحالي": monthlyReturnComparison.month, "إيصالات الشهر الحالي": monthlyReturnComparison.current.receipts, "وحدات الشهر الحالي": monthlyReturnComparison.current.units, "قيمة الشهر الحالي": monthlyReturnComparison.current.value, "الشهر السابق": monthlyReturnComparison.previousMonth, "إيصالات الشهر السابق": monthlyReturnComparison.previous.receipts, "وحدات الشهر السابق": monthlyReturnComparison.previous.units, "قيمة الشهر السابق": monthlyReturnComparison.previous.value, "فرق الإيصالات": monthlyReturnComparison.receiptChange, "فرق القيمة": monthlyReturnComparison.valueChange }];
    const riskRows = highReturnRateProducts.map((entry) => ({ "الصنف": entry.productName, "وحدات مباعة": entry.soldUnits, "وحدات مرتجعة": entry.returnedUnits, "نسبة الإرجاع (%)": Number(entry.returnRatePercent.toFixed(1)), "حد التنبيه المطبق (%)": store.returnRateAlertThreshold, "الحالة": "تحتاج مراجعة" }));
    const staffRows = staffReturnsReport.entries.map((entry) => ({ "الموظف": entry.staffMemberName, "إيصالات الإرجاع": entry.receipts, "الوحدات المرتجعة": entry.units, "قيمة الإرجاع": entry.value }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reasonRows.length ? reasonRows : [{ "ملاحظة": "لا توجد أسباب إرجاع محفوظة بعد" }]), "أسباب الإرجاع");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(comparisonRows), "مقارنة شهرية");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(riskRows.length ? riskRows : [{ "ملاحظة": "لا توجد أصناف تجاوزت حد نسبة الإرجاع" }]), "تنبيهات النسبة");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(staffRows.length ? staffRows : [{ "ملاحظة": "لا توجد إرجاعات مسجلة للموظفين هذا الشهر" }]), "إرجاعات الموظفين");
    XLSX.writeFile(workbook, `souqna-return-analytics-${currentMonthKey}.xlsx`);
    toast.success("تم تنزيل تحليلات الإرجاع المتقدمة.");
  };

  const exportStaffSalesExcel = async () => {
    const XLSX = await import("xlsx");
    const summaryRows = staffSalesReport.entries.map((entry) => ({ "الموظف": entry.staffMemberName, "فواتير البيع": entry.invoices, "الإرجاعات": entry.returns, "صافي المبيعات": entry.sales, "صافي الربح": entry.profit }));
    const detailRows = store.sales.filter((sale) => sale.createdAt.slice(0, 7) === currentMonthKey).map((sale) => ({ "التاريخ": sale.createdAt, "الموظف": sale.staffMemberName || "غير محدد", "رقم الفاتورة": sale.id.slice(-5), "نوع الحركة": sale.isReturn ? "إرجاع بيع" : "بيع", "طريقة الدفع": getPaymentMethodLabel(sale.paymentMethod), "الإجمالي": sale.total, "الربح": sale.profit }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ "ملاحظة": "لا توجد مبيعات مسجلة للموظفين هذا الشهر" }]), "ملخص الموظفين");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows.length ? detailRows : [{ "ملاحظة": "لا توجد فواتير لهذا الشهر" }]), "تفاصيل الفواتير");
    XLSX.writeFile(workbook, `souqna-staff-sales-${currentMonthKey}.xlsx`);
    toast.success("تم تنزيل تقرير مبيعات الموظفين محليًا.");
  };

  const exportInventoryCategoriesExcel = async () => {
    const XLSX = await import("xlsx");
    const summaryRows = inventoryCategorySummary.map((group) => ({ "الفئة": group.category, "عدد الأصناف": group.productCount, "الوحدات المتاحة": group.units, "قيمة الشراء": group.purchaseValue, "قيمة البيع": group.saleValue, "أصناف تحت الحد": group.lowStockCount }));
    const detailRows = store.products.map((product) => ({ "الفئة": product.category || "غير مصنف", "الصنف": product.name, "الرمز": product.sku, "الكمية": product.quantity, "حد التنبيه": product.lowStockAt, "سعر الشراء": product.purchasePrice, "سعر البيع": product.salePrice, "قيمة الشراء": product.quantity * product.purchasePrice, "قيمة البيع": product.quantity * product.salePrice }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ "ملاحظة": "لا توجد أصناف مصنفة بعد" }]), "ملخص الفئات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows.length ? detailRows : [{ "ملاحظة": "لا توجد أصناف في المخزون" }]), "أصناف الفئات");
    XLSX.writeFile(workbook, `souqna-inventory-categories-${todayKey()}.xlsx`);
    toast.success("تم تنزيل جرد المخزون حسب الفئات.");
  };

  const exportCustomerStatementExcel = async () => {
    if (!customerStatement) {
      toast.info("اختر زبونًا أولًا لتنزيل كشف حسابه.");
      return;
    }
    const XLSX = await import("xlsx");
    const rows = customerStatement.entries.map((entry) => ({ "التاريخ": entry.occurredAt, "العملية": entry.type, "المرجع": entry.reference, "مدين": entry.debit, "دائن": entry.credit, "الرصيد المتدرج": entry.balance, "ملاحظة": entry.note }));
    const summary = [{ "الزبون": customerStatement.customerName, "إجمالي فواتير الآجل": customerStatement.invoiced, "إرجاعات البيع": customerStatement.returned, "التحصيلات": customerStatement.collected, "الرصد المستحق": customerStatement.balance }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد حركات لهذا الزبون" }]), "الحركات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "الملخص");
    XLSX.writeFile(workbook, `souqna-customer-statement-${todayKey()}.xlsx`);
    toast.success("تم تنزيل كشف حساب الزبون محليًا.");
  };

  const printCustomerStatement = () => {
    if (!customerStatement) {
      toast.info("اختر زبونًا أولًا لطباعة كشف حسابه.");
      return;
    }
    const rows = customerStatement.entries.map((entry) => `<tr><td>${formatDate(entry.occurredAt)}</td><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.reference)}</td><td dir="ltr">${entry.debit ? money(entry.debit) : "—"}</td><td dir="ltr">${entry.credit ? money(entry.credit) : "—"}</td><td dir="ltr">${money(entry.balance)}</td></tr>`).join("");
    const content = `<h1>كشف حساب زبون</h1><p>${escapeHtml(store.storeName)} · ${escapeHtml(customerStatement.customerName)} · ${formatDate(new Date().toISOString())}</p><table><thead><tr><th>التاريخ</th><th>العملية</th><th>المرجع</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>${rows || "<tr><td colspan=\"6\">لا توجد حركات محفوظة.</td></tr>"}</tbody></table><table><tbody><tr><th>فواتير الآجل</th><td dir="ltr">${money(customerStatement.invoiced)}</td></tr><tr><th>إرجاعات البيع</th><td dir="ltr">${money(customerStatement.returned)}</td></tr><tr><th>التحصيلات</th><td dir="ltr">${money(customerStatement.collected)}</td></tr><tr><th>الرصد المستحق</th><td dir="ltr">${money(customerStatement.balance)}</td></tr></tbody></table><p class="foot">كشف محلي مبني على فواتير الذمة والتحصيلات والإرجاعات المحفوظة على هذا الجهاز.</p>`;
    if (openSystemPrint(`كشف ${customerStatement.customerName}`, content)) toast.success("فُتح كشف حساب الزبون للطباعة أو الحفظ من نافذة النظام.");
  };

  const exportCashClosingsExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = store.cashClosings.map((closing) => {
      const summary = getDailyCashSummary(store.sales, store.cashExpenses, closing.date, closing.openingCash, closing.actualCash, store.debtCollections);
      return { "تاريخ الوردية": closing.date, "مسؤول الوردية": closing.responsibleName || "غير محدد", "النقد الافتتاحي": closing.openingCash, "النقد المتوقع": summary.expectedCash, "النقد الفعلي": closing.actualCash, "الفارق": summary.variance ?? 0, "صافي التشغيل": summary.netOperatingProfit, "فئات النقد": (closing.denominations ?? []).map((entry) => `${entry.denomination}×${entry.count}`).join(" · ") || "غير مسجلة", "ملاحظة": closing.note || "" };
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد تسويات ورديات محفوظة بعد" }]), "تسويات الوردية");
    XLSX.writeFile(workbook, `souqna-cash-settlements-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير تسويات الوردية.");
  };

  const updateSupplierCreditLimit = (supplierName: string, value: string) => {
    const limit = Number(value);
    if (!Number.isFinite(limit) || limit < 0) return;
    setSupplierCreditLimits((current) => {
      const next = { ...current, [supplierName]: limit };
      localStorage.setItem(SUPPLIER_CREDIT_LIMITS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateSupplierDueDate = (supplierName: string, value: string) => {
    setStore((current) => ({ ...current, supplierDueDates: { ...current.supplierDueDates, [supplierName]: value } }));
  };

  const printSupplierPaymentNotice = (payment: SupplierPayment) => {
    const content = `<h1>مستند دفع للمورد</h1><p>${escapeHtml(store.storeName)} · ${formatDate(payment.paidAt)}</p><table><tbody><tr><th>المورد</th><td>${escapeHtml(payment.supplierName)}</td></tr><tr><th>المبلغ المدفوع</th><td dir="ltr">${money(payment.amount)}</td></tr>${payment.note ? `<tr><th>ملاحظة</th><td>${escapeHtml(payment.note)}</td></tr>` : ""}</tbody></table><p class="foot">تم إنشاء المستند محليًا من سجل مدفوعات الموردين.</p>`;
    return openSystemPrint(`دفع ${payment.supplierName}`, content);
  };

  const submitSupplierPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplierPaymentSupplier) return;
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const note = String(data.get("note") || "").trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("أدخل مبلغ دفع صحيحًا أكبر من صفر.");
      return;
    }
    const payment: SupplierPayment = { id: makeId("supplier-payment"), supplierName: supplierPaymentSupplier, amount, paidAt: new Date().toISOString(), note };
    setStore((current) => ({ ...current, supplierPayments: [...current.supplierPayments, payment] }));
    setSupplierPaymentSupplier(null);
    const opened = printSupplierPaymentNotice(payment);
    toast.success(opened ? "تم تسجيل الدفع وفتح مستند المورد للطباعة أو الحفظ." : "تم تسجيل دفع المورد محليًا.");
  };

  const printSupplierMonthlyStatement = (supplierName: string) => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const statement = getSupplierMonthlyStatement(store.products, store.supplierPayments, supplierName, monthKey);
    const rows = statement.entries.map((entry) => `<tr><td>${formatDate(entry.date)}</td><td>${entry.type}</td><td>${escapeHtml(entry.detail)}</td><td dir="ltr">${money(entry.amount)}</td></tr>`).join("");
    const content = `<h1>كشف حساب المورد الشهري</h1><p>${escapeHtml(store.storeName)} · ${escapeHtml(supplierName)} · ${monthKey}</p><table><thead><tr><th>التاريخ</th><th>العملية</th><th>التفاصيل</th><th>القيمة</th></tr></thead><tbody>${rows || "<tr><td colspan=\"4\">لا توجد حركات لهذا الشهر.</td></tr>"}</tbody></table><table><tbody><tr><th>إجمالي الاستلام</th><td dir="ltr">${money(statement.received)}</td></tr><tr><th>إجمالي الإرجاع</th><td dir="ltr">${money(statement.returned)}</td></tr><tr><th>إجمالي المدفوع</th><td dir="ltr">${money(statement.paid)}</td></tr><tr><th>صافي الشهر</th><td dir="ltr">${money(statement.net)}</td></tr></tbody></table>`;
    if (openSystemPrint(`كشف ${supplierName}`, content)) toast.success("فُتح كشف حساب المورد للطباعة أو الحفظ من نافذة النظام.");
  };

  const printCashClosing = (closing: CashClosing) => {
    const summary = getDailyCashSummary(store.sales, store.cashExpenses, closing.date, closing.openingCash, closing.actualCash, store.debtCollections);
    const varianceLabel = summary.variance === 0 ? "متطابق" : summary.variance && summary.variance > 0 ? "زيادة" : "عجز";
    const denominationRows = getActiveCashDenominations(closing.denominations).map((entry) => `<tr><td dir="ltr">${entry.denomination} د.ل × ${entry.count}</td><td dir="ltr">${money(entry.denomination * entry.count)}</td></tr>`).join("");
    const denominationsHtml = denominationRows ? `<h2>عدّ النقد بالفئات</h2><table><thead><tr><th>الفئة والعدد</th><th>الإجمالي</th></tr></thead><tbody>${denominationRows}</tbody></table>` : "";
    const content = `<h1>تسوية وإغلاق وردية يومي</h1><p>${escapeHtml(store.storeName)} · ${closing.date} · ${formatDate(closing.closedAt)}</p><table><tbody>${closing.responsibleName ? `<tr><th>مسؤول الوردية</th><td>${escapeHtml(closing.responsibleName)}</td></tr>` : ""}<tr><th>النقد الافتتاحي</th><td dir="ltr">${money(closing.openingCash)}</td></tr><tr><th>مبيعات نقدية مسجلة</th><td dir="ltr">${money(summary.cashSales)}</td></tr><tr><th>تحصيل ذمم</th><td dir="ltr">${money(summary.debtCollections)}</td></tr><tr><th>مصروفات مسجلة</th><td dir="ltr">-${money(summary.expenses)}</td></tr><tr><th>النقد المتوقع</th><td dir="ltr">${money(summary.expectedCash)}</td></tr><tr><th>النقد الفعلي</th><td dir="ltr">${money(closing.actualCash)}</td></tr><tr><th>${varianceLabel}</th><td dir="ltr">${money(Math.abs(summary.variance ?? 0))}</td></tr><tr><th>صافي ربح التشغيل</th><td dir="ltr">${money(summary.netOperatingProfit)}</td></tr></tbody></table>${denominationsHtml}${closing.note ? `<p><strong>ملاحظة:</strong> ${escapeHtml(closing.note)}</p>` : ""}<p class="foot">الحساب يعتمد على مبيعات النقد وتحصيل الذمم ومصروفات اليوم المسجلة داخل سوقنا.</p>`;
    return openSystemPrint(`إغلاق وردية ${closing.date}`, content);
  };

  const savePaymentReconciliation = (paymentMethod: "card" | "transfer") => {
    const row = reconciliationRows.find((entry) => entry.paymentMethod === paymentMethod);
    if (!row) return;
    const record: PaymentReconciliationRecord = { id: makeId("payment-reconciliation"), date: reconciliationDate, paymentMethod, posTotal: row.posTotal, bankStatementTotal: row.bankStatementTotal, difference: row.difference, note: reconciliationNote.trim().slice(0, 240), reviewedAt: new Date().toISOString() };
    setStore((current) => ({ ...current, paymentReconciliations: [record, ...current.paymentReconciliations.filter((entry) => !(entry.date === record.date && entry.paymentMethod === record.paymentMethod))].slice(0, 500) }));
    toast.success(row.matched ? `تم اعتماد مطابقة ${row.label} بنجاح.` : `تم حفظ مطابقة ${row.label} مع فرق ${money(Math.abs(row.difference))}.`);
  };

  const exportPaymentReconciliationExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = reconciliationRows.map((row) => { const saved = store.paymentReconciliations.find((entry) => entry.date === reconciliationDate && entry.paymentMethod === row.paymentMethod); return { "التاريخ": reconciliationDate, "طريقة الدفع": row.label, "صافي جهاز نقاط البيع": row.posTotal, "كشف الحساب": row.bankStatementTotal, "الفرق": row.difference, "الحالة": row.matched ? "مطابق" : "يحتاج مراجعة", "ملاحظة": saved?.note || reconciliationNote.trim(), "وقت الاعتماد": saved?.reviewedAt || "" }; });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "المطابقة اليومية");
    XLSX.writeFile(workbook, `souqna-payment-reconciliation-${reconciliationDate}.xlsx`);
    toast.success("تم تنزيل سجل المطابقة اليومية بصيغة Excel.");
  };

  const submitEmployeeAdvance = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const staffMemberId = String(data.get("staffMemberId") || "");
    const staffMember = store.localStaff.find((member) => member.id === staffMemberId);
    const type = String(data.get("type") || "cash") as EmployeeAdvanceType;
    const description = String(data.get("description") || "").trim();
    const month = String(data.get("month") || advanceMonth);
    const quantity = Math.max(0, Math.floor(Number(data.get("quantity")) || 0));
    const selectedProductId = String(data.get("productId") || "");
    const selectedProduct = store.products.find((product) => product.id === selectedProductId);
    const amountInput = Math.max(0, Number(data.get("amount")) || 0);
    const amount = type === "goods" && selectedProduct ? selectedProduct.purchasePrice * quantity : amountInput;
    const note = String(data.get("note") || "").trim();
    if (!staffMember) { toast.error("اختر الموظف أولًا."); return; }
    if (!["cash", "clothing", "goods"].includes(type)) { toast.error("اختر نوع السلفة أو العهدة."); return; }
    if (!isValidPayrollMonth(month)) { toast.error("اختر شهرًا صحيحًا."); return; }
    if (!description && type !== "goods") { toast.error("اكتب وصف السلفة أو العهدة."); return; }
    if (type === "goods" && (!selectedProduct || quantity <= 0)) { toast.error("اختر صنفًا وأدخل كمية صحيحة."); return; }
    if (amount <= 0) { toast.error("أدخل قيمة أكبر من صفر."); return; }
    if (type === "goods" && selectedProduct && selectedProduct.quantity < quantity) { toast.error(`الكمية المتاحة من «${selectedProduct.name}» هي ${selectedProduct.quantity} فقط.`); return; }
    const now = new Date().toISOString();
    const advance: EmployeeAdvance = { id: makeId("employee-advance"), staffMemberId, staffMemberName: staffMember.name, type, description: description || `بضاعة: ${selectedProduct?.name ?? ""}`, amount, quantity: type === "goods" ? quantity : undefined, productId: type === "goods" ? selectedProduct?.id : undefined, productName: type === "goods" ? selectedProduct?.name : undefined, month, createdAt: now, settled: 0, note };
    setStore((current) => ({ ...current, employeeAdvances: [advance, ...current.employeeAdvances], products: type === "goods" && selectedProduct ? current.products.map((product) => { if (product.id !== selectedProduct.id) return product; const batches = product.batches?.length ? consumeBatchesFefo(product.batches, quantity).batches : product.batches; return { ...product, quantity: product.quantity - quantity, batches }; }) : current.products }));
    setShowEmployeeAdvanceForm(false);
    setAdvanceMonth(month);
    toast.success(`تم تسجيل ${type === "cash" ? "السلفة النقدية" : "العهدة"} على ${staffMember.name} بقيمة ${money(amount)}.`);
  };

  const submitPayroll = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const staffMemberId = String(data.get("staffMemberId") || "");
    const staffMember = store.localStaff.find((member) => member.id === staffMemberId);
    const month = String(data.get("month") || payrollMonth);
    const baseSalary = Math.max(0, Number(data.get("baseSalary")) || 0);
    const manualAdvances = Math.max(0, Number(data.get("advances")) || 0);
    const registeredAdvances = getEmployeeAdvanceTotal(store.employeeAdvances, staffMemberId, month);
    const advances = manualAdvances + registeredAdvances;
    const deductions = Math.max(0, Number(data.get("deductions")) || 0);
    const paidAmount = Math.max(0, Number(data.get("paidAmount")) || 0);
    const paymentMethod = String(data.get("paymentMethod") || "cash") as PayrollPaymentMethod;
    const note = String(data.get("note") || "").trim();
    if (!staffMember) { toast.error("اختر الموظف أولًا."); return; }
    if (!/^\d{4}-\d{2}$/.test(month)) { toast.error("اختر شهرًا صحيحًا بصيغة سنة-شهر."); return; }
    if (baseSalary <= 0) { toast.error("أدخل راتبًا أساسيًا أكبر من صفر."); return; }
    if (!["cash", "card", "transfer"].includes(paymentMethod)) { toast.error("اختر طريقة دفع صحيحة."); return; }
    const netDue = Math.max(0, baseSalary - advances - deductions);
    if (paidAmount > netDue) { toast.error(`المبلغ المدفوع لا يمكن أن يتجاوز صافي الاستحقاق ${money(netDue)}.`); return; }
    const advanceNote = registeredAdvances > 0 ? `سلف وعهد مسجلة تلقائيًا: ${money(registeredAdvances)}` : "";
    const record: PayrollRecord = { id: makeId("payroll"), staffMemberId, staffMemberName: staffMember.name, month, baseSalary, advances, deductions, paidAmount, paymentMethod, note: [note, advanceNote].filter(Boolean).join(" · "), paidAt: new Date().toISOString() };
    const now = new Date().toISOString();
    const changes: PayrollChange[] = ([{ type: "salary", amount: baseSalary, reason: "تسجيل الراتب الأساسي" }, { type: "advance", amount: advances, reason: "تسجيل السلف" }, { type: "deduction", amount: deductions, reason: "تسجيل الخصومات" }, { type: "payment", amount: paidAmount, reason: "تسجيل الدفعة" }] as const).filter((change) => change.amount > 0).map((change) => ({ id: makeId("payroll-change"), payrollId: record.id, staffMemberId, staffMemberName: staffMember.name, type: change.type, amount: change.amount, reason: change.reason, createdAt: now }));
    setStore((current) => ({ ...current, payrollRecords: [...current.payrollRecords, record], payrollChanges: [...current.payrollChanges, ...changes], employeeAdvances: current.employeeAdvances.map((advance) => advance.staffMemberId === staffMemberId && advance.month === month ? { ...advance, settled: advance.amount } : advance) }));
    setShowPayrollForm(false);
    toast.success(`تم حفظ راتب ${staffMember.name} بصافي ${money(netDue)} محليًا.`);
    window.setTimeout(() => printPayrollReceipt(record), 0);
  };

  const printPayrollReceipt = (record: PayrollRecord) => {
    const netDue = getPayrollNet(record);
    const remaining = Math.max(0, netDue - record.paidAmount);
    const paymentLabel = record.paymentMethod === "cash" ? "نقدًا" : record.paymentMethod === "card" ? "بطاقة مصرفية" : "تحويل مصرفي";
    const linkedAdvances = store.employeeAdvances.filter((advance) => advance.staffMemberId === record.staffMemberId && advance.month === record.month);
    const advanceRows = linkedAdvances.length ? `<tr><th colspan="2">تفاصيل السلف والعهد</th></tr>${linkedAdvances.map((advance) => `<tr><td>${escapeHtml(advance.description)}${advance.productName ? ` (${escapeHtml(advance.productName)} × ${advance.quantity ?? 1})` : ""}</td><td dir="ltr">-${money(advance.amount)}</td></tr>`).join("")}` : "";
    const content = `<div class="receipt-brand"><h1>${escapeHtml(store.storeName)}</h1><p>إيصال استلام راتب</p></div><div class="test-rule"></div><table><tbody><tr><th>الموظف</th><td>${escapeHtml(record.staffMemberName)}</td></tr><tr><th>الشهر</th><td dir="ltr">${escapeHtml(record.month)}</td></tr><tr><th>الراتب الأساسي</th><td dir="ltr">${money(record.baseSalary)}</td></tr><tr><th>السلف</th><td dir="ltr">-${money(record.advances)}</td></tr><tr><th>الخصومات</th><td dir="ltr">-${money(record.deductions)}</td></tr><tr><th>صافي الاستحقاق</th><td dir="ltr"><strong>${money(netDue)}</strong></td></tr><tr><th>المبلغ المستلم</th><td dir="ltr"><strong>${money(record.paidAmount)}</strong></td></tr><tr><th>المتبقي</th><td dir="ltr">${money(remaining)}</td></tr><tr><th>طريقة الدفع</th><td>${paymentLabel}</td></tr></tbody></table>${record.note ? `<p class="foot">ملاحظة: ${escapeHtml(record.note)}</p>` : ""}<div class="test-rule"></div><p class="foot">أقر باستلام المبلغ الموضح أعلاه.</p><p class="foot">التاريخ: ${formatDate(record.paidAt)}</p>`;
    const receiptContent = content.replace(`<tr><th>السلف</th><td dir="ltr">-${money(record.advances)}</td></tr>`, `<tr><th>السلف والعهد</th><td dir="ltr">-${money(record.advances)}</td></tr>${advanceRows}`);
    if (openSystemPrint(`إيصال استلام راتب ${record.staffMemberName}`, receiptContent)) toast.success("فُتح إيصال استلام الراتب للطباعة أو الحفظ.");
  };

  const repeatPayrollRecord = (record: PayrollRecord) => {
    const nextMonth = getNextPayrollMonth(record.month);
    const repeated: PayrollRecord = { ...record, id: makeId("payroll"), month: nextMonth, advances: 0, deductions: 0, paidAmount: 0, note: `نسخة مكررة من كشف ${record.month}${record.note ? ` · ${record.note}` : ""}`, paidAt: new Date().toISOString() };
    const change: PayrollChange = { id: makeId("payroll-change"), payrollId: repeated.id, staffMemberId: repeated.staffMemberId, staffMemberName: repeated.staffMemberName, type: "salary", amount: repeated.baseSalary, reason: `تكرار كشف راتب ${record.month} إلى ${nextMonth}`, createdAt: repeated.paidAt };
    setStore((current) => ({ ...current, payrollRecords: [...current.payrollRecords, repeated], payrollChanges: [...current.payrollChanges, change] }));
    setPayrollMonth(nextMonth);
    toast.success(`تم تكرار كشف ${record.staffMemberName} إلى ${nextMonth} دون سلف أو خصومات.`);
  };

  const printPayrollRecord = (record: PayrollRecord) => {
    const netDue = getPayrollNet(record);
    const remaining = Math.max(0, netDue - record.paidAmount);
    const content = `<h1>كشف راتب موظف</h1><p>${escapeHtml(store.storeName)} · ${escapeHtml(record.month)} · ${escapeHtml(record.staffMemberName)}</p><table><tbody><tr><th>الموظف</th><td>${escapeHtml(record.staffMemberName)}</td></tr><tr><th>الشهر</th><td dir="ltr">${escapeHtml(record.month)}</td></tr><tr><th>الراتب الأساسي</th><td dir="ltr">${money(record.baseSalary)}</td></tr><tr><th>السلف</th><td dir="ltr">-${money(record.advances)}</td></tr><tr><th>الخصومات</th><td dir="ltr">-${money(record.deductions)}</td></tr><tr><th>صافي الاستحقاق</th><td dir="ltr">${money(netDue)}</td></tr><tr><th>المدفوع</th><td dir="ltr">${money(record.paidAmount)}</td></tr><tr><th>المتبقي</th><td dir="ltr">${money(remaining)}</td></tr><tr><th>طريقة الدفع</th><td>${record.paymentMethod === "cash" ? "نقدًا" : record.paymentMethod === "card" ? "بطاقة مصرفية" : "تحويل مصرفي"}</td></tr></tbody></table>${record.note ? `<p class="foot">ملاحظة: ${escapeHtml(record.note)}</p>` : ""}`;
    if (openSystemPrint(`كشف راتب ${record.staffMemberName} ${record.month}`, content)) toast.success("فُتح كشف الراتب للطباعة أو الحفظ.");
  };

  const exportPayrollExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = monthlyPayrollRecords.map((record) => ({ "الموظف": record.staffMemberName, "الشهر": record.month, "الراتب الأساسي": record.baseSalary, "السلف": record.advances, "الخصومات": record.deductions, "صافي الاستحقاق": getPayrollNet(record), "المدفوع": record.paidAmount, "المتبقي": Math.max(0, getPayrollNet(record) - record.paidAmount), "طريقة الدفع": record.paymentMethod === "cash" ? "نقدًا" : record.paymentMethod === "card" ? "بطاقة مصرفية" : "تحويل مصرفي", "تاريخ التسجيل": record.paidAt, "ملاحظة": record.note }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "الموظف": "لا توجد سجلات", "الشهر": payrollMonth }]), "الرواتب");
    XLSX.writeFile(workbook, `souqna-payroll-${payrollMonth}.xlsx`);
    toast.success("تم تنزيل كشف الرواتب بصيغة Excel.");
  };

  const exportEmployeeStatementExcel = async () => {
    const staffMember = store.localStaff.find((member) => member.id === employeeStatementStaffId);
    if (!staffMember || !employeeStatement) { toast.error("اختر موظفًا أولًا لتصدير كشفه."); return; }
    const XLSX = await import("xlsx");
    const rows = employeeStatement.entries.map((entry) => ({ "الموظف": staffMember.name, "النوع": entry.type, "المرجع": entry.reference, "القيمة المسجلة": entry.amount, "المتبقي للخصم": entry.outstanding, "التاريخ": entry.occurredAt, "الملاحظة": entry.note }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "الموظف": staffMember.name, "الحالة": "لا توجد عمليات" }]), "كشف الموظف");
    XLSX.writeFile(workbook, `souqna-employee-statement-${staffMember.name}-${todayKey()}.xlsx`);
    toast.success("تم تنزيل كشف حساب الموظف بصيغة Excel.");
  };

  const printEmployeeStatement = () => {
    const staffMember = store.localStaff.find((member) => member.id === employeeStatementStaffId);
    if (!staffMember || !employeeStatement) { toast.error("اختر موظفًا أولًا لطباعة كشفه."); return; }
    const rows = employeeStatement.entries.map((entry) => `<tr><td>${escapeHtml(entry.type)}</td><td>${escapeHtml(entry.reference)}</td><td dir="ltr">${money(entry.amount)}</td><td dir="ltr">${money(entry.outstanding)}</td><td>${escapeHtml(formatDate(entry.occurredAt))}</td></tr>`).join("");
    const content = `<div class="receipt-brand"><h1>${escapeHtml(store.storeName)}</h1><p>كشف حساب موظف</p></div><div class="test-rule"></div><table><tbody><tr><th>الموظف</th><td>${escapeHtml(staffMember.name)}</td></tr><tr><th>إجمالي المأخوذ</th><td dir="ltr">${money(employeeStatement.recordedTotal)}</td></tr><tr><th>المتبقي للخصم</th><td dir="ltr"><strong>${money(employeeStatement.outstanding)}</strong></td></tr>${employeeStatementCreditLimit > 0 ? `<tr><th>سقف الائتمان</th><td dir="ltr">${money(employeeStatementCreditLimit)}</td></tr>` : ""}</tbody></table><div class="test-rule"></div><table><thead><tr><th>النوع</th><th>المرجع</th><th>القيمة</th><th>المتبقي</th><th>التاريخ</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>لا توجد عمليات</td></tr>"}</tbody></table><p class="foot">وقت الطباعة: ${escapeHtml(formatDate(new Date().toISOString()))}</p>`;
    if (openSystemPrint(`كشف حساب ${staffMember.name}`, content)) toast.success("فُتح كشف حساب الموظف للطباعة أو الحفظ.");
  };

  const exportOperatingExpensesExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = monthlyOperatingExpenses.map((entry) => ({ "البند": entry.category, "عدد العمليات": entry.count, "الإجمالي": entry.total, "الملاحظات": entry.notes.join(" · ") }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "البند": "لا توجد مصروفات", "الشهر": payrollMonth }]), "المصاريف");
    XLSX.writeFile(workbook, `souqna-operating-expenses-${payrollMonth}.xlsx`);
    toast.success("تم تنزيل تقرير المصاريف التشغيلية بصيغة Excel.");
  };

  const submitCashExpense = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const category = String(data.get("category") || "").trim();
    const note = String(data.get("note") || "").trim();
    const date = String(data.get("date") || todayKey());
    if (!Number.isFinite(amount) || amount <= 0 || !category) {
      toast.error("أدخل مبلغًا صحيحًا واختر وصفًا للمصروف.");
      return;
    }
    const expense: CashExpense = { id: makeId("cash-expense"), amount, category, note, spentAt: `${date}T12:00:00.000Z` };
    setStore((current) => ({ ...current, cashExpenses: [...current.cashExpenses, expense] }));
    setShowCashExpenseForm(false);
    toast.success("تم تسجيل المصروف محليًا وتحديث صافي تشغيل اليوم.");
  };

  const submitCashClosing = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get("date") || todayKey());
    const openingCash = Number(data.get("openingCash"));
    const manualActualCash = Number(data.get("actualCash"));
    const denominations = getActiveCashDenominations(countedCashEntries);
    const actualCash = denominations.length ? countedCashTotal : manualActualCash;
    const note = String(data.get("note") || "").trim();
    const responsibleName = String(data.get("responsibleName") || "").trim().slice(0, 80);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(openingCash) || openingCash < 0 || !Number.isFinite(actualCash) || actualCash < 0) {
      toast.error("أدخل تاريخًا ومبالغ نقدية صحيحة لإغلاق الوردية.");
      return;
    }
    const closing: CashClosing = { id: makeId("cash-closing"), date, openingCash, actualCash, denominations, responsibleName, note, closedAt: new Date().toISOString() };
    setStore((current) => ({ ...current, cashClosings: [...current.cashClosings.filter((entry) => entry.date !== date), closing] }));
    setCashDenominationCounts({});
    setShowCashClosingForm(false);
    const opened = printCashClosing(closing);
    toast.success(opened ? "تم اعتماد الإغلاق وفتح مستند الوردية للطباعة أو الحفظ." : "تم اعتماد إغلاق الوردية محليًا.");
  };

  const openCashClosingForm = () => {
    const previousCounts = Object.fromEntries((todayCashClosing?.denominations ?? []).map((entry) => [entry.denomination, String(entry.count)]));
    setCashDenominationCounts(previousCounts);
    setShowCashClosingForm(true);
  };

  const submitDailySalesGoal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get("date") || todayKey());
    const target = Number(data.get("target"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(target) || target <= 0) {
      toast.error("أدخل تاريخًا وهدف مبيعات صحيحًا أكبر من صفر.");
      return;
    }
    setStore((current) => ({ ...current, dailySalesGoals: { ...current.dailySalesGoals, [date]: { date, target, setAt: new Date().toISOString() } } }));
    setShowDailyGoalForm(false);
    toast.success(`تم حفظ هدف مبيعات ${money(target)} ليوم ${date} محليًا.`);
  };

  const clearDailySalesGoal = () => {
    setStore((current) => {
      const dailySalesGoals = { ...current.dailySalesGoals };
      delete dailySalesGoals[todayKey()];
      return { ...current, dailySalesGoals };
    });
    setShowDailyGoalForm(false);
    toast.success("تمت إزالة هدف مبيعات اليوم.");
  };

  const submitMonthlySalesGoal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const month = String(data.get("month") || currentMonthKey);
    const target = Number(data.get("target"));
    if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(target) || target <= 0) {
      toast.error("أدخل شهرًا وهدف مبيعات صحيحًا أكبر من صفر.");
      return;
    }
    setStore((current) => ({ ...current, monthlySalesGoals: { ...current.monthlySalesGoals, [month]: { month, target, setAt: new Date().toISOString() } } }));
    setShowMonthlyGoalForm(false);
    toast.success(`تم حفظ هدف مبيعات ${money(target)} لشهر ${month} محليًا.`);
  };

  const clearMonthlySalesGoal = () => {
    setStore((current) => {
      const monthlySalesGoals = { ...current.monthlySalesGoals };
      delete monthlySalesGoals[currentMonthKey];
      return { ...current, monthlySalesGoals };
    });
    setShowMonthlyGoalForm(false);
    toast.success("تمت إزالة هدف مبيعات الشهر الحالي.");
  };

  const addCustomerCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const discountPercent = Number(data.get("discountPercent"));
    if (!name || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      toast.error("اكتب اسم فئة وخصمًا من 0% إلى 100%.");
      return;
    }
    if (store.customerCategories.some((category) => category.name.toLocaleLowerCase("ar") === name.toLocaleLowerCase("ar"))) {
      toast.error("توجد فئة زبائن بهذا الاسم بالفعل.");
      return;
    }
    setStore((current) => ({ ...current, customerCategories: [...current.customerCategories, { id: makeId("customer-category"), name, discountPercent }] }));
    event.currentTarget.reset();
    toast.success(`تم حفظ فئة «${name}» بخصم ${discountPercent}%.`);
  };

  const deleteCustomerCategory = (category: CustomerCategory) => {
    if (!window.confirm(`سيُحذف تصنيف «${category.name}» فقط. تبقى الفواتير السابقة كما هي. هل تريد المتابعة؟`)) return;
    setStore((current) => ({ ...current, customerCategories: current.customerCategories.filter((item) => item.id !== category.id) }));
    if (selectedCustomerCategoryId === category.id) {
      setSelectedCustomerCategoryId("");
      setSaleDiscountPercent(String(store.defaultDiscountPercent));
    }
    toast.success("تم حذف فئة الزبائن محليًا.");
  };

  const updateCustomerCreditLimit = (customer: string, value: string) => {
    const name = customer.trim();
    const key = name.toLocaleLowerCase("ar");
    if (!name) {
      toast.info("اختر أو اكتب اسم زبون أولًا لضبط سقف ائتمانه.");
      return;
    }
    if (!value.trim()) {
      setStore((current) => {
        const customerCreditLimits = { ...current.customerCreditLimits };
        delete customerCreditLimits[key];
        return { ...current, customerCreditLimits };
      });
      toast.success("تمت إزالة سقف ائتمان الزبون.");
      return;
    }
    const limit = Number(value);
    if (!Number.isFinite(limit) || limit < 0) {
      toast.error("أدخل سقف ائتمان صحيحًا يساوي صفرًا أو أكبر.");
      return;
    }
    setStore((current) => ({ ...current, customerCreditLimits: { ...current.customerCreditLimits, [key]: limit } }));
    toast.success("تم حفظ سقف ائتمان الزبون محليًا.");
  };

  const addLocalStaffMember = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") || "").trim();
    if (!name) {
      toast.error("اكتب اسم الموظف.");
      return;
    }
    if (store.localStaff.some((member) => member.name.toLocaleLowerCase("ar") === name.toLocaleLowerCase("ar"))) {
      toast.error("يوجد موظف بهذا الاسم بالفعل.");
      return;
    }
    setStore((current) => ({ ...current, localStaff: [...current.localStaff, { id: makeId("staff"), name }] }));
    event.currentTarget.reset();
    toast.success(`تم حفظ الموظف «${name}» محليًا.`);
  };

  const deleteLocalStaffMember = (member: LocalStaffMember) => {
    if (!window.confirm(`سيُحذف اسم «${member.name}» من قائمة الاختيار فقط، وتبقى فواتيره السابقة محفوظة. هل تريد المتابعة؟`)) return;
    setStore((current) => ({ ...current, localStaff: current.localStaff.filter((item) => item.id !== member.id) }));
    if (selectedStaffMemberId === member.id) setSelectedStaffMemberId("");
    toast.success("تم حذف الموظف من قائمة الاختيار المحلية.");
  };

  const runSensitiveAction = (title: string, action: () => void) => {
    if (!actionLockSettings.enabled) {
      action();
      return;
    }
    setActionLockPin("");
    setPendingProtectedAction({ title, action });
  };

  const verifySensitiveAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingProtectedAction) return;
    if (!(await isMatchingLocalPin(actionLockPin, actionLockSettings))) {
      toast.error("الرمز غير صحيح. لم تُنفّذ أي عملية.");
      return;
    }
    const action = pendingProtectedAction.action;
    setPendingProtectedAction(null);
    setActionLockPin("");
    action();
  };

  const saveActionLock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const pin = String(data.get("pin") || "");
    const confirmation = String(data.get("confirmation") || "");
    if (!isValidLocalPin(pin) || pin !== confirmation) {
      toast.error("اختر رمزًا رقميًا من 4 إلى 8 أرقام واكتبه متطابقًا.");
      return;
    }
    const salt = makeLocalLockSalt();
    setActionLockSettings({ enabled: true, salt, pinHash: await hashLocalPin(pin, salt) });
    event.currentTarget.reset();
    toast.success("تم تفعيل القفل المحلي للعمليات الحساسة.");
  };

  const disableActionLock = () => {
    if (!window.confirm("سيُلغى القفل المحلي من هذا الجهاز فقط. هل تريد المتابعة؟")) return;
    setActionLockSettings(emptyLocalActionLockSettings);
    toast.success("تم إيقاف القفل المحلي.");
  };

  const deleteCashExpense = (expense: CashExpense) => {
    runSensitiveAction("حذف مصروف نقدي", () => {
      if (!window.confirm(`سيُحذف مصروف «${expense.category}» بقيمة ${money(expense.amount)} من سجل الصندوق. هل تريد المتابعة؟`)) return;
      setStore((current) => ({ ...current, cashExpenses: current.cashExpenses.filter((entry) => entry.id !== expense.id) }));
      toast.success("تم حذف المصروف وتحديث صافي تشغيل اليوم.");
    });
  };

  const deleteCashClosing = (closing: CashClosing) => {
    runSensitiveAction("إلغاء إغلاق وردية", () => {
      if (!window.confirm(`سيُلغى إغلاق وردية ${closing.date} ويعود السجل إلى حالة غير مغلقة. هل تريد المتابعة؟`)) return;
      setStore((current) => ({ ...current, cashClosings: current.cashClosings.filter((entry) => entry.id !== closing.id) }));
      toast.success("تم إلغاء إغلاق الوردية محليًا.");
    });
  };

  const completeEmployeePurchase = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const staffMemberId = String(data.get("staffMemberId") || "");
    const staffMember = store.localStaff.find((member) => member.id === staffMemberId);
    const month = String(data.get("month") || currentMonthKey);
    const note = String(data.get("note") || "").trim().slice(0, 160);
    if (!cart.length) { toast.error("أضف أصناف الموظف إلى السلة أولًا."); return; }
    if (!staffMember) { toast.error("اختر الموظف صاحب المشتريات."); return; }
    if (!isValidPayrollMonth(month)) { toast.error("اختر شهر خصم صحيحًا."); return; }
    const creditLimit = Math.max(0, Number(store.employeeCreditLimits[staffMemberId]) || 0);
    const currentOutstanding = getEmployeeAdvanceTotal(store.employeeAdvances, staffMemberId);
    if (creditLimit > 0 && currentOutstanding + cartTotal > creditLimit) { toast.error(`لا يمكن ترحيل السلة: رصيد ${staffMember.name} بعد الفاتورة سيكون ${money(currentOutstanding + cartTotal)} ويتجاوز سقفه ${money(creditLimit)}.`); return; }
    const expiredCartItem = cart.find((item) => getExpiryStatus(store.products.find((product) => product.id === item.id)?.expiryDate).kind === "expired");
    if (expiredCartItem) { toast.error(`أزل «${expiredCartItem.name}» من السلة لأن صلاحيته انتهت.`); return; }
    const createdAt = new Date().toISOString();
    const saleId = makeId("employee-purchase");
    const advanceId = makeId("employee-purchase-advance");
    const sale: Sale = { id: saleId, createdAt, items: cart.map((item) => ({ productId: item.id, name: item.name, category: item.category, quantity: item.cartQuantity, price: item.salePrice, cost: item.purchasePrice })), total: cartTotal, profit: cartProfit, subtotal: cartSubtotal, discountPercent: cartDiscountPercent, discountAmount: cartDiscountAmount, quantityOfferDiscountAmount: quantityOfferSummary.discountAmount, paymentMethod: "credit", customerName: `موظف: ${staffMember.name}`, staffMemberId: selectedStaffMember?.id, staffMemberName: selectedStaffMember?.name, employeePurchaseStaffMemberId: staffMember.id, employeePurchaseStaffMemberName: staffMember.name, employeePurchaseAdvanceId: advanceId, note: ["مشتريات موظف تُخصم من الراتب", note].filter(Boolean).join(" · ") };
    const advance: EmployeeAdvance = { id: advanceId, staffMemberId: staffMember.id, staffMemberName: staffMember.name, type: "employee_purchase", description: `فاتورة مشتريات #${saleId.slice(-5)}`, amount: cartTotal, month, createdAt, settled: 0, saleId, note };
    setStore((current) => ({ ...current, sales: [sale, ...current.sales], employeeAdvances: [advance, ...current.employeeAdvances], products: current.products.map((product) => { const item = cart.find((candidate) => candidate.id === product.id); if (!item) return product; const batchConsumption = consumeBatchesFefo(product.batches ?? [], item.cartQuantity); return { ...product, quantity: product.quantity - item.cartQuantity, batches: batchConsumption.batches, expiryDate: getEarliestActiveExpiry(batchConsumption.batches) || product.expiryDate }; }) }));
    setLatestSale(sale);
    setShowEmployeePurchaseForm(false);
    setAdvanceMonth(month);
    resetSaleDraft();
    toast.success(`تم ترحيل فاتورة ${staffMember.name} بقيمة ${money(cartTotal)} إلى حسابه.`);
    window.setTimeout(() => printReceipt(sale), 0);
  };

  const returnEmployeePurchase = (sale: Sale) => {
    const linkedAdvance = store.employeeAdvances.find((advance) => advance.saleId === sale.id);
    if (!sale.employeePurchaseStaffMemberId || sale.isReturn || !linkedAdvance) { toast.error("هذه ليست فاتورة مشتريات موظف صالحة للإرجاع."); return; }
    if (linkedAdvance.settled >= linkedAdvance.amount) { toast.error("تمت تسوية هذه الفاتورة ضمن راتب سابق؛ أعدها يدويًا من حسابات الرواتب للحفاظ على الدقة."); return; }
    if (!window.confirm(`سيُرجع النظام كامل فاتورة الموظف «${sale.employeePurchaseStaffMemberName}» بقيمة ${money(sale.total)}، ويعيد الكميات للمخزون ويزيلها من حسابه. هل تريد المتابعة؟`)) return;
    const returnedAt = new Date().toISOString();
    const returnSale: Sale = { ...sale, id: makeId("employee-purchase-return"), createdAt: returnedAt, items: sale.items.map((item) => ({ ...item, quantity: -Math.abs(item.quantity) })), total: -Math.abs(sale.total), profit: -Math.abs(sale.profit), subtotal: sale.subtotal ? -Math.abs(sale.subtotal) : -Math.abs(sale.total), discountAmount: sale.discountAmount ? -Math.abs(sale.discountAmount) : 0, isReturn: true, returnOfSaleId: sale.id, returnReason: "إرجاع كامل لمشتريات موظف", note: `إرجاع فاتورة مشتريات الموظف #${sale.id.slice(-5)}` };
    setStore((current) => ({ ...current, sales: [returnSale, ...current.sales], employeeAdvances: current.employeeAdvances.map((advance) => advance.id === linkedAdvance.id ? { ...advance, settled: advance.amount } : advance), products: current.products.map((product) => { const returnedItem = sale.items.find((item) => item.productId === product.id); if (!returnedItem) return product; const quantity = Math.abs(returnedItem.quantity); const batches = [...(product.batches ?? []), { id: makeId("employee-purchase-return-batch"), receivedAt: returnedAt, quantity, remainingQuantity: quantity, purchasePrice: Math.max(0, returnedItem.cost), expiryDate: product.expiryDate || "", supplierName: "إرجاع مشتريات موظف", note: `إرجاع فاتورة #${sale.id.slice(-5)}` }]; return { ...product, quantity: product.quantity + quantity, batches, expiryDate: getEarliestActiveExpiry(batches) || product.expiryDate }; }) }));
    toast.success("تم إرجاع الفاتورة: أعيدت الكميات للمخزون وأزيلت قيمتها من حساب الموظف.");
    window.setTimeout(() => printReceipt(returnSale), 0);
  };

  const openEmployeePurchasePartialReturn = (sale: Sale) => {
    const linkedAdvance = store.employeeAdvances.find((advance) => advance.saleId === sale.id);
    if (!sale.employeePurchaseStaffMemberId || sale.isReturn || !linkedAdvance) { toast.error("هذه ليست فاتورة مشتريات موظف صالحة للإرجاع."); return; }
    if (linkedAdvance.settled >= linkedAdvance.amount) { toast.error("تمت تسوية هذه الفاتورة ضمن راتب سابق؛ لا يمكن إرجاعها من هذا المسار."); return; }
    const previouslyReturned = store.sales.filter((candidate) => candidate.returnOfSaleId === sale.id && candidate.isReturn).flatMap((candidate) => candidate.items).reduce<Record<string, number>>((totals, item) => ({ ...totals, [item.productId]: (totals[item.productId] || 0) + Math.abs(item.quantity) }), {});
    setEmployeePurchaseReturnSale(sale);
    setEmployeePurchaseReturnQuantities(Object.fromEntries(sale.items.map((item) => [item.productId, String(Math.max(0, Math.abs(item.quantity) - (previouslyReturned[item.productId] || 0)))])));
  };

  const submitEmployeePurchasePartialReturn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sale = employeePurchaseReturnSale;
    if (!sale) return;
    const linkedAdvance = store.employeeAdvances.find((advance) => advance.saleId === sale.id);
    if (!linkedAdvance) { toast.error("تعذر العثور على رصيد هذه الفاتورة."); return; }
    const previouslyReturned = store.sales.filter((candidate) => candidate.returnOfSaleId === sale.id && candidate.isReturn).flatMap((candidate) => candidate.items).reduce<Record<string, number>>((totals, item) => ({ ...totals, [item.productId]: (totals[item.productId] || 0) + Math.abs(item.quantity) }), {});
    const returnedItems = sale.items.flatMap((item) => { const quantity = Math.max(0, Math.floor(Number(employeePurchaseReturnQuantities[item.productId]) || 0)); const remaining = Math.max(0, Math.abs(item.quantity) - (previouslyReturned[item.productId] || 0)); return quantity > 0 && quantity <= remaining ? [{ ...item, quantity }] : []; });
    if (!returnedItems.length) { toast.error("أدخل كمية إرجاع صحيحة لصنف واحد على الأقل."); return; }
    if (returnedItems.length !== sale.items.filter((item) => (Number(employeePurchaseReturnQuantities[item.productId]) || 0) > 0).length) { toast.error("إحدى كميات الإرجاع أكبر من الكمية المتبقية في الفاتورة."); return; }
    const originalGross = sale.items.reduce((total, item) => total + Math.abs(item.quantity) * item.price, 0);
    const returnedGross = returnedItems.reduce((total, item) => total + item.quantity * item.price, 0);
    const returnedCost = returnedItems.reduce((total, item) => total + item.quantity * item.cost, 0);
    const returnedTotal = originalGross > 0 ? Math.min(linkedAdvance.amount - linkedAdvance.settled, sale.total * (returnedGross / originalGross)) : 0;
    if (returnedTotal <= 0) { toast.error("تعذر احتساب قيمة الإرجاع."); return; }
    const returnedAt = new Date().toISOString();
    const returnSale: Sale = { ...sale, id: makeId("employee-purchase-partial-return"), createdAt: returnedAt, items: returnedItems.map((item) => ({ ...item, quantity: -item.quantity })), total: -returnedTotal, profit: -(returnedTotal - returnedCost), subtotal: -returnedGross, discountAmount: -(returnedGross - returnedTotal), isReturn: true, returnOfSaleId: sale.id, returnReason: "إرجاع جزئي لمشتريات موظف", note: `إرجاع جزئي لفاتورة الموظف #${sale.id.slice(-5)}` };
    setStore((current) => ({ ...current, sales: [returnSale, ...current.sales], employeeAdvances: current.employeeAdvances.map((advance) => advance.id === linkedAdvance.id ? { ...advance, settled: Math.min(advance.amount, advance.settled + returnedTotal) } : advance), products: current.products.map((product) => { const returnedItem = returnedItems.find((item) => item.productId === product.id); if (!returnedItem) return product; const batches = [...(product.batches ?? []), { id: makeId("employee-purchase-partial-return-batch"), receivedAt: returnedAt, quantity: returnedItem.quantity, remainingQuantity: returnedItem.quantity, purchasePrice: Math.max(0, returnedItem.cost), expiryDate: product.expiryDate || "", supplierName: "إرجاع جزئي لمشتريات موظف", note: `إرجاع فاتورة #${sale.id.slice(-5)}` }]; return { ...product, quantity: product.quantity + returnedItem.quantity, batches, expiryDate: getEarliestActiveExpiry(batches) || product.expiryDate }; }) }));
    setEmployeePurchaseReturnSale(null);
    setEmployeePurchaseReturnQuantities({});
    toast.success(`تم إرجاع أصناف بقيمة ${money(returnedTotal)} وإعادة الكميات للمخزون وتخفيض حساب الموظف.`);
    window.setTimeout(() => printReceipt(returnSale), 0);
  };

  const completeSale = () => {
    if (!cart.length) {
      toast.error("أضف صنفًا واحدًا على الأقل إلى السلة.");
      return;
    }
    if (!selectedStaffMember) {
      toast.error(store.localStaff.length ? "اختر اسم الموظف قبل إتمام البيع." : "أضف اسم موظف من الإعدادات قبل إتمام البيع.");
      return;
    }
    const expiredCartItem = cart.find((item) => getExpiryStatus(store.products.find((product) => product.id === item.id)?.expiryDate).kind === "expired");
    if (expiredCartItem) {
      toast.error(`أزل «${expiredCartItem.name}» من السلة لأن صلاحيته انتهت.`);
      return;
    }
    const paymentSplits = mixedPaymentEnabled ? normalizePaymentSplits((Object.entries(paymentSplitAmounts) as Array<[PaymentMethod, string]>).map(([method, amount]) => ({ paymentMethod: method, amount: Number(amount) || 0, bankName: mixedBankName, posTerminalType: mixedPosTerminalType })), cartTotal) : undefined;
    if (mixedPaymentEnabled && Math.abs(getPaymentSplitsTotal(paymentSplits || []) - cartTotal) > 0.01) {
      toast.error(`أكمل تقسيم المبلغ. المتبقي ${money(Math.max(0, cartTotal - getPaymentSplitsTotal(paymentSplits || [])))}.`);
      return;
    }
    const creditSplitAmount = paymentSplits?.find((split) => split.paymentMethod === "credit")?.amount || 0;
    if ((paymentMethod === "credit" || creditSplitAmount > 0) && !customerName.trim()) {
      toast.error("اكتب اسم الزبون لتسجيل الذمة.");
      return;
    }
    if (!mixedPaymentEnabled && paymentMethod === "credit" && customerCreditStatus?.blocked) {
      toast.error(`لا يمكن إتمام البيع الآجل: السقف ${money(customerCreditStatus.limit ?? 0)} والرصيد المتوقع ${money(customerCreditStatus.projected)}.`);
      return;
    }
    const marginViolations = getMinimumMarginViolations(cart, cartDiscountAmount);
    if (marginViolations.length) {
      const firstViolation = marginViolations[0];
      toast.error(`لا يمكن اعتماد البيع: «${firstViolation.productName}» أقل من هامش الربح الأدنى ${firstViolation.minimumMarginPercent}%.`);
      return;
    }
    if (trainingMode) {
      resetSaleDraft();
      toast.success("اكتملت تجربة البيع دون حفظ فاتورة أو تعديل المخزون.");
      return;
    }
    const sale: Sale = {
      id: makeId("sale"),
      createdAt: new Date().toISOString(),
      items: cart.map((item) => ({ productId: item.id, name: item.name, category: item.category, quantity: item.cartQuantity, price: item.salePrice, cost: item.purchasePrice })),
      total: cartTotal,
      profit: cartProfit,
      subtotal: cartSubtotal,
      discountPercent: cartDiscountPercent,
      discountAmount: cartDiscountAmount,
      quantityOfferDiscountAmount: quantityOfferSummary.discountAmount,
      paymentMethod: mixedPaymentEnabled ? "cash" : paymentMethod,
      paymentSplits: paymentSplits?.length ? paymentSplits : undefined,
      bankName: !mixedPaymentEnabled && (paymentMethod === "card" || paymentMethod === "transfer") ? bankName.trim().slice(0, 80) || undefined : undefined,
      posTerminalType: !mixedPaymentEnabled && (paymentMethod === "card" || paymentMethod === "transfer") ? posTerminalType.trim().slice(0, 80) || undefined : undefined,
      customerName: (!mixedPaymentEnabled && paymentMethod === "credit") || creditSplitAmount > 0 ? customerName.trim() : undefined,
      customerPhone: (!mixedPaymentEnabled && paymentMethod === "credit") || creditSplitAmount > 0 ? customerPhone.trim() || undefined : undefined,
      customerCategoryId: selectedCustomerCategory?.id || undefined,
      customerCategoryName: selectedCustomerCategory?.name || undefined,
      staffMemberId: selectedStaffMember?.id || undefined,
      staffMemberName: selectedStaffMember?.name || undefined,
      note: saleNote.trim().slice(0, 240) || undefined,
      orderReference: saleOrderReference.trim().slice(0, 80) || undefined,
      costCenter: saleCostCenter.trim().slice(0, 80) || undefined,
    };
    setStore((current) => ({
      ...current,
      sales: [sale, ...current.sales],
      products: current.products.map((product) => {
        const item = cart.find((candidate) => candidate.id === product.id);
        if (!item) return product;
        const batchConsumption = consumeBatchesFefo(product.batches ?? [], item.cartQuantity);
        return { ...product, quantity: product.quantity - item.cartQuantity, batches: batchConsumption.batches, expiryDate: getEarliestActiveExpiry(batchConsumption.batches) || product.expiryDate };
      }),
      debts: (mixedPaymentEnabled ? creditSplitAmount > 0 : paymentMethod === "credit") ? [{ id: makeId("debt"), customerName: customerName.trim(), customerPhone: customerPhone.trim() || undefined, amount: mixedPaymentEnabled ? creditSplitAmount : cartTotal, paid: 0, createdAt: sale.createdAt, dueDate: "", note: `فاتورة رقم ${sale.id.slice(-5)}` }, ...current.debts] : current.debts,
    }));
    void enqueueSaleForCloudSync(sale).catch((error) => {
      console.error("تعذر إضافة الفاتورة إلى قائمة المزامنة", error);
      toast.error("حُفظت الفاتورة محليًا، لكن تعذرت إضافة المزامنة. صدّر نسخة احتياطية وأعد المحاولة.");
    });
    setLatestSale(sale);
    resetSaleDraft();
    toast.success(mixedPaymentEnabled ? `تم تسجيل البيع المختلط: ${getPaymentSplitsLabel(paymentSplits || [])}.` : paymentMethod === "credit" ? "تم حفظ البيع والذمة." : "تم تسجيل البيع بنجاح.");
  };

  useEffect(() => {
    if (page !== "sale") return;
    const handleSaleShortcut = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      const isTyping = Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT" || element.isContentEditable));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        saleSearchInputRef.current?.focus();
        return;
      }
      if (event.key === "Escape" && isCashierFullscreen) {
        setIsCashierFullscreen(false);
        return;
      }
      if (!isTyping) {
        const customAction = (Object.keys(CASHIER_SHORTCUT_ACTION_LABELS) as CashierShortcutAction[]).find((action) => matchesCashierShortcut(event, cashierSettings.shortcuts[action]));
        if (customAction) {
          event.preventDefault();
          if (customAction === "focus-search") { saleSearchInputRef.current?.focus(); return; }
          if (customAction === "open-scanner") { setShowBarcodeScanner(true); return; }
          if (customAction === "new-sale") { resetSaleDraft(); toast.success("تم تجهيز فاتورة جديدة."); return; }
          if (customAction === "confirm-sale") { completeSale(); return; }
          if (customAction === "suspend-sale") { suspendCurrentSale(); return; }
          if (customAction === "open-price-lookup") { openPriceLookup(); return; }
          if (customAction === "open-returns") { setActivePage("returns"); return; }
          if (customAction === "open-product-form") { if (trainingMode) toast.info("إضافة الأصناف متوقفة أثناء التدريب."); else { setEditingProduct(null); setPendingBarcode(""); setPendingProductImage(""); setShowProductForm(true); } return; }
          if (customAction === "cash-payment") { setMixedPaymentEnabled(false); setPaymentMethod("cash"); toast.success("تم اختيار الدفع النقدي."); return; }
          if (customAction === "card-payment") { setMixedPaymentEnabled(false); setPaymentMethod("card"); toast.success("تم اختيار الدفع بالبطاقة."); return; }
          if (customAction === "toggle-fullscreen") { setIsCashierFullscreen((current) => !current); return; }
          window.print();
          return;
        }
      }
      const desktopFunctionKey = getDesktopInvoiceFunctionKey(event);
      if (desktopFunctionKey) {
        event.preventDefault();
        if (desktopFunctionKey === "F1") { saleSearchInputRef.current?.focus(); return; }
        if (desktopFunctionKey === "F2") { setShowBarcodeScanner(true); return; }
        if (desktopFunctionKey === "F3") { resetSaleDraft(); toast.success("تم تجهيز فاتورة جديدة."); return; }
        if (desktopFunctionKey === "F4") { completeSale(); return; }
        if (desktopFunctionKey === "F5") { suspendCurrentSale(); return; }
        if (desktopFunctionKey === "F6") { openPriceLookup(); return; }
        if (desktopFunctionKey === "F7") { setActivePage("returns"); return; }
        if (desktopFunctionKey === "F8") { setEditingProduct(null); setPendingBarcode(""); setPendingProductImage(""); setShowProductForm(true); return; }
        if (desktopFunctionKey === "F9") { setMixedPaymentEnabled(false); setPaymentMethod("cash"); toast.success("تم اختيار الدفع النقدي."); return; }
        if (desktopFunctionKey === "F10") { setMixedPaymentEnabled(false); setPaymentMethod("card"); toast.success("تم اختيار الدفع بالبطاقة."); return; }
        if (desktopFunctionKey === "F11") { setIsCashierFullscreen((current) => !current); return; }
        window.print();
        return;
      }
      if (isTyping) return;
      if (matchesCashierShortcut(event, cashierSettings.shortcuts["focus-search"])) {
        event.preventDefault();
        saleSearchInputRef.current?.focus();
        return;
      }
      if (matchesCashierShortcut(event, cashierSettings.shortcuts["open-scanner"])) {
        event.preventDefault();
        setShowBarcodeScanner(true);
        return;
      }
      if (matchesCashierShortcut(event, cashierSettings.shortcuts["suspend-sale"])) {
        event.preventDefault();
        suspendCurrentSale();
        return;
      }
      if (matchesCashierShortcut(event, cashierSettings.shortcuts["confirm-sale"])) {
        event.preventDefault();
        completeSale();
        return;
      }
      if (matchesCashierShortcut(event, cashierSettings.shortcuts["toggle-fullscreen"])) {
        event.preventDefault();
        setIsCashierFullscreen((current) => !current);
      }
    };
    window.addEventListener("keydown", handleSaleShortcut);
    return () => window.removeEventListener("keydown", handleSaleShortcut);
  }, [cashierSettings.shortcuts, cart.length, completeSale, isCashierFullscreen, openPriceLookup, page, resetSaleDraft, suspendCurrentSale]);

  const prepareSaleReturn = (sale: Sale) => {
    const eligibility = getSaleReturnEligibility(sale, store.sales, store.debts);
    if (!eligibility.allowed) {
      toast.info(eligibility.reason);
      return false;
    }
    setReturnQuantities(Object.fromEntries(getSaleReturnableItems(sale, store.sales).map((item) => [item.productId, "0"])));
    setReturnCartReason("");
    return true;
  };

  const openSaleReturn = (sale: Sale) => {
    if (!prepareSaleReturn(sale)) return;
    setShowReturnReasonPicker(true);
    setReturnCartSale(sale);
  };

  const openReturnScreenSale = (sale: Sale) => {
    if (!prepareSaleReturn(sale)) return;
    setReturnScreenSale(sale);
  };

  const updateReturnCartQuantity = (productId: string, change: number) => {
    const remainingQuantity = returnCartAvailableItems.find((item) => item.productId === productId)?.remainingQuantity ?? 0;
    setReturnQuantities((current) => ({ ...current, [productId]: String(clampReturnCartQuantity(Number(current[productId]) || 0, change, remainingQuantity)) }));
  };
  const handleDirectReturnBarcodeDetected = useCallback((barcode: string) => {
    const product = findProductByBarcode(store.products, barcode);
    if (!product) {
      playBarcodeFeedback("not-found", barcodeFeedbackSoundEnabled);
      vibrateBarcodeFeedback("not-found", barcodeFeedbackVibrationEnabled);
      const message = `الباركود ${barcode} غير مسجل في المخزون.`;
      setCartBarcodeFeedback({ kind: "error", mode: "return", message });
      toast.error(message, { className: "barcode-toast barcode-toast--error" });
      return;
    }
    setDirectReturnQuantities((current) => ({ ...current, [product.id]: String(Math.min(999999, (Number(current[product.id]) || 0) + 1)) }));
    const message = `تمت إضافة «${product.name}» إلى سلة الإرجاع المباشر.`;
    setCartBarcodeFeedback({ kind: "success", mode: "return", productName: product.name, message });
    playBarcodeFeedback("success", barcodeFeedbackSoundEnabled);
    vibrateBarcodeFeedback("success", barcodeFeedbackVibrationEnabled);
    toast.success(message, { className: "barcode-toast barcode-toast--success" });
  }, [barcodeFeedbackSoundEnabled, barcodeFeedbackVibrationEnabled, store.products]);

  const handleReturnBarcodeDetected = useCallback((barcode: string) => {
    if (!activeReturnSale) return;
    const product = findProductByBarcode(store.products, barcode);
    if (!product) {
      playBarcodeFeedback("not-found", barcodeFeedbackSoundEnabled);
      vibrateBarcodeFeedback("not-found", barcodeFeedbackVibrationEnabled);
      const message = `الباركود ${barcode} غير مسجل في المخزون.`;
      setCartBarcodeFeedback({ kind: "error", mode: "return", message });
      toast.error(message, { className: "barcode-toast barcode-toast--error" });
      return;
    }
    const entry = returnCartAvailableItems.find((item) => item.productId === product.id);
    if (!entry) {
      playBarcodeFeedback("error", barcodeFeedbackSoundEnabled);
      vibrateBarcodeFeedback("error", barcodeFeedbackVibrationEnabled);
      const message = `«${product.name}» ليس ضمن الفاتورة المفتوحة للإرجاع.`;
      setCartBarcodeFeedback({ kind: "error", mode: "return", productName: product.name, message });
      toast.error(message, { className: "barcode-toast barcode-toast--error" });
      return;
    }
    const selectedQuantity = Number(returnQuantities[product.id]) || 0;
    if (selectedQuantity >= entry.remainingQuantity) {
      playBarcodeFeedback("error", barcodeFeedbackSoundEnabled);
      vibrateBarcodeFeedback("error", barcodeFeedbackVibrationEnabled);
      const message = `بلغت الكمية المتاحة لإرجاع «${product.name}».`;
      setCartBarcodeFeedback({ kind: "error", mode: "return", productName: product.name, message });
      toast.error(message, { className: "barcode-toast barcode-toast--error" });
      return;
    }
    updateReturnCartQuantity(product.id, 1);
    const nextQuantity = selectedQuantity + 1;
    const message = getCartBarcodeFeedbackMessage("return", product.name, nextQuantity);
    setCartBarcodeFeedback({ kind: "success", mode: "return", productName: product.name, message });
    playBarcodeFeedback("success", barcodeFeedbackSoundEnabled);
    vibrateBarcodeFeedback("success", barcodeFeedbackVibrationEnabled);
    toast.success(message, { className: "barcode-toast barcode-toast--success" });
  }, [activeReturnSale, barcodeFeedbackSoundEnabled, barcodeFeedbackVibrationEnabled, returnCartAvailableItems, returnQuantities, store.products]);

  useEffect(() => {
    if (page !== "sale" && page !== "returns" && !activeReturnSale) return;
    let buffer = "";
    let startedAt = 0;
    let lastKeyAt = 0;
    const handleUsbBarcodeKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable));
      if (isTyping || event.ctrlKey || event.metaKey || event.altKey) return;
      const now = Date.now();
      if (event.key === "Enter") {
        const barcode = getUsbBarcodeValue({ value: buffer, elapsedMs: startedAt ? now - startedAt : Number.POSITIVE_INFINITY });
        buffer = "";
        startedAt = 0;
        lastKeyAt = 0;
        if (!barcode) return;
        event.preventDefault();
        if (showPriceLookup) lookupProductPrice(barcode);
        else if (directReturnMode) handleDirectReturnBarcodeDetected(barcode);
        else if (activeReturnSale) handleReturnBarcodeDetected(barcode);
        else handleBarcodeDetected(barcode);
        return;
      }
      if (event.key.length !== 1 || /\s/.test(event.key)) return;
      if (!buffer || now - lastKeyAt > 380) {
        buffer = event.key;
        startedAt = now;
      } else {
        buffer += event.key;
      }
      lastKeyAt = now;
    };
    window.addEventListener("keydown", handleUsbBarcodeKey);
    return () => window.removeEventListener("keydown", handleUsbBarcodeKey);
  }, [activeReturnSale, directReturnMode, handleBarcodeDetected, handleDirectReturnBarcodeDetected, handleReturnBarcodeDetected, lookupProductPrice, page, showPriceLookup]);

  useEffect(() => {
    if (!barcodeReaderTestActive) return;
    let buffer: ExternalBarcodeBuffer = { value: "", lastKeyAt: 0 };
    let startedAt = 0;
    const handleReaderTest = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']") || event.ctrlKey || event.metaKey || event.altKey) return;
      const now = Date.now();
      if (event.key !== "Enter" && (!buffer.value || now - buffer.lastKeyAt > 250)) startedAt = now;
      const capture = captureExternalBarcodeKey(buffer, event.key, now);
      buffer = capture.buffer;
      if (!capture.barcode) return;
      const barcode = getUsbBarcodeValue({ value: capture.barcode, elapsedMs: startedAt ? now - startedAt : Number.POSITIVE_INFINITY });
      startedAt = 0;
      if (!barcode) return;
      event.preventDefault();
      setBarcodeReaderTestResult({ value: barcode, receivedAt: new Date().toISOString() });
      setBarcodeReaderTestActive(false);
      toast.success("تم التعرف على قارئ الباركود بنجاح.");
    };
    window.addEventListener("keydown", handleReaderTest);
    return () => window.removeEventListener("keydown", handleReaderTest);
  }, [barcodeReaderTestActive]);

  const commitSaleReturn = (sale: Sale, selectedItems: Sale["items"], reason: string) => {
    const returnedAt = new Date().toISOString();
    const originalGross = sale.items.reduce((total, item) => total + item.quantity * item.price, 0);
    const returnedGross = selectedItems.reduce((total, item) => total + item.quantity * item.price, 0);
    const returnedCost = selectedItems.reduce((total, item) => total + item.quantity * item.cost, 0);
    setReturnStockFeedback(selectedItems.flatMap((item) => { const product = store.products.find((entry) => entry.id === item.productId); return product ? [{ productName: product.name, quantity: product.quantity + item.quantity }] : []; }));
    const allocatedDiscount = originalGross > 0 ? Math.max(0, (sale.discountAmount ?? 0) * (returnedGross / originalGross)) : 0;
    const returnedTotal = Math.max(0, returnedGross - allocatedDiscount);
    const returnSale: Sale = { ...sale, id: makeId("sale-return"), createdAt: returnedAt, items: selectedItems.map((item) => ({ ...item, quantity: -item.quantity })), total: -returnedTotal, profit: -(returnedTotal - returnedCost), subtotal: -returnedGross, discountAmount: -allocatedDiscount, isReturn: true, returnOfSaleId: sale.id, returnReason: reason, staffMemberId: selectedReturnStaffMember?.id, staffMemberName: selectedReturnStaffMember?.name };
    setStore((current) => ({
      ...current,
      sales: [returnSale, ...current.sales],
      products: current.products.map((product) => {
        const returnedItem = selectedItems.find((item) => item.productId === product.id);
        if (!returnedItem) return product;
        const batches = [...(product.batches ?? []), { id: makeId("sale-return-batch"), receivedAt: returnedAt, quantity: returnedItem.quantity, remainingQuantity: returnedItem.quantity, purchasePrice: Math.max(0, returnedItem.cost), expiryDate: product.expiryDate || "", supplierName: "إرجاع بيع", note: `إرجاع جزئي للفاتورة ${sale.id.slice(-5)}: ${reason}` }];
        return { ...product, quantity: product.quantity + returnedItem.quantity, batches, expiryDate: getEarliestActiveExpiry(batches) || product.expiryDate };
      }),
      debts: sale.paymentMethod === "credit" ? current.debts.map((debt) => (debt.note || "").includes(sale.id.slice(-5)) ? { ...debt, amount: Math.max(0, debt.amount - returnedTotal), note: `${debt.note} · إرجاع ${money(returnedTotal)}` } : debt) : current.debts,
    }));
    setReturningSale(null);
    setReturnQuantities({});
    printReturnReceipt(returnSale);
    toast.success(`تم تسجيل إرجاع ${selectedItems.reduce((total, item) => total + item.quantity, 0)} وحدة وإعادة المخزون محليًا، وفُتح إيصال الإرجاع للطباعة.`);
  };

  const submitSaleReturn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!returningSale) return;
    if (!selectedReturnStaffMember) {
      toast.error(store.localStaff.length ? "اختر اسم الموظف قبل اعتماد الإرجاع." : "أضف اسم موظف من الإعدادات قبل اعتماد الإرجاع.");
      return;
    }
    const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
    const eligibility = getSaleReturnEligibility(returningSale, store.sales, store.debts);
    const returnableItems = getSaleReturnableItems(returningSale, store.sales);
    const returnableByProductId = new Map(returnableItems.map((item) => [item.productId, item.remainingQuantity]));
    const selectedItems = returningSale.items.flatMap((item) => {
      const quantity = Number(returnQuantities[item.productId]);
      const remainingQuantity = returnableByProductId.get(item.productId) ?? 0;
      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0 || quantity > remainingQuantity) return [];
      return quantity > 0 ? [{ ...item, quantity }] : [];
    });
    const hasInvalidQuantity = returningSale.items.some((item) => {
      const quantity = Number(returnQuantities[item.productId]);
      const remainingQuantity = returnableByProductId.get(item.productId) ?? 0;
      return !Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0 || quantity > remainingQuantity;
    });
    const expiredItem = selectedItems.find((item) => getExpiryStatus(store.products.find((product) => product.id === item.productId)?.expiryDate).kind === "expired");
    if (!eligibility.allowed) {
      toast.error(eligibility.reason);
      setReturningSale(null);
      setReturnQuantities({});
      return;
    }
    if (!reason) {
      toast.error("اكتب سبب إرجاع البيع لحفظه في السجل.");
      return;
    }
    if (hasInvalidQuantity) {
      toast.error("اختر كمية صحيحة لا تتجاوز المتبقي من كل صنف.");
      return;
    }
    if (!selectedItems.length) {
      toast.error("اختر صنفًا واحدًا وكمية واحدة على الأقل للإرجاع.");
      return;
    }
    if (expiredItem) {
      toast.error("لا يمكن إعادة صنف منتهي الصلاحية إلى المخزون. عالجه من سجل الهدر.");
      return;
    }
    runSensitiveAction("اعتماد إرجاع بيع جزئي", () => commitSaleReturn(returningSale, selectedItems, reason));
  };

  const commitReturnCart = () => {
    if (!activeReturnSale) return;
    if (!selectedReturnStaffMember) {
      toast.error(store.localStaff.length ? "اختر اسم الموظف قبل اعتماد الإرجاع." : "أضف اسم موظف من الإعدادات قبل اعتماد الإرجاع.");
      return;
    }
    const eligibility = getSaleReturnEligibility(activeReturnSale, store.sales, store.debts);
    const reason = returnCartReason.trim();
    const expiredItem = returnCartItems.find((item) => getExpiryStatus(store.products.find((product) => product.id === item.productId)?.expiryDate).kind === "expired");
    if (!eligibility.allowed) {
      toast.error(eligibility.reason);
      setReturnCartSale(null);
      setReturnScreenSale(null);
      setReturnQuantities({});
      return;
    }
    if (!reason) {
      toast.error("اكتب سبب الإرجاع لحفظه في السجل.");
      return;
    }
    if (!returnCartItems.length) {
      toast.error("أضف صنفًا واحدًا وكمية واحدة على الأقل إلى سلة الإرجاع.");
      return;
    }
    if (expiredItem) {
      toast.error("لا يمكن إعادة صنف منتهي الصلاحية إلى المخزون. عالجه من سجل الهدر.");
      return;
    }
    runSensitiveAction("اعتماد سلة إرجاع", () => {
      commitSaleReturn(activeReturnSale, returnCartItems, reason);
      setReturnCartSale(null);
      setReturnScreenSale(null);
      setReturnCartReason("");
    });
  };

  const commitDirectReturn = () => {
    if (!selectedReturnStaffMember) {
      toast.error(store.localStaff.length ? "اختر اسم الموظف قبل اعتماد الإرجاع." : "أضف اسم موظف من الإعدادات قبل اعتماد الإرجاع.");
      return;
    }
    const reason = directReturnReason.trim();
    if (!reason) { toast.error("اكتب سبب الإرجاع لحفظه في السجل."); return; }
    if (!directReturnItems.length) { toast.error("اختر صنفًا واحدًا وكمية واحدة على الأقل للإرجاع."); return; }
    const returnedAt = new Date().toISOString();
    const returnedGross = directReturnItems.reduce((total, item) => total + item.quantity * item.price, 0);
    const returnedCost = directReturnItems.reduce((total, item) => total + item.quantity * item.cost, 0);
    setReturnStockFeedback(directReturnItems.flatMap((item) => { const product = store.products.find((entry) => entry.id === item.productId); return product ? [{ productName: product.name, quantity: product.quantity + item.quantity }] : []; }));
    const returnSale: Sale = { id: makeId("sale-return"), createdAt: returnedAt, items: directReturnItems.map((item) => ({ ...item, quantity: -item.quantity })), total: -returnedGross, profit: -(returnedGross - returnedCost), subtotal: -returnedGross, discountAmount: 0, paymentMethod: directReturnPaymentMethod, isReturn: true, returnReason: reason, staffMemberId: selectedReturnStaffMember?.id, staffMemberName: selectedReturnStaffMember?.name, note: "إرجاع مباشر من المخزون" };
    setStore((current) => ({ ...current, sales: [returnSale, ...current.sales], products: current.products.map((product) => { const returnedItem = directReturnItems.find((item) => item.productId === product.id); if (!returnedItem) return product; const batches = [...(product.batches ?? []), { id: makeId("direct-return-batch"), receivedAt: returnedAt, quantity: returnedItem.quantity, remainingQuantity: returnedItem.quantity, purchasePrice: Math.max(0, returnedItem.cost), expiryDate: product.expiryDate || "", supplierName: "إرجاع مباشر", note: `إرجاع مباشر: ${reason}` }]; return { ...product, quantity: product.quantity + returnedItem.quantity, batches, expiryDate: getEarliestActiveExpiry(batches) || product.expiryDate }; }) }));
    printReturnReceipt(returnSale);
    setDirectReturnQuantities({});
    setDirectReturnReason("");
    setDirectReturnMode(false);
    toast.success(`تم تسجيل إرجاع ${directReturnItems.reduce((total, item) => total + item.quantity, 0)} وحدة وفتح الإيصال للطباعة.`);
  };

  const saveProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const savedAt = new Date().toISOString();
    const quantityOfferMinimumRaw = String(data.get("quantityOfferMinimum") || "").trim();
    const quantityOfferDiscountRaw = String(data.get("quantityOfferDiscount") || "").trim();
    const quantityOfferStartDate = String(data.get("quantityOfferStartDate") || "").trim();
    const quantityOfferEndDate = String(data.get("quantityOfferEndDate") || "").trim();
    const quantityOfferMinimum = Number(quantityOfferMinimumRaw);
    const quantityOfferDiscount = Number(quantityOfferDiscountRaw);
    if ((quantityOfferMinimumRaw || quantityOfferDiscountRaw) && (!Number.isInteger(quantityOfferMinimum) || quantityOfferMinimum < 1 || !Number.isFinite(quantityOfferDiscount) || quantityOfferDiscount <= 0 || quantityOfferDiscount > 100)) {
      toast.error("أدخل حد عرض كمية صحيحًا وخصمًا بين 0.01% و100%، أو اترك الحقلين فارغين.");
      return;
    }
    if ((quantityOfferStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(quantityOfferStartDate)) || (quantityOfferEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(quantityOfferEndDate)) || (quantityOfferStartDate && quantityOfferEndDate && quantityOfferEndDate < quantityOfferStartDate)) {
      toast.error("تحقق من تواريخ العرض: يجب ألا يسبق تاريخ النهاية تاريخ البداية.");
      return;
    }
    const product: Product = {
      id: editingProduct?.id ?? makeId("product"),
      name: String(data.get("name") || "").trim(),
      sku: String(data.get("sku") || "").trim() || `S-${Date.now().toString().slice(-4)}`,
      category: String(data.get("category") || "عام").trim(),
      imageDataUrl: isLocalProductImage(pendingProductImage) ? pendingProductImage : undefined,
      quantity: Number(data.get("quantity")),
      lowStockAt: Number(data.get("lowStockAt")),
      purchasePrice: Number(data.get("purchasePrice")),
      salePrice: Number(data.get("salePrice")),
      supplierName: String(data.get("supplierName") || "").trim(),
      expiryDate: String(data.get("expiryDate") || "").trim(),
      quantityOffers: quantityOfferMinimumRaw || quantityOfferDiscountRaw ? [{ minimumQuantity: quantityOfferMinimum, discountPercent: quantityOfferDiscount, startDate: quantityOfferStartDate || undefined, endDate: quantityOfferEndDate || undefined }] : [],
      minimumMarginPercent: Math.min(100, Math.max(0, Number(data.get("minimumMarginPercent")) || 0)),
      alternativeProductIds: data.getAll("alternativeProductIds").filter((id): id is string => typeof id === "string" && id !== editingProduct?.id).slice(0, 8),
    };
    if (!product.name || [product.quantity, product.lowStockAt, product.purchasePrice, product.salePrice].some(Number.isNaN)) {
      toast.error("أكمل بيانات الصنف المطلوبة.");
      return;
    }
    const addingFirstProduct = store.products.length === 0 && !editingProduct;
    setStore((current) => {
      const existingProduct = editingProduct ? current.products.find((item) => item.id === editingProduct.id) : undefined;
      const openingBatches = existingProduct?.batches?.length ? existingProduct.batches : existingProduct?.quantity ? [{ id: makeId("batch"), receivedAt: savedAt, quantity: existingProduct.quantity, remainingQuantity: existingProduct.quantity, purchasePrice: existingProduct.purchasePrice, expiryDate: existingProduct.expiryDate || "", supplierName: existingProduct.supplierName || "رصيد افتتاحي", note: "رصيد افتتاحي موثق عند تعديل الصنف" }] : [];
      const batches = existingProduct ? reconcileBatchStocktake(openingBatches, product.quantity, savedAt, product.purchasePrice) : product.quantity > 0 ? [{ id: makeId("batch"), receivedAt: savedAt, quantity: product.quantity, remainingQuantity: product.quantity, purchasePrice: product.purchasePrice, expiryDate: product.expiryDate || "", supplierName: product.supplierName || "رصيد افتتاحي", note: "رصيد افتتاحي عند إضافة الصنف" }] : [];
      const normalizedProduct = { ...product, batches, expiryDate: getEarliestActiveExpiry(batches) || product.expiryDate };
      const priceChanges = buildPriceChangeDrafts(editingProduct, normalizedProduct).map((change) => ({
        id: makeId("price"),
        productId: normalizedProduct.id,
        productName: normalizedProduct.name,
        ...change,
        createdAt: new Date().toISOString(),
      }));
      return {
        ...current,
        products: editingProduct ? current.products.map((item) => item.id === editingProduct.id ? normalizedProduct : item) : [normalizedProduct, ...current.products],
        priceHistory: priceChanges.length ? [...priceChanges, ...current.priceHistory] : current.priceHistory,
        initialized: true,
      };
    });
    setShowProductForm(false);
    setEditingProduct(null);
    setPendingBarcode("");
    setPendingProductImage("");
    if (addingFirstProduct) setPage("sale");
    toast.success(editingProduct ? "تم حفظ تعديلات الصنف." : addingFirstProduct ? "تم حفظ أول صنف حقيقي. يمكنك الآن بدء البيع." : "تمت إضافة الصنف إلى المخزون.");
  };

  const openProductForm = (product?: Product) => {
    setEditingProduct(product ?? null);
    setPendingBarcode("");
    setPendingProductImage(product?.imageDataUrl ?? "");
    setShowProductForm(true);
  };

  const saveReservation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const productId = String(data.get("productId") || "");
    const quantity = Math.floor(Number(data.get("quantity")));
    const customerName = String(data.get("customerName") || "").trim();
    const product = store.products.find((entry) => entry.id === productId);
    if (!product || !customerName || !Number.isFinite(quantity) || quantity < 1) {
      toast.error("اختر صنفًا واكتب اسم الزبون وكمية صحيحة.");
      return;
    }
    const reservable = getReservableQuantity(product.quantity, activeProductReservations, product.id);
    if (quantity > reservable) {
      toast.error(`لا يمكن الحجز: المتاح للحجز من «${product.name}» هو ${reservable} فقط.`);
      return;
    }
    setStore((current) => ({ ...current, productReservations: [{ id: makeId("reservation"), productId: product.id, productName: product.name, quantity, customerName, customerPhone: String(data.get("customerPhone") || "").trim() || undefined, note: String(data.get("note") || "").trim(), createdAt: new Date().toISOString(), expiresOn: String(data.get("expiresOn") || "").trim() || undefined, status: "active" }, ...current.productReservations] }));
    setShowReservationForm(false);
    toast.success("تم حفظ الحجز محليًا دون إنشاء فاتورة أو خصم المخزون.");
  };

  const fulfillReservation = (reservation: ProductReservation) => {
    const product = store.products.find((entry) => entry.id === reservation.productId);
    if (!product || product.quantity < reservation.quantity || getExpiryStatus(product.expiryDate).kind === "expired") {
      toast.error("لا يمكن استكمال هذا الحجز؛ الصنف غير متاح أو كميته الحالية لا تكفي.");
      return;
    }
    if (cart.length && !window.confirm("سيُستبدل محتوى السلة الحالية بالحجز. هل تريد المتابعة؟")) return;
    setCart([{ ...product, cartQuantity: reservation.quantity }]);
    setCustomerName(reservation.customerName);
    setCustomerPhone(reservation.customerPhone || "");
    setStore((current) => ({ ...current, productReservations: current.productReservations.map((entry) => entry.id === reservation.id ? { ...entry, status: "fulfilled", resolvedAt: new Date().toISOString() } : entry) }));
    setActivePage("sale");
    toast.success("نُقل الحجز إلى السلة. راجع البيع ثم أكده عند التسليم.");
  };

  const cancelReservation = (reservation: ProductReservation) => {
    if (!window.confirm(`سيُلغى حجز «${reservation.productName}» للزبون ${reservation.customerName}. هل تريد المتابعة؟`)) return;
    setStore((current) => ({ ...current, productReservations: current.productReservations.map((entry) => entry.id === reservation.id ? { ...entry, status: "cancelled", resolvedAt: new Date().toISOString() } : entry) }));
    toast.success("تم إلغاء الحجز محليًا.");
  };

  const saveContainerEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const customerName = String(data.get("customerName") || "").trim();
    const containerName = String(data.get("containerName") || "").trim();
    const quantity = Math.floor(Number(data.get("quantity")));
    const direction = data.get("direction") === "in" ? "in" : "out";
    if (!customerName || !containerName || !Number.isFinite(quantity) || quantity < 1) {
      toast.error("أكمل اسم الزبون والعبوة والكمية الصحيحة.");
      return;
    }
    const currentBalance = getContainerBalances(store.returnableContainerEntries).find((entry) => entry.customerName.toLocaleLowerCase("ar") === customerName.toLocaleLowerCase("ar") && entry.containerName.toLocaleLowerCase("ar") === containerName.toLocaleLowerCase("ar"))?.quantity ?? 0;
    if (direction === "in" && quantity > currentBalance) {
      toast.error(`لا يمكن تسجيل استرجاع ${quantity}: رصيد «${containerName}» لدى الزبون هو ${currentBalance} فقط.`);
      return;
    }
    setStore((current) => ({ ...current, returnableContainerEntries: [{ id: makeId("container"), customerName, containerName, quantity, direction, createdAt: new Date().toISOString(), note: String(data.get("note") || "").trim() }, ...current.returnableContainerEntries] }));
    setShowContainerForm(false);
    toast.success(direction === "out" ? "تم تسجيل تسليم العبوة للزبون." : "تم تسجيل استرجاع العبوة من الزبون.");
  };

  const openReservationPrompt = () => {
    if (!store.products.length) {
      toast.error("أضف صنفًا حقيقيًا قبل إنشاء حجز.");
      return;
    }
    const productQuery = window.prompt("اكتب اسم الصنف أو رمزه للحجز:");
    if (productQuery === null) return;
    const product = store.products.find((entry) => entry.name.toLocaleLowerCase("ar") === productQuery.trim().toLocaleLowerCase("ar") || entry.sku.toLocaleLowerCase("ar") === productQuery.trim().toLocaleLowerCase("ar"));
    if (!product) {
      toast.error("لم يُعثر على الصنف. اكتب الاسم أو الرمز كما هو محفوظ في المخزون.");
      return;
    }
    const quantity = Math.floor(Number(window.prompt(`كمية الحجز من «${product.name}»؟ المتاح للحجز ${getReservableQuantity(product.quantity, activeProductReservations, product.id)}:`)));
    const customerName = window.prompt("اسم الزبون للحجز:")?.trim() || "";
    if (!customerName || !Number.isFinite(quantity) || quantity < 1) {
      toast.error("لم يُحفظ الحجز؛ أدخل اسمًا وكمية صحيحة.");
      return;
    }
    const reservable = getReservableQuantity(product.quantity, activeProductReservations, product.id);
    if (quantity > reservable) {
      toast.error(`لا يمكن الحجز: المتاح للحجز ${reservable} فقط.`);
      return;
    }
    setStore((current) => ({ ...current, productReservations: [{ id: makeId("reservation"), productId: product.id, productName: product.name, quantity, customerName, note: "", createdAt: new Date().toISOString(), status: "active" }, ...current.productReservations] }));
    toast.success("تم حفظ الحجز محليًا دون خصم مخزون أو إنشاء فاتورة.");
  };

  const openContainerPrompt = () => {
    const customerName = window.prompt("اسم الزبون:")?.trim() || "";
    if (!customerName) return;
    const containerName = window.prompt("اسم العبوة أو الضمان (مثال: صندوق ماء):")?.trim() || "";
    const quantity = Math.floor(Number(window.prompt("الكمية:") || ""));
    const direction = window.confirm("اضغط «موافق» لتسجيل تسليم العبوة للزبون، أو «إلغاء» لتسجيل استرجاعها.") ? "out" : "in";
    if (!containerName || !Number.isFinite(quantity) || quantity < 1) {
      toast.error("لم تُحفظ الحركة؛ أدخل اسم العبوة وكمية صحيحة.");
      return;
    }
    const currentBalance = getContainerBalances(store.returnableContainerEntries).find((entry) => entry.customerName.toLocaleLowerCase("ar") === customerName.toLocaleLowerCase("ar") && entry.containerName.toLocaleLowerCase("ar") === containerName.toLocaleLowerCase("ar"))?.quantity ?? 0;
    if (direction === "in" && quantity > currentBalance) {
      toast.error(`لا يمكن الاسترجاع: رصيد الزبون من هذه العبوة ${currentBalance} فقط.`);
      return;
    }
    setStore((current) => ({ ...current, returnableContainerEntries: [{ id: makeId("container"), customerName, containerName, quantity, direction, createdAt: new Date().toISOString(), note: "" }, ...current.returnableContainerEntries] }));
    toast.success(direction === "out" ? "تم تسجيل تسليم العبوة للزبون." : "تم تسجيل استرجاع العبوة من الزبون.");
  };

  const deleteProduct = (product: Product) => {
    runSensitiveAction("حذف صنف من المخزون", () => {
      if (!window.confirm(`سيُحذف «${product.name}» من المخزون الحالي فقط. ستبقى كل الفواتير السابقة كما هي. هل تريد المتابعة؟`)) return;
      setStore((current) => ({ ...current, products: current.products.filter((item) => item.id !== product.id) }));
      setCart((current) => current.filter((item) => item.id !== product.id));
      toast.success("تم حذف الصنف من المخزون الحالي مع الاحتفاظ بسجل الفواتير.");
    });
  };

  const addInventoryQuantity = (product: Product) => {
    setReceivingStaffMemberId("");
    setReceivingProduct(product);
    toast.info("سجّل الكمية كدفعة مستلمة للحفاظ على المورد والصلاحية وسجل الاستلام.");
  };

  const receiveSupplierBatch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!receivingProduct) return;
    const data = new FormData(event.currentTarget);
    const quantity = Number(data.get("quantity"));
    const purchasePrice = Number(data.get("purchasePrice"));
    const supplierName = String(data.get("supplierName") || "").trim();
    const expiryDate = String(data.get("expiryDate") || "").trim();
    const purchaseInvoiceRef = String(data.get("purchaseInvoiceRef") || "").trim().slice(0, 100);
    const note = String(data.get("note") || "").trim();
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
      toast.error("أدخل كمية مستلمة وسعر شراء صحيحين.");
      return;
    }
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      toast.error("أدخل تاريخ صلاحية صحيحًا أو اتركه فارغًا.");
      return;
    }
    const receivingStaffMember = store.localStaff.find((member) => member.id === receivingStaffMemberId);
    const batch: ProductBatch = { id: makeId("batch"), receivedAt: new Date().toISOString(), quantity, remainingQuantity: quantity, purchasePrice, expiryDate, supplierName, purchaseInvoiceRef, note, staffMemberId: receivingStaffMember?.id, staffMemberName: receivingStaffMember?.name };
    setStore((current) => ({
      ...current,
      products: current.products.map((product) => {
        if (product.id !== receivingProduct.id) return product;
        const batches = [...(product.batches ?? []), batch];
        return { ...product, quantity: product.quantity + quantity, purchasePrice, supplierName: supplierName || product.supplierName, expiryDate: getEarliestActiveExpiry(batches) || product.expiryDate, batches };
      }),
    }));
    setReceivingProduct(null);
    setReceivingStaffMemberId("");
    toast.success(`تم استلام دفعة ${quantity} وحدة وتسجيلها في سجل المورد.`);
  };

  const submitStocktake = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stocktakeProduct) return;
    const actualQuantity = Number(stocktakeQuantity);
    if (!Number.isFinite(actualQuantity) || actualQuantity < 0) {
      toast.error("أدخل كمية فعلية صحيحة تساوي صفرًا أو أكثر.");
      return;
    }
    const difference = getStocktakeDifference(stocktakeProduct.quantity, actualQuantity);
    const recordedAt = new Date().toISOString();
    const stocktakeRecord = createStocktakeRecord({ id: makeId("stocktake"), productId: stocktakeProduct.id, productName: stocktakeProduct.name, sku: stocktakeProduct.sku, recordedQuantity: stocktakeProduct.quantity, actualQuantity, purchasePrice: stocktakeProduct.purchasePrice, recordedAt, note: "جرد دوري" });
    setStore((current) => ({ ...current, products: current.products.map((product) => {
      if (product.id !== stocktakeProduct.id) return product;
      const batches = product.batches?.length ? reconcileBatchStocktake(product.batches, actualQuantity, recordedAt, product.purchasePrice) : product.batches;
      return { ...product, quantity: actualQuantity, batches, expiryDate: batches?.length ? getEarliestActiveExpiry(batches) || product.expiryDate : product.expiryDate };
    }), stocktakeRecords: [stocktakeRecord, ...current.stocktakeRecords] }));
    setStocktakeProduct(null);
    setStocktakeQuantity("");
    toast.success(difference === 0 ? "تم تأكيد الجرد؛ الكمية مطابقة للمخزون." : `تم تحديث الكمية بعد الجرد: ${difference > 0 ? "+" : ""}${difference} وحدة.`);
  };

  const openBulkStocktake = () => {
    if (!store.products.length) {
      toast.info("أضف صنفًا واحدًا على الأقل قبل بدء الجرد الجماعي.");
      return;
    }
    setBulkStocktakeQuantities(Object.fromEntries(store.products.map((product) => [product.id, String(product.quantity)])));
    setShowBulkStocktake(true);
  };

  const commitBulkStocktake = (note: string, entries: Array<Product & { actualQuantity: number }>) => {
    const recordedAt = new Date().toISOString();
    const runId = makeId("bulk-stocktake");
    const records = createBulkStocktakeRecords(entries.map((entry) => ({ productId: entry.id, productName: entry.name, sku: entry.sku, recordedQuantity: entry.quantity, actualQuantity: entry.actualQuantity, purchasePrice: entry.purchasePrice })), runId, recordedAt, note);
    const summary = getBulkStocktakeSummary(records);
    const actualByProductId = new Map(records.map((record) => [record.productId, record.actualQuantity]));
    setStore((current) => ({
      ...current,
      products: current.products.map((product) => {
        const actualQuantity = actualByProductId.get(product.id);
        if (actualQuantity === undefined) return product;
        const batches = product.batches?.length ? reconcileBatchStocktake(product.batches, actualQuantity, recordedAt, product.purchasePrice) : product.batches;
        return { ...product, quantity: actualQuantity, batches, expiryDate: batches?.length ? getEarliestActiveExpiry(batches) || product.expiryDate : product.expiryDate };
      }),
      stocktakeRecords: [...records, ...current.stocktakeRecords],
    }));
    setStocktakeSettings((current) => ({ ...current, lastCompletedAt: recordedAt }));
    setShowBulkStocktake(false);
    setBulkStocktakeQuantities({});
    toast.success(`تم اعتماد الجرد الجماعي: ${summary.reviewedProducts} أصناف، ${summary.adjustedProducts} فروقات.`);
  };

  const submitBulkStocktake = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = String(data.get("note") || "جرد جماعي").trim() || "جرد جماعي";
    const entries = store.products.map((product) => ({ ...product, actualQuantity: Number(bulkStocktakeQuantities[product.id]) }));
    if (entries.some((entry) => !Number.isFinite(entry.actualQuantity) || entry.actualQuantity < 0 || !Number.isInteger(entry.actualQuantity))) {
      toast.error("أدخل كمية فعلية صحيحة لكل صنف قبل اعتماد الجرد.");
      return;
    }
    runSensitiveAction("اعتماد الجرد الجماعي", () => commitBulkStocktake(note, entries));
  };

  const exportBarcodeStocktakeExcel = async () => {
    const draft = store.barcodeStocktakeDraft;
    if (!draft) {
      toast.info("ابدأ جولة جرد بالباركود أولًا لتصدير ملخصها.");
      return;
    }
    const XLSX = await import("xlsx");
    const rows = barcodeStocktakeProgress.entries.map((entry) => ({
      "الصنف": entry.name,
      "الباركود": entry.sku,
      "التصنيف": entry.category || "غير مصنف",
      "المسجل": entry.quantity,
      "المعدود": entry.actualQuantity ?? "لم يعد",
      "الفارق": entry.difference ?? "—",
      "قيمة الفارق": entry.valueDifference === null ? "—" : entry.valueDifference,
      "الحالة": entry.counted ? (entry.difference === 0 ? "مطابق" : "فرق يحتاج مراجعة") : "لم يعد",
    }));
    const summary = [{
      "ملاحظة الجولة": draft.note,
      "بدأت": draft.createdAt,
      "آخر تحديث": draft.updatedAt,
      "أصناف معدودة": barcodeStocktakeProgress.countedProducts,
      "أصناف غير معدودة": barcodeStocktakeProgress.uncountedProducts,
      "وحدات مسجلة بالمسح/الإدخال": barcodeStocktakeProgress.scannedUnits,
      "فروقات تحتاج مراجعة": barcodeStocktakeProgress.differences,
    }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "جولة الباركود");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "ملخص الجولة");
    XLSX.writeFile(workbook, `souqna-barcode-stocktake-${todayKey()}.xlsx`);
    toast.success("تم تنزيل ملخص جولة الجرد بالباركود محليًا.");
  };

  const commitBarcodeStocktake = () => {
    const draft = store.barcodeStocktakeDraft;
    if (!draft) return;
    if (!barcodeStocktakeProgress.completed) {
      toast.error(`تبقى ${barcodeStocktakeProgress.uncountedProducts} أصناف دون عدّ. اكتب 0 للأصناف غير الموجودة أو أكمل جردها قبل الاعتماد.`);
      return;
    }
    const entries = barcodeStocktakeProgress.entries.map((entry) => ({ ...entry, actualQuantity: entry.actualQuantity ?? 0 }));
    runSensitiveAction("اعتماد جرد الباركود", () => {
      const recordedAt = new Date().toISOString();
      const runId = makeId("barcode-stocktake");
      const records = createBulkStocktakeRecords(entries.map((entry) => ({ productId: entry.id, productName: entry.name, sku: entry.sku, recordedQuantity: entry.quantity, actualQuantity: entry.actualQuantity, purchasePrice: entry.purchasePrice })), runId, recordedAt, draft.note);
      const summary = getBulkStocktakeSummary(records);
      const actualByProductId = new Map(records.map((record) => [record.productId, record.actualQuantity]));
      setStore((current) => ({
        ...current,
        products: current.products.map((product) => {
          const actualQuantity = actualByProductId.get(product.id);
          if (actualQuantity === undefined) return product;
          const batches = product.batches?.length ? reconcileBatchStocktake(product.batches, actualQuantity, recordedAt, product.purchasePrice) : product.batches;
          return { ...product, quantity: actualQuantity, batches, expiryDate: batches?.length ? getEarliestActiveExpiry(batches) || product.expiryDate : product.expiryDate };
        }),
        stocktakeRecords: [...records, ...current.stocktakeRecords],
        barcodeStocktakeDraft: null,
      }));
      setStocktakeSettings((current) => ({ ...current, lastCompletedAt: recordedAt }));
      setShowBarcodeStocktake(false);
      setShowBarcodeStocktakeScanner(false);
      toast.success(`تم اعتماد جولة الباركود: ${summary.reviewedProducts} أصناف، ${summary.adjustedProducts} فروقات.`);
    });
  };

  const completeWeeklyStocktake = () => {
    setStocktakeSettings((current) => ({ ...current, lastCompletedAt: new Date().toISOString() }));
    toast.success("تم اعتماد جرد هذا الأسبوع على هذا الجهاز.");
  };

  const finishStoreSetup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const storeName = String(data.get("storeName") || "").trim();
    if (!storeName) {
      toast.error("اكتب اسم محلك للبدء.");
      return;
    }
    setStore((current) => ({ ...current, storeName, initialized: true }));
    setShowStoreSetup(false);
    setShowProductForm(true);
    toast.success("تم حفظ بيانات المحل. أضف الآن أول صنف من مخزونك.");
  };

  const uploadReceiptLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر ملف صورة للشعار.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maximumSide = 420;
        const scale = Math.min(1, maximumSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          toast.error("تعذر تجهيز صورة الشعار.");
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setStore((current) => ({ ...current, receiptLogo: canvas.toDataURL("image/png") }));
        toast.success("تم حفظ شعار محلك للإيصالات.");
      };
      image.onerror = () => toast.error("تعذر قراءة صورة الشعار.");
      image.src = String(reader.result);
    };
    reader.onerror = () => toast.error("تعذر رفع الشعار.");
    reader.readAsDataURL(file);
  };

  const uploadProductImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر صورة للصنف من الكاميرا أو المعرض.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maximumSide = 520;
        const scale = Math.min(1, maximumSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          toast.error("تعذر تجهيز صورة الصنف.");
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setPendingProductImage(canvas.toDataURL("image/jpeg", 0.84));
        toast.success("تمت إضافة صورة الصنف محليًا.");
      };
      image.onerror = () => toast.error("تعذر قراءة صورة الصنف.");
      image.src = String(reader.result);
    };
    reader.onerror = () => toast.error("تعذر رفع صورة الصنف.");
    reader.readAsDataURL(file);
  };

  const addDebt = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const customer = String(data.get("customer") || "").trim();
    if (!customer || !amount) {
      toast.error("اكتب اسم الزبون والمبلغ.");
      return;
    }
    setStore((current) => ({ ...current, debts: [{ id: makeId("debt"), customerName: customer, customerPhone: String(data.get("customerPhone") || "").trim() || undefined, amount, paid: 0, createdAt: new Date().toISOString(), dueDate: String(data.get("dueDate") || ""), note: String(data.get("note") || "") }, ...current.debts] }));
    setShowDebtForm(false);
    toast.success("تمت إضافة الذمة إلى الدفتر.");
  };

  const collectDebt = (debt: Debt) => {
    const outstanding = Math.max(0, debt.amount - debt.paid);
    setCollectionDebt(debt);
    setCollectionAmount(outstanding.toFixed(2));
  };

  const submitDebtCollection = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!collectionDebt) return;
    const outstanding = Math.max(0, collectionDebt.amount - collectionDebt.paid);
    const value = Number(collectionAmount);
    if (!value || value <= 0) {
      toast.error("أدخل مبلغًا صحيحًا أكبر من صفر.");
      return;
    }
    const collection: DebtCollection = { id: makeId("debt-collection"), debtId: collectionDebt.id, customerName: collectionDebt.customerName, amount: Math.min(outstanding, value), collectedAt: new Date().toISOString(), note: "تحصيل ذمة" };
    setStore((current) => ({ ...current, debts: current.debts.map((item) => item.id === collectionDebt.id ? { ...item, paid: Math.min(item.amount, item.paid + value) } : item), debtCollections: [...current.debtCollections, collection] }));
    const settlesDebt = value >= outstanding;
    setCollectionDebt(null);
    setCollectionAmount("");
    toast.success(settlesDebt ? "تم تحصيل الذمة بالكامل ونقلها إلى الأرشيف وصندوق اليوم." : "تم تسجيل الدفعة ضمن الذمة وصندوق اليوم.");
  };

  const reverseDebtCollection = (collection: DebtCollection) => {
    if (!window.confirm(`سيُعكس تحصيل ${money(collection.amount)} من ${collection.customerName} ويعود المبلغ إلى الذمة. هل تريد المتابعة؟`)) return;
    setStore((current) => ({
      ...current,
      debts: current.debts.map((debt) => debt.id === collection.debtId ? { ...debt, paid: Math.max(0, debt.paid - collection.amount) } : debt),
      debtCollections: current.debtCollections.filter((entry) => entry.id !== collection.id),
    }));
    toast.success("تم عكس التحصيل وإعادة الذمة إلى رصيدها السابق.");
  };

  const openDebtReminder = (debt: Debt) => {
    if (!debt.customerPhone) {
      toast.info("أضف رقم هاتف الزبون أولًا لفتح تذكير واتساب يدوي.");
      return;
    }
    const remaining = Math.max(0, debt.amount - debt.paid);
    window.open(buildDebtReminderUrl({ phone: debt.customerPhone, customerName: debt.customerName, remaining, storeName: store.storeName }), "_blank", "noopener,noreferrer");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `souqna-backup-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    const exportedAt = new Date().toISOString();
    localStorage.setItem(BACKUP_EXPORTED_AT_KEY, exportedAt);
    setLastBackupAt(exportedAt);
    toast.success("تم تنزيل نسخة احتياطية من بياناتك.");
  };

  const exportReportsExcel = async () => {
    const XLSX = await import("xlsx");
    const monthRevenue = monthSales.reduce((total, sale) => total + sale.total, 0);
    const monthProfit = monthSales.reduce((total, sale) => total + sale.profit, 0);
    const summary = [
      { "المؤشر": "مبيعات اليوم", "القيمة (د.ل)": salesTodayTotal },
      { "المؤشر": "ربح اليوم", "القيمة (د.ل)": profitToday },
      { "المؤشر": "تحصيل ذمم اليوم", "القيمة (د.ل)": todayCashSummary.debtCollections },
      { "المؤشر": "مصروفات اليوم", "القيمة (د.ل)": todayCashSummary.expenses },
      { "المؤشر": "مبيعات الشهر", "القيمة (د.ل)": monthRevenue },
      { "المؤشر": "ربح الشهر", "القيمة (د.ل)": monthProfit },
      { "المؤشر": "الذمم المستحقة", "القيمة (د.ل)": totalOutstanding },
      { "المؤشر": "قيمة المخزون بسعر الشراء", "القيمة (د.ل)": store.products.reduce((total, product) => total + product.quantity * product.purchasePrice, 0) },
    ];
    const salesRows = store.sales.flatMap((sale) => sale.items.map((item) => ({ "رقم الفاتورة": sale.id.slice(-5), "مرجع الطلب": sale.orderReference ?? "", "التاريخ": sale.createdAt, "طريقة الدفع": getPaymentMethodLabel(sale.paymentMethod), "البنك": sale.bankName ?? "", "جهاز نقاط البيع": sale.posTerminalType ?? "", "الزبون": sale.customerName ?? "", "ملاحظة الفاتورة": sale.note ?? "", "الصنف": item.name, "الكمية": item.quantity, "سعر الوحدة": item.price, "الإجمالي": item.price * item.quantity, "الربح": (item.price - item.cost) * item.quantity })));
    const productRows = store.products.map((product) => ({ "اسم الصنف": product.name, "رمز الصنف": product.sku, "التصنيف": product.category, "الكمية": product.quantity, "حد التنبيه": product.lowStockAt, "سعر الشراء": product.purchasePrice, "سعر البيع": product.salePrice }));
    const debtRows = store.debts.map((debt) => ({ "الزبون": debt.customerName, "إجمالي الذمة": debt.amount, "المدفوع": debt.paid, "المتبقي": Math.max(0, debt.amount - debt.paid), "تاريخ الاستحقاق": debt.dueDate, "ملاحظة": debt.note }));
    const collectionRows = store.debtCollections.map((collection) => ({ "الزبون": collection.customerName, "المبلغ المحصل": collection.amount, "تاريخ التحصيل": collection.collectedAt, "ملاحظة": collection.note }));
    const workbook = XLSX.utils.book_new();
    const reportSheets: Array<[string, Record<string, unknown>[]]> = [["ملخص", summary], ["الفواتير", salesRows], ["المخزون", productRows], ["الذمم", debtRows], ["تحصيل الذمم", collectionRows]];
    reportSheets.forEach(([name, rows]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name));
    XLSX.writeFile(workbook, `souqna-report-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير Excel شامل للمبيعات والمخزون والذمم.");
  };

  const exportDailyPaymentSummaryExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = [
      ...dailyPaymentSummary.map((row) => ({ "طريقة الدفع": row.label, "فواتير البيع": row.saleReceipts, "إيصالات الإرجاع": row.returnReceipts, "إجمالي البيع": row.grossSales, "قيمة الإرجاع": row.returnedValue, "صافي المبيعات": row.netSales })),
      { "طريقة الدفع": "الإجمالي", "فواتير البيع": dailyPaymentSummaryTotals.saleReceipts, "إيصالات الإرجاع": dailyPaymentSummaryTotals.returnReceipts, "إجمالي البيع": dailyPaymentSummaryTotals.grossSales, "قيمة الإرجاع": dailyPaymentSummaryTotals.returnedValue, "صافي المبيعات": dailyPaymentSummaryTotals.netSales },
    ];
    const digitalRows = digitalPaymentSummary.map((row) => ({ "طريقة الدفع": row.label, "البنك": row.bankName, "جهاز نقاط البيع": row.posTerminalType, "فواتير البيع": row.saleReceipts, "إيصالات الإرجاع": row.returnReceipts, "إجمالي البيع": row.grossSales, "قيمة الإرجاع": row.returnedValue, "الصافي": row.netSales }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "طرق الدفع اليومية");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(digitalRows.length ? digitalRows : [{ "ملاحظة": "لا توجد معاملات بطاقة أو تحويل اليوم" }]), "تفاصيل الدفع الإلكتروني");
    XLSX.writeFile(workbook, `souqna-daily-payment-summary-${todayKey()}.xlsx`);
    toast.success("تم تنزيل ملخص طرق الدفع اليومي بصيغة Excel.");
  };

  const exportCategorySalesExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = [
      ...categorySalesReport.entries.map((entry) => ({ "الفئة": entry.category, "وحدات مباعة": entry.soldUnits, "وحدات مرتجعة": entry.returnedUnits, "الوحدات الصافية": entry.netUnits, "الإيراد الصافي": entry.revenue, "التكلفة": entry.cost, "الربح": entry.profit })),
      { "الفئة": "الإجمالي", "وحدات مباعة": categorySalesReport.totals.soldUnits, "وحدات مرتجعة": categorySalesReport.totals.returnedUnits, "الوحدات الصافية": categorySalesReport.totals.netUnits, "الإيراد الصافي": categorySalesReport.totals.revenue, "التكلفة": categorySalesReport.totals.cost, "الربح": categorySalesReport.totals.profit },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "مبيعات الفئات");
    XLSX.writeFile(workbook, `souqna-category-sales-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير مبيعات وربحية الفئات بصيغة Excel.");
  };

  const exportMonthlyContainersExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = [
      ...monthlyContainerReport.rows.map((row) => ({ "العبوة": row.containerName, "تم تسليمه": row.delivered, "تم استرجاعه": row.returned, "صافي الحركة": row.netChange })),
      { "العبوة": "الإجمالي", "تم تسليمه": monthlyContainerReport.totals.delivered, "تم استرجاعه": monthlyContainerReport.totals.returned, "صافي الحركة": monthlyContainerReport.totals.netChange },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "حركة العبوات الشهرية");
    XLSX.writeFile(workbook, `souqna-container-report-${currentMonthKey}.xlsx`);
    toast.success("تم تنزيل تقرير العبوات الشهري بصيغة Excel.");
  };

  const exportGoodsReceiptsExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = store.goodsReceipts.map((receipt) => ({ "التاريخ": receipt.receivedAt, "الباركود": receipt.barcode, "الصنف": receipt.productName, "الكمية المستلمة": receipt.quantity, "سعر الشراء": receipt.purchasePrice, "المورد": receipt.supplierName, "الموظف المسؤول": receipt.staffMemberName || "غير محدد", "الصلاحية": receipt.expiryDate, "مرجع فاتورة الشراء": receipt.purchaseInvoiceRef, "ملاحظة": receipt.note }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "سجل الاستلام");
    XLSX.writeFile(workbook, `souqna-goods-receipts-${todayKey()}.xlsx`);
    toast.success("تم تنزيل سجل استلام البضاعة بصيغة Excel.");
  };

  const exportSuccessfulScanHistoryExcel = async () => {
    const XLSX = await import("xlsx");
    const scanRows = filteredDailySuccessfulReceivingScans.map((entry) => ({ "التاريخ": dailySuccessfulScanDate, "وقت المسح": entry.scannedAt, "الباركود": entry.barcode, "الصنف": entry.productName }));
    const summaryRows = dailySuccessfulReceivingScanSummary.map((entry) => ({ "التاريخ": dailySuccessfulScanDate, "الصنف": entry.productName, "الباركود": entry.barcode, "عدد مرات المسح": entry.scans, "آخر مسح": entry.lastScannedAt }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(scanRows.length ? scanRows : [{ "ملاحظة": "لا توجد تعرفات ناجحة مطابقة للتصفية" }]), "سجل المسح");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ "ملاحظة": "لا توجد أصناف مُمَسَّحة في التاريخ المختار" }]), "ملخص الأصناف");
    XLSX.writeFile(workbook, `souqna-successful-scans-${dailySuccessfulScanDate}.xlsx`);
    toast.success("تم تنزيل سجل المسح المفلتر وملخص الأصناف بصيغة Excel.");
  };

  const exportSupplierCostChangesExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = supplierCostChangesReport.changes.map((change) => ({ "التاريخ": change.receivedAt, "المورد": change.supplierName, "الصنف": change.productName, "التكلفة السابقة": change.previousCost, "التكلفة الجديدة": change.nextCost, "فرق التكلفة": change.difference, "نسبة التغير (%)": change.percentChange === null ? "" : Number(change.percentChange.toFixed(2)), "مرجع الاستلام": change.receiptId.slice(-6).toUpperCase() }));
    const repeatedRows = repeatedCostIncreaseProducts.map((product) => ({ "الصنف": product.productName, "عدد الزيادات": product.increases, "إجمالي الزيادة": product.totalIncrease, "الموردون": product.suppliers.join("، "), "آخر استلام": product.latestReceivedAt }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد تغيرات تكلفة ضمن الفلتر الحالي" }]), "تغيرات التكلفة");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(repeatedRows.length ? repeatedRows : [{ "ملاحظة": "لا توجد زيادات متكررة هذا الشهر" }]), "زيادات متكررة");
    XLSX.writeFile(workbook, `souqna-supplier-cost-changes-${currentMonthKey}${costReportSupplierFilter ? `-${costReportSupplierFilter}` : ""}.xlsx`);
    toast.success("تم تنزيل تقرير تغيرات تكلفة المورد بصيغة Excel.");
  };

  const printSupplierCostChangesReport = () => {
    const filterLabel = [costReportSupplierFilter || "كل الموردين", costReportProductFilter ? costChangeProductOptions.find(([id]) => id === costReportProductFilter)?.[1] || "الصنف المختار" : "كل الأصناف"].join(" · ");
    const rows = supplierCostChangesReport.changes.map((change) => `<tr><td>${formatDate(change.receivedAt)}</td><td>${escapeHtml(change.supplierName)}</td><td>${escapeHtml(change.productName)}</td><td dir="ltr">${money(change.previousCost)}</td><td dir="ltr">${money(change.nextCost)}</td><td dir="ltr">${change.difference > 0 ? "+" : ""}${money(change.difference)}${change.percentChange === null ? "" : ` · ${change.percentChange.toFixed(1)}%`}</td><td dir="ltr">${escapeHtml(change.receiptId.slice(-6).toUpperCase())}</td></tr>`).join("");
    const content = `<h1>تقرير تغيرات تكلفة الاستلام</h1><p>${escapeHtml(store.storeName)} · ${escapeHtml(currentMonthKey)} · ${escapeHtml(filterLabel)}</p><table><thead><tr><th>التاريخ</th><th>المورد</th><th>الصنف</th><th>السابق</th><th>الجديد</th><th>الفرق</th><th>المرجع</th></tr></thead><tbody>${rows || "<tr><td colspan=\"7\">لا توجد تغيرات تكلفة ضمن الفلتر الحالي.</td></tr>"}</tbody></table><p class="foot">هذا التقرير مبني من حركات الاستلام المحفوظة محليًا على هذا الجهاز.</p>`;
    if (openSystemPrint(`تغيرات تكلفة ${currentMonthKey}`, content)) toast.success("فُتح تقرير تغيرات التكلفة للطباعة أو الحفظ من نافذة النظام.");
  };

  const exportMonthlyReservationsExcel = async () => {
    const XLSX = await import("xlsx");
    const statusLabel = (status: ProductReservation["status"]) => status === "fulfilled" ? "منفذ" : status === "cancelled" ? "ملغى" : "قائم";
    const rows = monthlyReservationReport.reservations.map((reservation) => ({ "رقم الحجز": reservation.id.slice(-5), "التاريخ": reservation.createdAt, "الحالة": statusLabel(reservation.status), "الزبون": reservation.customerName, "الهاتف": reservation.customerPhone || "", "الصنف": reservation.productName, "الكمية": reservation.quantity, "ينتهي في": reservation.expiresOn || "", "وقت الإنهاء": reservation.resolvedAt || "", "ملاحظة": reservation.note }));
    const summary = [{ "الحالة": "قائم", "العدد": monthlyReservationReport.summary.active, "الوحدات": "" }, { "الحالة": "منفذ", "العدد": monthlyReservationReport.summary.fulfilled, "الوحدات": "" }, { "الحالة": "ملغى", "العدد": monthlyReservationReport.summary.cancelled, "الوحدات": "" }, { "الحالة": "إجمالي الوحدات المحجوزة", "العدد": "", "الوحدات": monthlyReservationReport.summary.units }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "ملخص الحجوزات");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "سجل الحجوزات");
    XLSX.writeFile(workbook, `souqna-reservations-${currentMonthKey}.xlsx`);
    toast.success("تم تنزيل تقرير الحجوزات الشهري بصيغة Excel.");
  };

  const exportContainerStatementExcel = async () => {
    if (!containerStatementCustomer || !containerStatementEntries.length) {
      toast.error("اختر زبونًا لديه حركة عبوات أولًا.");
      return;
    }
    const XLSX = await import("xlsx");
    const rows = containerStatementEntries.map((entry) => ({ "التاريخ": entry.createdAt, "العبوة": entry.containerName, "الحركة": entry.direction === "out" ? "تسليم للزبون" : "استرجاع من الزبون", "الكمية": entry.quantity, "ملاحظة": entry.note }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "كشف العبوات");
    XLSX.writeFile(workbook, `souqna-container-statement-${containerStatementCustomer}-${todayKey()}.xlsx`);
    toast.success("تم تنزيل كشف عبوات الزبون بصيغة Excel.");
  };

  const printDailyPaymentSummary = () => {
    const rows = dailyPaymentSummary.map((row) => `<tr><td>${row.label}</td><td>${row.saleReceipts}</td><td>${row.returnReceipts}</td><td>${money(row.grossSales)}</td><td>${money(row.returnedValue)}</td><td>${money(row.netSales)}</td></tr>`).join("");
    const content = `<main dir="rtl" style="font-family:Arial,sans-serif;color:#173f31;padding:18px"><h1 style="margin:0 0 6px">${escapeHtml(store.storeName)}</h1><p style="margin:0 0 18px">ملخص المبيعات حسب طريقة الدفع · ${formatDate(new Date().toISOString())}</p><table style="width:100%;border-collapse:collapse;text-align:right"><thead><tr><th>الطريقة</th><th>فواتير البيع</th><th>الإرجاعات</th><th>إجمالي البيع</th><th>قيمة الإرجاع</th><th>الصافي</th></tr></thead><tbody>${rows}<tr><th>الإجمالي</th><th>${dailyPaymentSummaryTotals.saleReceipts}</th><th>${dailyPaymentSummaryTotals.returnReceipts}</th><th>${money(dailyPaymentSummaryTotals.grossSales)}</th><th>${money(dailyPaymentSummaryTotals.returnedValue)}</th><th>${money(dailyPaymentSummaryTotals.netSales)}</th></tr></tbody></table><style>th,td{border-bottom:1px solid #d9d4c8;padding:8px 5px;font-size:12px}th{background:#f5f0e5}</style></main>`;
    openSystemPrint(`ملخص طرق الدفع ${todayKey()}`, content);
  };

  const exportWeeklyReportExcel = async () => {
    const XLSX = await import("xlsx");
    const weeklySales = store.sales.filter((sale) => new Date(sale.createdAt) >= new Date(weeklySummary.startAt));
    const summaryRows = [
      { "المؤشر": "بداية الأسبوع", "القيمة": formatDate(weeklySummary.startAt) },
      { "المؤشر": "نهاية الأسبوع", "القيمة": formatDate(weeklySummary.endAt) },
      { "المؤشر": "عدد الفواتير", "القيمة": weeklySummary.invoices },
      { "المؤشر": "المبيعات", "القيمة": weeklySummary.revenue },
      { "المؤشر": "الأرباح", "القيمة": weeklySummary.profit },
    ];
    const saleRows = weeklySales.map((sale) => ({ "رقم الفاتورة": sale.id.slice(-5), "التاريخ": sale.createdAt, "الطريقة": sale.paymentMethod === "cash" ? "نقدًا" : "آجل", "الإجمالي": sale.total, "الربح": sale.profit }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "ملخص أسبوعي");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(saleRows), "فواتير الأسبوع");
    XLSX.writeFile(workbook, `souqna-weekly-profit-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير الأرباح الأسبوعي.");
  };

  const exportMonthlyReportExcel = async () => {
    const XLSX = await import("xlsx");
    const summaryRows = [
      { "المؤشر": "بداية الشهر", "القيمة": formatDate(monthlySummary.startAt) },
      { "المؤشر": "نهاية التقرير", "القيمة": formatDate(monthlySummary.endAt) },
      { "المؤشر": "عدد الفواتير", "القيمة": monthlySummary.invoices },
      { "المؤشر": "الوحدات المباعة", "القيمة": monthlySummary.units },
      { "المؤشر": "المبيعات", "القيمة": monthlySummary.revenue },
      { "المؤشر": "الأرباح", "القيمة": monthlySummary.profit },
      { "المؤشر": "متوسط الفاتورة", "القيمة": monthlySummary.averageInvoice },
      { "المؤشر": "أصناف بلا حركة (30 يومًا)", "القيمة": inactiveProducts.length },
    ];
    const invoiceRows = monthlySummary.sales.map((sale) => ({ "رقم الفاتورة": sale.id.slice(-5), "التاريخ": sale.createdAt, "الطريقة": sale.paymentMethod === "cash" ? "نقدًا" : "آجل", "الزبون": sale.customerName ?? "", "الإجمالي": sale.total, "الربح": sale.profit }));
    const productRows = monthlySummary.products.map((product) => ({ "الصنف": product.name, "الوحدات المباعة": product.quantity, "الإيراد": product.revenue, "الربح": product.profit }));
    const inactiveRows = inactiveProducts.map(({ product, lastSoldAt }) => ({ "الصنف": product.name, "الرمز": product.sku, "المتوفر": product.quantity, "آخر بيع": lastSoldAt || "لم يسجل بيع" }));
    const workbook = XLSX.utils.book_new();
    const reportSheets: Array<[string, Record<string, unknown>[]]> = [["ملخص شهري", summaryRows], ["فواتير الشهر", invoiceRows], ["أداء الأصناف", productRows], ["أصناف بلا حركة", inactiveRows]];
    reportSheets.forEach(([name, rows]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name));
    XLSX.writeFile(workbook, `souqna-monthly-report-${todayKey()}.xlsx`);
    toast.success("تم تنزيل التقرير الشهري المفصل.");
  };

  const exportMonthlyExpensesExcel = async () => {
    const XLSX = await import("xlsx");
    const summaryRows = monthlyExpenseReport.groups.map((group) => ({ "التصنيف": group.category, "عدد المصروفات": group.count, "إجمالي المصروفات": group.amount }));
    const detailRows = monthlyExpenseReport.groups.flatMap((group) => group.expenses.map((expense) => ({ "التصنيف": group.category, "المبلغ": expense.amount, "التاريخ": expense.spentAt, "الملاحظة": expense.note || "" })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ "ملاحظة": "لا توجد مصروفات مسجلة لهذا الشهر" }]), "حسب التصنيف");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows.length ? detailRows : [{ "ملاحظة": "لا توجد تفاصيل مصروفات" }]), "تفاصيل المصروفات");
    XLSX.writeFile(workbook, `souqna-monthly-expenses-${todayKey()}.xlsx`);
    toast.success("تم تنزيل تقرير مصروفات الشهر.");
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as unknown;
      const validation = validateStoreBackup(parsed);
      if (!validation.valid) {
        toast.error(validation.reason);
        return;
      }
      if (!window.confirm(`سيتم استبدال بيانات هذا الجهاز بنسخة «${validation.summary.storeName}» التي تحتوي على ${validation.summary.products} صنف و${validation.summary.sales} فاتورة. هل تريد المتابعة؟`)) return;
      const imported = parsed as StoreData;
      setStore(normalizeStore({ ...imported, initialized: true }));
      setCart([]);
      toast.success("تم استيراد النسخة الاحتياطية بنجاح.");
    } catch {
      toast.error("تعذّر قراءة الملف. اختر نسخة احتياطية من سوقنا.");
    }
  };

  const installOnDevice = async () => {
    if (!installPrompt) {
      toast.message("من قائمة Chrome على أندرويد اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") toast.success("تمت إضافة سوقنا إلى هاتفك.");
    setInstallPrompt(null);
  };

  const downloadExcelTemplate = async () => {
    const XLSX = await import("xlsx");
    const templateRows = [{ "اسم الصنف": "", "رمز الصنف": "", "التصنيف": "عام", "المورد": "", "تاريخ الصلاحية": "", "الكمية": 0, "حد التنبيه": 5, "سعر الشراء": 0, "سعر البيع": 0 }];
    const sheet = XLSX.utils.json_to_sheet(templateRows);
    sheet["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 15 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "الأصناف");
    XLSX.writeFile(workbook, "souqna-products-template.xlsx");
    toast.success("تم تنزيل قالب الأصناف. املأ الصفوف ثم استورد الملف.");
  };

  const importExcelProducts = async (file?: File) => {
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("لا توجد ورقة");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      if (!rows.length) throw new Error("لا توجد صفوف");
      const received = new Map<string, Omit<Product, "id">>();
      let rejected = 0;
      rows.forEach((row) => {
        const name = excelText(pickColumn(row, ["اسم الصنف", "الاسم", "name", "Name"]));
        const sku = excelText(pickColumn(row, ["رمز الصنف", "الباركود", "SKU", "sku", "Barcode", "barcode"]));
        const category = excelText(pickColumn(row, ["التصنيف", "الفئة", "category", "Category"])) || "عام";
        const supplierName = excelText(pickColumn(row, ["المورد", "اسم المورد", "supplier", "Supplier"]));
        const expiryDate = excelText(pickColumn(row, ["تاريخ الصلاحية", "تاريخ الانتهاء", "expiryDate", "Expiry Date", "expiry"]));
        const quantity = excelNumber(pickColumn(row, ["الكمية", "quantity", "Quantity"]));
        const lowStockAt = excelNumber(pickColumn(row, ["حد التنبيه", "الحد الأدنى", "lowStockAt", "Low Stock", "low stock"]));
        const purchasePrice = excelNumber(pickColumn(row, ["سعر الشراء", "purchasePrice", "Purchase Price", "cost"]));
        const salePrice = excelNumber(pickColumn(row, ["سعر البيع", "salePrice", "Sale Price", "price"]));
        if (!name || !sku || [quantity, lowStockAt, purchasePrice, salePrice].some((value) => !Number.isFinite(value) || value < 0)) { rejected += 1; return; }
        received.set(sku.toLowerCase(), { name, sku, category, supplierName, expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(expiryDate) ? expiryDate : "", quantity, lowStockAt, purchasePrice, salePrice });
      });
      const items = Array.from(received.values());
      if (!items.length) throw new Error("كل الصفوف غير صالحة");
      const importedAt = new Date().toISOString();
      let updated = 0;
      setStore((current) => {
        const bySku = new Map(current.products.map((product) => [product.sku.toLowerCase(), product]));
        const products = [...current.products];
        const priceHistory: PriceHistoryEntry[] = [];
        items.forEach((item) => {
          const key = item.sku.toLowerCase();
          const currentProduct = bySku.get(key);
          if (currentProduct) {
            const index = products.findIndex((product) => product.id === currentProduct.id);
            const openingBatches = currentProduct.batches?.length ? currentProduct.batches : currentProduct.quantity ? [{ id: makeId("batch"), receivedAt: importedAt, quantity: currentProduct.quantity, remainingQuantity: currentProduct.quantity, purchasePrice: currentProduct.purchasePrice, expiryDate: currentProduct.expiryDate || "", supplierName: currentProduct.supplierName || "رصيد افتتاحي", note: "رصيد افتتاحي موثق عند استيراد Excel" }] : [];
            const batches = reconcileBatchStocktake(openingBatches, item.quantity, importedAt, item.purchasePrice);
            const nextProduct = { ...currentProduct, ...item, batches, expiryDate: getEarliestActiveExpiry(batches) || item.expiryDate };
            products[index] = nextProduct;
            buildPriceChangeDrafts(currentProduct, nextProduct).forEach((change) => priceHistory.push({ id: makeId("price"), productId: currentProduct.id, productName: nextProduct.name, ...change, createdAt: new Date().toISOString() }));
            updated += 1;
          } else {
            const batches = item.quantity > 0 ? [{ id: makeId("batch"), receivedAt: importedAt, quantity: item.quantity, remainingQuantity: item.quantity, purchasePrice: item.purchasePrice, expiryDate: item.expiryDate || "", supplierName: item.supplierName || "رصيد افتتاحي", note: "رصيد افتتاحي عند استيراد Excel" }] : [];
            products.unshift({ id: makeId("product"), ...item, batches, expiryDate: getEarliestActiveExpiry(batches) || item.expiryDate });
          }
        });
        return { ...current, products, priceHistory: priceHistory.length ? [...priceHistory, ...current.priceHistory] : current.priceHistory, initialized: true };
      });
      const added = items.length - updated;
      toast.success(`تمت معالجة ${items.length} صنف: ${added} مضاف و${updated} محدّث${rejected ? ` · ${rejected} صف تم تجاوزه` : ""}.`);
      if (rejected) toast.info("تأكد من الأعمدة المطلوبة: اسم الصنف، رمز الصنف، الكمية، حد التنبيه، سعر الشراء، سعر البيع.");
    } catch {
      toast.error("تعذّر قراءة Excel. نزّل القالب واستخدم ورقة الأصناف الأولى.");
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const resetData = () => {
    if (!window.confirm("سيتم حذف جميع أصنافك ومبيعاتك وذممك من هذا الجهاز، ثم يبدأ إعداد محل جديد. هل تريد المتابعة؟")) return;
    setStore(emptyStoreData);
    setCart([]);
    setReadNotificationKeys([]);
    setShowStoreSetup(true);
    toast.success("تم حذف البيانات. أعد الآن تجهيز محلك ببياناتك الحقيقية.");
  };

  const saveAccessProfile = (profile: LocalAccessProfile) => {
    localStorage.setItem(LOCAL_ACCESS_PROFILE_KEY, JSON.stringify(profile));
    setAccessProfile(profile);
  };

  const setupOwnerAccess = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwnerSetupPhone(navigator.userAgent)) { toast.error("إعداد المالك محصور في هاتفك الرئيسي. هذا الكمبيوتر يُربط كجهاز مستخدم من الهاتف."); setAccessMode("login"); return; }
    if (!deviceIdentity) { toast.error("جاري تجهيز هوية هذا الجهاز، أعد المحاولة خلال لحظة."); return; }
    const username = accessUsername.trim();
    if (username.length < 3 || accessPassword.length < 6) { toast.error("اكتب اسم مستخدم من 3 أحرف وكلمة مرور من 6 أحرف على الأقل."); return; }
    if (accessPassword !== accessPasswordConfirm) { toast.error("تأكيد كلمة المرور غير مطابق."); return; }
    const profile = await createOwnerProfile(username, accessPassword, deviceIdentity.deviceId, deviceIdentity.deviceProof);
    saveAccessProfile(profile);
    localStorage.setItem(LOCAL_ACCESS_SESSION_KEY, profile.username);
    setAccessAuthenticated(true);
    setAccessPassword("");
    setAccessPasswordConfirm("");
    toast.success("تم إعداد جهاز المالك وحمايته محليًا.");
  };

  const importActivation = () => {
    if (!deviceIdentity) { toast.error("جاري تجهيز هوية الجهاز."); return; }
    const payload = decodeLocalAccessCode(activationCode);
    const profile = payload && "role" in payload ? activateDevice(payload, deviceIdentity.deviceId, deviceIdentity.deviceProof) : null;
    if (!profile) { toast.error("رمز التفعيل غير صالح لهذا الجهاز أو انتهت صلاحيته."); return; }
    saveAccessProfile(profile);
    setActivationCode("");
    setAccessMode("login");
    toast.success("تم ربط هذا الجهاز بالحساب. سجّل الآن باسم المستخدم وكلمة المرور.");
  };

  const importDeactivation = () => {
    if (!deviceIdentity) { toast.error("جاري تجهيز هوية الجهاز."); return; }
    const payload = decodeLocalAccessCode<DeactivationPayload>(deactivationCode);
    if (!payload || !("action" in payload) || !canDeactivateDevice(payload, deviceIdentity.deviceId, deviceIdentity.deviceProof)) { toast.error("رمز التعطيل غير صالح لهذا الجهاز."); return; }
    localStorage.setItem(LOCAL_ACCESS_DISABLED_KEY, JSON.stringify({ disabledAt: new Date().toISOString(), issuedAt: payload.issuedAt }));
    if (payload.reason) localStorage.setItem(LOCAL_ACCESS_DISABLED_REASON_KEY, payload.reason);
    else localStorage.removeItem(LOCAL_ACCESS_DISABLED_REASON_KEY);
    localStorage.removeItem(LOCAL_ACCESS_SESSION_KEY);
    setAccessAuthenticated(false);
    setDeviceDisabled(true);
    setDeviceDisabledReason(payload.reason || "");
  };

  const loginLocalAccess = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessProfile) { toast.error("فعّل هذا الجهاز أولًا عبر QR أو رمز التفعيل."); return; }
    if (accessProfile.deviceId !== deviceIdentity?.deviceId || accessProfile.deviceProof !== deviceIdentity?.deviceProof) { toast.error("ملف الدخول لا يطابق هوية هذا الجهاز."); return; }
    if (await verifyLocalAccessLogin(accessProfile, accessUsername, accessPassword)) {
      localStorage.setItem(LOCAL_ACCESS_SESSION_KEY, accessProfile.username);
      setAccessAuthenticated(true);
      setAccessPassword("");
      toast.success("تم فتح سوقنا محليًا.");
    } else {
      toast.error(isAccessExpired(accessProfile) ? "انتهت صلاحية هذا الحساب." : "اسم المستخدم أو كلمة المرور غير صحيحين.");
    }
  };

  const issueDeviceActivation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (accessProfile?.role !== "owner") { toast.error("إصدار الحسابات متاح للمالك فقط."); return; }
    const request = decodeLocalAccessCode<DeviceRequest>(issueRequestCode);
    const days = Math.max(1, Math.floor(Number(issueDurationDays) || 0));
    if (!request || !request.deviceId || !request.deviceProof) { toast.error("الصق رمز طلب الربط الصحيح من الجهاز الآخر أو امسحه بالكاميرا."); return; }
    if (issueUsername.trim().length < 3 || issuePassword.length < 6) { toast.error("اكتب اسم مستخدم من 3 أحرف وكلمة مرور من 6 أحرف على الأقل."); return; }
    const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
    const payload = await createActivationPayload(request, issueUsername.trim(), issuePassword, expiresAt);
    const wasIssuedBefore = issuedDevices.some((record) => record.deviceId === request.deviceId);
    const code = encodeLocalAccessCode(payload);
    setIssuedActivationCode(code);
    void makeReceiptQrDataUrl(code).then(setIssuedActivationQr).catch(() => setIssuedActivationQr(""));
    setIssuedDevices((current) => upsertIssuedDevice(current, { deviceId: request.deviceId, deviceProof: request.deviceProof, username: payload.username, expiresAt: payload.expiresAt, issuedAt: payload.issuedAt }));
    setDeviceActivity((current) => addDeviceActivity(current, { deviceId: request.deviceId, username: payload.username, action: wasIssuedBefore ? "renewed" : "issued", note: `صلاحية ${days} يومًا` }));
    setIssuePassword("");
    toast.success(`تم إصدار تفعيل مربوط بجهاز واحد لمدة ${days} يومًا.`);
  };

  const issueDeviceDeactivation = (record: IssuedDeviceRecord) => {
    const reason = window.prompt(`سبب تعطيل جهاز «${record.username}» (اختياري):`, record.deactivationReason || "");
    if (reason === null) return;
    const payload = createDeactivationPayload(record.deviceId, record.deviceProof, reason);
    const code = encodeLocalAccessCode(payload);
    setIssuedDeactivationCode(code);
    void makeReceiptQrDataUrl(code).then(setIssuedDeactivationQr).catch(() => setIssuedDeactivationQr(""));
    setIssuedDevices((current) => current.map((entry) => entry.deviceId === record.deviceId ? { ...entry, deactivationIssuedAt: payload.issuedAt, deactivationReason: payload.reason } : entry));
    setDeviceActivity((current) => addDeviceActivity(current, { deviceId: record.deviceId, username: record.username, action: "deactivation_issued", note: payload.reason }));
    toast.success(`تم إنشاء رمز تعطيل للجهاز المرتبط بحساب «${record.username}».`);
  };

  const exportIssuedDevicesExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = filteredIssuedDevices.map((record) => {
      const visual = getIssuedDeviceVisualState(record);
      return {
        "اسم المستخدم": record.username,
        "معرف الجهاز": record.deviceId,
        "تاريخ الإصدار": record.issuedAt,
        "تاريخ الانتهاء": record.expiresAt,
        "الحالة": visual.state === "active" ? "ساري" : visual.state === "near" ? "قريب من الانتهاء" : visual.state === "warning" ? "تحذير" : visual.state === "urgent" ? "عاجل" : "منتهٍ",
        "الأيام المتبقية": visual.daysRemaining,
        "رمز تعطيل صادر": record.deactivationIssuedAt ? "نعم" : "لا",
        "تاريخ إصدار رمز التعطيل": record.deactivationIssuedAt || "",
        "سبب التعطيل": record.deactivationReason || "",
      };
    });
    const visibleDeviceIds = new Set(filteredIssuedDevices.map((record) => record.deviceId));
    const activityRows = deviceActivity.filter((entry) => visibleDeviceIds.has(entry.deviceId)).map((entry) => ({ "التاريخ والوقت": entry.createdAt, "اسم المستخدم": entry.username, "معرف الجهاز": entry.deviceId, "العملية": getDeviceActivityLabel(entry.action), "ملاحظة": entry.note || "" }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد أجهزة تطابق التصفية الحالية" }]), "الأجهزة");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activityRows.length ? activityRows : [{ "ملاحظة": "لا توجد عمليات للأجهزة المطابقة" }]), "سجل النشاط");
    XLSX.writeFile(workbook, `souqna-issued-devices-${todayKey()}.xlsx`);
    toast.success("تم تنزيل سجل الأجهزة المفلتر إلى Excel.");
  };

  const printIssuedDevicesReport = () => {
    const deviceRows = filteredIssuedDevices.map((record) => {
      const visual = getIssuedDeviceVisualState(record);
      const state = visual.state === "active" ? "ساري" : visual.state === "near" ? `قريب — ${visual.daysRemaining} أيام` : visual.state === "warning" ? `تحذير — ${visual.daysRemaining} أيام` : visual.state === "urgent" ? "عاجل — يوم واحد" : "منتهٍ";
      return `<tr><td>${escapeHtml(record.username)}</td><td dir="ltr">${escapeHtml(record.deviceId.slice(-8))}</td><td>${escapeHtml(state)}</td><td>${escapeHtml(formatDate(record.expiresAt))}</td><td>${escapeHtml(record.deactivationReason || "—")}</td></tr>`;
    }).join("");
    const activityRows = deviceActivity.filter((entry) => filteredIssuedDevices.some((record) => record.deviceId === entry.deviceId)).slice(0, 20).map((entry) => `<tr><td>${escapeHtml(formatDate(entry.createdAt))}</td><td>${escapeHtml(entry.username)}</td><td>${escapeHtml(getDeviceActivityLabel(entry.action))}</td><td>${escapeHtml(entry.note || "—")}</td></tr>`).join("");
    const content = `<h1>تقرير الأجهزة الصادرة</h1><p>${escapeHtml(store.storeName)} · ${todayKey()} · ${escapeHtml(issuedDeviceFilter === "all" ? "كل الحالات" : issuedDeviceFilter)}</p><h2>الأجهزة (${filteredIssuedDevices.length})</h2>${deviceRows ? `<table><thead><tr><th>المستخدم</th><th>الجهاز</th><th>الحالة</th><th>الانتهاء</th><th>سبب التعطيل</th></tr></thead><tbody>${deviceRows}</tbody></table>` : "<p>لا توجد أجهزة تطابق الفلترة والبحث.</p>"}<h2>آخر النشاطات</h2>${activityRows ? `<table><thead><tr><th>التاريخ</th><th>المستخدم</th><th>العملية</th><th>ملاحظة</th></tr></thead><tbody>${activityRows}</tbody></table>` : "<p>لا توجد نشاطات مطابقة.</p>"}`;
    if (openSystemPrint(`تقرير أجهزة ${store.storeName}`, content)) toast.success("فُتح تقرير الأجهزة للطباعة أو الحفظ.");
  };

  const deleteIssuedDeviceRecord = (record: IssuedDeviceRecord) => {
    if (!window.confirm(`سيُحذف «${record.username}» من سجل جهاز المالك فقط. لن يتوقف الجهاز إلا إذا استورد رمز التعطيل. هل تريد المتابعة؟`)) return;
    setIssuedDevices((current) => current.filter((entry) => entry.deviceId !== record.deviceId));
    setDeviceActivity((current) => addDeviceActivity(current, { deviceId: record.deviceId, username: record.username, action: "record_deleted" }));
    toast.success("تم حذف الجهاز من السجل المحلي للمالك.");
  };

  const lockLocalAccess = () => {
    localStorage.removeItem(LOCAL_ACCESS_SESSION_KEY);
    setAccessAuthenticated(false);
    setAccessUsername("");
    setAccessPassword("");
    setAccessMode("login");
  };

  const importAccessQrImage = async (file: File | undefined, target: "activation" | "deactivation" | "request") => {
    if (!file) return;
    try {
      const code = await readQrCodeFromImage(file);
      if (target === "activation") setActivationCode(code); else if (target === "deactivation") setDeactivationCode(code); else setIssueRequestCode(code);
      toast.success("تمت قراءة رمز QR من الصورة محليًا.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر قراءة QR من الصورة.");
    }
  };

  const prepareIssuedDeviceRenewal = (record: IssuedDeviceRecord) => {
    setIssueRequestCode(encodeLocalAccessCode({ version: 1, deviceId: record.deviceId, deviceProof: record.deviceProof, createdAt: record.issuedAt }));
    setIssueUsername(record.username);
    setIssuePassword("");
    setIssueDurationDays("30");
    setIssuedActivationCode("");
    setIssuedActivationQr("");
    toast.success(`تم تجهيز تجديد حساب «${record.username}». أدخل كلمة مرور جديدة والمدة ثم أنشئ التفعيل.`);
  };

  const copyCurrentDeviceId = async () => {
    if (!deviceIdentity?.deviceId) { toast.error("معرّف الجهاز غير متاح بعد. أعد فتح سوقنا ثم حاول مجددًا."); return; }
    try {
      await navigator.clipboard.writeText(deviceIdentity.deviceId);
      toast.success("تم نسخ معرّف هذا الجهاز.");
    } catch {
      const input = document.createElement("textarea");
      input.value = deviceIdentity.deviceId;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      copied ? toast.success("تم نسخ معرّف هذا الجهاز.") : toast.error("تعذر النسخ تلقائيًا. حاول من متصفح آخر.");
    }
  };

  const importSupportScreenshot = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) { toast.error("اختر صورة بصيغة JPG أو PNG أو WebP."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("صورة الخطأ كبيرة جدًا. اختر صورة أصغر من 8 ميغابايت."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const ratio = Math.min(1, 1000 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext("2d");
        if (!context) { toast.error("تعذر تجهيز صورة الخطأ."); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.76);
        if (dataUrl.length > 850_000) { toast.error("الصورة ما زالت كبيرة للتخزين المحلي. قصّها أو اختر لقطة أصغر."); return; }
        setSupportScreenshotDataUrl(dataUrl);
        toast.success("تمت إضافة صورة الخطأ وحفظها محليًا مع البلاغ.");
      };
      image.onerror = () => toast.error("تعذر قراءة صورة الخطأ.");
      image.src = String(reader.result || "");
    };
    reader.onerror = () => toast.error("تعذر قراءة ملف الصورة.");
    reader.readAsDataURL(file);
  };

  const updateSupportRequestStatus = (id: string, status: SupportRequestStatus) => {
    setSupportRequests((current) => keepSupportRequests(current.map((request) => request.id === id ? { ...request, status } : request)));
    toast.success(`تم تغيير حالة البلاغ إلى «${SUPPORT_STATUS_LABELS[status]}».`);
  };

  const exportSupportRequestsExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = supportRequests.map((request) => ({ "رقم البلاغ المحلي": request.id, "تاريخ البلاغ": request.createdAt, "نوع المشكلة": SUPPORT_CATEGORY_LABELS[request.category], "الحالة": SUPPORT_STATUS_LABELS[request.status], "التفاصيل": request.details, "معرّف الجهاز": request.deviceId, "نوع الحساب": request.role === "owner" ? "مالك" : request.role === "user" ? "مستخدم" : "غير محدد", "صورة خطأ محفوظة محليًا": request.screenshotDataUrl ? "نعم" : "لا" }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "ملاحظة": "لا توجد بلاغات دعم محفوظة بعد" }]), "سجل الدعم");
    XLSX.writeFile(workbook, `souqna-support-requests-${todayKey()}.xlsx`);
    toast.success("تم تنزيل سجل الدعم إلى Excel.");
  };

  const pageTitle: Record<Page, string> = { dashboard: "لوحة اليوم", sale: "بيع جديد", returns: "إرجاع بيع", closing: "إغلاق الوردية", payroll: "رواتب الموظفين", advances: "السلف والعهد", inventory: "إدارة المخزون", debts: "دفتر الذمم", reports: "تقارير المتجر", settings: "الإعدادات" };

  if (!dataReady) {
    return <div className="app-loading" dir="rtl"><img src={logoUrl} alt="سوقنا" /><strong>نجهّز بيانات محلك بأمان…</strong><span>يتم فتح قاعدة البيانات المحلية على هذا الجهاز.</span></div>;
  }

  if (deviceDisabled) {
    return <main className="app-shell" dir="rtl"><section className="modal-card modal-card--debt" style={{ margin: "12vh auto", width: "min(94vw, 520px)" }}><div className="modal-heading"><div><span className="section-kicker">جهاز معطّل</span><h2>تم إيقاف هذا الجهاز</h2></div><ShieldOff size={30} /></div><p className="modal-note">تم استيراد رمز تعطيل صالح لهذا الجهاز من المالك. لا يمكن فتح سوقنا عليه أو إعادة تفعيله إلا بإجراء إداري جديد من جهاز المالك.</p>{deviceDisabledReason && <div className="collection-summary"><span>سبب الإيقاف</span><strong>{deviceDisabledReason}</strong></div>}</section></main>;
  }

  if (!accessAuthenticated) {
    const ownerSetupAllowedOnThisDevice = isOwnerSetupPhone(navigator.userAgent);
    const canSetupOwner = !accessProfile && ownerBootstrapState === "allow" && ownerSetupAllowedOnThisDevice;
    const ownerSetupBlockedOnDesktop = !accessProfile && ownerBootstrapState === "allow" && !ownerSetupAllowedOnThisDevice;
    const isOwnerSetup = !accessProfile && accessMode === "owner";
    const isActivation = !accessProfile && accessMode === "activate";
    const isDeactivation = Boolean(accessProfile && accessMode === "deactivate");
    return <main className="app-shell" dir="rtl"><section className="modal-card modal-card--debt" style={{ margin: "6vh auto", width: "min(94vw, 620px)" }}><div className="modal-heading"><div><span className="section-kicker">وصول محلي مقيد بالجهاز</span><h2>{isOwnerSetup ? "إعداد جهاز المالك" : isActivation ? "ربط جهاز مستخدم" : isDeactivation ? "إيقاف هذا الجهاز" : "تسجيل الدخول إلى سوقنا"}</h2></div><img src={logoUrl} alt="سوقنا" className="w-10 h-10 rounded-xl" /></div>{!accessProfile && !isOwnerSetup && !isActivation && <div className="price-history-list">{canSetupOwner ? <button className="action-button action-button--primary" onClick={() => setAccessMode("owner")}>هذا هاتفي الرئيسي — إعداد المالك</button> : <p className="modal-note">{ownerSetupBlockedOnDesktop ? "هذا كمبيوتر فرعي: لا يمكنه أبدًا أن يصبح مالكًا. افتح سوقنا من هاتفك الرئيسي لإصدار حساب لهذا الكمبيوتر." : "هذا جهاز جديد مستقل؛ لا تظهر فيه بيانات أي محل. فعّله بحساب يصدره المالك ليعمل بجميع مميزات سوقنا."}</p>}<button className="action-button action-button--primary" onClick={() => setAccessMode("activate")}>ربط هذا الكمبيوتر أو الهاتف من المالك</button><p className="modal-note">كل حساب مؤقت يُربط بجهاز واحد فقط. لا يمكن تفعيل رمز هذا الجهاز على هاتف أو كمبيوتر آخر.</p></div>}{isOwnerSetup && !canSetupOwner && <div className="price-history-list"><p className="modal-note">هذا الجهاز ليس هاتف المالك، ولذلك لا يمكن إعداد مالك عليه. اختر ربط الجهاز من هاتفك الرئيسي.</p><button type="button" className="action-button action-button--primary" onClick={() => setAccessMode("activate")}>الانتقال إلى ربط هذا الجهاز</button></div>}{isOwnerSetup && canSetupOwner && <form className="form-grid" onSubmit={(event) => void setupOwnerAccess(event)}><label className="field"><span>اسم مستخدم المالك *</span><input autoFocus required value={accessUsername} onChange={(event) => setAccessUsername(event.target.value)} placeholder="مثال: owner" /></label><label className="field"><span>كلمة مرور المالك *</span><input required type="password" minLength={6} value={accessPassword} onChange={(event) => setAccessPassword(event.target.value)} placeholder="6 أحرف أو أكثر" /></label><label className="field field--wide"><span>تأكيد كلمة المرور *</span><input required type="password" minLength={6} value={accessPasswordConfirm} onChange={(event) => setAccessPasswordConfirm(event.target.value)} /></label><p className="modal-note field--wide">احتفظ بكلمة مرور المالك؛ هي التي تفتح إعدادات إصدار حسابات الأجهزة الأخرى.</p><div className="modal-actions field--wide"><button type="button" className="action-button action-button--secondary" onClick={() => setAccessMode("login")}>رجوع</button><button type="submit" className="action-button action-button--primary">حماية هاتف المالك</button></div></form>}{isActivation && <div className="price-history-list"><div className="collection-summary"><span>1. أرسل طلب هذا الكمبيوتر إلى هاتفك الرئيسي</span><strong>من الهاتف: الإعدادات ← المالك ← إصدار تفعيل، ثم امسح QR الظاهر هنا أو الصق الرمز في الهاتف.</strong>{deviceRequestQr ? <img src={deviceRequestQr} alt="طلب ربط الجهاز" className="mx-auto w-48 h-48 rounded-xl bg-white p-2" /> : <span>يجري تجهيز QR…</span>}<textarea className="mt-3 w-full min-h-20" value={deviceIdentity ? encodeLocalAccessCode({ version: 1, deviceId: deviceIdentity.deviceId, deviceProof: deviceIdentity.deviceProof, createdAt: new Date().toISOString() }) : ""} readOnly aria-label="رمز طلب ربط الجهاز" /></div><div className="collection-summary"><span>2. الصق رمز التفعيل الصادر من الهاتف هنا</span><strong>عند استخدام الكمبيوتر، الصق الرمز النصي أو اختر صورة QR؛ لا تحتاج كاميرا الكمبيوتر.</strong><textarea autoFocus value={activationCode} onChange={(event) => setActivationCode(event.target.value)} placeholder="الصق رمز التفعيل الذي ظهر في هاتف المالك" aria-label="رمز التفعيل" /></div><input ref={activationImageInputRef} type="file" accept="image/*" className="hidden-input" onChange={(event) => void importAccessQrImage(event.target.files?.[0], "activation")} /><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setAccessQrScannerMode("activation")}>مسح QR بالكاميرا</button><button type="button" className="action-button action-button--secondary" onClick={() => activationImageInputRef.current?.click()}>اختيار صورة QR</button><button type="button" className="action-button action-button--primary" disabled={!activationCode.trim()} onClick={importActivation}>تفعيل هذا الكمبيوتر الآن</button></div><p className="modal-note">بعد نجاح التفعيل ستظهر شاشة اسم المستخدم وكلمة المرور للدخول.</p><button type="button" className="text-button" onClick={() => setAccessMode("login")}>رجوع</button></div>}{isDeactivation && <div className="price-history-list"><p className="modal-note">امسح أو الصق رمز التعطيل الذي أنشأه المالك لهذا الجهاز. بعد التأكيد سيتوقف سوقنا فورًا على هذا الجهاز.</p><label className="field"><span>رمز التعطيل</span><textarea value={deactivationCode} onChange={(event) => setDeactivationCode(event.target.value)} placeholder="الصق رمز التعطيل هنا" /></label><input ref={activationImageInputRef} type="file" accept="image/*" className="hidden-input" onChange={(event) => void importAccessQrImage(event.target.files?.[0], "deactivation")} /><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setAccessQrScannerMode("deactivation")}>مسح QR بالكاميرا</button><button type="button" className="action-button action-button--secondary" onClick={() => activationImageInputRef.current?.click()}>اختيار صورة QR</button><button type="button" className="action-button action-button--primary" onClick={importDeactivation}>إيقاف هذا الجهاز</button></div><button type="button" className="text-button" onClick={() => setAccessMode("login")}>إلغاء</button></div>}{accessProfile && !isDeactivation && <form className="form-grid" onSubmit={(event) => void loginLocalAccess(event)}><div className="collection-summary field--wide"><span>{accessProfile.role === "owner" ? "هاتف المالك" : "حساب جهاز فرعي مقيد"}</span><strong>{accessProfile.username}{accessProfile.expiresAt ? ` · صالح حتى ${new Date(accessProfile.expiresAt).toLocaleDateString("ar-LY")}` : ""}</strong></div><label className="field"><span>اسم المستخدم</span><input autoFocus required value={accessUsername} onChange={(event) => setAccessUsername(event.target.value)} /></label><label className="field"><span>كلمة المرور</span><input required type="password" value={accessPassword} onChange={(event) => setAccessPassword(event.target.value)} /></label><div className="modal-actions field--wide"><button type="submit" className="action-button action-button--primary">دخول محلي</button>{accessProfile.role === "user" && <><button type="button" className="action-button action-button--secondary" onClick={() => setAccessMode("deactivate")}>استيراد رمز تعطيل</button><button type="button" className="action-button action-button--secondary" onClick={() => { localStorage.removeItem(LOCAL_ACCESS_PROFILE_KEY); setAccessProfile(null); setAccessMode("login"); }}>تفعيل جهاز آخر</button></>}</div></form>}</section>{accessQrScannerMode && <BarcodeScanner onDetected={(value) => { if (accessQrScannerMode === "activation") setActivationCode(value); else if (accessQrScannerMode === "deactivation") setDeactivationCode(value); else setIssueRequestCode(value); setAccessQrScannerMode(null); }} onClose={() => setAccessQrScannerMode(null)} kicker="تفويض محلي" heading={accessQrScannerMode === "activation" ? "امسح رمز التفعيل" : accessQrScannerMode === "deactivation" ? "امسح رمز التعطيل" : "امسح طلب ربط الجهاز"} closeLabel="إغلاق الماسح" />}</main>;
  }

  return (
	  <div className={`souqna-app ${page === "returns" ? "souqna-app--pos-reference" : ""} ${page === "sale" ? "souqna-app--erp-sale" : ""}`} dir="rtl">
		    {updateAvailable && <section className="panel weekly-report-strip" style={{ margin: "0 1rem", borderColor: "#b6763b", background: "#fff9ed" }} role="status"><div><span className="section-kicker">تحديث سوقنا متاح</span><h3>توجد مميزات وتحسينات جديدة</h3><p>اضغط «تحديث الآن» لتنزيل النسخة الجديدة. لن تتأثر بيانات محلك المحلية.</p></div><div className="inventory-page__actions"><button type="button" className="action-button action-button--primary" onClick={applyAvailableAppUpdate}><Download size={17} /> تحديث الآن</button><button type="button" className="text-button" onClick={() => setUpdateAvailable(false)}>لاحقًا</button></div></section>}
	    {accessExpiryNotice && page !== "sale" && <section className="panel weekly-report-strip" style={{ margin: "0 1rem", borderColor: accessExpiryNotice.level === "urgent" ? "#b74d39" : "#b6763b", background: accessExpiryNotice.level === "urgent" ? "#fff2ee" : "#fff9ed" }} role="status"><div><span className="section-kicker">تنبيه صلاحية الجهاز</span><h3>{accessExpiryNotice.daysRemaining === 1 ? "تنتهي صلاحية حساب هذا الجهاز غدًا" : `تنتهي صلاحية حساب هذا الجهاز بعد ${accessExpiryNotice.daysRemaining} أيام`}</h3><p>تواصل مع المالك قبل انتهاء الصلاحية ليصدر لك تفعيلًا مجددًا لهذا الجهاز.</p></div><CircleAlert size={28} color={accessExpiryNotice.level === "urgent" ? "#b74d39" : "#b6763b"} /></section>}
	    {showPriceLookup && priceLookupResult && <button type="button" className="price-lookup-add-to-cart" disabled={getExpiryStatus(priceLookupResult.expiryDate).kind === "expired" || (cart.find((item) => item.id === priceLookupResult.id)?.cartQuantity ?? 0) >= priceLookupResult.quantity} onClick={addPriceLookupResultToCart}><ShoppingBag size={18} /> {getExpiryStatus(priceLookupResult.expiryDate).kind === "expired" ? "الصنف منتهي الصلاحية" : (cart.find((item) => item.id === priceLookupResult.id)?.cartQuantity ?? 0) >= priceLookupResult.quantity ? "بلغت الكمية المتاحة" : "إضافة إلى سلة البيع"}</button>}
	    {showPriceLookup && <div className="modal-backdrop" role="presentation"><section className="modal-card modal-card--debt price-lookup-dialog" role="dialog" aria-modal="true" aria-label="استعلام سعر صنف"><div className="modal-heading"><div><span className="section-kicker">استعلام محلي</span><h3>سعر ومخزون الصنف</h3></div><button type="button" className="icon-button" onClick={() => { setShowPriceLookup(false); setShowPriceLookupScanner(false); }} aria-label="إغلاق"><X size={19} /></button></div><form className="price-lookup-form" onSubmit={(event) => { event.preventDefault(); lookupProductPrice(priceLookupQuery); }}><label className="field"><span>اكتب اسم الصنف أو امسح الباركود</span><input autoFocus value={priceLookupQuery} onChange={(event) => setPriceLookupQuery(event.target.value)} placeholder="مثال: ماء أو 625..." /></label><button type="submit" className="action-button action-button--primary"><Search size={17} /> عرض السعر</button><button type="button" className="action-button action-button--secondary" onClick={() => setShowPriceLookupScanner(true)}><Camera size={17} /> مسح بالكاميرا</button></form>{priceLookupResult ? <section className="price-lookup-result" aria-live="polite"><div><span className="section-kicker">تم العثور على الصنف</span><h3>{priceLookupResult.name}</h3><p>الرمز: <b dir="ltr">{priceLookupResult.sku}</b>{priceLookupResult.shelfLocation ? ` · الرف: ${priceLookupResult.shelfLocation}` : ""}</p></div><div className="price-lookup-result__price"><small>سعر البيع</small><strong dir="ltr">{money(priceLookupResult.salePrice)}</strong><span className={priceLookupResult.quantity > priceLookupResult.lowStockAt ? "status-badge" : "status-badge status-badge--warning"}>{priceLookupResult.quantity} متوفر</span></div></section> : <p className="modal-note">هذا الوضع للاستعلام فقط: لا يضيف الصنف إلى السلة ولا يغير المخزون أو الفاتورة.</p>}{store.priceLookupHistory.length > 0 && <section className="price-history-panel price-lookup-history"><div className="panel-heading"><div><span className="section-kicker">آخر الاستعلامات</span><h3>سجل محلي قصير</h3></div><button type="button" className="text-button" onClick={() => setStore((current) => ({ ...current, priceLookupHistory: [] }))}>مسح السجل</button></div><div className="price-history-list">{store.priceLookupHistory.map((entry) => <button type="button" className={`price-history-row price-lookup-history__row ${entry.found ? "" : "price-lookup-history__row--missing"}`} key={entry.id} onClick={() => { setPriceLookupQuery(entry.query); lookupProductPrice(entry.query); }}><span><strong>{entry.productName}</strong><small>{entry.query} · {formatDate(entry.lookedUpAt)}</small></span><b>{entry.found ? "عرض" : "غير مسجل"}</b></button>)}</div></section>}<div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setShowPriceLookup(false); setShowPriceLookupScanner(false); }}>العودة إلى البيع</button></div></section></div>}
	    {unmatchedBarcodeStocktakeValue && <div className="modal-backdrop" role="presentation"><section className="modal-card modal-card--debt" role="dialog" aria-modal="true" aria-label="ربط باركود الجرد بصنف موجود"><div className="modal-heading"><div><span className="section-kicker">باركود غير مطابق</span><h3>اختر الصنف الموجود لربط الرمز</h3></div><button type="button" className="icon-button" onClick={() => setUnmatchedBarcodeStocktakeValue("")} aria-label="إغلاق"><X size={19} /></button></div><p className="modal-note">الرمز المقروء لا يطابق رمزًا محفوظًا. اختر الصنف الصحيح وسيُحفظ هذا الرمز كرمز بديل له، دون استبدال رمز الصنف الأصلي، ثم تُحسب وحدة مباشرة في جولة الجرد.</p><label className="field"><span>الباركود المقروء</span><input value={unmatchedBarcodeStocktakeValue} readOnly dir="ltr" /></label><label className="field"><span>الصنف الموجود</span><select defaultValue="" onChange={(event) => { if (event.target.value) linkUnmatchedBarcodeToStocktakeProduct(event.target.value); }}><option value="" disabled>اختر الصنف الصحيح</option>{[...store.products].sort((left, right) => left.name.localeCompare(right.name, "ar")).map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setUnmatchedBarcodeStocktakeValue("")}>تجاهل الرمز ومتابعة الجرد</button></div></section></div>}
      <aside className={`sidebar ${mobileNav ? "sidebar--open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><img src={logoUrl} alt="رمز سوقنا" /></div>
          <div><strong>سوقنا</strong><span>دفتر تشغيل محلك</span></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="إغلاق القائمة"><X size={19} /></button>
        </div>

        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <p className="nav-label">إدارة المتجر</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActivePage(id)} className={`nav-item ${page === id ? "nav-item--active" : ""}`}>
              <Icon size={19} /><span>{label}</span>{id === "debts" && totalOutstanding > 0 && <b>{store.debts.filter((debt) => debt.amount > debt.paid).length}</b>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={() => setActivePage("settings")} className={`nav-item ${page === "settings" ? "nav-item--active" : ""}`}><Settings size={19} /><span>الإعدادات</span></button>
          <button onClick={lockLocalAccess} className="nav-item"><ShieldOff size={19} /><span>قفل النظام</span></button>
          <div className="offline-note"><WifiOff size={16} /><span>بياناتك محفوظة على هذا الجهاز</span></div>
        </div>
      </aside>

      {mobileNav && <button aria-label="إغلاق القائمة" className="sidebar-backdrop" onClick={() => setMobileNav(false)} />}

        <main className={`main-shell ${isCashierFullscreen ? "main-shell--cashier" : ""} ${page === "returns" ? "main-shell--pos-reference" : ""}`}>

        <header className="topbar">
          <div className="topbar__title">
            <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="فتح القائمة"><Menu size={23} /></button>
            <div className="topbar-ledger-mark" aria-hidden="true"><img src={logoUrl} alt="" /><div><b>سوقنا</b><span>دفتر<br/>التشغيل</span></div></div>
            <div><p>مرحبًا بك في {store.storeName}</p><h1>{pageTitle[page]}</h1></div>
          </div>
          <div className="topbar__tools">
            <span className={`connection-pill ${isOnline ? "" : "connection-pill--offline"}`}>{isOnline ? <Check size={14} /> : <WifiOff size={14} />}{isOnline ? "جاهز للعمل دون إنترنت" : "وضع العمل المحلي"}</span>
            <div className="notification-wrapper">
              <button className={`notification-trigger ${unreadNotificationCount ? "notification-trigger--active" : ""}`} onClick={() => setNotificationsOpen((open) => !open)} aria-label={`الإشعارات، ${unreadNotificationCount} غير مقروءة`} aria-expanded={notificationsOpen}>
                <BellRing size={19} />
                {unreadNotificationCount > 0 && <b>{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</b>}
              </button>
              {notificationsOpen && <section className="notification-popover" role="dialog" aria-label="مركز الإشعارات">
                <div className="notification-popover__head"><div><span className="section-kicker">مركز المتابعة</span><h3>إشعارات محلك</h3></div>{unreadNotificationCount > 0 && <button className="text-button" onClick={markAllNotificationsRead}>تعليم الكل كمقروء</button>}</div>
                <div className="notification-popover__list">
                  {notifications.length ? notifications.map((notification) => {
                    const read = readNotificationKeys.includes(notification.id);
                    const Icon = notification.kind === "info" ? WalletCards : CircleAlert;
                    return <button key={notification.id} className={`notification-item notification-item--${notification.kind} ${read ? "notification-item--read" : ""}`} onClick={() => openNotification(notification)}><span className="notification-item__icon"><Icon size={17} /></span><span className="notification-item__copy"><strong>{notification.title}</strong><small>{notification.description}</small></span>{!read && <i aria-label="غير مقروء" />}</button>;
                  }) : <div className="notification-empty"><Check size={20} /><p>كل شيء تحت السيطرة الآن.</p><small>لا توجد تنبيهات ضمن الإعدادات المفعلة.</small></div>}
                </div>
                <div className="notification-popover__foot"><Settings size={14} /> <button onClick={() => { setActivePage("settings"); setNotificationsOpen(false); }}>تخصيص الإشعارات</button></div>
              </section>}
            </div>
            {(page === "sale" || page === "returns") && <button className="action-button action-button--secondary cashier-mode-button" onClick={() => setIsCashierFullscreen((current) => !current)}>{isCashierFullscreen ? "خروج من شاشة الكاشير" : "شاشة الكاشير"}</button>}
            {(page === "sale" || page === "returns") && <button className="action-button action-button--secondary topbar-switch" onClick={() => setActivePage(page === "sale" ? "returns" : "sale")}><ArrowLeft size={17} /> {page === "sale" ? "الانتقال إلى الترجيع" : "الانتقال إلى البيع"}</button>}
            <button className="action-button action-button--primary action-button--new-sale" onClick={openSale}><Plus size={19} /> بيعة جديدة</button>
          </div>
        </header>

        <div className="page-content">
          {page === "dashboard" && (
            <section className="dashboard-page">
              <div className="ledger-ribbon" aria-label="مؤشر دفتر التشغيل اليومي">
                <div className="ledger-ribbon__stamp"><img src={logoUrl} alt="" /><span><b>دفتر اليوم</b><small>تشغيل محلك خطوة بخطوة</small></span></div>
                <div className="ledger-ribbon__date"><CalendarDays size={16} /><span>سجل اليوم</span><b>{new Intl.DateTimeFormat("ar-LY", { day: "2-digit", month: "short" }).format(new Date())}</b></div>
                <div className="ledger-ribbon__status"><i /><span>{store.products.length ? "المحل جاهز للبيع" : "أضف أول صنف"}</span><small>{store.products.length ? "المبيعات محفوظة محليًا" : "لا توجد بيانات تجريبية"}</small></div>
              </div>
              <div className="dashboard-greeting" style={{ backgroundImage: `linear-gradient(90deg, rgba(247,241,229,.98) 37%, rgba(247,241,229,.72) 67%, rgba(247,241,229,.34)), url(${receiptPatternUrl})` }}>
                <div className="greeting-copy">
                  <span className="eyebrow"><CalendarDays size={15} /> {new Intl.DateTimeFormat("ar-LY", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
                  <h2>{store.products.length ? <>يوم منظم يبدأ من <em>محلك.</em></> : <>ابدأ ببيانات <em>محلك الحقيقية.</em></>}</h2>
                  <p>{store.products.length ? "تابع مبيعاتك ومخزونك وذممك من شاشة واحدة، حتى عندما ينقطع الإنترنت." : "لا توجد أي أصناف أو فواتير تجريبية هنا. أضف أول صنف من مخزونك الفعلي لتبدأ التشغيل."}</p>
                  <button className="action-button action-button--primary" onClick={store.products.length ? openSale : () => openProductForm()}>{store.products.length ? <ShoppingBag size={18} /> : <PackagePlus size={18} />}{store.products.length ? "تسجيل بيع" : "إضافة أول صنف"}</button>
                </div>
                <div className="greeting-stamp"><span>سوقنا</span><small>محلك في يدك</small></div>
              </div>

              <div className="stat-grid">
                <StatCard label="مبيعات اليوم" value={money(salesTodayTotal)} detail={`${todaySales.length} فاتورة مسجلة`} icon={CircleDollarSign} tone="olive" />
                <StatCard label="ربح اليوم" value={money(profitToday)} detail="بعد تكلفة الأصناف" icon={TrendingUp} tone="blue" />
                <StatCard label="صافي تشغيل اليوم" value={money(todayCashSummary.netOperatingProfit)} detail={`${todayExpenses.length} مصروفات مسجلة`} icon={WalletCards} tone="apricot" />
                <StatCard label="ذمم مستحقة" value={money(totalOutstanding)} detail={`${store.debts.filter((debt) => debt.amount > debt.paid).length} زبون بانتظار السداد`} icon={WalletCards} tone="apricot" />
                <StatCard label="تنبيهات المخزون" value={`${lowStock.length} أصناف`} detail={lowStock.length ? "تحتاج متابعة الآن" : "المخزون في وضع جيد"} icon={BellRing} tone="sand" />
              </div>

              <section className="panel weekly-report-strip"><div><span className="section-kicker">هدف مبيعات اليوم</span><h3>{dailyGoalProgress.active ? (dailyGoalProgress.met ? "تم تحقيق الهدف" : `${dailyGoalProgress.achievement.toFixed(0)}% من الهدف`) : "ضع هدفًا واضحًا لليوم"}</h3><p>{dailyGoalProgress.active ? `المبيعات ${money(dailyGoalProgress.revenue)} من هدف ${money(dailyGoalProgress.target)} · المتبقي ${money(dailyGoalProgress.remaining)}.` : "حدد رقمًا اختياريًا لتتابع تقدم المبيعات خلال اليوم على هذا الجهاز."}</p></div><div className="inventory-page__actions">{dailyGoalProgress.active && <span className={`status-badge ${dailyGoalProgress.met ? "" : "status-badge--warning"}`}>{dailyGoalProgress.met ? "متحقق" : `${dailyGoalProgress.achievement.toFixed(0)}%`}</span>}<button className="action-button action-button--secondary" onClick={() => setShowDailyGoalForm(true)}><TrendingUp size={17} /> {dailyGoalProgress.active ? "تعديل الهدف" : "ضبط الهدف"}</button></div></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">هدف مبيعات الشهر</span><h3>{monthlyGoalProgress.active ? (monthlyGoalProgress.met ? "تم تحقيق هدف الشهر" : `${monthlyGoalProgress.achievement.toFixed(0)}% من هدف الشهر`) : "ضع هدفًا للشهر"}</h3><p>{monthlyGoalProgress.active ? `مبيعات الشهر ${money(monthlyGoalProgress.revenue)} من هدف ${money(monthlyGoalProgress.target)} · المتبقي ${money(monthlyGoalProgress.remaining)}.` : "ضع هدفًا شهريًا اختياريًا لمتابعة نمو المحل من لوحة اليوم."}</p></div><div className="inventory-page__actions">{monthlyGoalProgress.active && <span className={`status-badge ${monthlyGoalProgress.met ? "" : "status-badge--warning"}`}>{monthlyGoalProgress.met ? "متحقق" : `${monthlyGoalProgress.achievement.toFixed(0)}%`}</span>}<button className="action-button action-button--secondary" onClick={() => setShowMonthlyGoalForm(true)}><CalendarDays size={17} /> {monthlyGoalProgress.active ? "تعديل الهدف" : "ضبط الهدف"}</button></div></section>

              <section className="panel dashboard-return-summary"><div className="panel-heading"><div><span className="section-kicker">ملخص الإرجاع</span><h3>مرتجعات اليوم حسب السبب</h3></div><button className="text-button" onClick={() => setActivePage("reports")}>التفاصيل <ChevronLeft size={16} /></button></div>{dailyReturnReasonSummary.length ? <><div className="report-stats"><StatCard label="قيمة المرتجعات" value={money(dailyReturnTotal)} detail={`${todayReturns.length} إيصالات`} icon={Undo2} tone="apricot" /><StatCard label="الوحدات المرتجعة" value={`${dailyReturnUnits}`} detail="تعود إلى المخزون عند الاعتماد" icon={PackagePlus} tone="sand" /></div><div className="return-reason-bars">{dailyReturnReasonSummary.slice(0, 5).map((entry) => <div className="return-reason-bar" key={`daily-return-${entry.reason}`}><div><strong>{entry.reason}</strong><span>{entry.receipts} إيصالات · {entry.units} وحدات</span></div><b dir="ltr">{money(entry.value)}</b></div>)}</div></> : <EmptyState icon={Undo2} title="لا توجد مرتجعات اليوم" description="ستظهر هنا قيمة المرتجعات وتصنيف أسبابها بعد اعتماد أول عملية إرجاع." action={<button className="text-button text-button--strong" onClick={() => setActivePage("returns")}>فتح شاشة الإرجاع <ArrowLeft size={16} /></button>} />}</section>

              <section className="panel dashboard-current-staff"><div className="panel-heading"><div><span className="section-kicker">موظف الوردية · اليوم</span><h3>{currentStaffMember ? `ملخص ${currentStaffMember.name}` : "ملخص الموظف الحالي"}</h3></div><button className="text-button" onClick={() => setActivePage("settings")}>تغيير الموظف <ChevronLeft size={16} /></button></div>{currentStaffMember ? <div className="report-stats"><StatCard label="مبيعات اليوم" value={money(currentStaffTodaySummary.salesValue)} detail={`${currentStaffTodaySummary.salesInvoices} فواتير`} icon={ShoppingBag} tone="olive" /><StatCard label="مرتجعات اليوم" value={money(currentStaffTodaySummary.returnValue)} detail={`${currentStaffTodaySummary.returnInvoices} إيصالات · ${currentStaffTodaySummary.returnUnits} وحدات`} icon={Undo2} tone="apricot" /><StatCard label="الصافي" value={money(currentStaffTodaySummary.salesValue - currentStaffTodaySummary.returnValue)} detail="مبيعات ناقص مرتجعات" icon={TrendingUp} tone="blue" /></div> : <EmptyState icon={UserRound} title="اختر الموظف الحالي" description="يُستخدم الموظف المحفوظ لإظهار أداء ورديتك اليومية هنا." action={<button className="text-button text-button--strong" onClick={() => setActivePage("settings")}>فتح إعدادات الموظفين <ArrowLeft size={16} /></button>} />}</section>

              <section className="panel dashboard-staff-performance"><div className="panel-heading"><div><span className="section-kicker">أداء الموظفين · {currentMonthKey}</span><h3>المبيعات والمرتجعات حسب الموظف</h3></div><button className="text-button" onClick={() => setActivePage("reports")}>التفاصيل <ChevronLeft size={16} /></button></div>{staffPerformanceReport.length ? <div className="staff-performance-list">{staffPerformanceReport.map((entry) => <div className="staff-performance-row" key={`dashboard-staff-performance-${entry.staffMemberId}`}><div className="staff-performance-row__name"><strong>{entry.staffMemberName}</strong><small>{entry.salesInvoices} مبيعات · {entry.returnInvoices} مرتجعات · {entry.returnUnits} وحدات مرتجعة</small></div><div><span>المبيعات</span><b dir="ltr">{money(entry.salesValue)}</b></div><div><span>المرتجعات</span><b dir="ltr">{money(entry.returnValue)}</b></div><div className="staff-performance-row__net"><span>الصافي</span><b dir="ltr">{money(entry.netValue)}</b></div></div>)}</div> : <EmptyState icon={UserRound} title="لا توجد حركات مرتبطة بموظفين" description="ستظهر المبيعات والمرتجعات هنا بعد اختيار الموظف عند الاعتماد." />}</section>

              <div className="dashboard-columns">
                <section className="panel panel--sales-flow"><div className="panel-heading"><div><span className="section-kicker">صندوق اليوم</span><h3>{todayCashClosing ? "إغلاق الوردية معتمد" : "أغلق ورديتك بدقة"}</h3></div><button className="text-button" onClick={() => setActivePage("reports")}>إدارة الصندوق <ChevronLeft size={16} /></button></div><div className="financial-stack"><div><span>نقد متوقع</span><b dir="ltr">{money(todayCashSummary.expectedCash)}</b></div><div><span>مصروفات اليوم</span><b dir="ltr">{money(todayCashSummary.expenses)}</b></div><div className="financial-stack__profit"><span>{todayCashClosing ? "فارق الإغلاق" : "صافي تشغيل اليوم"}</span><b dir="ltr">{money(todayCashClosing ? Math.abs(todayCashSummary.variance ?? 0) : todayCashSummary.netOperatingProfit)}</b></div></div></section>
                <section className="panel panel--sales-flow">
                  <div className="panel-heading"><div><span className="section-kicker">سجل اليوم</span><h3>آخر الحركات</h3></div><button className="text-button" onClick={() => setActivePage("reports")}>كل التقارير <ChevronLeft size={16} /></button></div>
                  {todaySales.length ? (
                    <div className="activity-list">
                      {todaySales.slice(0, 5).map((sale) => <div className="activity-row" key={sale.id}><span className="activity-icon"><ReceiptText size={18} /></span><div><strong>فاتورة #{sale.id.slice(-5)}</strong><small>{formatDate(sale.createdAt)} · {sale.items.length} أصناف</small></div><b dir="ltr">{money(sale.total)}</b><button className="mini-icon" onClick={() => void downloadReceiptPdf(sale)} aria-label="تنزيل الفاتورة PDF"><Download size={16} /></button><button className="mini-icon" onClick={() => printReceipt(sale)} aria-label="طباعة الفاتورة"><Printer size={16} /></button></div>)}
                    </div>
                  ) : <EmptyState icon={ReceiptText} title="لا توجد مبيعات مسجلة اليوم" description="ابدأ أول بيعة، وسيتولى سوقنا حساب الإجمالي والربح." action={<button className="text-button text-button--strong" onClick={() => setActivePage("sale")}>فتح شاشة البيع <ArrowLeft size={16} /></button>} />}
                </section>

                <section className="panel panel--low-stock">
                  <div className="panel-heading"><div><span className="section-kicker">المخزون</span><h3>محتاج متابعة</h3></div><button className="text-button" onClick={() => setActivePage("inventory")}>عرض المخزون <ChevronLeft size={16} /></button></div>
                  {dailyReturnReasonSummary.length > 0 && <div className="return-daily-summary"><div className="return-daily-summary__headline"><span><strong>مرتجعات اليوم</strong><small>{todayReturns.length} إيصالات · {dailyReturnUnits} وحدات</small></span><b dir="ltr">{money(dailyReturnTotal)}</b></div><div className="return-daily-summary__reasons">{dailyReturnReasonSummary.slice(0, 4).map((entry) => <div key={`dashboard-return-reason-${entry.reason}`}><span>{entry.reason}</span><b>{entry.receipts} إيصالات · {entry.units} وحدات</b></div>)}</div></div>}
                  {lowStock.length ? <div className="stock-alerts">{lowStock.map((product) => <div className="stock-alert" key={product.id}><div><strong>{product.name}</strong><small>الحد الأدنى: {product.lowStockAt} وحدات</small></div><b>{product.quantity}</b><span>وحدات</span></div>)}</div> : <EmptyState icon={store.products.length ? Check : Archive} title={store.products.length ? "كل الأصناف مطمئنة" : "لا يوجد مخزون بعد"} description={store.products.length ? "لا توجد أصناف تجاوزت حد إعادة الطلب." : "أضف أصناف مخزون محلك الفعلية، وستظهر التنبيهات هنا تلقائيًا."} action={!store.products.length ? <button className="text-button text-button--strong" onClick={() => openProductForm()}>إضافة أول صنف <ArrowLeft size={16} /></button> : undefined} />}
                </section>
              </div>
            </section>
          )}

	          {page === "sale" && (
            <section className={`sales-page sales-workbench cashier-font-${cashierSettings.fontScale} cashier-cart-width-${cashierSettings.cartWidth} cashier-cart-image-${cashierSettings.cartImageScale} ${saleFocusMode ? "sales-workbench--focus" : ""}`}>
              <header className="sales-workbench__header">
                <div className="sales-workbench__brand">
                  <span className="sales-workbench__eyebrow"><ShoppingBag size={15} /> نقطة البيع</span>
                  <h2>فاتورة بيع جديدة</h2>
                  <span className="sales-workbench__status"><i /> يعمل محليًا · لا يحتاج إنترنت</span>
                </div>
                <div className="sales-workbench__header-actions">
	                  <button type="button" className="sales-header-button sales-header-button--scan" onClick={() => setShowBarcodeScanner(true)}><Camera size={17} /> مسح باركود <kbd>F2</kbd></button>
	                  <button type="button" className="sales-header-button sales-header-button--suspend" disabled={!cart.length} onClick={suspendCurrentSale}><Archive size={17} /> تعليق السلة <kbd>F5</kbd></button>
                  <button type="button" className="sales-header-button" onClick={() => setActivePage("returns")}><Undo2 size={16} /> الترجيع <kbd>F7</kbd></button>
                  <button type="button" className="sales-header-button" onClick={() => setIsCashierFullscreen((current) => !current)}><LayoutDashboard size={16} /> {isCashierFullscreen ? "خروج" : "شاشة كاملة"}</button>
                  <div className="sales-workbench__clock"><b dir="ltr">{new Date().toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" })}</b><small>{new Date().toLocaleDateString("ar-LY")}</small></div>
                </div>
              </header>

              {trainingMode && <div className="sales-training-banner" role="status" aria-live="polite"><ShieldCheck size={18} /><span><strong>{TRAINING_MODE_LABEL} مفعّل</strong><small>{getTrainingModeMessage(true)}</small></span><button type="button" onClick={stopTrainingMode}>إنهاء التدريب</button></div>}

              <section className="sales-invoice-meta" aria-label="بيانات الفاتورة">
                <div className="sales-meta-card sales-meta-card--invoice"><span>الفاتورة الحالية</span><strong dir="ltr">#{String(store.sales.length + 1).padStart(6, "0")}</strong><small>{cart.length ? "مسودة قيد التجهيز" : "جاهزة لإضافة الأصناف"}</small></div>
                <label className="sales-meta-field"><span>الكاشير المسؤول *</span><select required value={selectedStaffMemberId} onChange={(event) => { const id = event.target.value; setSelectedStaffMemberId(id); setReturnStaffMemberId(id); rememberStaffMemberId(id); }}><option value="">اختر الموظف</option>{store.localStaff.map((member) => <option key={`sales-staff-${member.id}`} value={member.id}>{member.name}</option>)}</select></label>
                <div className="sales-meta-card"><span>عدد الوحدات</span><strong dir="ltr">{cart.reduce((count, item) => count + item.cartQuantity, 0)}</strong><small>في السلة الآن</small></div>
                <div className="sales-meta-card sales-meta-card--total"><span>صافي الفاتورة</span><strong dir="ltr">{money(cartTotal)}</strong><small>{cart.length ? "بعد الخصم" : "—"}</small></div>
              </section>

              <section className="sales-command-bar" aria-label="أوامر البيع">
                <label className="sales-search-box"><Search size={19} /><input ref={saleSearchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم الصنف أو امسح الباركود..." aria-label="بحث عن صنف" /><kbd>F1</kbd></label>
                <button type="button" className="sales-command-button sales-command-button--scan" onClick={() => setShowBarcodeScanner(true)}><Camera size={18} /> مسح باركود <kbd>Alt+B</kbd></button>
                <button type="button" className="sales-command-button" onClick={openPriceLookup}><Search size={17} /> استعلام السعر</button>
                <button type="button" className="sales-command-button" onClick={() => openProductForm()}><PackagePlus size={17} /> صنف جديد</button>
                <button type="button" className={`sales-command-button ${saleFocusMode ? "is-active" : ""}`} onClick={() => setSaleFocusMode((current) => !current)}><LayoutDashboard size={17} /> {saleFocusMode ? "إظهار الحساب" : "تركيز السلة"}</button>
                {saleCategories.length > 0 && <div className="sales-category-strip" aria-label="تصفية حسب الفئة"><button type="button" className={!saleCategoryFilter ? "is-active" : ""} onClick={() => setSaleCategoryFilter("")}>كل الأصناف</button>{saleCategories.slice(0, 7).map((category) => <button type="button" key={`sale-category-${category}`} className={saleCategoryFilter === category ? "is-active" : ""} onClick={() => setSaleCategoryFilter(category)}>{category}</button>)}</div>}
              </section>

              {query.trim() && <section className="sales-search-results" aria-label="نتائج البحث"><div><strong>نتائج البحث</strong><small>{filteredSaleProducts.length ? `اضغط لإضافة الصنف · ${filteredSaleProducts.length} نتيجة` : "لا يوجد صنف مطابق"}</small></div><div>{filteredSaleProducts.slice(0, 8).map((product) => <button type="button" key={`sales-search-${product.id}`} onClick={() => { addToCart(product); setQuery(""); saleSearchInputRef.current?.focus(); }}><span>{product.name}</span><small dir="ltr">{product.sku || product.barcodeAliases?.[0] || "بدون باركود"}</small><b dir="ltr">{money(product.salePrice)}</b></button>)}</div></section>}

              <div className="sales-workbench__main">
	                <section className="sales-products-panel panel" aria-label="جميع المنتجات المنزلّة">
	                  <div className="sales-panel-heading sales-products-heading"><div><h3>جميع المنتجات المنزلّة</h3><small>اضغط على المنتج لإضافته إلى الفاتورة، أو استخدم قارئ الباركود.</small></div><div className="sales-panel-heading__actions"><span className="sales-count-badge">{filteredSaleProducts.length} منتج</span>{favoriteSaleProducts.length > 0 && <span className="sales-favorite-note"><Star size={14} fill="currentColor" /> {favoriteSaleProducts.length} مفضلة</span>}</div></div>
                  {favoriteSaleProducts.length > 0 && <div className="sales-favorites-row" aria-label="الأصناف المفضلة">{favoriteSaleProducts.slice(0, 6).map((product) => <button type="button" key={`sale-favorite-${product.id}`} onClick={() => addToCart(product)}><Star size={13} fill="currentColor" /><span>{product.name}</span><b dir="ltr">{money(product.salePrice)}</b></button>)}</div>}
                  <div className="sales-product-grid">{filteredSaleProducts.map((product) => <div className="sales-product-card-wrap" key={product.id}><button type="button" className="sales-product-card" onClick={() => addToCart(product)}>{product.imageDataUrl ? <img src={product.imageDataUrl} alt="" /> : <span className="sales-product-card__placeholder"><Box size={22} /></span>}<span className="sales-product-card__category">{product.category || "عام"}</span><strong>{product.name}</strong><div><b dir="ltr">{money(product.salePrice)}</b><small>{product.quantity} متوفر</small></div><i className={product.quantity <= product.lowStockAt ? "is-low" : ""} /></button><button type="button" className="sales-product-card__favorite" onClick={() => toggleFavoriteProduct(product.id)} aria-label={store.favoriteProductIds.includes(product.id) ? `إزالة ${product.name} من المفضلة` : `إضافة ${product.name} إلى المفضلة`}><Star size={14} fill={store.favoriteProductIds.includes(product.id) ? "currentColor" : "none"} /></button></div>)}</div>
                  {!filteredSaleProducts.length && <EmptyState icon={Box} title={store.products.length ? "لا توجد أصناف مطابقة" : "لم تضف أصنافًا بعد"} description={store.products.length ? "غيّر عبارة البحث أو الفئة ثم حاول من جديد." : "أضف أول صنف من زر «صنف جديد» لتبدأ البيع الفعلي."} action={!store.products.length ? <button type="button" className="action-button action-button--primary" onClick={() => openProductForm()}><Plus size={16} /> إضافة أول صنف</button> : undefined} />}
                </section>

                <aside className="sales-cart-panel panel" aria-label="سلة البيع">
                  <div className="sales-cart-panel__heading"><div><span className="sales-section-kicker">تفاصيل الفاتورة</span><h3>السلة الحالية</h3></div><div className="sales-cart-heading-actions">{store.suspendedSaleDrafts.length > 0 && <button type="button" className="sales-suspended-toggle" onClick={() => setShowSuspendedSales((current) => !current)}>{showSuspendedSales ? "إخفاء المعلقة" : `السلال المعلقة (${store.suspendedSaleDrafts.length})`}</button>}<span className={`sales-cart-count ${cart.length ? "has-items" : ""}`}>{cart.reduce((count, item) => count + item.cartQuantity, 0)}</span></div></div>
                  {cartBarcodeFeedback && <div className={`sales-feedback sales-feedback--${cartBarcodeFeedback.kind}`} role="status" aria-live={cartBarcodeFeedback.kind === "error" ? "assertive" : "polite"}><span>{cartBarcodeFeedback.kind === "success" ? "✓" : "!"}</span><div><strong>{cartBarcodeFeedback.productName || "تنبيه المسح"}</strong><small>{cartBarcodeFeedback.message}</small></div></div>}
                  {cart.length ? <div className="sales-cart-items">{cart.map((item, index) => <div className="sales-cart-row" key={item.id}><span className="sales-cart-row__index">{index + 1}</span><span className="sales-cart-row__media">{item.imageDataUrl ? <img src={item.imageDataUrl} alt="" /> : <Box size={22} />}</span><div className="sales-cart-row__info"><strong>{item.name}</strong><small dir="ltr">{money(item.salePrice)} للوحدة</small><div className="sales-cart-row__meta">{cashierSettings.showCartCode && <span dir="ltr">{item.sku || item.barcodeAliases?.[0] || "—"}</span>}{cashierSettings.showCartStock && <span className={item.quantity <= item.lowStockAt ? "is-low" : ""}>المخزون: {item.quantity}</span>}</div></div><div className="sales-quantity-control"><button type="button" onClick={() => changeCartQuantity(item.id, -1)} aria-label={`تقليل ${item.name}`}><Minus size={13} /></button><b>{item.cartQuantity}</b><button type="button" onClick={() => changeCartQuantity(item.id, 1)} aria-label={`زيادة ${item.name}`}><Plus size={13} /></button></div><strong className="sales-cart-row__total" dir="ltr">{money(item.salePrice * item.cartQuantity)}</strong><button type="button" className="sales-remove-button" title={`إزالة ${item.name}`} onClick={() => setCart((current) => current.filter((cartItem) => cartItem.id !== item.id))} aria-label={`إزالة ${item.name}`}><Trash2 size={15} /></button></div>)}</div> : <div className="sales-cart-empty"><ShoppingBag size={32} /><strong>السلة فارغة</strong><span>ابحث عن الصنف أو امسح الباركود لإضافته إلى الفاتورة.</span></div>}
                  {showSuspendedSales && store.suspendedSaleDrafts.length > 0 && <div className="sales-suspended-list"><div><span>السلال المعلقة</span><small>استئناف دون تعديل المخزون</small></div>{store.suspendedSaleDrafts.slice(0, 3).map((draft) => <div className="sales-suspended-row" key={draft.id}><span><strong>{draft.label}</strong><small>{draft.items.reduce((count, item) => count + item.quantity, 0)} وحدات · {formatDate(draft.createdAt)}</small></span><button type="button" onClick={() => resumeSuspendedSale(draft)} aria-label={`استئناف ${draft.label}`}><ShoppingBag size={14} /></button><button type="button" onClick={() => deleteSuspendedSale(draft)} aria-label={`حذف ${draft.label}`}><Trash2 size={14} /></button></div>)}</div>}
                  <div className="sales-cart-total"><span>صافي الفاتورة</span><strong dir="ltr">{money(cartTotal)}</strong></div>
                </aside>
              </div>

              <section className="sales-checkout-area" aria-label="منطقة إتمام البيع">
                <section className="sales-summary-card panel"><div className="sales-checkout-heading"><div><span className="sales-section-kicker">المراجعة</span><h3>ملخص الحساب</h3></div><ReceiptText size={20} /></div><div className="sales-summary-lines"><div><span>مجموع الأصناف</span><b dir="ltr">{money(cartSubtotal)}</b></div><div><span>خصم عروض الكمية</span><b dir="ltr">-{money(quantityOfferSummary.discountAmount)}</b></div><div><span>خصم الفاتورة</span><b dir="ltr">-{money(manualCartDiscountAmount)}</b></div><div className="is-total"><span>الصافي المطلوب</span><strong dir="ltr">{money(cartTotal)}</strong></div><div><span>المتوقع تحصيله</span><b dir="ltr">{money(mixedPaymentEnabled ? paymentSplitTotal : cartTotal)}</b></div></div><div className="sales-profit-note"><TrendingUp size={15} /> ربح متوقع: <b dir="ltr">{money(cartProfit)}</b></div></section>

                <section className="sales-payment-card panel"><div className="sales-checkout-heading"><div><span className="sales-section-kicker">التسوية</span><h3>طريقة الدفع</h3></div><CreditCard size={20} /></div><div className="sales-payment-options"><button type="button" className={paymentMethod === "cash" && !mixedPaymentEnabled ? "is-selected" : ""} onClick={() => { setMixedPaymentEnabled(false); setPaymentMethod("cash"); }}><CircleDollarSign size={16} /> نقدًا</button><button type="button" className={paymentMethod === "card" && !mixedPaymentEnabled ? "is-selected" : ""} onClick={() => { setMixedPaymentEnabled(false); setPaymentMethod("card"); }}><CreditCard size={16} /> بطاقة</button><button type="button" className={paymentMethod === "transfer" && !mixedPaymentEnabled ? "is-selected" : ""} onClick={() => { setMixedPaymentEnabled(false); setPaymentMethod("transfer"); }}><ArrowLeftRight size={16} /> تحويل</button><button type="button" className={paymentMethod === "credit" && !mixedPaymentEnabled ? "is-selected" : ""} onClick={() => { setMixedPaymentEnabled(false); setPaymentMethod("credit"); }}><UserRound size={16} /> آجل</button><button type="button" className={mixedPaymentEnabled ? "is-selected" : ""} onClick={() => setMixedPaymentEnabled(true)}><ArrowLeftRight size={16} /> مختلط</button></div>{mixedPaymentEnabled && <div className="sales-mixed-payment"><div className="sales-mixed-grid">{(["cash", "card", "transfer", "credit"] as PaymentMethod[]).map((method) => <label key={`split-${method}`}><span>{getPaymentMethodLabel(method)}</span><input type="number" min="0" step="0.01" inputMode="decimal" value={paymentSplitAmounts[method]} onChange={(event) => setPaymentSplitAmounts((current) => ({ ...current, [method]: event.target.value }))} placeholder="0.00" /></label>)}</div><div className={`sales-payment-balance ${Math.abs(paymentSplitRemaining) < 0.01 ? "is-complete" : ""}`}><span>المجموع <b dir="ltr">{money(paymentSplitTotal)}</b></span><strong>{Math.abs(paymentSplitRemaining) < 0.01 ? "اكتمل المبلغ" : paymentSplitRemaining > 0 ? `المتبقي ${money(paymentSplitRemaining)}` : `زيادة ${money(Math.abs(paymentSplitRemaining))}`}</strong></div><label className="sales-inline-field"><span>البنك / جهاز الدفع (اختياري)</span><input value={mixedBankName} onChange={(event) => setMixedBankName(event.target.value)} placeholder="مثال: مصرف الجمهورية · POS-01" /></label></div>}{!mixedPaymentEnabled && (paymentMethod === "card" || paymentMethod === "transfer") && <div className="sales-payment-extra"><label><span>{paymentMethod === "card" ? "اسم البنك" : "البنك المحوَّل إليه"}</span><input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="اختياري" /></label><label><span>جهاز نقاط البيع</span><input value={posTerminalType} onChange={(event) => setPosTerminalType(event.target.value)} placeholder="اختياري" /></label></div>}</section>

                <section className="sales-details-card panel"><div className="sales-checkout-heading"><div><span className="sales-section-kicker">بيانات اختيارية</span><h3>الزبون والفاتورة</h3></div><UserRound size={20} /></div><div className="sales-details-grid"><label><span>اسم الزبون</span><input list="sales-customers" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="اختياري" /></label><label><span>هاتف الزبون</span><input value={customerPhone} inputMode="tel" onChange={(event) => setCustomerPhone(event.target.value)} placeholder="اختياري" /></label><label><span>خصم الفاتورة %</span><input value={saleDiscountPercent} inputMode="decimal" type="number" min="0" max="100" step="0.5" onChange={(event) => setSaleDiscountPercent(event.target.value)} /></label><label><span>مركز التكلفة / المرجع</span><input value={saleCostCenter} onChange={(event) => setSaleCostCenter(event.target.value)} placeholder="اختياري" /></label><label className="sales-details-grid__wide"><span>ملاحظة</span><input value={saleNote} maxLength={240} onChange={(event) => setSaleNote(event.target.value)} placeholder="ملاحظة للفاتورة أو للزبون" /></label></div>{(paymentMethod === "credit" || (mixedPaymentEnabled && Number(paymentSplitAmounts.credit) > 0)) && <div className={`sales-credit-note ${customerCreditStatus.blocked ? "is-blocked" : ""}`}><UserRound size={15} /><span>{customerCreditStatus.limit !== null ? `سقف الائتمان ${money(customerCreditStatus.limit)} · المتوقع ${money(customerCreditStatus.projected)}` : "أدخل اسم الزبون لحساب الذمة"}{customerCreditStatus.blocked ? " · تجاوز السقف" : ""}</span></div>}<datalist id="sales-customers">{recurringCustomers.map((customer) => <option key={customer.name} value={customer.name} />)}</datalist></section>
              </section>

              <footer className="sales-action-strip"><button type="button" onClick={() => setActivePage("dashboard")}><ArrowLeft size={16} /> خروج</button><button type="button" onClick={() => window.print()}><Printer size={16} /> طباعة</button><button type="button" disabled={!cart.length} onClick={suspendCurrentSale}><Archive size={16} /> تعليق</button><button type="button" onClick={openSale}><FileText size={16} /> فاتورة جديدة <kbd>F3</kbd></button><button type="button" className="sales-action-strip__save" disabled={!cart.length || !selectedStaffMemberId} onClick={completeSale}><Check size={18} /> حفظ البيع <kbd>F4</kbd></button></footer>
              {latestSale && <div className="sales-success-banner"><Check size={18} /><span>تم حفظ الفاتورة بقيمة <b dir="ltr">{money(latestSale.total)}</b></span><button type="button" onClick={() => setPreviewSale(latestSale)}><ReceiptText size={15} /> معاينة</button><button type="button" onClick={() => printReceipt(latestSale)}><Printer size={15} /> طباعة</button><button type="button" onClick={() => setLatestSale(null)} aria-label="إخفاء إشعار الحفظ"><X size={16} /></button></div>}
            </section>
          )}

          {page === "returns" && (
            <section className={`sales-page returns-workbench cashier-font-${cashierSettings.fontScale}`}>
              <header className="sales-workbench__header returns-workbench__header">
                <div className="sales-workbench__brand"><span className="sales-workbench__eyebrow"><Undo2 size={15} /> إدارة المرتجعات</span><h2>ترجيع بيع</h2><span className="sales-workbench__status sales-workbench__status--return"><i /> يُعاد للمخزون بعد الاعتماد</span></div>
                <div className="sales-workbench__header-actions"><button type="button" className="sales-header-button" onClick={() => setActivePage("sale")}><ShoppingBag size={16} /> العودة للبيع <kbd>F1</kbd></button><button type="button" className="sales-header-button" onClick={() => setIsCashierFullscreen((current) => !current)}><LayoutDashboard size={16} /> {isCashierFullscreen ? "خروج" : "شاشة كاملة"}</button><div className="sales-workbench__clock"><b dir="ltr">{new Date().toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" })}</b><small>{new Date().toLocaleDateString("ar-LY")}</small></div></div>
              </header>
              <section className="returns-mode-bar"><div className="returns-mode-tabs"><button type="button" className={!directReturnMode ? "is-active" : ""} onClick={() => { setDirectReturnMode(false); setReturnScreenSale(null); setReturnQuantities({}); }}><ReceiptText size={16} /> من فاتورة بيع</button><button type="button" className={directReturnMode ? "is-active" : ""} onClick={() => { setDirectReturnMode(true); setDirectReturnQuery(""); setDirectReturnQuantities({}); setDirectReturnReason(""); }}><PackagePlus size={16} /> من كل الأصناف</button></div><div className="returns-mode-help"><span>الخطوة {directReturnMode ? "2" : returnScreenSale ? "2" : "1"} من 3</span><small>{directReturnMode ? "اختر الصنف والكمية" : returnScreenSale ? "حدد ما سيُعاد" : "ابحث عن الفاتورة"}</small></div></section>
              {returnStockFeedback && <div className="sales-feedback sales-feedback--success returns-feedback" role="status" aria-live="polite"><CheckCircle2 size={18} /><div><strong>تم تحديث المخزون</strong><span>{returnStockFeedback.map((entry) => `«${entry.productName}»: ${entry.quantity} وحدة`).join(" · ")}</span></div><button type="button" onClick={() => setReturnStockFeedback(null)} aria-label="إغلاق إشعار المخزون"><X size={16} /></button></div>}

              {directReturnMode ? <div className="returns-workspace"><section className="returns-products-panel panel"><div className="sales-panel-heading"><div><span className="sales-section-kicker">إرجاع مباشر</span><h3>كل الأصناف المنزلّة</h3><small>ابحث عن صنف وأدخل الكمية المطلوب إرجاعها.</small></div><button type="button" className="sales-command-button sales-command-button--scan" onClick={() => setShowDirectReturnBarcodeScanner(true)}><Camera size={16} /> مسح باركود</button></div><label className="returns-search-box"><Search size={18} /><input value={directReturnQuery} onChange={(event) => setDirectReturnQuery(event.target.value)} placeholder="ابحث باسم الصنف أو الباركود..." /></label><div className="returns-product-grid">{filteredDirectReturnProducts.map((product) => { const quantity = Math.floor(Number(directReturnQuantities[product.id]) || 0); return <div className="returns-product-card" key={`direct-return-${product.id}`}>{product.imageDataUrl ? <img src={product.imageDataUrl} alt="" /> : <Box size={22} />}<span>{product.category || "عام"} · المخزون {product.quantity}</span><strong>{product.name}</strong><b dir="ltr">{money(product.salePrice)}</b><label><span>الكمية</span><input type="number" min="0" step="1" inputMode="numeric" value={directReturnQuantities[product.id] ?? "0"} onChange={(event) => setDirectReturnQuantities((current) => ({ ...current, [product.id]: event.target.value.replace(/[^0-9]/g, "").slice(0, 6) }))} /></label><button type="button" onClick={() => setDirectReturnQuantities((current) => ({ ...current, [product.id]: String(quantity + 1) }))}><Plus size={14} /> أضف للسلة</button></div>})}</div>{!filteredDirectReturnProducts.length && <EmptyState icon={Undo2} title="لا يوجد صنف مطابق" description="ابحث بالاسم أو امسح باركود الصنف." />}</section><aside className="returns-cart-panel panel"><div className="sales-cart-panel__heading"><div><span className="sales-section-kicker">تسوية الإرجاع</span><h3>سلة الإرجاع</h3></div><span className="sales-cart-count has-items">{directReturnItems.reduce((total, item) => total + item.quantity, 0)}</span></div><div className="returns-cart-list">{directReturnItems.length ? directReturnItems.map((item) => <div className="returns-cart-row" key={`direct-cart-${item.productId}`}><div><strong>{item.name}</strong><small dir="ltr">{money(item.price)} للوحدة</small></div><div className="sales-quantity-control"><button type="button" onClick={() => setDirectReturnQuantities((current) => ({ ...current, [item.productId]: String(Math.max(0, item.quantity - 1)) }))}><Minus size={13} /></button><b>{item.quantity}</b><button type="button" onClick={() => setDirectReturnQuantities((current) => ({ ...current, [item.productId]: String(item.quantity + 1) }))}><Plus size={13} /></button></div><strong dir="ltr">{money(item.price * item.quantity)}</strong><button type="button" className="sales-remove-button" onClick={() => setDirectReturnQuantities((current) => ({ ...current, [item.productId]: "0" }))}><Trash2 size={15} /></button></div>) : <div className="sales-cart-empty"><Undo2 size={30} /><strong>لا توجد أصناف للإرجاع</strong><span>اختر صنفًا وأدخل الكمية.</span></div>}</div><div className="returns-fields"><label><span>الموظف المسؤول *</span><select required value={returnStaffMemberId} onChange={(event) => { const id = event.target.value; setReturnStaffMemberId(id); setSelectedStaffMemberId(id); rememberStaffMemberId(id); }}><option value="">اختر الموظف</option>{store.localStaff.map((member) => <option key={`return-direct-staff-${member.id}`} value={member.id}>{member.name}</option>)}</select></label><label><span>سبب الإرجاع *</span><input value={directReturnReason} onChange={(event) => setDirectReturnReason(event.target.value)} placeholder="مثال: إرجاع الزبون" /></label><label><span>طريقة التسوية</span><select value={directReturnPaymentMethod} onChange={(event) => setDirectReturnPaymentMethod(event.target.value as PaymentMethod)}><option value="cash">نقدًا</option><option value="card">بطاقة مصرفية</option><option value="transfer">تحويل مصرفي</option><option value="credit">آجل / ذمة</option></select></label></div><div className="returns-total"><span>إجمالي الإرجاع</span><strong dir="ltr">{money(directReturnTotal)}</strong></div><button type="button" className="returns-confirm-button" disabled={!directReturnItems.length || !selectedReturnStaffMember} onClick={commitDirectReturn}><Undo2 size={18} /> اعتماد الإرجاع</button></aside></div>
              : !returnScreenSale ? <section className="returns-invoice-picker panel"><div className="sales-panel-heading"><div><span className="sales-section-kicker">الخطوة 1</span><h3>اختر الفاتورة</h3><small>لا تظهر الفواتير التي أُعيدت بالكامل.</small></div><span className="sales-count-badge">{filteredReturnableSales.length} فاتورة</span></div><label className="returns-search-box"><Search size={18} /><input value={returnInvoiceQuery} onChange={(event) => setReturnInvoiceQuery(event.target.value)} placeholder="رقم الفاتورة أو اسم الزبون..." /></label><div className="returns-invoice-list">{filteredReturnableSales.length ? filteredReturnableSales.map((sale) => { const remainingUnits = getSaleReturnableItems(sale, store.sales).reduce((total, item) => total + item.remainingQuantity, 0); return <button type="button" className="returns-invoice-row" key={`return-invoice-${sale.id}`} onClick={() => openReturnScreenSale(sale)}><span className="returns-invoice-row__number"><ReceiptText size={17} /><strong>#{sale.id.slice(-5)}</strong></span><span className="returns-invoice-row__details"><strong>{sale.customerName || "زبون نقدي"}</strong><small>{formatDate(sale.createdAt)} · {remainingUnits} وحدة متاحة · {getPaymentMethodLabel(sale.paymentMethod)}</small></span><b dir="ltr">{money(sale.total)}</b><span className="returns-open-label">فتح <ArrowLeft size={14} /></span></button>}) : <EmptyState icon={Undo2} title="لا توجد فواتير قابلة للإرجاع" description="ابحث برقم الفاتورة أو اسم الزبون." />}</div></section>
              : <div className="returns-workspace"><section className="returns-products-panel panel"><div className="sales-panel-heading"><div><span className="sales-section-kicker">الفاتورة الأصلية #{returnScreenSale.id.slice(-5)}</span><h3>حدد الأصناف المرتجعة</h3><small>الكمية المتاحة للإرجاع ظاهرة على كل صنف.</small></div><button type="button" className="sales-command-button sales-command-button--scan" onClick={() => setShowReturnBarcodeScanner(true)}><Camera size={16} /> مسح باركود</button></div><div className="returns-product-grid">{returnCartAvailableItems.map((entry) => { const item = returnScreenSale.items.find((candidate) => candidate.productId === entry.productId); const selectedQuantity = Number(returnQuantities[entry.productId]) || 0; const atLimit = selectedQuantity >= entry.remainingQuantity; return <button type="button" className="returns-product-card returns-product-card--button" key={`return-item-${entry.productId}`} disabled={atLimit || entry.remainingQuantity < 1} onClick={() => updateReturnCartQuantity(entry.productId, 1)}><Undo2 size={20} /><span>متاح {entry.remainingQuantity} · سبق إرجاعه {entry.returnedQuantity}</span><strong>{item?.name || "صنف"}</strong><b dir="ltr">{money(item?.price || 0)}</b><small>{atLimit ? "بلغت الكمية المتاحة" : "اضغط لإضافة وحدة"}</small></button>})}</div>{!returnCartAvailableItems.some((entry) => entry.remainingQuantity > 0) && <EmptyState icon={Undo2} title="لا توجد كميات متاحة" description="هذه الفاتورة أُعيدت بالكامل." />}</section><aside className="returns-cart-panel panel"><div className="sales-cart-panel__heading"><div><span className="sales-section-kicker">الخطوة 3</span><h3>تأكيد الإرجاع</h3></div><span className="sales-cart-count has-items">{returnCartItems.reduce((total, item) => total + item.quantity, 0)}</span></div><div className="returns-cart-list">{returnCartItems.length ? returnCartItems.map((item) => <div className="returns-cart-row" key={`return-cart-${item.productId}`}><div><strong>{item.name}</strong><small dir="ltr">{money(item.price)} للوحدة</small></div><div className="sales-quantity-control"><button type="button" onClick={() => updateReturnCartQuantity(item.productId, -1)}><Minus size={13} /></button><b>{item.quantity}</b><button type="button" onClick={() => updateReturnCartQuantity(item.productId, 1)}><Plus size={13} /></button></div><strong dir="ltr">{money(item.price * item.quantity)}</strong><button type="button" className="sales-remove-button" onClick={() => setReturnQuantities((current) => ({ ...current, [item.productId]: "0" }))}><Trash2 size={15} /></button></div>) : <div className="sales-cart-empty"><Undo2 size={30} /><strong>سلة الإرجاع فارغة</strong><span>اضغط على صنف من الفاتورة لإضافته.</span></div>}</div><div className="returns-fields"><label><span>الموظف المسؤول *</span><select required value={returnStaffMemberId} onChange={(event) => { const id = event.target.value; setReturnStaffMemberId(id); setSelectedStaffMemberId(id); rememberStaffMemberId(id); }}><option value="">اختر الموظف</option>{store.localStaff.map((member) => <option key={`return-staff-${member.id}`} value={member.id}>{member.name}</option>)}</select></label><label><span>سبب الإرجاع *</span><input value={returnCartReason} onChange={(event) => setReturnCartReason(event.target.value)} placeholder="مثال: إرجاع الزبون أو صنف تالف" /></label></div><div className="returns-total"><span>قيمة التسوية</span><strong dir="ltr">{money(returnCartTotal)}</strong></div><button type="button" className="returns-confirm-button" disabled={!returnCartItems.length || !selectedReturnStaffMember} onClick={commitReturnCart}><Undo2 size={18} /> اعتماد الإرجاع</button><button type="button" className="returns-back-button" onClick={() => { setReturnScreenSale(null); setReturnQuantities({}); setReturnCartReason(""); }}><ArrowRight size={15} /> تغيير الفاتورة</button></aside></div>}
            </section>
          )}

          {page === "payroll" && (
            <section className="payroll-page">
              <div className="page-intro payroll-page__intro"><div><span className="eyebrow"><UserRound size={15} /> إدارة الرواتب</span><h2>رواتب الموظفين <em>بوضوح شهري.</em></h2><p>سجّل الراتب والسلف والخصومات، وتابع صافي الاستحقاق والمدفوع لكل موظف محليًا.</p></div><button className="action-button action-button--primary" onClick={() => setShowPayrollForm(true)} disabled={!store.localStaff.length}><Plus size={17} /> تسجيل راتب</button></div>
              <div className="report-toolbar"><label className="field"><span>الشهر</span><input type="month" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} /></label><label className="search-box"><Search size={17} /><input value={payrollQuery} onChange={(event) => setPayrollQuery(event.target.value)} placeholder="ابحث باسم الموظف أو الملاحظة..." /></label></div>
              <div className="payroll-stat-grid"><StatCard label="إجمالي الرواتب" value={money(monthlyPayrollSummary.baseSalary)} detail="قبل السلف والخصومات" icon={WalletCards} tone="olive" /><StatCard label="السلف" value={money(monthlyPayrollSummary.advances)} detail="خصم من الاستحقاق" icon={ArrowLeftRight} tone="apricot" /><StatCard label="الخصومات" value={money(monthlyPayrollSummary.deductions)} detail="خصومات الشهر" icon={CircleAlert} tone="apricot" /><StatCard label="صافي الاستحقاق" value={money(monthlyPayrollSummary.netDue)} detail={`المدفوع ${money(monthlyPayrollSummary.paidAmount)}`} icon={CheckCircle2} tone="blue" /></div>
              <section className="panel payroll-report-card"><div className="panel-heading"><div><span className="section-kicker">كشف الشهر</span><h3>تفاصيل رواتب الموظفين</h3></div><div className="panel-heading__actions"><button className="text-button" onClick={() => void exportPayrollExcel()}><Download size={15} /> Excel</button><span className="status-badge">{monthlyPayrollRecords.length} سجل</span></div></div>{monthlyPayrollRecords.length ? <div className="payroll-record-list">{monthlyPayrollRecords.map((record) => <div className="payroll-record-row" key={record.id}><div><strong>{record.staffMemberName}</strong><small>{record.month} · {record.note || "بدون ملاحظة"}</small></div><div><span>الراتب</span><b dir="ltr">{money(record.baseSalary)}</b></div><div><span>السلف والخصم</span><b dir="ltr">-{money(record.advances + record.deductions)}</b></div><div><span>الصافي</span><b dir="ltr">{money(getPayrollNet(record))}</b></div><div><span>المدفوع</span><b dir="ltr">{money(record.paidAmount)}</b></div><div><span>المتبقي</span><b dir="ltr">{money(Math.max(0, getPayrollNet(record) - record.paidAmount))}</b></div><button className="mini-icon" onClick={() => printPayrollRecord(record)} aria-label={`طباعة كشف راتب ${record.staffMemberName}`}><Printer size={15} /></button><button className="mini-icon" onClick={() => repeatPayrollRecord(record)} aria-label={`تكرار كشف ${record.staffMemberName}`}><Copy size={15} /></button><span className="status-badge">{record.paymentMethod === "cash" ? "نقدًا" : record.paymentMethod === "card" ? "بطاقة" : "تحويل"}</span></div>)}</div> : <EmptyState icon={UserRound} title={store.localStaff.length ? "لا توجد رواتب لهذا الشهر" : "أضف موظفًا أولًا"} description={store.localStaff.length ? "غيّر الشهر أو سجّل أول راتب من زر تسجيل راتب." : "أضف أسماء الموظفين من الإعدادات ثم سجّل مستحقاتهم."} action={<button className="text-button text-button--strong" onClick={() => setShowPayrollForm(true)} disabled={!store.localStaff.length}>تسجيل أول راتب</button>} />}</section>
              <section className="panel operating-expense-report"><div className="panel-heading"><div><span className="section-kicker">مصروفات المحل</span><h3>المصاريف التشغيلية حسب البند</h3></div><div className="panel-heading__actions"><button className="text-button" onClick={() => void exportOperatingExpensesExcel()}><Download size={15} /> Excel</button><button className="text-button" onClick={() => setShowCashExpenseForm(true)}><Plus size={15} /> تسجيل مصروف</button></div></div>{monthlyOperatingExpenses.length ? <div className="expense-category-list">{monthlyOperatingExpenses.map((entry) => <div className="expense-category-row" key={entry.category}><span><strong>{entry.category}</strong><small>{entry.count} عمليات{entry.notes.length ? ` · ${entry.notes[0]}` : ""}</small></span><b dir="ltr">{money(entry.total)}</b></div>)}<div className="expense-category-total"><span>إجمالي المصروفات التشغيلية</span><b dir="ltr">{money(monthlyOperatingExpenses.reduce((total, entry) => total + entry.total, 0))}</b></div></div> : <EmptyState icon={CircleDollarSign} title="لا توجد مصروفات لهذا الشهر" description="سجّل مصاريف النقل أو التشغيل أو الصيانة لتظهر مصنفة هنا." />}</section>
              <section className="panel payroll-profit-card"><div className="panel-heading"><div><span className="section-kicker">النتيجة الشهرية</span><h3>صافي الربح بعد التكاليف</h3></div><span className={`status-badge ${monthlyNetProfitAfterCosts < 0 ? "status-badge--warning" : ""}`}>{monthlyNetProfitAfterCosts < 0 ? "يحتاج مراجعة" : "إيجابي"}</span></div><div className="profit-summary-grid"><div><span>أرباح المبيعات</span><b dir="ltr">{money(monthlySalesProfit)}</b></div><div><span>الرواتب</span><b dir="ltr">-{money(monthlyPayrollCost)}</b></div><div><span>المصاريف</span><b dir="ltr">-{money(monthlyOperatingExpenseTotal)}</b></div><div className="profit-summary-grid__total"><span>الصافي بعد التكاليف</span><b dir="ltr">{money(monthlyNetProfitAfterCosts)}</b></div></div></section>
              <section className="panel payroll-change-log"><div className="panel-heading"><div><span className="section-kicker">سجل التدقيق</span><h3>آخر تغييرات الرواتب</h3></div><span className="status-badge">{store.payrollChanges.length} تغيير</span></div>{store.payrollChanges.length ? <div className="change-log-list">{store.payrollChanges.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 12).map((change) => <div className="change-log-row" key={change.id}><span className="change-log-row__dot" /><div><strong>{change.staffMemberName}</strong><small>{change.reason} · {formatDate(change.createdAt)}</small></div><b dir="ltr">{money(change.amount)}</b></div>)}</div> : <p className="modal-note">سيظهر هنا تاريخ تسجيل الرواتب والسلف والخصومات والدفعات.</p>}</section>
            </section>
          )}

          {page === "closing" && (
            <section className="closing-page">
              <div className="page-intro closing-page__intro"><div><span className="eyebrow"><WalletCards size={15} /> إغلاق الوردية اليومية</span><h2>أغلق يومك <em>بثقة ووضوح.</em></h2><p>راجع طرق الدفع، قارن النقد المتوقع بالنقد الفعلي، ثم احفظ إغلاق الوردية على هذا الجهاز.</p></div><button className="action-button action-button--primary" onClick={() => setShowCashClosingForm(true)}><Check size={17} /> {todayCashClosing ? "تعديل إغلاق اليوم" : "بدء إغلاق الوردية"}</button></div>
              <section className="closing-summary-hero panel"><div><span className="section-kicker">ملخص اليوم · {todayKey()}</span><h3>{todayCashClosing ? "إغلاق الوردية معتمد" : "الوردية ما زالت مفتوحة"}</h3><p>{todayCashClosing ? `اعتمدها ${todayCashClosing.responsibleName || "المسؤول المحدد"} في ${formatDate(todayCashClosing.closedAt)}.` : "أدخل النقد الفعلي في نهاية الوردية لمقارنة الرصيد المتوقع وتسجيل الفارق."}</p></div><span className={`status-badge ${todayCashClosing ? "" : "status-badge--warning"}`}>{todayCashClosing ? "معتمد" : "بانتظار الإغلاق"}</span></section>
              <div className="closing-stat-grid"><StatCard label="مبيعات نقدية" value={money(dailyPaymentSummary.find((row) => row.paymentMethod === "cash")?.netSales || 0)} detail="بعد خصم المرتجعات النقدية" icon={CircleDollarSign} tone="olive" /><StatCard label="مبيعات البطاقات" value={money(dailyPaymentSummary.find((row) => row.paymentMethod === "card")?.netSales || 0)} detail="صافي البطاقة اليوم" icon={CreditCard} tone="blue" /><StatCard label="التحويلات" value={money(dailyPaymentSummary.find((row) => row.paymentMethod === "transfer")?.netSales || 0)} detail="صافي التحويل اليوم" icon={ArrowLeftRight} tone="blue" /><StatCard label="النقد المتوقع" value={money(todayCashSummary.expectedCash)} detail={`${todayCashSummary.expenses ? `مصروفات ${money(todayCashSummary.expenses)}` : "دون مصروفات"}`} icon={WalletCards} tone="apricot" /></div>
              <div className="closing-grid"><section className="panel closing-breakdown"><div className="panel-heading"><div><span className="section-kicker">تفاصيل طرق الدفع</span><h3>ملخص ما سجله الكاشير</h3></div><span className="status-badge">محلي بالكامل</span></div>{dailyPaymentSummary.map((row) => <div className="closing-breakdown__row" key={`closing-${row.paymentMethod}`}><span><strong>{row.label}</strong><small>{row.saleReceipts} مبيعات · {row.returnReceipts} مرتجعات</small></span><b dir="ltr">{money(row.netSales)}</b></div>)}<div className="closing-breakdown__total"><span>إجمالي الصافي</span><b dir="ltr">{money(dailyPaymentSummaryTotals.netSales)}</b></div></section><section className="panel closing-cash-card"><div className="panel-heading"><div><span className="section-kicker">تسوية النقد</span><h3>هل يطابق الصندوق؟</h3></div><WalletCards size={20} /></div><div className="closing-cash-card__numbers"><div><span>النقد المتوقع</span><b dir="ltr">{money(todayCashSummary.expectedCash)}</b></div>{todayCashClosing ? <div><span>النقد الفعلي</span><b dir="ltr">{money(todayCashClosing.actualCash)}</b></div> : <div><span>المصروفات</span><b dir="ltr">{money(todayCashSummary.expenses)}</b></div>}</div>{todayCashClosing && <div className={`closing-variance ${Math.abs(todayCashSummary.variance || 0) < 0.01 ? "is-matched" : "is-different"}`}><span>{Math.abs(todayCashSummary.variance || 0) < 0.01 ? "الصندوق مطابق" : "فرق يحتاج مراجعة"}</span><b dir="ltr">{money(Math.abs(todayCashSummary.variance || 0))}</b></div>}<button className="action-button action-button--checkout" onClick={() => setShowCashClosingForm(true)}>{todayCashClosing ? <Pencil size={17} /> : <Check size={17} />}{todayCashClosing ? "مراجعة الإغلاق" : "إدخال النقد الفعلي واعتماد الإغلاق"}</button></section></div>
            </section>
          )}

          {page === "advances" && (
            <section className="payroll-page advances-page">
              <div className="page-intro payroll-page__intro"><div><span className="eyebrow"><HandCoins size={15} /> إدارة مستحقات الموظفين</span><h2>السلف والعهد <em>بشفافية كاملة.</em></h2><p>سجّل النقود والملابس والبضاعة التي يستلمها الموظف، وسيُضاف رصيدها تلقائيًا إلى خصم كشف الراتب.</p></div><button className="action-button action-button--primary" onClick={() => setShowEmployeeAdvanceForm(true)} disabled={!store.localStaff.length}><Plus size={17} /> تسجيل سلفة أو عهدة</button></div>
              <div className="payroll-stat-grid"><StatCard label="إجمالي الرصيد" value={money(monthlyAdvanceTotal)} detail={`الشهر ${advanceMonth}`} icon={CircleDollarSign} tone="apricot" /><StatCard label="عدد السجلات" value={String(monthlyEmployeeAdvances.length)} detail="سلف وعهد غير مسددة" icon={ClipboardList} tone="olive" /><StatCard label="عهد بضاعة" value={String(monthlyEmployeeAdvances.filter((advance) => advance.type === "goods").length)} detail="تم خصمها من المخزون" icon={Box} tone="blue" /></div>
              <div className="report-toolbar"><label className="field"><span>شهر الخصم</span><input type="month" value={advanceMonth} onChange={(event) => setAdvanceMonth(event.target.value)} /></label><label className="search-box"><Search size={17} /><input value={advanceQuery} onChange={(event) => setAdvanceQuery(event.target.value)} placeholder="ابحث باسم الموظف أو الوصف..." /></label></div>
              <section className="panel payroll-report-card"><div className="panel-heading"><div><span className="section-kicker">سجل العهد والسلف</span><h3>تفاصيل ما تم استلامه</h3></div><span className="status-badge">{monthlyEmployeeAdvances.length} سجل</span></div>{monthlyEmployeeAdvances.length ? <div className="payroll-record-list">{monthlyEmployeeAdvances.map((advance) => <div className="payroll-record-row" key={advance.id}><div><strong>{advance.staffMemberName}</strong><small>{advance.description}{advance.productName ? ` · ${advance.productName}` : ""}</small></div><div><span>النوع</span><b>{advance.type === "cash" ? "نقدية" : advance.type === "clothing" ? "ملابس" : "بضاعة"}</b></div><div><span>القيمة</span><b dir="ltr">{money(advance.amount)}</b></div><div><span>المتبقي</span><b dir="ltr">{money(Math.max(0, advance.amount - advance.settled))}</b></div><div><span>التسجيل</span><b>{formatDate(advance.createdAt)}</b></div></div>)}</div> : <EmptyState icon={HandCoins} title={store.localStaff.length ? "لا توجد سلف أو عهد لهذا الشهر" : "أضف موظفًا أولًا"} description={store.localStaff.length ? "سجّل مبلغًا نقديًا أو عهدة ملابس أو اصرف بضاعة من المخزون لتظهر هنا." : "أضف أسماء الموظفين من الإعدادات قبل تسجيل المستحقات."} action={<button className="text-button text-button--strong" onClick={() => setShowEmployeeAdvanceForm(true)} disabled={!store.localStaff.length}>تسجيل أول عهدة</button>} />}</section>
              <section className="panel payroll-report-card"><div className="panel-heading"><div><span className="section-kicker">كشف حساب الموظف</span><h3>الفواتير والسلف والمبالغ المستحقة</h3></div><div className="panel-heading__actions"><button className="text-button" onClick={printEmployeeStatement} disabled={!employeeStatementStaffId}><Printer size={15} /> طباعة</button><button className="text-button" onClick={() => void exportEmployeeStatementExcel()} disabled={!employeeStatementStaffId}><Download size={15} /> Excel</button></div></div><div className="form-grid"><label className="field"><span>اختر الموظف</span><select value={employeeStatementStaffId} onChange={(event) => setEmployeeStatementStaffId(event.target.value)}><option value="">اختر موظفًا لعرض كشفه</option>{store.localStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>{employeeStatementStaffId && <label className="field"><span>سقف ائتمان الموظف (د.ل)</span><input type="number" min="0" step="0.01" inputMode="decimal" value={employeeStatementCreditLimit || ""} placeholder="بدون سقف" onChange={(event) => { const limit = Math.max(0, Number(event.target.value) || 0); setStore((current) => ({ ...current, employeeCreditLimits: { ...current.employeeCreditLimits, [employeeStatementStaffId]: limit } })); }} /></label>}</div>{employeeStatement ? <><div className="payroll-stat-grid"><StatCard label="فواتير بضاعة" value={String(employeeStatement.invoices)} detail="سلال مرحّلة إلى الحساب" icon={ReceiptText} tone="blue" /><StatCard label="إجمالي المأخوذ" value={money(employeeStatement.recordedTotal)} detail="كل الفواتير والسلف" icon={HandCoins} tone="apricot" /><StatCard label="المستحق للخصم" value={money(employeeStatement.outstanding)} detail={employeeStatementCreditLimit > 0 ? `سقف الموظف ${money(employeeStatementCreditLimit)}` : "الرصيد قبل كشف الراتب"} icon={WalletCards} tone="olive" /></div>{employeeStatementOverCreditLimit && <p className="modal-note low-number">تنبيه ائتماني: الرصيد المستحق تجاوز السقف المحدد للموظف.</p>}{employeeStatementSalary > 0 && <p className={`modal-note ${employeeStatementAboveLimit ? "low-number" : "safe-number"}`}>{employeeStatementAboveLimit ? `تنبيه: رصيد الموظف تجاوز 50% من آخر راتب مسجل (${money(employeeStatementSalary)}).` : `رصيد الموظف ضمن حد المتابعة: أقل من 50% من آخر راتب مسجل (${money(employeeStatementSalary)}).`}</p>}{employeeStatement.entries.length ? <div className="payroll-record-list">{employeeStatement.entries.map((entry) => <div className="payroll-record-row" key={entry.id}><div><strong>{entry.reference}</strong><small>{entry.note}</small></div><div><span>النوع</span><b>{entry.type}</b></div><div><span>القيمة</span><b dir="ltr">{money(entry.amount)}</b></div><div><span>المتبقي</span><b dir="ltr">{money(entry.outstanding)}</b></div><div><span>التاريخ</span><b>{formatDate(entry.occurredAt)}</b></div><button className="mini-icon" onClick={() => { const sale = store.sales.find((candidate) => candidate.id === entry.id); if (sale) setPreviewSale(sale); }} disabled={!store.sales.some((candidate) => candidate.id === entry.id)} aria-label="عرض الفاتورة"><ReceiptText size={15} /></button>{entry.type === "فاتورة بضاعة" && entry.outstanding > 0 && <button className="mini-icon mini-icon--danger" onClick={() => { const sale = store.sales.find((candidate) => candidate.id === entry.id); if (sale) openEmployeePurchasePartialReturn(sale); }} aria-label="إرجاع أصناف من فاتورة الموظف"><Undo2 size={15} /></button>}</div>)}</div> : <p className="modal-note">لا توجد فواتير أو سلف لهذا الموظف.</p>}</> : <p className="modal-note">اختر الموظف لعرض كل فواتير البضاعة والسلف التي ستُخصم منه.</p>}</section>
              <section className="panel payroll-profit-card"><div className="panel-heading"><div><span className="section-kicker">طريقة العمل</span><h3>كيف يظهر الخصم في الراتب؟</h3></div></div><p className="modal-note">من شاشة البيع املأ السلة ثم اضغط «ترحيل السلة لموظف». تُسجّل فاتورة بضاعة باسم الموظف، تُنقص الكميات من المخزون، ويُضاف إجماليها تلقائيًا إلى حسابه. عند تسجيل كشف راتبه، تُخصم جميع الفواتير والسلف غير المسددة للشهر المختار وتُسوّى من الحساب.</p></section>
            </section>
          )}

          {page === "inventory" && (
            <>
              {showGoodsReceiving && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">سجل التعرفات الناجحة</span><h3>{dailySuccessfulReceivingScans.length ? `${dailySuccessfulReceivingScans.length} تعرفات في التاريخ المختار` : "لا توجد تعرفات ناجحة في التاريخ المختار"}</h3></div><div className="inventory-page__actions"><span className="status-badge">محلي</span><button type="button" className="action-button action-button--secondary" onClick={() => void exportSuccessfulScanHistoryExcel()}><Download size={16} /> Excel</button></div></div><div className="form-grid"><label className="field"><span>تاريخ السجل</span><input type="date" value={dailySuccessfulScanDate} onChange={(event) => setDailySuccessfulScanDate(event.target.value || todayKey())} /></label><label className="field"><span>بحث بالاسم أو الباركود</span><input value={dailySuccessfulScanQuery} onChange={(event) => setDailySuccessfulScanQuery(event.target.value)} placeholder="اكتب اسم الصنف أو الباركود" /></label></div>{dailySuccessfulReceivingScanSummary.length ? <div className="summary-grid">{dailySuccessfulReceivingScanSummary.slice(0, 4).map((entry) => <div className="summary-card" key={entry.productId}><span>{entry.productName}</span><strong>{entry.scans} مسح</strong><small dir="ltr">{entry.barcode}</small></div>)}</div> : null}{filteredDailySuccessfulReceivingScans.length ? <div className="price-history-list">{filteredDailySuccessfulReceivingScans.slice(0, 20).map((entry) => <div className="price-history-row" key={entry.id}><span><strong>{entry.productName}</strong><small dir="ltr">{entry.barcode} · {formatDate(entry.scannedAt)} · {new Date(entry.scannedAt).toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" })}</small></span><div className="row-actions"><button type="button" className="mini-icon" onClick={() => reviewReceivingSessionProduct(entry.barcode)} aria-label={`مراجعة ${entry.productName}`}><Search size={15} /></button><button type="button" className="mini-icon" onClick={() => { const product = store.products.find((item) => item.id === entry.productId); if (product) printReceivingBarcodeLabel(product); else toast.error("لم يعد الصنف محفوظًا للطباعة."); }} aria-label={`طباعة ملصق ${entry.productName}`}><Printer size={15} /></button></div></div>)}</div> : <p className="modal-note">{dailySuccessfulScanQuery ? "لا توجد نتائج مطابقة للبحث في التاريخ المختار." : "ستُحفظ هنا كل عملية تعرّف ناجحة في التاريخ المختار، حتى بعد إغلاق جلسة الاستلام."}</p>}</section>}
              {showGoodsReceiving && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">آخر منتجات مُمَسَّحة بنجاح</span><h3>{successfulReceivingSessionEvents.length ? `${successfulReceivingSessionEvents.length} أصناف جاهزة للمراجعة` : "لا توجد منتجات مُمَسَّحة بعد"}</h3></div><span className="status-badge">جلسة حالية</span></div>{successfulReceivingSessionEvents.length ? <div className="price-history-list">{successfulReceivingSessionEvents.map((entry) => <div className="price-history-row" key={entry.id}><span><strong>{entry.productName}</strong><small dir="ltr">{entry.barcode} · {formatDate(entry.createdAt)} · {new Date(entry.createdAt).toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" })}</small></span><button type="button" className="action-button action-button--secondary" onClick={() => reviewReceivingSessionProduct(entry.barcode)}><Search size={16} /> مراجعة</button></div>)}</div> : <p className="modal-note">بعد التعرف على أي صنف بالباركود سيظهر هنا اسمه ورمزه ووقت المسح، دون حفظ بيانات تجريبية.</p>}</section>}
              {showGoodsReceiving && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">جلسة الاستلام الحالية</span><h3>{receivingSessionHistory.length ? `آخر ${receivingSessionHistory.length} عمليات مسح` : "لم تُسجّل عمليات مسح بعد"}</h3></div><button type="button" className="text-button" onClick={() => { setReceivingSession({ scans: 0, found: 0, notFound: 0, receivedUnits: 0 }); setReceivingSessionHistory([]); }}>تصفير الجلسة</button></div>{receivingProductId && (() => { const product = store.products.find((item) => item.id === receivingProductId); return product ? <div className="inventory-page__actions"><div className="field"><span>كمية سريعة</span><div className="input-action"><button type="button" className="action-button action-button--secondary" onClick={() => setQuickReceivingQuantity(-1)}><Minus size={16} /> 1</button><button type="button" className="action-button action-button--secondary" onClick={() => setQuickReceivingQuantity(1)}><Plus size={16} /> 1</button><button type="button" className="action-button action-button--secondary" onClick={() => setQuickReceivingQuantity(5)}>+ 5</button><button type="button" className="action-button action-button--secondary" onClick={() => setQuickReceivingQuantity(10)}>+ 10</button></div></div><button type="button" className="action-button action-button--secondary" onClick={() => printReceivingBarcodeLabel(product)}><Printer size={16} /> طباعة ملصق الباركود</button></div> : null; })()}{receivingSessionHistory.length ? <div className="price-history-list">{receivingSessionHistory.slice(0, 6).map((entry) => <div className="price-history-row" key={entry.id}><span><strong>{entry.kind === "received" ? `تم استلام ${entry.quantity} وحدة` : entry.kind === "success" ? "تم التعرف على الصنف" : entry.kind === "not-found" ? "باركود غير مسجل" : "إدخال غير صالح"}</strong><small>{entry.productName || entry.barcode || "لم يُدخل باركود"} · {formatDate(entry.createdAt)}</small></span><span className={`status-badge ${entry.kind === "success" || entry.kind === "received" ? "" : "status-badge--warning"}`}>{entry.kind === "received" ? "مضاف للمخزون" : entry.kind === "success" ? "معروف" : entry.kind === "not-found" ? "جديد" : "خطأ"}</span></div>)}</div> : <p className="modal-note">سيظهر هنا آخر التعرفات والأخطاء وعمليات الاعتماد خلال هذه الجلسة فقط.</p>}</section>}
	            {showGoodsReceiving && receivingProductId && (() => { const product = store.products.find((item) => item.id === receivingProductId); if (!product) return null; const review = getReceivingCostReview(product.purchasePrice, Number(receivingPurchasePrice)); return <section className="panel weekly-report-strip"><div><span className="section-kicker">مراجعة تكلفة الاستلام</span><h3 className={review.direction === "up" ? "low-number" : review.direction === "down" ? "safe-number" : ""}>{review.direction === "unchanged" ? "سعر الشراء مطابق لآخر تكلفة" : review.direction === "up" ? `تكلفة الاستلام ارتفعت ${money(Math.abs(review.difference))}` : `تكلفة الاستلام انخفضت ${money(Math.abs(review.difference))}`}</h3><p>آخر تكلفة محفوظة {money(review.previousCost)} · السعر الجديد {money(review.nextCost)}{review.percentChange === null ? " · لا توجد تكلفة سابقة موجبة لحساب النسبة." : ` · فرق ${Math.abs(review.percentChange).toFixed(1)}%`}</p></div><span className={`status-badge ${review.direction === "up" ? "status-badge--warning" : ""}`}>{review.direction === "unchanged" ? "مطابق" : review.direction === "up" ? "زيادة تكلفة" : "انخفاض تكلفة"}</span></section>; })()}
	            {latestGoodsReceipt && latestGoodsReceiptReview && <section className="panel weekly-report-strip"><div><span className="section-kicker">تم اعتماد الاستلام</span><h3>{latestGoodsReceipt.productName} · {latestGoodsReceipt.quantity} وحدة</h3><p>تكلفة الاستلام {money(latestGoodsReceipt.quantity * latestGoodsReceipt.purchasePrice)} · {latestGoodsReceipt.supplierName || "مورد غير محدد"}.</p></div><div className="inventory-page__actions"><button className="action-button action-button--secondary" onClick={() => printGoodsReceiptNotice(latestGoodsReceipt, latestGoodsReceiptReview)}><Printer size={17} /> طباعة إيصال الاستلام</button><button className="text-button" onClick={() => { setLatestGoodsReceipt(null); setLatestGoodsReceiptReview(null); }}>إخفاء</button></div></section>}
	            {showGoodsReceiving && <section className="panel weekly-report-strip"><div><span className="section-kicker">حد زيادة التكلفة</span><h3>{costIncreaseAlertThreshold}%</h3><p>يظهر تنبيه عند وصول زيادة تكلفة الاستلام إلى هذه النسبة أو تجاوزها. الإعداد محفوظ محليًا على هذا الجهاز.</p></div><label className="field"><span>نسبة التنبيه (%)</span><input type="number" min="0" max="100" step="0.5" inputMode="decimal" value={costIncreaseAlertThreshold} onChange={(event) => { const value = Number(event.target.value); setCostIncreaseAlertThreshold(Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0); }} /></label></section>}
	            {showGoodsReceiving && receivingProductId && (() => { const product = store.products.find((item) => item.id === receivingProductId); if (!product) return null; const review = getReceivingCostReview(product.purchasePrice, Number(receivingPurchasePrice)); const increasePercent = review.percentChange ?? 0; const exceedsThreshold = review.direction === "up" && review.percentChange !== null && increasePercent >= costIncreaseAlertThreshold; return exceedsThreshold ? <section className="panel weekly-report-strip"><div><span className="section-kicker">تنبيه تكلفة الاستلام</span><h3 className="low-number">زيادة تتجاوز الحد المحدد</h3><p>زادت تكلفة «{product.name}» بنسبة {increasePercent.toFixed(1)}%، بينما حدك المحلي {costIncreaseAlertThreshold}%.</p></div><span className="status-badge status-badge--warning">راجع السعر قبل الاعتماد</span></section> : null; })()}
	            {showGoodsReceiving && <section className="panel price-history-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">فلاتر متقدمة لسجل المنتجات</span><h3>{filteredDailySuccessfulReceivingScans.length} نتيجة مطابقة من {dailySuccessfulReceivingScans.length}</h3><p>استخدم البحث أعلاه بالاسم أو الباركود، ثم حدّد التصنيف أو المورد أو حالة الرصيد للوصول إلى السجل بسرعة.</p></div><button type="button" className="action-button action-button--secondary" onClick={() => { setDailySuccessfulScanQuery(""); setDailySuccessfulScanCategory(""); setDailySuccessfulScanSupplier(""); setDailySuccessfulScanStockStatus("all"); }}>تصفير الفلاتر</button></div><div className="form-grid"><label className="field"><span>التصنيف</span><select value={dailySuccessfulScanCategory} onChange={(event) => setDailySuccessfulScanCategory(event.target.value)}><option value="">كل التصنيفات</option>{successfulScanCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label className="field"><span>المورد</span><select value={dailySuccessfulScanSupplier} onChange={(event) => setDailySuccessfulScanSupplier(event.target.value)}><option value="">كل الموردين</option>{successfulScanSuppliers.map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}</select></label><label className="field"><span>حالة المخزون</span><select value={dailySuccessfulScanStockStatus} onChange={(event) => setDailySuccessfulScanStockStatus(event.target.value as "all" | "available" | "low" | "out")}><option value="all">كل الحالات</option><option value="available">متاح</option><option value="low">منخفض</option><option value="out">نافد أو غير محفوظ</option></select></label></div></section>}
	            <section className="inventory-page">
	              {showGoodsReceiving && <section className="panel weekly-report-strip"><div><span className="section-kicker">نتيجة مسح الباركود</span><h3>{receivingFeedback ? receivingFeedback.message : "جاهز للمسح"}</h3><p>{receivingFeedback?.kind === "success" ? "تم فتح نموذج كمية الاستلام للصنف المتعرف عليه." : receivingFeedback?.kind === "not-found" ? "سيُفتح نموذج إضافة صنف جديد مع الباركود المحفوظ." : "امسح الرمز بالقارئ أو اكتبه ثم اضغط Enter."}</p>{receivingFeedback && <span className={`status-badge ${receivingFeedback.kind === "success" ? "" : "status-badge--warning"}`} style={receivingFeedback.kind === "error" ? { borderColor: "#b94a48", color: "#8d2927" } : undefined}>{receivingFeedback.kind === "success" ? "تم التعرف" : receivingFeedback.kind === "not-found" ? "غير مسجل" : "تعذر الإدخال"}</span>}</div><div className="inventory-page__actions"><label className="field"><span>صوت الباركود</span><select value={barcodeFeedbackSoundEnabled ? "on" : "off"} onChange={(event) => setBarcodeFeedbackSoundEnabled(event.target.value === "on")}><option value="on">مفعل</option><option value="off">صامت</option></select></label><label className="field"><span>اهتزاز الهاتف</span><select value={barcodeFeedbackVibrationEnabled ? "on" : "off"} onChange={(event) => setBarcodeFeedbackVibrationEnabled(event.target.value === "on")}><option value="on">مفعل</option><option value="off">صامت</option></select></label><div className="field"><span>جلسة الاستلام</span><b>{receivingSession.scans} مسح · {receivingSession.found} معروف · {receivingSession.notFound} جديد · {receivingSession.receivedUnits} وحدة</b><button type="button" className="text-button" onClick={() => setReceivingSession({ scans: 0, found: 0, notFound: 0, receivedUnits: 0 })}>تصفير الجلسة</button></div></div></section>}
	              <div className="page-intro"><div><span className="eyebrow"><Archive size={15} /> إدارة المنتجات</span><h2>مخزونك، واضح <em>دائمًا.</em></h2><p>أضف أصنافك وحدد حد التنبيه لكل صنف؛ سيتابع سوقنا الكميات بعد كل بيع.</p></div><div className="inventory-page__actions"><input className="hidden-input" ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange={(event) => void importExcelProducts(event.target.files?.[0])} /><button className="action-button action-button--secondary" onClick={openReservationPrompt}><ClipboardList size={17} /> حجز زبون</button><button className="action-button action-button--secondary" onClick={openContainerPrompt}><Archive size={17} /> دفتر العبوات</button><button className="action-button action-button--primary" onClick={openBarcodeStocktake}><Camera size={17} /> جرد سريع بالباركود</button><button className="action-button action-button--secondary" onClick={openBulkStocktake}><ClipboardList size={17} /> جرد جماعي</button><button className="action-button action-button--secondary" onClick={() => setShowStocktakeScanner(true)}><Camera size={17} /> جرد صنف بالكاميرا</button><button className="action-button action-button--secondary" onClick={() => { setSelectedLabelProductIds(filteredInventory.map((product) => product.id)); setShowShelfLabels(true); }}><Printer size={17} /> ملصقات أسعار</button><button className="action-button action-button--secondary" onClick={() => void downloadExcelTemplate()}><FileText size={17} /> قالب Excel</button><button className="action-button action-button--secondary" onClick={() => excelInputRef.current?.click()}><Upload size={17} /> استيراد Excel</button><button className="action-button action-button--primary" onClick={() => openProductForm()}><PackagePlus size={18} /> إضافة صنف</button></div></div>
	              <div className="inventory-summary"><div><span>إجمالي الأصناف</span><b>{store.products.length}</b></div><div><span>وحدات بالمخزون</span><b>{store.products.reduce((total, product) => total + product.quantity, 0)}</b></div><div><span>قيمة المخزون (شراء)</span><b dir="ltr">{money(store.products.reduce((total, product) => total + product.quantity * product.purchasePrice, 0))}</b></div><div className={lowStock.length ? "warning" : "safe"}><span>تحتاج إعادة طلب</span><b>{lowStock.length}</b></div><div className={expiringProducts.length ? "warning" : "safe"}><span>صلاحية قريبة أو منتهية</span><b>{expiringProducts.length}</b></div></div>
	              <section className="panel weekly-report-strip"><div><span className="section-kicker">متابعة تغيرات تكلفة المورد</span><h3>{costReportSupplierFilter || costReportProductFilter ? "تقرير مفلتر" : "كل الموردين والأصناف"}</h3><p>فلتر النتائج بالمورد أو الصنف، ثم اطبع التقرير أو نزّل ملف Excel مطابقًا للفلتر الحالي.</p></div><div className="inventory-page__actions"><label className="field"><span>المورد</span><select value={costReportSupplierFilter} onChange={(event) => setCostReportSupplierFilter(event.target.value)}><option value="">كل الموردين</option>{supplierCostChangesFullReport.suppliers.map((supplier) => <option key={supplier.supplierName} value={supplier.supplierName}>{supplier.supplierName} · {supplier.changes.length} تغيرات</option>)}</select></label><label className="field"><span>الصنف</span><select value={costReportProductFilter} onChange={(event) => setCostReportProductFilter(event.target.value)}><option value="">كل الأصناف</option>{costChangeProductOptions.map(([productId, productName]) => <option key={productId} value={productId}>{productName}</option>)}</select></label><button className="action-button action-button--secondary" onClick={() => void exportSupplierCostChangesExcel()} disabled={!supplierCostChangesReport.changes.length}><Download size={16} /> تكلفة Excel</button><button className="action-button action-button--secondary" onClick={printSupplierCostChangesReport} disabled={!supplierCostChangesReport.changes.length}><Printer size={16} /> طباعة التقرير</button></div></section>
	              {repeatedCostIncreaseProducts.length > 0 && <section className="panel weekly-report-strip"><div><span className="section-kicker">زيادات تكلفة متكررة</span><h3>{repeatedCostIncreaseProducts.length} أصناف تحتاج متابعة</h3><p>تكرر ارتفاع تكلفة هذه الأصناف مرتين أو أكثر خلال الشهر الحالي.</p></div><div className="price-history-list">{repeatedCostIncreaseProducts.map((product) => <div className="price-history-row" key={product.productId}><span><strong>{product.productName}</strong><small>{product.suppliers.join("، ")} · آخر استلام {formatDate(product.latestReceivedAt)}</small></span><span className="status-badge status-badge--warning">{product.increases} زيادات</span><b className="low-number" dir="ltr">+{money(product.totalIncrease)}</b></div>)}</div></section>}
	              {supplierMonthlyCostComparison.suppliers.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">مقارنة تكلفة الموردين</span><h3>{supplierMonthlyCostComparison.currentMonthKey} مقابل {supplierMonthlyCostComparison.previousMonthKey}</h3></div><span className="status-badge">محلي</span></div><div className="table-wrap"><table className="inventory-table"><thead><tr><th>المورد</th><th>تغيرات هذا الشهر</th><th>تغيرات الشهر السابق</th><th>زيادات هذا الشهر</th><th>صافي الفرق</th></tr></thead><tbody>{supplierMonthlyCostComparison.suppliers.map((supplier) => <tr key={supplier.supplierName}><td>{supplier.supplierName}</td><td>{supplier.currentChanges}{supplier.changesDifference ? ` (${supplier.changesDifference > 0 ? "+" : ""}${supplier.changesDifference})` : ""}</td><td>{supplier.previousChanges}</td><td className={supplier.currentIncreases > supplier.previousIncreases ? "low-number" : ""}>{supplier.currentIncreases}{supplier.increasesDifference ? ` (${supplier.increasesDifference > 0 ? "+" : ""}${supplier.increasesDifference})` : ""}</td><td className={supplier.currentNetChange > 0 ? "low-number" : supplier.currentNetChange < 0 ? "safe-number" : ""} dir="ltr">{supplier.currentNetChange > 0 ? "+" : ""}{money(supplier.currentNetChange)}</td></tr>)}</tbody></table></div></section>}
	              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تغيرات تكلفة الموردين</span><h3>{supplierCostChangesReport.changes.length ? `${supplierCostChangesReport.changes.length} تغيرات خلال ${currentMonthKey}` : "لا توجد تغيرات تكلفة هذا الشهر"}</h3></div><span className={`status-badge ${costIncreaseAlerts.length ? "status-badge--warning" : ""}`}>{costIncreaseAlerts.length ? `${costIncreaseAlerts.length} فوق الحد` : "ضمن الحد"}</span></div>{supplierCostChangesReport.changes.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>التاريخ</th><th>المورد</th><th>الصنف</th><th>السابق</th><th>الجديد</th><th>الفرق</th><th>المرجع</th></tr></thead><tbody>{supplierCostChangesReport.changes.map((change) => <tr key={change.receiptId}><td>{formatDate(change.receivedAt)}</td><td>{change.supplierName}</td><td>{change.productName}</td><td dir="ltr">{money(change.previousCost)}</td><td dir="ltr">{money(change.nextCost)}</td><td className={change.difference > 0 ? "low-number" : "safe-number"} dir="ltr">{change.difference > 0 ? "+" : ""}{money(change.difference)}{change.percentChange === null ? "" : ` · ${change.percentChange.toFixed(1)}%`}</td><td dir="ltr">{change.receiptId.slice(-6).toUpperCase()}</td></tr>)}</tbody></table></div> : <p className="modal-note">يعتمد التقرير على حركات الاستلام الفعلية فقط، ويقارن كل تكلفة بالاستلام السابق للصنف نفسه.</p>}</section>
	              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">استلام بضاعة بالباركود</span><h3>{showGoodsReceiving ? "امسح الصنف ثم أدخل كمية الاستلام" : "نزّل بضاعة جديدة بسرعة"}</h3></div><button className="action-button action-button--secondary" onClick={() => { setShowGoodsReceiving((current) => !current); setReceivingBarcode(""); setReceivingProductId(""); setReceivingQuantity("1"); setReceivingStaffMemberId(""); }}><PackagePlus size={16} /> {showGoodsReceiving ? "إغلاق" : "استلام بالباركود"}</button></div>{showGoodsReceiving && <><div className="form-grid"><label className="field field--wide"><span>الباركود</span><div className="input-action"><input autoFocus value={receivingBarcode} onChange={(event) => { setReceivingBarcode(event.target.value); setReceivingProductId(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); detectReceivingBarcode(receivingBarcode); } }} placeholder="امسح القارئ أو اكتب الرمز ثم Enter" inputMode="numeric" /><button type="button" className="action-button action-button--secondary" onClick={() => setShowReceivingBarcodeScanner(true)}><Camera size={16} /> مسح بالكاميرا</button><button type="button" className="action-button action-button--secondary" onClick={() => detectReceivingBarcode(receivingBarcode)}>تعرّف على الصنف</button></div></label><p className="modal-note field--wide">{getReceivingBarcodeReaderGuidance()}</p></div>{receivingProductId && (() => { const product = store.products.find((item) => item.id === receivingProductId); return product ? <form className="form-grid" onSubmit={saveGoodsReceipt}><div className="field field--wide"><span>الصنف المتعرف عليه</span><strong>{product.name} · الرصيد الحالي {product.quantity}</strong></div><label className="field"><span>كمية الاستلام *</span><input name="quantity" type="number" min="1" step="1" inputMode="numeric" value={receivingQuantity} onChange={(event) => setReceivingQuantity(event.target.value)} required /></label><label className="field"><span>سعر الشراء للوحدة *</span><input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={product.purchasePrice} required /></label><label className="field"><span>المورد</span><input name="supplierName" defaultValue={product.supplierName || ""} maxLength={80} /></label>{store.localStaff.length > 0 && <label className="field"><span>الموظف المسؤول عن الاستلام</span><select value={receivingStaffMemberId} onChange={(event) => setReceivingStaffMemberId(event.target.value)}><option value="">بدون تحديد</option>{store.localStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}<label className="field"><span>تاريخ الصلاحية</span><input name="expiryDate" type="date" /></label><label className="field"><span>مرجع فاتورة الشراء</span><input name="purchaseInvoiceRef" maxLength={100} /></label><label className="field"><span>ملاحظة</span><input name="note" maxLength={180} placeholder="اختياري" /></label><div className="modal-actions field--wide"><button type="button" className="action-button action-button--secondary" onClick={() => setReceivingProductId("")}>تغيير الباركود</button><button type="submit" className="action-button action-button--primary"><PackagePlus size={17} /> اعتماد الاستلام</button></div></form> : null; })()}</>}</section>
	              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">سجل استلام البضاعة</span><h3>{store.goodsReceipts.length ? `${store.goodsReceipts.length} حركات استلام محفوظة` : "لا توجد حركات استلام بعد"}</h3></div><button className="action-button action-button--secondary" onClick={() => void exportGoodsReceiptsExcel()} disabled={!store.goodsReceipts.length}><Download size={16} /> استلام Excel</button></div>{store.goodsReceipts.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>التاريخ</th><th>الباركود</th><th>الصنف</th><th>الكمية</th><th>سعر الشراء</th><th>المورد</th><th>الموظف المسؤول</th></tr></thead><tbody>{store.goodsReceipts.slice(0, 10).map((receipt) => <tr key={receipt.id}><td>{formatDate(receipt.receivedAt)}</td><td dir="ltr">{receipt.barcode}</td><td>{receipt.productName}</td><td>{receipt.quantity}</td><td dir="ltr">{money(receipt.purchasePrice)}</td><td>{receipt.supplierName || "—"}</td><td>{receipt.staffMemberName || "غير محدد"}</td></tr>)}</tbody></table></div> : <p className="modal-note">بعد اعتماد استلام صنف معروف بالباركود، يظهر هنا السجل ويصبح قابلًا للتنزيل في Excel.</p>}</section>
	              {showReservationForm && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">حجز جديد</span><h3>احفظ طلب الزبون وتاريخ انتهائه</h3></div><button className="text-button" onClick={() => setShowReservationForm(false)}>إغلاق</button></div><form className="form-grid" onSubmit={saveReservation}><label className="field"><span>الصنف *</span><select name="productId" required defaultValue=""><option value="" disabled>اختر صنفًا</option>{store.products.filter((product) => product.quantity > 0 && getExpiryStatus(product.expiryDate).kind !== "expired").map((product) => <option key={product.id} value={product.id}>{product.name} · المتاح للحجز {getReservableQuantity(product.quantity, activeProductReservations, product.id)}</option>)}</select></label><label className="field"><span>الكمية *</span><input name="quantity" type="number" min="1" step="1" inputMode="numeric" required /></label><label className="field"><span>اسم الزبون *</span><input name="customerName" maxLength={80} required /></label><label className="field"><span>هاتف الزبون</span><input name="customerPhone" inputMode="tel" maxLength={30} /></label><label className="field"><span>ينتهي الحجز في</span><input name="expiresOn" type="date" min={todayKey()} /></label><label className="field field--wide"><span>ملاحظة</span><input name="note" maxLength={180} placeholder="اختياري" /></label><div className="modal-actions field--wide"><button type="button" className="action-button action-button--secondary" onClick={() => setShowReservationForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> حفظ الحجز</button></div></form></section>}
	              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">حجوزات الزبائن</span><h3>{activeProductReservations.length ? `${activeProductReservations.length} حجوزات · ${totalReservedUnits} وحدات` : "لا توجد حجوزات قائمة"}</h3></div><button className="action-button action-button--secondary" onClick={() => setShowReservationForm(true)}><Plus size={16} /> حجز جديد</button></div>{activeProductReservations.length ? <div className="price-history-list">{activeProductReservations.map((reservation) => <div className="price-history-row" key={reservation.id}><span><strong>{reservation.productName} · {reservation.quantity} وحدة</strong><small>{reservation.customerName}{reservation.customerPhone ? ` · ${reservation.customerPhone}` : ""}{reservation.expiresOn ? ` · حتى ${reservation.expiresOn}` : ""}{reservation.note ? ` · ${reservation.note}` : ""}</small></span><span className="status-badge">متاح الآن {getReservableQuantity(store.products.find((product) => product.id === reservation.productId)?.quantity ?? 0, activeProductReservations.filter((entry) => entry.id !== reservation.id), reservation.productId)}</span><div className="row-actions"><button className="mini-icon" onClick={() => printReservationReceipt(reservation)} aria-label={`طباعة حجز ${reservation.productName}`}><Printer size={15} /></button><button className="mini-icon" onClick={() => fulfillReservation(reservation)} aria-label={`استكمال حجز ${reservation.productName}`}><ShoppingBag size={15} /></button><button className="mini-icon mini-icon--danger" onClick={() => cancelReservation(reservation)} aria-label={`إلغاء حجز ${reservation.productName}`}><Trash2 size={15} /></button></div></div>)}</div> : <p className="modal-note">الحجز يحفظ طلب الزبون محليًا ولا ينشئ فاتورة أو يخصم المخزون حتى تستكمله في سلة البيع.</p>}</section>
	              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تقرير الحجوزات للشهر</span><h3>{monthlyReservationReport.reservations.length ? `قائم ${monthlyReservationReport.summary.active} · منفذ ${monthlyReservationReport.summary.fulfilled} · ملغى ${monthlyReservationReport.summary.cancelled}` : "لا توجد حجوزات هذا الشهر"}</h3></div><button className="action-button action-button--secondary" onClick={() => void exportMonthlyReservationsExcel()}><Download size={16} /> حجوزات Excel</button></div>{monthlyReservationReport.reservations.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الحجز</th><th>الزبون</th><th>الصنف</th><th>الكمية</th><th>الحالة</th><th>ينتهي في</th></tr></thead><tbody>{monthlyReservationReport.reservations.map((reservation) => <tr key={reservation.id}><td>{reservation.id.slice(-5)}</td><td>{reservation.customerName}</td><td>{reservation.productName}</td><td>{reservation.quantity}</td><td><span className="status-badge">{reservation.status === "fulfilled" ? "منفذ" : reservation.status === "cancelled" ? "ملغى" : "قائم"}</span></td><td>{reservation.expiresOn || "—"}</td></tr>)}<tr><td colSpan={3}><strong>إجمالي الوحدات المحجوزة</strong></td><td><strong>{monthlyReservationReport.summary.units}</strong></td><td colSpan={2}></td></tr></tbody></table></div> : <p className="modal-note">تظهر هنا الحجوزات الجديدة المنفذة والملغاة والقائمة لهذا الشهر.</p>}</section>
	              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">دفتر العبوات والضمانات</span><h3>{containerBalances.length ? `${containerBalances.length} أرصدة عبوات قائمة` : "لا توجد عبوات معلقة"}</h3></div><button className="action-button action-button--secondary" onClick={openContainerPrompt}><Plus size={16} /> حركة عبوة</button></div>{containerBalances.length ? <div className="price-history-list">{containerBalances.map((entry) => <div className="price-history-row" key={`${entry.customerName}-${entry.containerName}`}><span><strong>{entry.customerName}</strong><small>{entry.containerName}</small></span><b>{entry.quantity} عبوة لدى الزبون</b></div>)}</div> : <p className="modal-note">سجل تسليم عبوة أو ضمان للزبون، ثم سجل استرجاعها لاحقًا لمعرفة الرصيد المحلي بدقة.</p>}</section>
	              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">كشف عبوات زبون</span><h3>{containerStatementCustomer ? `حركة ${containerStatementCustomer}` : "اختر زبونًا لإصدار كشفه"}</h3></div><div className="button-row"><button className="mini-icon" onClick={printContainerStatement} aria-label="طباعة كشف العبوات"><Printer size={15} /></button><button className="mini-icon" onClick={() => void exportContainerStatementExcel()} aria-label="تنزيل كشف العبوات Excel"><Download size={15} /></button></div></div><label className="field"><span>الزبون</span><select value={containerStatementCustomer} onChange={(event) => setContainerStatementCustomer(event.target.value)}><option value="">اختر زبونًا</option>{containerStatementCustomers.map((customer) => <option key={customer} value={customer}>{customer}</option>)}</select></label>{containerStatementEntries.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>التاريخ</th><th>العبوة</th><th>الحركة</th><th>الكمية</th></tr></thead><tbody>{containerStatementEntries.map((entry) => <tr key={entry.id}><td>{formatDate(entry.createdAt)}</td><td>{entry.containerName}</td><td>{entry.direction === "out" ? "تسليم" : "استرجاع"}</td><td>{entry.quantity}</td></tr>)}</tbody></table></div> : <p className="modal-note">اختر زبونًا لعرض كشف حركة عبواته وطباعته أو تنزيله.</p>}</section>
	              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تقرير العبوات للشهر</span><h3>{monthlyContainerReport.rows.length ? `حركة ${currentMonthKey}` : "لا توجد حركات هذا الشهر"}</h3></div><button className="action-button action-button--secondary" onClick={() => void exportMonthlyContainersExcel()}><Download size={16} /> عبوات Excel</button></div>{monthlyContainerReport.rows.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>العبوة</th><th>تسليم</th><th>استرجاع</th><th>صافي الحركة</th></tr></thead><tbody>{monthlyContainerReport.rows.map((row) => <tr key={row.containerName}><td><strong>{row.containerName}</strong></td><td>{row.delivered}</td><td>{row.returned}</td><td><b>{row.netChange}</b></td></tr>)}<tr><td><strong>الإجمالي</strong></td><td>{monthlyContainerReport.totals.delivered}</td><td>{monthlyContainerReport.totals.returned}</td><td><b>{monthlyContainerReport.totals.netChange}</b></td></tr></tbody></table></div> : <p className="modal-note">ستظهر حركة الشهر بعد تسجيل تسليم أو استرجاع عبوات حقيقية.</p>}</section>
	              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">مواقع الرفوف</span><h3>{shelfLocations.length ? `${shelfLocations.length} مواقع محفوظة` : "نظّم الأصناف حسب موقعها"}</h3></div><span className="status-badge">اختياري ومحلي</span></div>{store.products.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>الموقع</th><th>الكمية</th></tr></thead><tbody>{[...store.products].sort((left, right) => (left.shelfLocation || "~").localeCompare(right.shelfLocation || "~", "ar") || left.name.localeCompare(right.name, "ar")).map((product) => <tr key={`shelf-${product.id}`}><td><strong>{product.name}</strong><small dir="ltr">{product.sku}</small></td><td><input aria-label={`موقع رف ${product.name}`} key={`${product.id}-${product.shelfLocation || ""}`} defaultValue={product.shelfLocation || ""} maxLength={50} placeholder="مثال: ر1 · رف 3" onBlur={(event) => updateProductShelfLocation(product.id, event.target.value)} /></td><td>{product.quantity}</td></tr>)}</tbody></table></div> : <p className="modal-note">أضف أصنافًا حقيقية أولًا ثم اكتب موقع كل صنف لتسهيل المرور أثناء الجرد.</p>}<p className="modal-note">اكتب رمزًا بسيطًا مثل «ر1 · رف 3». سيُستخدم الموقع في البحث والفرز داخل المخزون وجولة الجرد السريع.</p></section>
              {store.barcodeStocktakeDraft && <section className="panel weekly-report-strip"><div><span className="section-kicker">جولة الباركود محفوظة محليًا</span><h3>{barcodeStocktakeProgress.countedProducts} من {store.products.length} أصناف معدودة</h3><p>وحدات مسجلة {barcodeStocktakeProgress.scannedUnits} · غير معدودة {barcodeStocktakeProgress.uncountedProducts} · فروقات ظاهرة {barcodeStocktakeProgress.differences}. لا يتغير المخزون قبل اعتماد الجولة.</p></div><button className="action-button action-button--secondary" onClick={openBarcodeStocktake}><ClipboardList size={17} /> متابعة الجولة</button></section>}
              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">جرد حسب الفئة</span><h3>{inventoryCategorySummary.length ? `${inventoryCategorySummary.length} فئات في المخزون` : "لا توجد فئات بعد"}</h3></div><button className="action-button action-button--secondary" onClick={() => void exportInventoryCategoriesExcel()}><Download size={16} /> فئات المخزون Excel</button></div>{inventoryCategorySummary.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الفئة</th><th>الأصناف</th><th>الوحدات</th><th>قيمة الشراء</th><th>قيمة البيع</th><th>تحت الحد</th></tr></thead><tbody>{inventoryCategorySummary.map((group) => <tr key={group.category}><td><strong>{group.category}</strong></td><td>{group.productCount}</td><td>{group.units}</td><td dir="ltr">{money(group.purchaseValue)}</td><td dir="ltr">{money(group.saleValue)}</td><td><span className={`status-badge ${group.lowStockCount ? "status-badge--warning" : ""}`}>{group.lowStockCount ? `${group.lowStockCount} أصناف` : "مطمئن"}</span></td></tr>)}</tbody></table></div> : <p className="modal-note">ستظهر الفئات بعد حفظ أصناف حقيقية مع تصنيفها.</p>}<p className="modal-note">القيمة تحسب من الكمية الحالية وسعر الشراء أو البيع المحفوظ لكل صنف على هذا الجهاز.</p></section>
              <section className="panel batch-inventory-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">استلام المورد والدفعات</span><h3>جرد الدفعات حسب أقرب صلاحية</h3></div><span className="status-badge">{expirySortedBatches.length} نشطة · {batchHistory.length} في السجل</span></div>{store.products.length ? <><div className="notification-settings">{store.products.map((product) => <button key={product.id} onClick={() => { setReceivingProduct(product); setReceivingStaffMemberId(""); }}><span><strong>{product.name}</strong><small>{getActiveBatches(product.batches ?? []).length ? `${getActiveBatches(product.batches ?? []).length} دفعات · ${getBatchRemainingTotal(product.batches ?? [])} وحدة ضمن الدفعات` : "أضف أول دفعة موثقة"}</small></span><PackagePlus size={16} /></button>)}</div>{batchHistory.length ? <div className="price-history-list">{batchHistory.slice(0, 20).map(({ product, batch }) => { const expiry = getExpiryStatus(batch.expiryDate); const state = batch.wasteApproval ? "هدر معتمد" : batch.wasteRequest ? "بانتظار اعتماد ثانٍ" : batch.supplierReturn ? "مرجعة للمورد" : batch.remainingQuantity <= 0 ? "مستهلكة" : expiry.kind === "expired" ? "منتهية" : expiry.kind === "soon" ? "قريبة" : "نشطة"; const warning = state === "منتهية" || state === "قريبة" || state === "هدر معتمد" || state === "بانتظار اعتماد ثانٍ"; const editable = isBatchEditable(batch) && !batch.wasteRequest; const canReturn = editable && !batch.supplierReturn && !batch.wasteApproval; const canWaste = batch.remainingQuantity > 0 && expiry.kind === "expired" && !batch.wasteRequest && !batch.wasteApproval && !batch.supplierReturn; const canFinalApprove = Boolean(batch.wasteRequest && !batch.wasteApproval && !batch.supplierReturn && batch.remainingQuantity > 0); return <div className="price-history-row" key={batch.id}><span><strong>{product.name}</strong><small>{batch.supplierName || "بدون مورد"} · استلام {formatDate(batch.receivedAt)}{batch.note ? ` · ${batch.note}` : ""}</small></span><b>{batch.remainingQuantity} / {batch.quantity}</b><span className={`status-badge ${warning ? "status-badge--warning" : ""}`}>{state} · {batch.expiryDate || "بلا تاريخ صلاحية"}</span><div className="row-actions"><button className="mini-icon" onClick={() => printSupplierReceivingNotice(product, batch)} aria-label="طباعة إشعار الاستلام"><Printer size={14} /></button><button className="mini-icon" disabled={!batch.supplierReturn} onClick={() => printSupplierReturnNotice(product, batch)} aria-label="طباعة إشعار الإرجاع"><ReceiptText size={14} /></button><button className="mini-icon" disabled={!editable} onClick={() => setEditingBatch({ product, batch })} aria-label="تعديل الدفعة غير المستهلكة"><Pencil size={14} /></button><button className="mini-icon" disabled={!canWaste} onClick={() => setWasteApprovalBatch({ product, batch })} aria-label="طلب اعتماد هدر الدفعة المنتهية"><Archive size={14} /></button><button className="mini-icon" disabled={!canFinalApprove} onClick={() => setFinalWasteApprovalBatch({ product, batch })} aria-label="اعتماد هدر نهائي"><Check size={14} /></button><button className="mini-icon" disabled={!canReturn} onClick={() => setSupplierReturnBatch({ product, batch })} aria-label="إرجاع الدفعة إلى المورد"><ArrowLeft size={14} /></button><button className="mini-icon mini-icon--danger" disabled={!editable} onClick={() => cancelBatch(product, batch)} aria-label="إلغاء الدفعة غير المستهلكة"><Trash2 size={14} /></button></div></div>; })}</div> : <p className="modal-note">لم تسجل دفعات بعد؛ اختر أي صنف أعلاه لتوثيق أول استلام من المورد.</p>}</> : <EmptyState icon={Archive} title="أضف صنفًا أولًا" description="بعد إضافة الأصناف، ستتمكن من استلام دفعات الموردين وتتبع صلاحيتها." />}</section>
              {inactiveProducts.length > 0 && <section className="panel weekly-report-strip"><div><span className="section-kicker">متابعة الحركة</span><h3>{inactiveProducts.length} أصناف بلا حركة</h3><p>{inactiveProducts.slice(0, 3).map(({ product }) => product.name).join(" · ")}{inactiveProducts.length > 3 ? " · وغيرها" : ""}</p></div><button className="action-button action-button--secondary" onClick={() => setActivePage("reports")}><BarChart3 size={17} /> فتح التقرير الشهري</button></section>}
              <section className="panel weekly-report-strip"><div><span className="section-kicker">قائمة شراء محلية</span><h3>{supplierPurchaseList.length ? `${supplierPurchaseList.reduce((count, group) => count + group.products.length, 0)} أصناف تحتاج شراء` : "المخزون يغطي حد التنبيه"}</h3><p>{supplierPurchaseList.length ? supplierPurchaseList.map((group) => `${group.supplierName}: ${group.products.length}`).join(" · ") : "ستظهر هنا الأصناف المنخفضة مجمعة حسب المورد."}</p></div><div className="inventory-page__actions"><button className="action-button action-button--primary" onClick={openSupplierPurchaseOrder}><ShoppingBag size={17} /> تجهيز طلب شراء</button><button className="action-button action-button--secondary" onClick={printSupplierPurchaseList}><Printer size={17} /> طباعة المقترح</button></div></section>
              <section className="weekly-report-strip"><div><span className="section-kicker">جرد أسبوعي محلي</span><h3>{stocktakeDue ? "موعد الجرد اليوم" : "موعد الجرد مضبوط"}</h3><p>{stocktakeDue ? "راجِع الأصناف ثم اعتمد جرد الأسبوع بعد الانتهاء." : stocktakeSettings.lastCompletedAt ? `آخر اعتماد: ${formatDate(stocktakeSettings.lastCompletedAt)}` : "سيظهر التذكير عند حلول اليوم المحدد."}</p></div><div className="inventory-page__actions"><label className="field"><span>يوم الجرد</span><select value={stocktakeSettings.weekday} onChange={(event) => setStocktakeSettings((current) => ({ ...current, weekday: Number(event.target.value) }))}><option value="0">الأحد</option><option value="1">الاثنين</option><option value="2">الثلاثاء</option><option value="3">الأربعاء</option><option value="4">الخميس</option><option value="5">الجمعة</option><option value="6">السبت</option></select></label><button className="action-button action-button--secondary" onClick={completeWeeklyStocktake}><Check size={17} /> اعتماد جرد الأسبوع</button></div></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">مقارنة جولات الجرد</span><h3>{stocktakeRunComparison.current && stocktakeRunComparison.previous ? "آخر جولتين معتمدتين" : "تحتاج جولتين معتمدتين للمقارنة"}</h3><p>{stocktakeRunComparison.current && stocktakeRunComparison.previous ? `الأحدث: ${stocktakeRunComparison.current.products} أصناف · ${stocktakeRunComparison.current.adjustedProducts} فروقات. السابقة: ${stocktakeRunComparison.previous.products} أصناف · ${stocktakeRunComparison.previous.adjustedProducts} فروقات.` : "بعد اعتماد جولتي جرد، ستظهر مقارنة الفروقات وقيمتها تلقائيًا من السجلات المحلية."}</p></div>{stocktakeRunComparison.current && stocktakeRunComparison.previous ? <div className="inventory-page__actions"><span className={`status-badge ${stocktakeRunComparison.adjustedProductChange && stocktakeRunComparison.adjustedProductChange > 0 ? "status-badge--warning" : ""}`}>فرق الأصناف {stocktakeRunComparison.adjustedProductChange && stocktakeRunComparison.adjustedProductChange > 0 ? "+" : ""}{stocktakeRunComparison.adjustedProductChange}</span><span className={`status-badge ${stocktakeRunComparison.shortageValueChange && stocktakeRunComparison.shortageValueChange > 0 ? "status-badge--warning" : ""}`}>فرق العجز {money(stocktakeRunComparison.shortageValueChange ?? 0)}</span></div> : <span className="status-badge">محلي بالكامل</span>}</section>
              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">سجل فروقات الجرد</span><h3>{stocktakeRecordSummary.count ? `${stocktakeRecordSummary.count} تسويات محفوظة` : "لا توجد فروقات جرد محفوظة"}</h3></div><span className={`status-badge ${stocktakeRecordSummary.shortageUnits ? "status-badge--warning" : ""}`}>عجز {stocktakeRecordSummary.shortageUnits} · زيادة {stocktakeRecordSummary.surplusUnits}</span></div>{recentStocktakeRecords.length ? <div className="price-history-list">{recentStocktakeRecords.map((record) => <div className="price-history-row" key={record.id}><span><strong>{record.productName}</strong><small>{formatDate(record.recordedAt)} · مسجل {record.recordedQuantity} · فعلي {record.actualQuantity}</small></span><b dir="ltr">{record.difference > 0 ? "+" : ""}{record.difference} وحدة</b><span className={`status-badge ${record.difference < 0 ? "status-badge--warning" : ""}`}>{money(Math.abs(record.valueDifference))}</span></div>)}</div> : <p className="modal-note">نفّذ الجرد اليدوي أو بالكاميرا؛ سيُحفظ كل فرق مع قيمته بسعر الشراء داخل هذا السجل.</p>}</section>
              {shelfLocations.length > 0 && <section className="weekly-report-strip"><div><span className="section-kicker">مرور بحسب الرف</span><h3>{inventoryShelfFilter || "كل مواقع الرفوف"}</h3><p>تُرتّب قائمة الأصناف وجولة الباركود حسب الموقع المكتوب لكل صنف.</p></div><label className="field"><span>تصفية الموقع</span><select value={inventoryShelfFilter} onChange={(event) => setInventoryShelfFilter(event.target.value)}><option value="">كل المواقع</option>{shelfLocations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label></section>}
              <section className="panel inventory-table-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">قائمة الأصناف</span><h3>المخزون الحالي</h3></div><label className="search-box search-box--small"><Search size={17} /><input value={inventoryQuery} onChange={(event) => setInventoryQuery(event.target.value)} placeholder="ابحث باسم أو رمز..." /></label></div>
                <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>الرمز</th><th>المتوفر</th><th>سعر الشراء</th><th>سعر البيع</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>{filteredInventory.map((product) => { const low = product.quantity <= product.lowStockAt; const expiry = getExpiryStatus(product.expiryDate); return <tr key={product.id}><td><div className="product-cell">{product.imageDataUrl ? <img src={product.imageDataUrl} alt="" /> : <span>{product.name.slice(0, 1)}</span>}<div><strong>{product.name}</strong><small>{product.category}{product.supplierName ? ` · ${product.supplierName}` : ""}</small></div></div></td><td dir="ltr">{product.sku}</td><td><b className={low ? "low-number" : ""}>{product.quantity}</b><small> / حد {product.lowStockAt}</small></td><td dir="ltr">{money(product.purchasePrice)}</td><td dir="ltr">{money(product.salePrice)}</td><td><span className={`status-badge ${low || expiry.kind === "soon" || expiry.kind === "expired" ? "status-badge--warning" : ""}`}>{expiry.kind === "expired" ? "منتهي" : expiry.kind === "soon" ? `ينتهي ${product.expiryDate}` : low ? "منخفض" : "متوفر"}</span></td><td><div className="row-actions"><button className="mini-icon" onClick={() => addInventoryQuantity(product)} aria-label="إضافة كمية"><Plus size={16} /></button><button className="mini-icon" onClick={() => setPriceHistoryProductId(product.id)} aria-label="سجل الأسعار"><History size={15} /></button><button className="mini-icon" onClick={() => openProductForm(product)} aria-label="تعديل الصنف"><Pencil size={15} /></button><button className="mini-icon mini-icon--danger" onClick={() => deleteProduct(product)} aria-label="حذف الصنف"><Trash2 size={15} /></button></div></td></tr>})}</tbody></table></div>
                {!filteredInventory.length && <EmptyState icon={Archive} title="المخزون فارغ" description="أضف أول صنف لتبدأ متابعة منتجات محلك." />}
                {priceHistoryProductId && <section className="price-history-panel"><div className="panel-heading"><div><span className="section-kicker">سجل الأسعار</span><h3>{store.products.find((product) => product.id === priceHistoryProductId)?.name || "صنف"}</h3></div><button className="text-button" onClick={() => setPriceHistoryProductId(null)}>إغلاق</button></div>{selectedProductPriceHistory.length ? <div className="price-history-list">{selectedProductPriceHistory.map((entry) => <div className="price-history-row" key={entry.id}><span>{entry.field === "purchasePrice" ? "سعر الشراء" : "سعر البيع"}</span><b dir="ltr">{money(entry.previous)}</b><ArrowLeft size={15} /><strong dir="ltr">{money(entry.next)}</strong><small>{formatDate(entry.createdAt)}</small></div>)}</div> : <EmptyState icon={History} title="لا توجد تغييرات مسجلة" description="سيظهر هنا كل تعديل لاحق على سعر الشراء أو البيع لهذا الصنف." />}</section>}
	              </section>
	            </section>
	            </>
	          )}

          {page === "debts" && (
            <section className="debts-page">
              <div className="page-intro"><div><span className="eyebrow"><WalletCards size={15} /> متابعة الزبائن</span><h2>دفتر الذمم، <em>من دون ورق.</em></h2><p>كل عملية آجلة تسجل تلقائيًا. أضف ذمة يدوية أو سجل دفعة عندما يسدد الزبون.</p></div><button className="action-button action-button--primary" onClick={() => setShowDebtForm(true)}><Plus size={18} /> إضافة ذمة</button></div>
              <div className="debt-overview"><div className="debt-overview__total"><span>إجمالي المبلغ المستحق</span><strong dir="ltr">{money(totalOutstanding)}</strong><small>لدى {store.debts.filter((debt) => debt.amount > debt.paid).length} زبون</small></div><div className="debt-overview__hint"><CircleAlert size={22} /><p>حافظ على التواصل: الذمة الواضحة تحمي علاقتك بالزبون وتساعدك على التخطيط للشراء.</p></div></div>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">كشف حساب الزبون</span><h3>{customerStatement ? customerStatement.customerName : "اختر زبونًا لمراجعة حركاته"}</h3><p>{customerStatement ? `فواتير آجل ${money(customerStatement.invoiced)} · إرجاعات ${money(customerStatement.returned)} · تحصيلات ${money(customerStatement.collected)} · الرصيد ${money(customerStatement.balance)}.` : "يجمع الفواتير الآجلة والتحصيلات والإرجاعات المحفوظة على هذا الجهاز."}</p></div><div className="inventory-page__actions"><select aria-label="اختيار زبون لكشف الحساب" value={customerStatementName} onChange={(event) => setCustomerStatementName(event.target.value)}><option value="">اختر زبونًا</option>{customerStatementNames.map((name) => <option key={name} value={name}>{name}</option>)}</select>{customerStatement && <label className="field"><span>سقف الائتمان (د.ل)</span><input key={customerStatement.customerName} type="number" inputMode="decimal" min="0" step="0.01" defaultValue={store.customerCreditLimits[customerStatement.customerName.trim().toLocaleLowerCase("ar")] ?? ""} placeholder="بلا سقف" onBlur={(event) => updateCustomerCreditLimit(customerStatement.customerName, event.target.value)} /></label>}<button className="action-button action-button--secondary" disabled={!customerStatement} onClick={printCustomerStatement}><Printer size={16} /> طباعة الكشف</button><button className="action-button action-button--secondary" disabled={!customerStatement} onClick={() => void exportCustomerStatementExcel()}><Download size={16} /> كشف Excel</button></div></section>
              {customerStatement && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">حركات {customerStatement.customerName}</span><h3>{customerStatement.entries.length ? `${customerStatement.entries.length} حركات محفوظة` : "لا توجد حركات"}</h3></div><span className="status-badge">الرصيد {money(customerStatement.balance)}</span></div>{customerStatement.entries.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>التاريخ</th><th>العملية</th><th>المرجع</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>{customerStatement.entries.map((entry) => <tr key={entry.id}><td>{formatDate(entry.occurredAt)}</td><td>{entry.type}</td><td>{entry.reference}<small>{entry.note}</small></td><td dir="ltr">{entry.debit ? money(entry.debit) : "—"}</td><td dir="ltr">{entry.credit ? money(entry.credit) : "—"}</td><td dir="ltr"><b>{money(entry.balance)}</b></td></tr>)}</tbody></table></div> : <p className="modal-note">لا توجد فواتير آجل أو تحصيلات أو إرجاعات مسجلة لهذا الزبون بعد.</p>}</section>}
              <section className="panel debt-list-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">سجل الذمم</span><h3>{showSettledDebts ? "أرشيف الذمم المسددة" : "المبالغ القائمة"}</h3></div><div className="debt-list-tools"><label className="search-box search-box--small"><Search size={17} /><input value={debtQuery} onChange={(event) => setDebtQuery(event.target.value)} placeholder="ابحث بالاسم أو الهاتف..." /></label><button className="action-button action-button--secondary debt-archive-toggle" onClick={() => setShowSettledDebts((current) => !current)}><Archive size={15} />{showSettledDebts ? `إظهار القائمة (${activeDebts.length})` : `الأرشيف (${settledDebts.length})`}</button><span className="status-badge">تحديث محلي فوري</span></div></div>{store.debts.length ? (showSettledDebts ? settledDebts : activeDebts).length ? <div className="debt-list">{(showSettledDebts ? settledDebts : activeDebts).map((debt) => { const remaining = Math.max(0, debt.amount - debt.paid); const settled = isSettledDebt(debt); return <div className={`debt-row ${settled ? "debt-row--settled" : ""}`} key={debt.id}><div className="debt-avatar">{debt.customerName.slice(0, 1)}</div><div className="debt-person"><strong>{debt.customerName}</strong><small>{debt.customerPhone ? `هاتف: ${debt.customerPhone} · ` : ""}{debt.note || `سجلت في ${formatDate(debt.createdAt)}`}{debt.dueDate ? ` · استحقاق ${debt.dueDate}` : ""}</small></div><div className="debt-amount"><span>المتبقي</span><b dir="ltr">{money(remaining)}</b><small>من {money(debt.amount)}</small></div><div className="debt-progress"><span><i style={{ width: `${Math.min(100, (debt.paid / debt.amount) * 100) || 0}%` }} /></span><small>تم تحصيل {money(debt.paid)}</small></div>{settled ? <span className="settled-label"><Check size={15} /> مسددة</span> : <div className="debt-row-actions"><button className="action-button action-button--secondary" onClick={() => collectDebt(debt)}>تسجيل دفعة</button>{debt.customerPhone && <button className="mini-icon mini-icon--whatsapp" onClick={() => openDebtReminder(debt)} aria-label="فتح تذكير واتساب يدوي"><MessageCircle size={16} /></button>}</div>}</div>})}</div> : <EmptyState icon={showSettledDebts ? Archive : Search} title={showSettledDebts ? "الأرشيف فارغ" : "لا توجد ذمم قائمة مطابقة"} description={showSettledDebts ? "ستظهر هنا الذمم بعد تحصيلها بالكامل." : "جرّب كتابة اسم الزبون أو رقم هاتفه دون مسافات إضافية."} /> : <EmptyState icon={WalletCards} title="دفتر الذمم فارغ" description="عند اختيار «آجل / ذمة» أثناء البيع، سيظهر سجل الزبون هنا تلقائيًا." action={<button className="text-button text-button--strong" onClick={() => setActivePage("sale")}>فتح شاشة البيع <ArrowLeft size={16} /></button>} />}</section>
            </section>
          )}

	          {page === "reports" && (
	            <section className="reports-page">
	              <div className="page-intro"><div><span className="eyebrow"><BarChart3 size={15} /> أرقام واضحة</span><h2>اعرف كيف مضى <em>يوم محلك.</em></h2><p>تقارير مبنية من فواتيرك المحفوظة على هذا الجهاز، بلا إنترنت ولا تعقيد.</p></div><div className="inventory-page__actions"><button className="action-button action-button--secondary" onClick={exportData}><Download size={17} /> نسخة احتياطية</button><button className="action-button action-button--secondary" onClick={() => void exportLocalOperationsExcel()}><Download size={17} /> تشغيل محلي Excel</button><button className="action-button action-button--primary" onClick={() => void exportReportsExcel()}><FileText size={17} /> تقرير Excel</button></div></div>
	              <section className="panel price-history-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">طرق الدفع اليوم</span><h3>صافي المبيعات بعد الإرجاعات</h3></div><div className="inventory-page__actions"><button className="action-button action-button--secondary" onClick={printDailyPaymentSummary}><Printer size={16} /> طباعة الملخص</button><button className="action-button action-button--secondary" onClick={() => void exportDailyPaymentSummaryExcel()}><Download size={16} /> Excel</button></div></div><div className="table-wrap"><table className="inventory-table"><thead><tr><th>طريقة الدفع</th><th>فواتير البيع</th><th>الإرجاعات</th><th>إجمالي البيع</th><th>قيمة الإرجاع</th><th>الصافي</th></tr></thead><tbody>{dailyPaymentSummary.map((row) => <tr key={row.paymentMethod}><td><strong>{row.label}</strong></td><td>{row.saleReceipts}</td><td>{row.returnReceipts}</td><td dir="ltr">{money(row.grossSales)}</td><td dir="ltr">{money(row.returnedValue)}</td><td dir="ltr"><b>{money(row.netSales)}</b></td></tr>)}<tr><td><strong>الإجمالي</strong></td><td>{dailyPaymentSummaryTotals.saleReceipts}</td><td>{dailyPaymentSummaryTotals.returnReceipts}</td><td dir="ltr">{money(dailyPaymentSummaryTotals.grossSales)}</td><td dir="ltr">{money(dailyPaymentSummaryTotals.returnedValue)}</td><td dir="ltr"><b>{money(dailyPaymentSummaryTotals.netSales)}</b></td></tr></tbody></table></div><p className="modal-note">يفصل الملخص مبيعات اليوم عن الإرجاعات ثم يعرض صافي كل طريقة دفع محليًا.</p></section>
	              <section className="panel price-history-panel digital-payment-report"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">الدفع الإلكتروني اليوم</span><h3>البطاقات والتحويلات حسب البنك والجهاز</h3><small>عرض منفصل لتسهيل مطابقة معاملات المصرف ونقاط البيع.</small></div><span className="status-badge">{digitalPaymentSummary.length} قنوات</span></div><div className="table-wrap"><table className="inventory-table"><thead><tr><th>طريقة الدفع</th><th>البنك</th><th>الجهاز</th><th>فواتير البيع</th><th>الإرجاعات</th><th>إجمالي البيع</th><th>قيمة الإرجاع</th><th>الصافي</th></tr></thead><tbody>{digitalPaymentSummary.map((row) => <tr key={`${row.paymentMethod}-${row.bankName}-${row.posTerminalType}`}><td><strong>{row.label}</strong></td><td>{row.bankName}</td><td>{row.posTerminalType}</td><td>{row.saleReceipts}</td><td>{row.returnReceipts}</td><td dir="ltr">{money(row.grossSales)}</td><td dir="ltr">{money(row.returnedValue)}</td><td dir="ltr"><b>{money(row.netSales)}</b></td></tr>)}</tbody></table></div>{!digitalPaymentSummary.length && <p className="modal-note">ستظهر هنا معاملات البطاقة والتحويل بعد تسجيل أول فاتورة إلكترونية اليوم.</p>}</section><section className="panel price-history-panel reconciliation-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">مراجعة الأرصدة</span><h3>مطابقة أجهزة نقاط البيع مع كشف الحساب</h3><small>أدخل إجمالي كشف المصرف لليوم، وسيقارن النظام تلقائيًا بصافي المعاملات المسجلة محليًا.</small></div><div className="inventory-page__actions"><label className="field"><span>يوم المطابقة</span><input type="date" value={reconciliationDate} onChange={(event) => setReconciliationDate(event.target.value)} /></label><button type="button" className="action-button action-button--secondary" onClick={() => void exportPaymentReconciliationExcel()}><Download size={16} /> Excel المطابقة</button></div></div><div className="reconciliation-grid">{reconciliationRows.map((row) => <article className={`reconciliation-card ${row.matched ? "is-matched" : "has-difference"}`} key={row.paymentMethod}><div className="reconciliation-card__header"><div><span className="section-kicker">{row.label}</span><h4>{row.matched ? "مطابق" : "يحتاج مراجعة"}</h4></div><strong dir="ltr">{money(Math.abs(row.difference))}</strong></div><div className="reconciliation-card__metrics"><span>صافي الجهاز <b dir="ltr">{money(row.posTotal)}</b></span><label>كشف الحساب<input type="number" min="0" step="0.01" inputMode="decimal" value={reconciliationStatements[row.paymentMethod]} onChange={(event) => setReconciliationStatements((current) => ({ ...current, [row.paymentMethod]: event.target.value }))} placeholder="0.00" /></label><span>الفرق <b dir="ltr">{money(row.difference)}</b></span></div><button type="button" className="action-button action-button--secondary" onClick={() => savePaymentReconciliation(row.paymentMethod)}>{row.matched ? "اعتماد المطابقة" : "حفظ نتيجة المراجعة"}</button></article>)}</div><label className="customer-field reconciliation-note"><span>ملاحظة المراجعة (اختياري)</span><input value={reconciliationNote} maxLength={240} onChange={(event) => setReconciliationNote(event.target.value)} placeholder="مثال: تم التحقق من كشف المصرف أو سبب الفرق" /></label><div className="reconciliation-history"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">السجل التاريخي</span><h4>عمليات المطابقة السابقة</h4><small>{filteredReconciliationHistory.length} نتيجة محفوظة محليًا</small></div></div><div className="reconciliation-history__filters"><input value={reconciliationHistoryQuery} onChange={(event) => setReconciliationHistoryQuery(event.target.value)} placeholder="ابحث بالتاريخ أو الملاحظة" aria-label="البحث في سجل المطابقة" /><select value={reconciliationHistoryMethod} onChange={(event) => setReconciliationHistoryMethod(event.target.value as "all" | "card" | "transfer")}><option value="all">كل طرق الدفع</option><option value="card">بطاقة مصرفية</option><option value="transfer">تحويل مصرفي</option></select><select value={reconciliationHistoryStatus} onChange={(event) => setReconciliationHistoryStatus(event.target.value as "all" | "matched" | "difference")}><option value="all">كل الحالات</option><option value="matched">مطابق فقط</option><option value="difference">به فرق فقط</option></select></div>{filteredReconciliationHistory.length ? <div className="reconciliation-history__list">{filteredReconciliationHistory.map((entry) => <div className="reconciliation-history__row" key={entry.id}><div><strong>{entry.date} · {getPaymentMethodLabel(entry.paymentMethod)}</strong><small>{entry.note || "دون ملاحظة"} · اعتماد {formatDate(entry.reviewedAt)}</small></div><span><b dir="ltr">فرق {money(entry.difference)}</b><i className={Math.abs(entry.difference) < 0.01 ? "is-matched" : "has-difference"}>{Math.abs(entry.difference) < 0.01 ? "مطابق" : "يحتاج مراجعة"}</i><button type="button" className="text-button text-button--strong" onClick={() => setSelectedReconciliation(entry)}>عرض التفاصيل</button></span></div>)}</div> : <p className="modal-note">لا توجد عمليات مطابقة محفوظة توافق البحث الحالي.</p>}</div>{selectedReconciliation && <div className="reconciliation-detail-backdrop" role="presentation" onClick={() => setSelectedReconciliation(null)}><section className="reconciliation-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="reconciliation-detail-title" onClick={(event) => event.stopPropagation()}><div className="reconciliation-detail-dialog__header"><div><span className="section-kicker">تفاصيل عملية المطابقة</span><h3 id="reconciliation-detail-title">{getPaymentMethodLabel(selectedReconciliation.paymentMethod)} · {selectedReconciliation.date}</h3></div><button type="button" className="icon-button" onClick={() => setSelectedReconciliation(null)} aria-label="إغلاق التفاصيل">×</button></div><div className="reconciliation-detail-grid"><div><span>صافي جهاز نقاط البيع</span><b dir="ltr">{money(selectedReconciliation.posTotal)}</b></div><div><span>كشف الحساب المصرفي</span><b dir="ltr">{money(selectedReconciliation.bankStatementTotal)}</b></div><div><span>الفرق المحسوب</span><b dir="ltr">{money(selectedReconciliation.difference)}</b></div><div><span>الحالة</span><b className={Math.abs(selectedReconciliation.difference) < 0.01 ? "detail-status--matched" : "detail-status--difference"}>{Math.abs(selectedReconciliation.difference) < 0.01 ? "مطابق" : "يحتاج مراجعة"}</b></div><div><span>وقت الاعتماد</span><b>{formatDate(selectedReconciliation.reviewedAt)}</b></div><div><span>الملاحظة</span><b>{selectedReconciliation.note || "لا توجد ملاحظة"}</b></div></div><button type="button" className="action-button action-button--primary" onClick={() => setSelectedReconciliation(null)}>إغلاق التفاصيل</button></section></div>}<p className="modal-note">الفرق = كشف الحساب − صافي جهاز نقاط البيع. تتم معالجة البيانات محليًا على هذا الجهاز.</p></section><section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">مبيعات الفئات</span><h3>{categorySalesReport.entries.length ? "الربحية حسب التصنيف" : "لا توجد مبيعات مصنفة بعد"}</h3></div><button className="action-button action-button--secondary" onClick={() => void exportCategorySalesExcel()}><Download size={16} /> فئات Excel</button></div>{categorySalesReport.entries.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الفئة</th><th>مباعة</th><th>مرتجعة</th><th>صافي وحدات</th><th>الإيراد</th><th>الربح</th></tr></thead><tbody>{categorySalesReport.entries.map((entry) => <tr key={entry.category}><td><strong>{entry.category}</strong></td><td>{entry.soldUnits}</td><td>{entry.returnedUnits}</td><td>{entry.netUnits}</td><td dir="ltr">{money(entry.revenue)}</td><td dir="ltr"><b>{money(entry.profit)}</b></td></tr>)}<tr><td><strong>الإجمالي</strong></td><td>{categorySalesReport.totals.soldUnits}</td><td>{categorySalesReport.totals.returnedUnits}</td><td>{categorySalesReport.totals.netUnits}</td><td dir="ltr">{money(categorySalesReport.totals.revenue)}</td><td dir="ltr"><b>{money(categorySalesReport.totals.profit)}</b></td></tr></tbody></table></div> : <p className="modal-note">ستظهر مبيعات وربحية كل فئة بعد اعتماد فواتير حقيقية.</p>}<p className="modal-note">تخصم الإرجاعات من الوحدات والإيراد والتكلفة، وتحسب خصومات الفاتورة بنسبتها على الأصناف.</p></section>
	              <section className="panel weekly-report-strip"><div><span className="section-kicker">تحليل تشغيلي محلي</span><h3>{operationalRiskInsights.length ? `${operationalRiskInsights.length} أصناف تحتاج قرار شراء` : "المخزون تحت متابعة حسابية"}</h3><p>يحسب آخر 14 يومًا من مبيعات المحل ومتوسط الطلب وأيام التغطية داخل هذا الجهاز، دون أي خدمة خارجية أو إرسال بيانات إلى الإنترنت.</p></div><div className="inventory-page__actions"><button className="action-button action-button--secondary" onClick={() => void exportLocalAnalysisExcel()}><Download size={17} /> تحليل تشغيل Excel</button><button className="action-button action-button--secondary" onClick={printLocalDecisionCenter}><Printer size={17} /> طباعة القرارات</button></div></section>
	              <section className="panel price-history-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">مركز قرارات المحل</span><h3>{localDecisionCenter.actions.length ? `${localDecisionCenter.actions.length} إجراءات مرتبة بالأولوية` : "لا توجد إجراءات عاجلة حاليًا"}</h3><p>قواعد محلية تجمع خطر النفاد والسيولة والذمم والمخزون الراكد ومخاطر التسعير، دون إنترنت أو ذكاء اصطناعي.</p></div><span className={`status-badge ${localDecisionCenter.urgentCount || localDecisionCenter.priceRiskCount ? "status-badge--warning" : ""}`}>{localDecisionCenter.urgentCount ? `${localDecisionCenter.urgentCount} عاجلة` : "مستقر"}</span></div>{localDecisionCenter.actions.length ? <div className="price-history-list">{localDecisionCenter.actions.map((action) => <button type="button" className="price-history-row" key={action.id} onClick={() => setActivePage(action.page)}><span><strong>{action.title}</strong><small>{action.detail}</small></span><b dir="ltr">{action.metric}</b><span className={`status-badge ${action.priority === "urgent" ? "status-badge--warning" : ""}`}>{action.priority === "urgent" ? "عاجل" : action.priority === "watch" ? "متابعة" : "مراجعة"}</span></button>)}</div> : <p className="modal-note">أكمل تسجيل المبيعات والمخزون الحقيقي لتظهر قرارات أدق قابلة للتنفيذ.</p>}</section>
              <div className="report-stats"><StatCard label="خطر نفاد عاجل" value={String(operationalInsights.filter((entry) => entry.risk === "urgent").length)} detail="تغطية لا تتجاوز 3 أيام وفق الطلب" icon={CircleAlert} tone="apricot" /><StatCard label="تحتاج متابعة" value={String(operationalInsights.filter((entry) => entry.risk === "watch").length)} detail="تغطية أسبوع أو أقل / قرب حد التنبيه" icon={TrendingUp} tone="sand" /><StatCard label="تكلفة شراء مقترحة" value={money(purchaseRecommendations.reduce((total, group) => total + group.estimatedCost, 0))} detail={`${purchaseRecommendations.reduce((total, group) => total + group.units, 0)} وحدة مقترحة`} icon={PackagePlus} tone="olive" /><StatCard label={`صافي سيولة ${cashFlowForecast.horizonDays} أيام`} value={money(cashFlowForecast.projectedNet)} detail={cashFlowForecast.signal === "positive" ? "توقع موجب" : cashFlowForecast.signal === "watch" ? "هامش محدود" : "يحتاج تدخلاً"} icon={WalletCards} tone={cashFlowForecast.signal === "negative" ? "apricot" : cashFlowForecast.signal === "watch" ? "sand" : "blue"} /></div>
              {operationalRiskInsights.length > 0 ? <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">أولوية الشراء</span><h3>توصيات قابلة للتفسير</h3></div><span className="status-badge">آخر 14 يومًا</span></div><div className="price-history-list">{operationalRiskInsights.slice(0, 8).map((entry) => <div className="price-history-row" key={`demand-${entry.productId}`}><span><strong>{entry.productName}</strong><small>{entry.supplierName} · {entry.explanation}</small></span><b dir="ltr">{entry.recommendedOrderQuantity} وحدة</b><span className={`status-badge ${entry.risk === "urgent" ? "status-badge--warning" : ""}`}>{entry.daysOfCover === null ? "لا بيانات طلب" : `${entry.daysOfCover.toFixed(1)} يوم تغطية`}</span></div>)}</div></section> : <section className="panel weekly-report-strip"><div><span className="section-kicker">أولوية الشراء</span><h3>لا توجد توصيات عاجلة حاليًا</h3><p>ستظهر التوصيات عندما تتوفر مبيعات محلية حديثة أو ينخفض الرصيد نحو حد التنبيه.</p></div></section>}
              {purchaseRecommendations.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">خطة شراء الموردين</span><h3>تجميع التوصيات لتقليل الجهد</h3></div><span className="status-badge">{purchaseRecommendations.length} موردين</span></div><div className="price-history-list">{purchaseRecommendations.slice(0, 6).map((group) => <div className="price-history-row" key={`recommendation-${group.supplierName}`}><span><strong>{group.supplierName}</strong><small>{group.entries.length} أصناف · {group.urgentItems ? `${group.urgentItems} عاجلة` : "لا أصناف عاجلة"}</small></span><b dir="ltr">{money(group.estimatedCost)}</b><span className="status-badge">{group.units} وحدة</span></div>)}</div></section>}
              <section className="panel weekly-report-strip"><div><span className="section-kicker">توقع السيولة</span><h3>{cashFlowForecast.signal === "positive" ? "التدفق المتوقع موجب" : cashFlowForecast.signal === "watch" ? "راقب هامش السيولة" : "راجع المصروفات والتحصيلات"}</h3><p>{cashFlowForecast.explanation} دخل متوقع {money(cashFlowForecast.projectedIncome)} · مصروفات متوقعة {money(cashFlowForecast.projectedExpenses)} خلال {cashFlowForecast.horizonDays} أيام.</p></div><span className={`status-badge ${cashFlowForecast.signal !== "positive" ? "status-badge--warning" : ""}`}>{money(cashFlowForecast.projectedNet)}</span></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">صندوق اليوم</span><h3>{todayCashClosing ? "إغلاق الوردية معتمد" : "مراجعة النقد قبل إغلاق الوردية"}</h3><p>نقد متوقع {money(todayCashSummary.expectedCash)} · تحصيل ذمم {money(todayCashSummary.debtCollections)} · مصروفات {money(todayCashSummary.expenses)} · صافي تشغيل {money(todayCashSummary.netOperatingProfit)}</p></div><div className="inventory-page__actions"><button className="action-button action-button--secondary" onClick={() => setShowCashExpenseForm(true)}><Minus size={17} /> تسجيل مصروف</button><button className="action-button action-button--primary" onClick={openCashClosingForm}><Check size={17} /> {todayCashClosing ? "تحديث الإغلاق" : "إغلاق وردية"}</button></div></section>
              <div className="report-stats"><StatCard label="مبيعات نقدية" value={money(todayCashSummary.cashSales)} detail={`${todayCashSummary.invoices} فواتير اليوم`} icon={CircleDollarSign} tone="olive" /><StatCard label="تحصيل ذمم اليوم" value={money(todayCashSummary.debtCollections)} detail={`${todayCashSummary.collectionCount} تحصيلات نقدية`} icon={WalletCards} tone="sand" /><StatCard label="مبيعات آجلة" value={money(todayCashSummary.creditSales)} detail="لا تدخل ضمن نقد الصندوق" icon={WalletCards} tone="sand" /><StatCard label={todayCashClosing ? "فارق الإغلاق" : "النقد المتوقع"} value={money(todayCashClosing ? Math.abs(todayCashSummary.variance ?? 0) : todayCashSummary.expectedCash)} detail={todayCashClosing ? ((todayCashSummary.variance ?? 0) === 0 ? "النقد متطابق" : (todayCashSummary.variance ?? 0) > 0 ? "زيادة مسجلة" : "عجز يحتاج مراجعة") : "افتتاحي + مبيعات نقدية + تحصيل ذمم - مصروفات"} icon={ReceiptText} tone="blue" /></div>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">مصروفات اليوم</span><h3>{todayExpenses.length ? `${todayExpenses.length} مصروفات مسجلة` : "لم تسجل مصروفات اليوم"}</h3><p>{todayExpenses.length ? todayExpenses.slice(0, 3).map((expense) => `${expense.category}: ${money(expense.amount)}`).join(" · ") : "سجّل الإيجار الجزئي أو النقل أو المشتريات التشغيلية لظهور صافي الربح بدقة."}</p></div><span className={`status-badge ${todayExpenses.length ? "status-badge--warning" : ""}`}>{money(todayCashSummary.expenses)}</span></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">سقف مصروفات اليوم</span><h3>{todayExpenseLimitStatus.active ? (todayExpenseLimitStatus.exceeded ? "تم تجاوز السقف" : todayExpenseLimitStatus.nearing ? "اقتربت من السقف" : "المصروفات ضمن السقف") : "لم يُضبط سقف بعد"}</h3><p>{todayExpenseLimitStatus.active ? `سُجل ${money(todayExpenseLimitStatus.spent)} من سقف ${money(todayExpenseLimitStatus.limit)} · المتبقي ${money(todayExpenseLimitStatus.remaining)}` : "اضبط سقفًا اختياريًا من الإعدادات لتظهر متابعة مبكرة قبل تجاوز مصروفات اليوم."}</p></div><button className="action-button action-button--secondary" onClick={() => setActivePage("settings")}><Settings size={17} /> ضبط السقف</button></section>
              {todayDebtCollections.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تحصيلات اليوم</span><h3>دخل نقدي من الذمم</h3></div><span className="status-badge">{money(todayCashSummary.debtCollections)}</span></div><div className="price-history-list">{todayDebtCollections.map((collection) => <div className="price-history-row" key={collection.id}><span><strong>{collection.customerName}</strong><small>{collection.note || formatDate(collection.collectedAt)}</small></span><b dir="ltr">+{money(collection.amount)}</b><button className="mini-icon mini-icon--danger" onClick={() => reverseDebtCollection(collection)} aria-label={`عكس تحصيل ${collection.customerName}`}><Trash2 size={15} /></button></div>)}</div></section>}
              {todayExpenses.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">سجل الصندوق</span><h3>مصروفات اليوم</h3></div><button className="text-button" onClick={() => setShowCashExpenseForm(true)}><Plus size={16} /> إضافة مصروف</button></div><div className="price-history-list">{todayExpenses.map((expense) => <div className="price-history-row" key={expense.id}><span><strong>{expense.category}</strong><small>{expense.note || formatDate(expense.spentAt)}</small></span><b dir="ltr">-{money(expense.amount)}</b><button className="mini-icon mini-icon--danger" onClick={() => deleteCashExpense(expense)} aria-label={`حذف مصروف ${expense.category}`}><Trash2 size={15} /></button></div>)}</div></section>}
              {todayCashClosing && <section className="panel weekly-report-strip"><div><span className="section-kicker">تسوية الوردية</span><h3>{todayCashSummary.variance === 0 ? "النقد متطابق" : todayCashSummary.variance && todayCashSummary.variance > 0 ? "زيادة نقدية مسجلة" : "عجز نقدي يحتاج مراجعة"}</h3><p>{todayCashClosing.responsibleName ? `المسؤول: ${todayCashClosing.responsibleName} · ` : ""}فعلي {money(todayCashClosing.actualCash)} · متوقع {money(todayCashSummary.expectedCash)} · فارق {money(Math.abs(todayCashSummary.variance ?? 0))}</p></div><div className="row-actions"><button className="mini-icon" onClick={() => void exportCashClosingsExcel()} aria-label="تنزيل تسويات الوردية Excel"><Download size={15} /></button><button className="mini-icon" onClick={() => printCashClosing(todayCashClosing)} aria-label="طباعة إغلاق الوردية"><Printer size={15} /></button><button className="mini-icon mini-icon--danger" onClick={() => deleteCashClosing(todayCashClosing)} aria-label="إلغاء إغلاق الوردية"><Trash2 size={15} /></button></div></section>}
              <section className="panel price-history-panel"><div className="panel-heading panel-heading--stack"><div><span className="section-kicker">الإرجاعات حسب الموظف</span><h3>{staffReturnsReport.totals.receipts ? `تقرير ${currentMonthKey} المحلي` : "لا توجد إرجاعات للموظفين هذا الشهر"}</h3></div><div className="inventory-page__actions"><span className="status-badge">{staffReturnsReport.totals.receipts} إيصالات · {staffReturnsReport.totals.units} وحدات</span><button className="action-button action-button--secondary" type="button" onClick={() => void exportAdvancedReturnAnalyticsExcel()}><Download size={16} /> Excel</button><button className="action-button action-button--secondary" type="button" onClick={printMonthlyReturnsSummary}><Printer size={16} /> طباعة الملخص</button></div></div>{staffReturnsReport.entries.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الموظف</th><th>إيصالات الإرجاع</th><th>الوحدات</th><th>قيمة الإرجاع</th></tr></thead><tbody>{staffReturnsReport.entries.map((entry) => <tr key={`staff-return-${entry.staffMemberId}`}><td>{entry.staffMemberName}</td><td>{entry.receipts}</td><td>{entry.units}</td><td dir="ltr"><b>{money(entry.value)}</b></td></tr>)}</tbody><tfoot><tr><th>الإجمالي</th><th>{staffReturnsReport.totals.receipts}</th><th>{staffReturnsReport.totals.units}</th><th dir="ltr">{money(staffReturnsReport.totals.value)}</th></tr></tfoot></table></div> : <p className="modal-note">سيظهر هنا كل إرجاع مسجل في الشهر الحالي حسب اسم الموظف المحفوظ في الفاتورة. السجل بلا اسم يُعرض كـ«غير محدد».</p>}<p className="modal-note">حد التنبيه الحالي لنسبة الإرجاع: {store.returnRateAlertThreshold}% · يمكن تعديله من الإعدادات.</p></section>
              <section className="panel price-history-panel">
                <div className="panel-heading panel-heading--stack"><div><span className="section-kicker">إرجاع بيع محلي</span><h3>ابحث عن فاتورة ثم افتح سلة الإرجاع</h3></div><span className="status-badge">{saleReturns.length} إرجاعات</span></div>
                <div className="inventory-page__actions"><label className="field"><span>من تاريخ</span><input value={returnFilterFromDate} onChange={(event) => setReturnFilterFromDate(event.target.value)} type="date" /></label><label className="field"><span>إلى تاريخ</span><input value={returnFilterToDate} onChange={(event) => setReturnFilterToDate(event.target.value)} type="date" /></label><label className="field"><span>سبب الإرجاع</span><select value={returnReasonFilter} onChange={(event) => setReturnReasonFilter(event.target.value)}><option value="">كل الأسباب</option>{returnReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label><button className="action-button action-button--secondary" type="button" onClick={() => void exportFilteredReturnsExcel()}><Download size={16} /> الإرجاعات Excel</button><button className="action-button action-button--secondary" type="button" onClick={() => void exportAdvancedReturnAnalyticsExcel()}><BarChart3 size={16} /> تحليلات الإرجاع Excel</button></div>
                <label className="search-box"><Search size={17} /><input value={returnInvoiceQuery} onChange={(event) => setReturnInvoiceQuery(event.target.value)} placeholder="رقم الفاتورة أو اسم الزبون..." /></label>
                {filteredReturnableSales.length ? <div className="price-history-list">{filteredReturnableSales.map((sale) => { const remainingUnits = getSaleReturnableItems(sale, store.sales).reduce((total, item) => total + item.remainingQuantity, 0); return <div className="price-history-row" key={`returnable-${sale.id}`}><span><strong>فاتورة #{sale.id.slice(-5)}</strong><small>{formatDate(sale.createdAt)} · {sale.customerName ? `${sale.customerName} · ` : ""}متبقي للإرجاع {remainingUnits} وحدة · طريقة الدفع: {getPaymentMethodLabel(sale.paymentMethod)}</small></span><b dir="ltr">{money(sale.total)}</b><button className="action-button action-button--secondary" onClick={() => openSaleReturn(sale)}><Undo2 size={15} /> فتح سلة الإرجاع</button></div>; })}</div> : <p className="modal-note">لا توجد فاتورة مطابقة قابلة للإرجاع. ابحث برقم الفاتورة أو اسم الزبون.</p>}
                {filteredSaleReturns.length > 0 ? <div className="price-history-list">{filteredSaleReturns.slice(0, 20).map((sale) => <div className="price-history-row" key={`return-receipt-${sale.id}`}><span><strong>إرجاع #{sale.id.slice(-5)}</strong><small>{formatDate(sale.createdAt)} · فاتورة أصلية #{sale.returnOfSaleId?.slice(-5) || "غير محددة"} · {sale.returnReason || "بدون سبب"}</small></span><b dir="ltr">{money(Math.abs(sale.total))}</b><button className="mini-icon" onClick={() => printReturnReceipt(sale)} aria-label={`طباعة إيصال الإرجاع ${sale.id.slice(-5)}`}><Printer size={15} /></button></div>)}</div> : <p className="modal-note">لا توجد إيصالات إرجاع تطابق التصفية الحالية.</p>}
                <p className="modal-note">اختر الكميات المتبقية فقط؛ تعيد سلة الإرجاع الأصناف للمخزون وتسجل أثرها المالي. لا يُسمح بإرجاع فاتورة آجلة بعد تحصيل جزء منها.</p>
              </section>
              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تحليلات الإرجاع</span><h3>{saleReturns.length ? "أسباب واتجاهات الإرجاعات" : "لا توجد إرجاعات للتحليل بعد"}</h3></div><span className={`status-badge ${highReturnRateProducts.length ? "status-badge--warning" : ""}`}>{highReturnRateProducts.length ? `${highReturnRateProducts.length} أصناف تحتاج مراجعة` : "ضمن المتابعة"}</span></div>{saleReturns.length ? <><div className="report-stats"><StatCard label={`إرجاعات ${monthlyReturnComparison.month}`} value={String(monthlyReturnComparison.current.receipts)} detail={`${monthlyReturnComparison.current.units} وحدات · ${money(monthlyReturnComparison.current.value)}`} icon={Undo2} tone="apricot" /><StatCard label={`فرق عن ${monthlyReturnComparison.previousMonth}`} value={`${monthlyReturnComparison.receiptChange > 0 ? "+" : ""}${monthlyReturnComparison.receiptChange} إيصالات`} detail={`${monthlyReturnComparison.valueChange > 0 ? "+" : ""}${money(monthlyReturnComparison.valueChange)}`} icon={BarChart3} tone={monthlyReturnComparison.receiptChange > 0 ? "apricot" : "olive"} /><StatCard label="أكثر سبب تكرارًا" value={returnReasonSummary[0]?.reason || "—"} detail={returnReasonSummary[0] ? `${returnReasonSummary[0].receipts} إيصالات` : "لا توجد أسباب"} icon={CircleAlert} tone="sand" /></div><div className="price-history-list">{returnReasonSummary.slice(0, 5).map((entry) => <div className="price-history-row" key={`return-reason-${entry.reason}`}><span><strong>{entry.reason}</strong><small>{entry.receipts} إيصالات · {entry.units} وحدات مرتجعة</small></span><b dir="ltr">{money(entry.value)}</b></div>)}</div>{highReturnRateProducts.length > 0 && <div className="price-history-list">{highReturnRateProducts.slice(0, 5).map((entry) => <div className="price-history-row" key={`high-return-${entry.productId}`}><span><strong>{entry.productName}</strong><small>مرتجع {entry.returnedUnits} من {entry.soldUnits} مباعة</small></span><span className="status-badge status-badge--warning">{entry.returnRatePercent.toFixed(1)}%</span></div>)}</div>}</> : <p className="modal-note">ستظهر الأسباب والمقارنة الشهرية والتنبيهات بعد تسجيل إرجاعات فعلية محليًا.</p>}</section>
              <div className="weekly-report-strip"><div><span className="section-kicker">آخر 7 أيام</span><h3>ملخص الأرباح الأسبوعي</h3><p>{weeklySummary.invoices} فاتورة · مبيعات {money(weeklySummary.revenue)} · ربح {money(weeklySummary.profit)}</p></div><button className="action-button action-button--secondary" onClick={() => void exportWeeklyReportExcel()}><Download size={17} /> تقرير أسبوعي Excel</button></div>
              <div className="weekly-report-strip"><div><span className="section-kicker">مقارنة أسبوعية</span><h3>{weekComparison.profitChange >= 0 ? "الأرباح ارتفعت" : "الأرباح انخفضت"} {money(Math.abs(weekComparison.profitChange))}</h3><p>هذا الأسبوع: مبيعات {money(weekComparison.current.revenue)} · ربح {money(weekComparison.current.profit)} · {weekComparison.current.invoices} فاتورة</p></div><div><span className="section-kicker">الأسبوع السابق</span><p>مبيعات {money(weekComparison.previous.revenue)} · ربح {money(weekComparison.previous.profit)} · {weekComparison.previous.invoices} فاتورة</p></div></div>
              <div className="weekly-report-strip"><div><span className="section-kicker">هذا الشهر</span><h3>تقرير شهري مفصل</h3><p>{monthlySummary.invoices} فاتورة · {monthlySummary.units} وحدة · مبيعات {money(monthlySummary.revenue)} · ربح {money(monthlySummary.profit)}</p></div><div className="inventory-page__actions"><span className={`status-badge ${inactiveProducts.length ? "status-badge--warning" : ""}`}>{inactiveProducts.length ? `${inactiveProducts.length} أصناف بلا حركة` : "كل الأصناف لها حركة"}</span><button className="action-button action-button--secondary" onClick={() => void exportMonthlyReportExcel()}><Download size={17} /> تقرير شهري Excel</button></div></div>
              <section className="panel price-history-panel">
                <div className="panel-heading"><div><span className="section-kicker">ربحية الأصناف</span><h3>{productProfitabilityReport.entries.length ? `${productProfitabilityReport.entries.length} أصناف لها حركة هذا الشهر` : "لا توجد مبيعات لحساب الربحية"}</h3></div><button className="action-button action-button--secondary" onClick={() => void exportProductProfitabilityExcel()}><Download size={16} /> ربحية الأصناف Excel</button></div>
                {productProfitabilityReport.entries.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>صافي الوحدات</th><th>مرتجع / نسبة</th><th>الإيراد الصافي</th><th>التكلفة</th><th>الربح</th><th>الهامش</th></tr></thead><tbody>{productProfitabilityReport.entries.slice(0, 12).map((entry) => <tr key={`profitability-${entry.productId}`}><td><strong>{entry.productName}</strong><small>{entry.transactionCount} حركات · خصومات {money(entry.discounts)}</small></td><td>{entry.units}</td><td><span className={`status-badge ${entry.returnRatePercent > 0 ? "status-badge--warning" : ""}`}>{entry.returnedUnits} / {entry.returnRatePercent.toFixed(1)}%</span><small>من {entry.soldUnits} مباعة</small></td><td dir="ltr">{money(entry.netRevenue)}</td><td dir="ltr">{money(entry.costOfGoods)}</td><td dir="ltr"><b className={entry.profit < 0 ? "low-number" : ""}>{money(entry.profit)}</b></td><td><span className={`status-badge ${entry.marginPercent < 0 ? "status-badge--warning" : ""}`}>{entry.marginPercent.toFixed(1)}%</span></td></tr>)}</tbody></table></div> : <p className="modal-note">سيظهر لكل صنف الإيراد والتكلفة والخصومات والربح بعد تسجيل مبيعات حقيقية.</p>}
                <p className="modal-note">نسبة الإرجاع = الوحدات المرتجعة ÷ الوحدات المباعة خلال الشهر. تدخل الإرجاعات والخصومات في صافي الربحية تلقائيًا.</p>
              </section>
              <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">مبيعات الموظفين</span><h3>{staffSalesReport.entries.length ? `${staffSalesReport.entries.length} موظفين لهم حركات هذا الشهر` : "لا توجد فواتير مرتبطة بموظف بعد"}</h3></div><button className="action-button action-button--secondary" onClick={() => void exportStaffSalesExcel()}><Download size={16} /> موظفون Excel</button></div>{staffSalesReport.entries.length ? <div className="table-wrap"><table className="inventory-table"><thead><tr><th>الموظف</th><th>فواتير البيع</th><th>الإرجاعات</th><th>صافي المبيعات</th><th>صافي الربح</th></tr></thead><tbody>{staffSalesReport.entries.map((entry) => <tr key={entry.staffMemberId}><td><strong>{entry.staffMemberName}</strong></td><td>{entry.invoices}</td><td>{entry.returns}</td><td dir="ltr">{money(entry.sales)}</td><td dir="ltr"><b className={entry.profit < 0 ? "low-number" : ""}>{money(entry.profit)}</b></td></tr>)}</tbody></table></div> : <p className="modal-note">أضف أسماء الموظفين من الإعدادات، ثم اختر الاسم عند البيع ليظهر التقرير محليًا. لا توجد حسابات أو تسجيل دخول.</p>}</section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">هدف الشهر</span><h3>{monthlyGoalProgress.active ? (monthlyGoalProgress.met ? "تم تحقيق الهدف الشهري" : "متابعة هدف مبيعات الشهر") : "لم يُضبط هدف شهري"}</h3><p>{monthlyGoalProgress.active ? `المبيعات ${money(monthlyGoalProgress.revenue)} من هدف ${money(monthlyGoalProgress.target)} · إنجاز ${monthlyGoalProgress.achievement.toFixed(1)}% · متبقي ${money(monthlyGoalProgress.remaining)}.` : "اضبط هدفًا شهريًا من لوحة اليوم لمقارنة نمو مبيعات المحل بصورة مباشرة."}</p></div><div className="inventory-page__actions"><span className={`status-badge ${monthlyGoalProgress.active && !monthlyGoalProgress.met ? "status-badge--warning" : ""}`}>{monthlyGoalProgress.active ? (monthlyGoalProgress.met ? "متحقق" : `${monthlyGoalProgress.achievement.toFixed(0)}%`) : "اختياري"}</span><button className="action-button action-button--secondary" onClick={() => setShowMonthlyGoalForm(true)}><CalendarDays size={17} /> {monthlyGoalProgress.active ? "تعديل الهدف" : "ضبط هدف الشهر"}</button></div></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">مصروفات هذا الشهر</span><h3>{monthlyExpenseReport.count ? `${monthlyExpenseReport.count} مصروفات · ${monthlyExpenseReport.groups.length} تصنيفات` : "لا توجد مصروفات شهرية مسجلة"}</h3><p>{monthlyExpenseReport.groups.length ? monthlyExpenseReport.groups.slice(0, 3).map((group) => `${group.category}: ${money(group.amount)}`).join(" · ") : "سجّل المصروفات اليومية لتظهر هنا مجمعة حسب التصنيف."}</p></div><div className="inventory-page__actions"><span className="status-badge">{money(monthlyExpenseReport.amount)}</span><button className="action-button action-button--secondary" onClick={() => void exportMonthlyExpensesExcel()}><Download size={17} /> مصروفات Excel</button></div></section>
              <div className="weekly-report-strip"><div><span className="section-kicker">هدر الصلاحية</span><h3>{expiryWasteReport.units ? `${expiryWasteReport.units} وحدات منتهية تحتاج معالجة` : "لا يوجد هدر صلاحية مسجل"}</h3><p>{expiryWasteReport.units ? `تكلفة تقديرية ${money(expiryWasteReport.cost)} من ${expiryWasteReport.entries.length} دفعات منتهية.` : "سيظهر هنا الرصيد المتبقي في الدفعات المنتهية فقط."}</p></div><button className="action-button action-button--secondary" onClick={() => void exportExpiryWasteExcel()}><Download size={17} /> تقرير هدر Excel</button></div>
              <div className="weekly-report-strip"><div><span className="section-kicker">تكلفة المخزون حسب المورد</span><h3>{supplierInventoryCostReport.groups.length ? `${supplierInventoryCostReport.groups.length} موردين · ${supplierInventoryCostReport.units} وحدات` : "لا توجد دفعات نشطة"}</h3><p>{supplierInventoryCostReport.groups.length ? `إجمالي تكلفة الدفعات النشطة ${money(supplierInventoryCostReport.cost)}.` : "سيظهر هنا رصيد الدفعات المتبقي مجمعًا حسب المورد."}</p></div><button className="action-button action-button--secondary" onClick={() => void exportSupplierInventoryCostExcel()}><Download size={17} /> تكلفة الموردين Excel</button></div>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">مشتريات الموردين</span><h3>{supplierPurchaseReport.groups.length ? `${supplierPurchaseReport.groups.length} موردين · صافي ${money(supplierPurchaseReport.net)}` : "لا توجد مشتريات في الفترة المختارة"}</h3><p>استلام {money(supplierPurchaseReport.received)} · إرجاع {money(supplierPurchaseReport.returned)} · تُستخرج من سجلات الدفعات المحفوظة.</p></div><div className="inventory-page__actions"><label className="field"><span>الشهر</span><input aria-label="شهر تقرير مشتريات الموردين" type="month" value={supplierPurchasesMonth} onChange={(event) => setSupplierPurchasesMonth(event.target.value || new Date().toISOString().slice(0, 7))} /></label><button className="action-button action-button--secondary" onClick={() => void exportSupplierPurchasesExcel()}><Download size={17} /> مشتريات Excel</button></div></section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">مقارنة مشتريات الموردين</span><h3>{supplierPurchaseComparison.difference === 0 ? "الصافي ثابت عن الشهر السابق" : supplierPurchaseComparison.difference > 0 ? "المشتريات ارتفعت عن الشهر السابق" : "المشتريات انخفضت عن الشهر السابق"}</h3><p>الشهر المختار {money(supplierPurchaseComparison.currentNet)} · الشهر السابق {money(supplierPurchaseComparison.previousNet)} · الفرق {money(Math.abs(supplierPurchaseComparison.difference))}</p></div><span className={`status-badge ${supplierPurchaseComparison.difference > 0 ? "status-badge--warning" : ""}`}>{supplierPurchaseComparison.groups.length} موردين</span></section>
              {supplierPurchaseComparison.groups.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تفاصيل المقارنة</span><h3>صافي المشتريات لكل مورد</h3></div><span className="status-badge">{supplierPurchaseComparison.previousMonth}</span></div><div className="price-history-list">{supplierPurchaseComparison.groups.map((group) => <div className="price-history-row" key={`purchase-comparison-${group.supplierName}`}><span><strong>{group.supplierName}</strong><small>السابق {money(group.previousNet)} · المختار {money(group.currentNet)}</small></span><b dir="ltr">{group.difference > 0 ? "+" : ""}{money(group.difference)}</b></div>)}</div></section>}
              <section className="panel weekly-report-strip"><div><span className="section-kicker">سقف ائتمان الموردين</span><h3>{supplierCreditStatus.groups.length ? `${supplierCreditStatus.exceededCount} تجاوزات · ${supplierCreditStatus.nearingCount} اقتربت من السقف` : "أضف دفعات الموردين أولًا"}</h3><p>سقف الائتمان محفوظ على هذا الجهاز ويُقارن بالرصيد المستحق بعد المدفوعات والإرجاعات.</p></div>{supplierCreditStatus.groups.length ? <div className="notification-settings">{supplierCreditStatus.groups.map((group) => <label key={group.supplierName} className={`notification-setting ${group.exceeded || group.nearing ? "notification-setting--on" : ""}`}><span><strong>{group.supplierName}</strong><small>الرصيد {money(group.outstanding)} · {group.creditLimit ? (group.exceeded ? "تجاوز السقف" : group.nearing ? "اقترب من السقف" : `متاح ${money(group.availableCredit)}`) : "بدون سقف"}</small></span><input aria-label={`سقف ائتمان ${group.supplierName}`} type="number" min="0" step="0.01" value={group.creditLimit || ""} onChange={(event) => updateSupplierCreditLimit(group.supplierName, event.target.value)} placeholder="سقف د.ل" /></label>)}</div> : null}</section>
              <section className="panel weekly-report-strip"><div><span className="section-kicker">استحقاقات الموردين</span><h3>{supplierDueDateStatuses.length ? `${supplierDueDateStatuses.filter((status) => status.overdue).length} متأخرة · ${supplierDueDateStatuses.filter((status) => status.nearing).length} قريبة` : "اضبط موعد الاستحقاق لكل مورد"}</h3><p>يظهر التنبيه محليًا عند فتح سوقنا قبل 3 أيام من الموعد أو فور تأخره، دون إرسال تلقائي.</p></div>{supplierCreditStatus.groups.length ? <div className="notification-settings">{supplierCreditStatus.groups.map((group) => { const due = supplierDueDateStatuses.find((status) => status.supplierName === group.supplierName); return <label key={`due-${group.supplierName}`} className={`notification-setting ${due?.overdue || due?.nearing ? "notification-setting--on" : ""}`}><span><strong>{group.supplierName}</strong><small>{due ? (due.overdue ? `متأخر ${Math.abs(due.daysUntilDue)} يوم · ${money(due.outstanding)}` : `موعد ${due.dueDate} · ${money(due.outstanding)}`) : `الرصيد المستحق ${money(group.outstanding)}`}</small></span><input aria-label={`استحقاق ${group.supplierName}`} type="date" value={store.supplierDueDates[group.supplierName] ?? ""} onChange={(event) => updateSupplierDueDate(group.supplierName, event.target.value)} /></label>; })}</div> : null}</section>
              {supplierObligationReport.obligations.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">تصنيف التزامات الموردين</span><h3>{supplierObligationReport.overdueCount} متأخرة · {supplierObligationReport.nearDueCount} قريبة · {supplierObligationReport.payableCount} مستحقة</h3></div><span className={`status-badge ${supplierObligationReport.overdueCount ? "status-badge--warning" : ""}`}>{supplierObligationReport.settledCount} بلا رصيد</span></div><div className="price-history-list">{supplierObligationReport.obligations.map((item) => { const label = item.status === "overdue" ? "متأخر" : item.status === "nearDue" ? "قريب" : item.status === "payable" ? "مستحق" : "بلا رصيد"; return <div className="price-history-row" key={`obligation-${item.supplierName}`}><span><strong>{item.supplierName}</strong><small>{item.dueDate ? `استحقاق ${item.dueDate}` : "لم يحدد موعد استحقاق"}</small></span><span className={`status-badge ${item.status === "overdue" || item.status === "nearDue" ? "status-badge--warning" : ""}`}>{label}</span><b dir="ltr">{money(item.outstanding)}</b></div>; })}</div></section>}
              {supplierCreditStatus.groups.length > 0 && <section className="panel weekly-report-strip"><div><span className="section-kicker">حسابات الموردين</span><h3>دفع وكشف حساب شهري</h3><p>سجّل الدفعة للمورد ثم اطبع المستند أو كشف الحساب الشهري من نافذة النظام.</p></div><div className="notification-settings">{supplierCreditStatus.groups.map((group) => <div className="notification-setting" key={`actions-${group.supplierName}`}><span><strong>{group.supplierName}</strong><small>الرصيد المستحق {money(group.outstanding)}</small></span><div className="row-actions"><button className="mini-icon" onClick={() => setSupplierPaymentSupplier(group.supplierName)} aria-label={`تسجيل دفع إلى ${group.supplierName}`}><CircleDollarSign size={14} /></button><button className="mini-icon" onClick={() => printSupplierMonthlyStatement(group.supplierName)} aria-label={`طباعة كشف حساب ${group.supplierName}`}><Printer size={14} /></button></div></div>)}</div></section>}
              {supplierOperatingSummary.length > 0 && <section className="panel price-history-panel"><div className="panel-heading"><div><span className="section-kicker">ملخص تشغيلي للمورد</span><h3>رصيد، مخزون، وإنفاق الشهر</h3></div><span className="status-badge">{supplierOperatingSummary.length} موردين</span></div><div className="price-history-list">{supplierOperatingSummary.map((supplier) => <div className="price-history-row" key={`summary-${supplier.supplierName}`}><span><strong>{supplier.supplierName}</strong><small>مخزون بسعر الشراء {money(supplier.inventoryCost)} · مدفوع الشهر {money(supplier.monthlyPayments)}</small></span><b dir="ltr">{money(supplier.outstanding)}</b></div>)}</div></section>}
              <div className="report-stats"><StatCard label="مبيعات هذا الشهر" value={money(monthSales.reduce((total, sale) => total + sale.total, 0))} detail={`${monthSales.length} فاتورة`} icon={CircleDollarSign} tone="olive" /><StatCard label="أرباح هذا الشهر" value={money(monthSales.reduce((total, sale) => total + sale.profit, 0))} detail="فرق البيع عن الشراء" icon={TrendingUp} tone="blue" /><StatCard label="متوسط الفاتورة" value={money(monthSales.length ? monthSales.reduce((total, sale) => total + sale.total, 0) / monthSales.length : 0)} detail="لكل بيع مسجل" icon={ReceiptText} tone="sand" /></div>
	              <div className="report-columns"><section className="panel report-chart"><div className="panel-heading"><div><span className="section-kicker">هذا الشهر</span><h3>الأصناف الأكثر مبيعًا</h3></div><span className="chart-note">حسب الوحدات</span></div>{itemSales.length ? <div className="bars">{itemSales.slice(0, 6).map((item, index) => <div className="bar-row" key={item.name}><div><span>{index + 1}</span><strong>{item.name}</strong></div><div className="bar-track"><i style={{ width: `${(item.quantity / itemSales[0].quantity) * 100}%` }} /></div><b>{item.quantity}</b></div>)}</div> : <EmptyState icon={BarChart3} title="التقرير ينتظر أول عملية بيع" description="سجّل فواتيرك وستظهر المنتجات الأعلى مبيعًا هنا." />}</section><section className="panel report-totals"><div className="panel-heading"><div><span className="section-kicker">ملخص النشاط</span><h3>نظرة مالية</h3></div></div><div className="financial-stack"><div><span>إيرادات الشهر</span><b dir="ltr">{money(monthSales.reduce((total, sale) => total + sale.total, 0))}</b></div><div><span>تكلفة البضاعة المباعة</span><b dir="ltr">{money(monthSales.reduce((total, sale) => total + (sale.total - sale.profit), 0))}</b></div><div className="financial-stack__profit"><span>الربح الإجمالي</span><b dir="ltr">{money(monthSales.reduce((total, sale) => total + sale.profit, 0))}</b></div></div><div className="report-advice"><TrendingUp size={18} /><p>{monthSales.length ? "استمر في تسجيل كل فاتورة؛ دقة التقرير تتحسن مع انتظام الإدخال." : "ستظهر هنا مقارنة شهرية تلقائية بمجرد بدء البيع."}</p></div></section></div>
	            </section>
	          )}

          {page === "settings" && (
            <section className="settings-page">
              <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><ShieldCheck size={21} /></div><div><span className="section-kicker">تدريب وتجهيز الكاشير</span><h3>جرّب دون لمس بيانات محلك</h3><p>وضع التدريب يفصل السلة والبيع والتعديلات المؤقتة عن بيانات المحل؛ عند الخروج تعود بياناتك كما كانت. فحص القارئ يلتقط أول باركود سريع فقط ولا يضيف صنفًا أو يسجل عملية.</p></div><div className="notification-settings field--wide"><div className="notification-setting"><span><strong>{trainingMode ? "وضع التدريب مفعّل الآن" : "وضع التدريب متوقف"}</strong><small>{getTrainingModeMessage(trainingMode)}</small></span><button type="button" className={`action-button ${trainingMode ? "action-button--secondary" : "action-button--primary"}`} onClick={trainingMode ? stopTrainingMode : startTrainingMode}>{trainingMode ? "إنهاء التدريب" : "بدء التدريب"}</button></div><div className="notification-setting"><span><strong>{barcodeReaderTestActive ? "بانتظار مسح من القارئ…" : barcodeReaderTestResult ? `تم التعرف على: ${barcodeReaderTestResult.value}` : "اختبر قارئ USB أو Bluetooth"}</strong><small>{barcodeReaderTestActive ? "امسح أي باركود الآن؛ سيظهر الرقم هنا فقط دون إضافة صنف." : barcodeReaderTestResult ? `آخر اختبار: ${formatDate(barcodeReaderTestResult.receivedAt)}` : "صِل القارئ كلوحة مفاتيح، ثم اضغط زر الاختبار وامسح رمزًا. يجب أن ينهي القارئ الإرسال بزر Enter."}</small></span><div className="modal-actions"><button type="button" className={`action-button ${barcodeReaderTestActive ? "action-button--secondary" : "action-button--primary"}`} onClick={() => { setBarcodeReaderTestResult(null); setBarcodeReaderTestActive((current) => !current); }}>{barcodeReaderTestActive ? "إلغاء الاختبار" : "اختبار القارئ الآن"}</button>{barcodeReaderTestResult && <button type="button" className="text-button" onClick={() => setBarcodeReaderTestResult(null)}>مسح النتيجة</button>}</div></div></div></section>
              <div className="page-intro"><div><span className="eyebrow"><Settings size={15} /> تحكم محلي</span><h2>إعدادات بسيطة، <em>بياناتك بيدك.</em></h2><p>يُحفظ كل ما تسجله داخل متصفح هذا الجهاز. احتفظ بنسخة احتياطية دورية.</p></div></div>
              <div className="settings-grid">
	                <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><ReceiptText size={21} /></div><div><span className="section-kicker">جدول الفاتورة</span><h3>مساحة الكاشير حسب راحتك</h3><p>غيّر الحجم والأعمدة ووضع الإدخال على هذا الجهاز فقط. لا تتغير بيانات الفواتير أو الأجهزة الأخرى.</p></div><div className="form-grid field--wide"><label className="field"><span>حجم جدول أصناف الفاتورة</span><select value={invoiceTableSettings.scale} onChange={(event) => setInvoiceTableSettings((current) => ({ ...current, scale: event.target.value as typeof current.scale }))}>{Object.entries(INVOICE_TABLE_SCALE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="field"><span>الأعمدة الظاهرة</span><div className="checkbox-grid">{(Object.keys(INVOICE_TABLE_COLUMN_LABELS) as InvoiceTableColumn[]).map((column) => <label key={column}><input type="checkbox" checked={invoiceTableSettings.columns[column]} onChange={(event) => setInvoiceTableSettings((current) => ({ ...current, columns: { ...current.columns, [column]: event.target.checked } }))} /> {INVOICE_TABLE_COLUMN_LABELS[column]}</label>)}</div></div><label className="field field--wide"><span>وضع إدخال الأصناف</span><div className="notification-setting"><span><strong>{invoiceTableSettings.focusMode ? "مفعّل: الجدول في الواجهة" : "عادي: الملخصات ظاهرة"}</strong><small>عند التفعيل تختفي ملخصات الفاتورة مؤقتًا ليكبر مجال إدخال الأصناف.</small></span><button type="button" className={`action-button ${invoiceTableSettings.focusMode ? "action-button--primary" : "action-button--secondary"}`} onClick={() => setInvoiceTableSettings((current) => ({ ...current, focusMode: !current.focusMode }))}>{invoiceTableSettings.focusMode ? "إلغاء وضع الإدخال" : "تفعيل وضع الإدخال"}</button></div></label></div><div className="modal-actions field--wide"><button type="button" className="action-button action-button--secondary" onClick={() => { setInvoiceTableSettings(DEFAULT_INVOICE_TABLE_SETTINGS); toast.success("عادت إعدادات جدول الفاتورة الافتراضية."); }}>استعادة إعدادات الجدول</button></div></section>
	                {accessProfile?.role === "user" && <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><ShieldCheck size={21} /></div><div><span className="section-kicker">حالة هذا الجهاز</span><h3>{accessExpiryNotice ? accessExpiryNotice.daysRemaining === 1 ? "تنتهي الصلاحية غدًا" : `متبقي ${accessExpiryNotice.daysRemaining} أيام` : "التفعيل ساري"}</h3><p>{accessExpiryNotice ? "هذا التنبيه يظهر هنا داخل الإعدادات فقط كي لا يقطع شاشة البيع. تواصل مع المالك قبل انتهاء الصلاحية ليصدر لك تجديدًا لهذا الجهاز." : `صلاحية هذا الجهاز ممتدة حتى ${accessProfile.expiresAt ? formatDate(accessProfile.expiresAt) : "التاريخ المحدد"}.`}</p></div><div className="collection-summary field--wide"><span>حالة الوصول</span><strong className={accessExpiryNotice?.level === "urgent" ? "low-number" : ""}>{accessExpiryNotice ? "يحتاج متابعة" : "ساري"}</strong></div></section>}
                <section className="panel settings-card settings-card--receipt cashier-settings-card"><div className="setting-icon"><LayoutDashboard size={21} /></div><div><span className="section-kicker">إعدادات الكاشير</span><h3>شاشة أسهل للعمل السريع</h3><p>اختر حجم خط وعرض سلة وصورة مريحين، وحدد البيانات الظاهرة داخل السلة لهذا الجهاز فقط.</p></div><div className="cashier-settings-grid field--wide"><label className="field"><span>حجم خط شاشة الكاشير</span><select value={cashierSettings.fontScale} onChange={(event) => setCashierSettings((current) => ({ ...current, fontScale: event.target.value as CashierFontScale }))}>{Object.entries(CASHIER_FONT_SCALE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>عرض السلة على الكمبيوتر</span><select value={cashierSettings.cartWidth} onChange={(event) => setCashierSettings((current) => ({ ...current, cartWidth: event.target.value as CashierCartWidth }))}>{Object.entries(CASHIER_CART_WIDTH_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>حجم صورة الصنف</span><select value={cashierSettings.cartImageScale} onChange={(event) => setCashierSettings((current) => ({ ...current, cartImageScale: event.target.value as CashierCartImageScale }))}>{Object.entries(CASHIER_CART_IMAGE_SCALE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="field"><span>بيانات السلة الظاهرة</span><div className="checkbox-grid"><label><input type="checkbox" checked={cashierSettings.showCartCode} onChange={(event) => setCashierSettings((current) => ({ ...current, showCartCode: event.target.checked }))} /> كود الصنف</label><label><input type="checkbox" checked={cashierSettings.showCartStock} onChange={(event) => setCashierSettings((current) => ({ ...current, showCartStock: event.target.checked }))} /> المخزون المتاح</label></div></div><div className="cashier-shortcuts"><span>اختصارات لوحة المفاتيح</span><div>{(Object.keys(CASHIER_SHORTCUT_ACTION_LABELS) as CashierShortcutAction[]).map((action) => <label key={action}><small>{CASHIER_SHORTCUT_ACTION_LABELS[action]}</small><select value={cashierSettings.shortcuts[action]} onChange={(event) => setCashierSettings((current) => updateCashierShortcut(current, action, event.target.value as CashierShortcut))}>{CASHIER_SHORTCUT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}</div></div></div><div className="modal-actions field--wide"><button type="button" className="action-button action-button--secondary" onClick={() => { setCashierSettings(DEFAULT_CASHIER_SETTINGS); toast.success("عادت إعدادات الكاشير الافتراضية لهذا الجهاز."); }}>استعادة الإعدادات الافتراضية</button></div></section>
                <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><Download size={21} /></div><div><span className="section-kicker">تصدير الدعم</span><h3>سجل البلاغات إلى Excel</h3><p>ينزّل ملفًا يحتوي على وقت البلاغ ونوعه وحالته ومعرّف الجهاز، دون تضمين صورة الخطأ أو رفع أي بيانات.</p></div><div className="modal-actions field--wide"><button type="button" className="action-button action-button--secondary" disabled={!supportRequests.length} onClick={() => void exportSupportRequestsExcel()}><Download size={17} /> تنزيل سجل الدعم Excel</button>{!supportRequests.length && <span className="modal-note">أنشئ بلاغًا واحدًا على الأقل لتفعيل التصدير.</span>}</div></section>
                <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><MessageCircle size={21} /></div><div><span className="section-kicker">خدمة العملاء</span><h3>زر التواصل عبر واتساب</h3><p>{accessProfile?.role === "owner" ? "يظهر للمالك زر «دعم المالك» برسالة جاهزة تشرح أن الطلب من جهاز المالك." : "يفتح زر «تواصل معنا» محادثة واتساب برسالة دعم جاهزة، دون عرض رقم الهاتف في الواجهة."}</p></div><div className="notification-settings field--wide"><div className="notification-setting"><span><strong>{supportButtonVisible ? "زر الدعم ظاهر" : "زر الدعم مخفي"}</strong><small>هذا الاختيار محفوظ محليًا على هذا الجهاز فقط.</small></span><button type="button" className={`action-button ${supportButtonVisible ? "action-button--secondary" : "action-button--primary"}`} onClick={() => { const next = !supportButtonVisible; localStorage.setItem(LOCAL_SUPPORT_VISIBILITY_KEY, next ? "visible" : "hidden"); setSupportButtonVisible(next); window.dispatchEvent(new Event(SUPPORT_VISIBILITY_EVENT)); toast.success(next ? "ظهر زر خدمة العملاء على هذا الجهاز." : "تم إخفاء زر خدمة العملاء على هذا الجهاز."); }}>{supportButtonVisible ? "إخفاء الزر" : "إظهار الزر"}</button></div></div></section>
                <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><ClipboardList size={21} /></div><div><span className="section-kicker">سجل الدعم المحلي</span><h3>{supportRequests.length ? `${supportRequests.length} بلاغات محفوظة` : "لا توجد بلاغات بعد"}</h3><p>يُحفظ السجل على هذا الجهاز فقط، ويمكنك تحديث حالة كل بلاغ ومراجعة صورة الخطأ المرفقة محليًا.</p></div><div className="collection-summary field--wide"><span>معرّف هذا الجهاز</span><strong dir="ltr">{deviceIdentity?.deviceId ? `•••• ${deviceIdentity.deviceId.slice(-8)}` : "يجري إنشاء المعرّف…"}</strong><div className="modal-actions"><button type="button" className="action-button action-button--secondary" disabled={!deviceIdentity?.deviceId} onClick={() => void copyCurrentDeviceId()}><Copy size={17} /> نسخ معرّف الجهاز</button></div></div>{supportRequests.length ? <div className="price-history-list field--wide">{supportRequests.slice(0, 8).map((request) => <div className="price-history-row" key={request.id}><span><strong>{SUPPORT_CATEGORY_LABELS[request.category]}</strong><small>{formatDate(request.createdAt)} · {request.details.slice(0, 110)}{request.details.length > 110 ? "…" : ""}</small>{request.screenshotDataUrl && <img src={request.screenshotDataUrl} alt={`صورة خطأ البلاغ ${request.id}`} className="mt-2 h-20 w-20 rounded-lg object-cover border" />}</span><div className="row-actions"><span className="status-badge">{SUPPORT_STATUS_LABELS[request.status]}</span><select aria-label={`حالة البلاغ ${request.id}`} value={request.status} onChange={(event) => updateSupportRequestStatus(request.id, event.target.value as SupportRequestStatus)}>{(Object.entries(SUPPORT_STATUS_LABELS) as Array<[SupportRequestStatus, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>)}</div> : <p className="modal-note field--wide">عند تجهيز أول بلاغ ستظهر تفاصيله هنا محليًا.</p>}</section>
                <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><CircleAlert size={21} /></div><div><span className="section-kicker">بلاغ دعم سريع</span><h3>اشرح المشكلة مرة واحدة</h3><p>يجهّز سوقنا رسالة مرتبة بالبلاغ ومعرّف هذا الجهاز، ثم يفتح محادثة واتساب لتُرسلها أنت بنفسك.</p></div><form className="form-grid field--wide" onSubmit={(event) => { event.preventDefault(); const details = supportDetails.trim(); if (details.length < 5) { toast.error("اكتب وصفًا أوضح للمشكلة من 5 أحرف على الأقل."); return; } if (!deviceIdentity?.deviceId) { toast.error("تعذر قراءة معرّف هذا الجهاز. أعد فتح سوقنا ثم حاول مجددًا."); return; } const request: SupportRequest = { id: `SUP-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString(), category: supportCategory, details, deviceId: deviceIdentity.deviceId, role: accessProfile?.role || null, status: "prepared", screenshotDataUrl: supportScreenshotDataUrl || undefined }; setSupportRequests((current) => keepSupportRequests([request, ...current])); setSupportDetails(""); setSupportScreenshotDataUrl(""); if (supportScreenshotInputRef.current) supportScreenshotInputRef.current.value = ""; window.open(`https://wa.me/218917514589?text=${encodeURIComponent(buildSupportRequestMessage(request))}`, "_blank", "noopener,noreferrer"); toast.success("تم حفظ البلاغ محليًا وتجهيز رسالة الدعم."); }}><label className="field"><span>نوع المشكلة</span><select value={supportCategory} onChange={(event) => setSupportCategory(event.target.value as SupportCategory)}>{Object.entries(SUPPORT_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field field--wide"><span>وصف المشكلة *</span><textarea required minLength={5} maxLength={500} value={supportDetails} onChange={(event) => setSupportDetails(event.target.value.slice(0, 500))} placeholder="مثال: عند طباعة الفاتورة تظهر الصفحة فارغة" /><small>لن يُرسل شيء تلقائيًا؛ تفتح المحادثة لتراجع الرسالة ثم ترسلها بنفسك.</small></label><input ref={supportScreenshotInputRef} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="hidden-input" onChange={(event) => { importSupportScreenshot(event.target.files?.[0]); event.currentTarget.value = ""; }} /><div className="collection-summary field--wide"><span>صورة الخطأ (اختيارية)</span>{supportScreenshotDataUrl ? <img src={supportScreenshotDataUrl} alt="معاينة صورة الخطأ" className="mt-2 h-32 max-w-full rounded-lg object-cover" /> : <small>صوّر رسالة الخطأ أو اخترها من المعرض. تحفظ محليًا مع البلاغ ولا تُرسل تلقائيًا.</small>}<div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => supportScreenshotInputRef.current?.click()}><Camera size={17} /> كاميرا أو معرض</button>{supportScreenshotDataUrl && <button type="button" className="text-button" onClick={() => setSupportScreenshotDataUrl("")}>إزالة الصورة</button>}</div></div><div className="modal-actions field--wide"><button type="submit" className="action-button action-button--primary"><MessageCircle size={17} /> تجهيز بلاغ الدعم</button></div></form></section>
                {accessProfile?.role === "owner" && <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><ShieldCheck size={21} /></div><div><span className="section-kicker">المالك الأساسي</span><h3>إصدار تفعيل لجهاز واحد</h3><p>اطلب من الجهاز الآخر فتح «ربط جهاز مستخدم»، ثم امسح رمز طلبه أو الصقه هنا. رمز التفعيل الناتج لا يعمل إلا على ذلك الجهاز.</p></div><form className="form-grid field--wide" onSubmit={(event) => void issueDeviceActivation(event)}><label className="field field--wide"><span>رمز طلب الجهاز الآخر *</span><textarea value={issueRequestCode} onChange={(event) => setIssueRequestCode(event.target.value)} placeholder="الصق الرمز أو امسحه بالكاميرا" /></label><div className="modal-actions field--wide"><button type="button" className="action-button action-button--secondary" onClick={() => setAccessQrScannerMode("request")}>مسح طلب الجهاز بالكاميرا</button></div><label className="field"><span>اسم المستخدم *</span><input required minLength={3} value={issueUsername} onChange={(event) => setIssueUsername(event.target.value)} placeholder="مثال: cash-1" /></label><label className="field"><span>كلمة المرور *</span><input required type="password" minLength={6} value={issuePassword} onChange={(event) => setIssuePassword(event.target.value)} placeholder="6 أحرف أو أكثر" /></label><label className="field"><span>مدة الصلاحية بالأيام *</span><input required type="number" min="1" step="1" value={issueDurationDays} onChange={(event) => setIssueDurationDays(event.target.value)} placeholder="30" /></label><div className="modal-actions field--wide"><button type="submit" className="action-button action-button--primary"><ShieldCheck size={17} /> إنشاء رمز التفعيل</button></div></form>{issuedActivationCode && <div className="collection-summary field--wide"><span>أرسل هذا التفعيل للجهاز المطلوب فقط</span><strong>امسح QR على الجهاز الآخر أو الصق الرمز يدويًا</strong>{issuedActivationQr && <img src={issuedActivationQr} alt="رمز QR لتفعيل جهاز واحد" className="mx-auto my-3 w-48 h-48 rounded-xl bg-white p-2" />}<textarea className="w-full min-h-20" value={issuedActivationCode} readOnly aria-label="رمز تفعيل الجهاز" /></div>}{accessQrScannerMode === "request" && <BarcodeScanner onDetected={(value) => { setIssueRequestCode(value); setAccessQrScannerMode(null); }} onClose={() => setAccessQrScannerMode(null)} kicker="المالك الأساسي" heading="امسح طلب ربط الجهاز" closeLabel="إغلاق الماسح" />}</section>}
                {accessProfile?.role === "owner" && <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><MonitorSmartphone size={21} /></div><div><span className="section-kicker">سجل الأجهزة الصادرة</span><h3>{issuedDevices.length ? `${issuedDevices.length} أجهزة محفوظة` : "لا توجد أجهزة صادرة بعد"}</h3><p>يُحفظ السجل على جهاز المالك فقط. الأخضر ساري، الأصفر يقترب من الانتهاء، والبرتقالي أو الأحمر يحتاج متابعة عاجلة.</p></div><input ref={requestImageInputRef} type="file" accept="image/*" className="hidden-input" onChange={(event) => void importAccessQrImage(event.target.files?.[0], "request")} /><div className="modal-actions field--wide"><button type="button" className="action-button action-button--secondary" onClick={() => requestImageInputRef.current?.click()}>قراءة طلب QR من صورة</button></div>{issuedDevices.length ? <><div className="notification-settings field--wide"><div className="notification-setting" style={{ borderInlineStart: "4px solid #2b7a55" }}><span><strong>سارية</strong><small>أكثر من 7 أيام</small></span><b>{issuedDeviceVisualSummary.active}</b></div><div className="notification-setting" style={{ borderInlineStart: "4px solid #c18a2d" }}><span><strong>قريبة</strong><small>خلال 7 أيام</small></span><b>{issuedDeviceVisualSummary.near}</b></div><div className="notification-setting" style={{ borderInlineStart: "4px solid #d26b33" }}><span><strong>تحذير</strong><small>خلال 3 أيام</small></span><b>{issuedDeviceVisualSummary.warning}</b></div><div className="notification-setting" style={{ borderInlineStart: "4px solid #b74d39" }}><span><strong>عاجلة / منتهية</strong><small>يوم واحد أو منتهية</small></span><b>{issuedDeviceVisualSummary.urgent + issuedDeviceVisualSummary.expired}</b></div></div><div className="modal-actions field--wide"><label className="field"><span>فلترة الأجهزة</span><select value={issuedDeviceFilter} onChange={(event) => setIssuedDeviceFilter(event.target.value as typeof issuedDeviceFilter)}><option value="all">كل الأجهزة</option><option value="active">سارية</option><option value="near">قريبة خلال 7 أيام</option><option value="warning">تحذير خلال 3 أيام</option><option value="urgent">عاجلة — يوم واحد</option><option value="expired">منتهية</option></select></label><button type="button" className="action-button action-button--secondary" onClick={() => void exportIssuedDevicesExcel()}><Download size={17} /> تصدير Excel</button></div>{filteredIssuedDevices.length ? <div className="price-history-list field--wide">{filteredIssuedDevices.map((record) => { const visual = getIssuedDeviceVisualState(record); const tone = visual.state === "active" ? { color: "#1e6b4a", background: "#e8f4ed", border: "#2b7a55", label: "ساري" } : visual.state === "near" ? { color: "#936617", background: "#fff7dc", border: "#c18a2d", label: `ينتهي خلال ${visual.daysRemaining} أيام` } : visual.state === "warning" ? { color: "#a1491f", background: "#fff0e8", border: "#d26b33", label: `ينتهي خلال ${visual.daysRemaining} أيام` } : visual.state === "urgent" ? { color: "#9b372b", background: "#fff0ed", border: "#b74d39", label: "ينتهي غدًا" } : { color: "#8f302a", background: "#fde9e7", border: "#a33f35", label: "منتهٍ" }; return <div className="price-history-row" style={{ borderInlineStart: `4px solid ${tone.border}` }} key={record.deviceId}><span><strong>{record.username}</strong><small>الجهاز {record.deviceId.slice(-8)} · صدر في {formatDate(record.issuedAt)} · ينتهي {formatDate(record.expiresAt)}{record.deactivationIssuedAt ? ` · رمز تعطيل صدر ${formatDate(record.deactivationIssuedAt)}` : ""}{record.deactivationReason ? ` · السبب: ${record.deactivationReason}` : ""}</small></span><span className="status-badge" style={{ color: tone.color, background: tone.background }}>{tone.label}</span><div className="row-actions"><button type="button" className="text-button" onClick={() => prepareIssuedDeviceRenewal(record)}>تجديد</button><button type="button" className="text-button low-number" onClick={() => issueDeviceDeactivation(record)}>إنشاء تعطيل</button><button type="button" className="mini-icon mini-icon--danger" onClick={() => deleteIssuedDeviceRecord(record)} aria-label={`حذف ${record.username}`}><Trash2 size={15} /></button></div></div>; })}</div> : <p className="modal-note field--wide">لا توجد أجهزة تطابق الفلترة الحالية.</p>}</> : <p className="modal-note field--wide">عند إصدار أول تفعيل سيظهر الجهاز هنا مع اسم المستخدم وتاريخ انتهاء الصلاحية.</p>}</section>}
                {accessProfile?.role === "owner" && issuedDeactivationCode && <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><ShieldOff size={21} /></div><div><span className="section-kicker">رمز تعطيل جهاز</span><h3>أرسله إلى الجهاز المطلوب فقط</h3><p>يفتح مستخدم الجهاز شاشة الدخول ثم يختار «استيراد رمز تعطيل»، ويمسح هذا الرمز أو يلصقه. الحذف من السجل وحده لا يوقف الجهاز.</p></div>{issuedDeactivationQr && <img src={issuedDeactivationQr} alt="رمز QR لتعطيل جهاز" className="mx-auto my-3 w-48 h-48 rounded-xl bg-white p-2" />}<textarea className="w-full min-h-20" value={issuedDeactivationCode} readOnly aria-label="رمز تعطيل الجهاز" /></section>}
                {accessProfile?.role === "owner" && <section className="panel settings-card settings-card--receipt"><div className="setting-icon"><ClipboardList size={21} /></div><div><span className="section-kicker">بحث ونشاط الأجهزة</span><h3>راجع العمليات واطبع التقرير</h3><p>اكتب اسم المستخدم أو جزءًا من معرف الجهاز؛ ينعكس البحث على سجل الأجهزة أعلاه وعلى آخر النشاطات هنا.</p></div><label className="field field--wide"><span>بحث في الأجهزة</span><div className="search-field"><Search size={18} /><input value={issuedDeviceQuery} onChange={(event) => setIssuedDeviceQuery(event.target.value)} placeholder="مثال: cash-1 أو آخر أرقام معرف الجهاز" /></div></label><div className="modal-actions field--wide"><button type="button" className="action-button action-button--secondary" onClick={printIssuedDevicesReport}><Printer size={17} /> طباعة تقرير الأجهزة</button><span className="modal-note">نتائج مطابقة: {filteredIssuedDevices.length} جهاز</span></div><div className="price-history-list field--wide">{filteredDeviceActivity.slice(0, 12).map((entry) => <div className="price-history-row" key={entry.id}><span><strong>{entry.username} — {getDeviceActivityLabel(entry.action)}</strong><small>{formatDate(entry.createdAt)} · الجهاز {entry.deviceId.slice(-8)}{entry.note ? ` · ${entry.note}` : ""}</small></span><History size={17} /></div>)}{!filteredDeviceActivity.length && <p className="modal-note">لا توجد عمليات مطابقة للبحث الحالي بعد.</p>}</div></section>}
                <section className="panel settings-card settings-card--receipt">
                  <div className="setting-icon"><Store size={21} /></div>
                  <div><span className="section-kicker">هوية الإيصال</span><h3>اسم المحل وشعاره</h3><p>تُحفظ الهوية على هذا الجهاز وتظهر في كل فاتورة مطبوعة.</p></div>
                  <div className="receipt-settings">
                    <label><span>اسم المحل</span><input value={store.storeName} onChange={(event) => setStore((current) => ({ ...current, storeName: event.target.value }))} placeholder="اسم محلك" /></label>
                    <label><span>هاتف المحل (اختياري)</span><input value={store.storePhone} inputMode="tel" onChange={(event) => setStore((current) => ({ ...current, storePhone: event.target.value }))} placeholder="مثال: 091 000 0000" /></label>
                    <label><span>محتوى رمز QR في الفاتورة (اختياري)</span><textarea value={store.receiptQrContent} onChange={(event) => setStore((current) => ({ ...current, receiptQrContent: event.target.value.slice(0, 300) }))} maxLength={300} placeholder="مثال: رابط موقع المحل في خرائط Google، واتساب، رقم هاتف، أو نص معلومات المحل" /><small>إن تركته فارغًا، يعرض الرمز ملخص الفاتورة. استخدم رابطًا قصيرًا ليبقى الرمز واضحًا عند الطباعة.</small></label>
                    <label><span>حجم خط الفاتورة الحرارية</span><select value={store.receiptTextSize} onChange={(event) => setStore((current) => ({ ...current, receiptTextSize: event.target.value === "small" || event.target.value === "large" ? event.target.value : "normal" }))}><option value="small">صغير — يوفر مساحة</option><option value="normal">متوسط — موصى به</option><option value="large">كبير — أوضح للقراءة</option></select><small>يؤثر في إيصالات 58 و80 مم فقط، وليس ورقة A4.</small></label>
                    <label><span>درجة وضوح الطباعة الحرارية</span><select value={store.receiptPrintClarity} onChange={(event) => setStore((current) => ({ ...current, receiptPrintClarity: event.target.value === "standard" || event.target.value === "maximum" ? event.target.value : "high" }))}><option value="standard">عادي — حبر وخطوط أخف</option><option value="high">واضح — موصى به</option><option value="maximum">أقصى تباين — للطباعة الباهتة</option></select><small>يزيد سماكة الخطوط والفواصل داخل الإيصال؛ إعداد الطابعة الفعلي يبقى من خصائص Xprinter.</small></label>
                    <div className="receipt-logo-picker">
                      <img src={store.receiptLogo || logoUrl} alt={store.receiptLogo ? `شعار ${store.storeName}` : "شعار سوقنا الافتراضي"} />
                      <div><b>{store.receiptLogo ? "شعار محلك" : "شعار سوقنا الافتراضي"}</b><small>يُصغّر تلقائيًا ويُحفظ محليًا. JPG أو PNG أو WebP.</small></div>
                      <input className="hidden-input" ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { uploadReceiptLogo(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                      <div className="receipt-logo-picker__actions"><button type="button" className="action-button action-button--secondary" onClick={() => logoInputRef.current?.click()}><Upload size={16} /> رفع شعار</button>{store.receiptLogo && <button type="button" className="text-button" onClick={() => { setStore((current) => ({ ...current, receiptLogo: "" })); toast.success("سيُستخدم شعار سوقنا الافتراضي في الإيصالات."); }}>إزالة الشعار</button>}</div>
                    </div>
                    <label><span>خصم افتراضي عند الفاتورة (%)</span><input value={store.defaultDiscountPercent || ""} inputMode="decimal" type="number" min="0" max="100" step="0.5" onChange={(event) => setStore((current) => ({ ...current, defaultDiscountPercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) }))} placeholder="0" /></label>
                    <label><span>سقف مصروفات اليوم (د.ل)</span><input value={store.dailyExpenseLimit || ""} inputMode="decimal" type="number" min="0" step="0.01" onChange={(event) => setStore((current) => ({ ...current, dailyExpenseLimit: Math.max(0, Number(event.target.value) || 0) }))} placeholder="بدون سقف" /><small>{todayExpenseLimitStatus.active ? `اليوم: ${money(todayExpenseLimitStatus.spent)} من ${money(todayExpenseLimitStatus.limit)}` : "اختياري: سيظهر تنبيه عند 80% وعند التجاوز."}</small></label>
                    <label><span>حد تنبيه نسبة الإرجاع (%)</span><input value={store.returnRateAlertThreshold} inputMode="decimal" type="number" min="1" max="100" step="0.5" onChange={(event) => setStore((current) => ({ ...current, returnRateAlertThreshold: Math.min(100, Math.max(1, Number(event.target.value) || 10)) }))} /><small>يظهر تنبيه محلي للصنف عندما تبلغ نسبة إرجاعه هذا الحد أو تتجاوزه.</small></label>
                  </div>
                </section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--blue"><UserRound size={21} /></div><div><span className="section-kicker">فئات الزبائن</span><h3>خصومات محلية حسب الفئة</h3><p>أنشئ الفئات التي تناسب محلك، ثم اخترها في الفاتورة لتعبئة الخصم تلقائيًا. يبقى الخصم قابلًا للتعديل لكل عملية بيع.</p></div><form className="receipt-settings" onSubmit={addCustomerCategory}><label><span>اسم الفئة *</span><input name="name" maxLength={60} placeholder="مثال: زبون دائم" required /></label><label><span>الخصم (%) *</span><input name="discountPercent" type="number" inputMode="decimal" min="0" max="100" step="0.5" placeholder="مثال: 5" required /></label><button className="action-button action-button--secondary" type="submit"><Plus size={17} /> إضافة فئة</button></form>{store.customerCategories.length ? <div className="price-history-list">{store.customerCategories.map((category) => <div className="price-history-row" key={category.id}><span><strong>{category.name}</strong><small>خصم افتراضي في الفاتورة</small></span><b dir="ltr">{category.discountPercent}%</b><button className="mini-icon mini-icon--danger" onClick={() => deleteCustomerCategory(category)} aria-label={`حذف فئة ${category.name}`}><Trash2 size={15} /></button></div>)}</div> : <p className="modal-note">لا توجد فئات بعد؛ لن تُنشأ أي فئات تلقائيًا.</p>}</section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--blue"><UserRound size={21} /></div><div><span className="section-kicker">موظفو المحل</span><h3>أسماء محلية للفواتير</h3><p>أضف أسماء اختيارية للكاشير أو العاملين ثم اختر الاسم عند البيع. لا توجد حسابات أو تسجيل دخول أو تتبع خارجي.</p></div><form className="receipt-settings" onSubmit={addLocalStaffMember}><label><span>اسم الموظف *</span><input name="name" maxLength={60} placeholder="مثال: كاشير صباحي" required /></label><button className="action-button action-button--secondary" type="submit"><Plus size={17} /> إضافة موظف</button></form>{store.localStaff.length ? <div className="price-history-list">{store.localStaff.map((member) => <div className="price-history-row" key={member.id}><span><strong>{member.name}</strong><small>يظهر كخيار عند تسجيل البيع</small></span><button className="mini-icon mini-icon--danger" onClick={() => deleteLocalStaffMember(member)} aria-label={`حذف الموظف ${member.name}`}><Trash2 size={15} /></button></div>)}</div> : <p className="modal-note">لا توجد أسماء موظفين بعد؛ الفواتير ستبقى بلا اسم موظف حتى تضيف اسمًا وتختاره.</p>}</section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--apricot"><ShieldCheck size={21} /></div><div><span className="section-kicker">قفل العمليات الحساسة</span><h3>{actionLockSettings.enabled ? "القفل المحلي مفعّل" : "قفل اختياري برمز محلي"}</h3><p>عند تفعيله، يطلب سوقنا الرمز قبل حذف صنف أو مصروف، إلغاء إغلاق وردية، اعتماد جرد جماعي، أو اعتماد إرجاع بيع. لا يُرسل الرمز خارج هذا الجهاز.</p></div>{actionLockSettings.enabled ? <div className="receipt-settings"><span className="status-badge">مفعّل برمز رقمي</span><button className="action-button action-button--secondary" onClick={disableActionLock}><ShieldOff size={17} /> إيقاف القفل</button></div> : <form className="receipt-settings" onSubmit={saveActionLock}><label><span>رمز القفل (4–8 أرقام)</span><input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,8}" autoComplete="new-password" required /></label><label><span>تأكيد الرمز</span><input name="confirmation" type="password" inputMode="numeric" pattern="[0-9]{4,8}" autoComplete="new-password" required /></label><button className="action-button action-button--secondary" type="submit"><ShieldCheck size={17} /> تفعيل القفل</button></form>}</section>
                <section className="panel settings-card settings-card--printer settings-card--printer-hub"><div className="setting-icon setting-icon--blue"><Printer size={21} /></div><div><span className="section-kicker">مركز الطباعة الحرارية</span><h3>اطبع عبر هاتف أندرويد</h3><p>لا يحتاج سوقنا إلى موديل محدد. ابدأ دائمًا باختيار الطابعة من نافذة أندرويد؛ فهذا يعرض الطابعات التي يعرفها هاتفك.</p></div><div className="printer-settings"><div className="printer-detect printer-detect--primary"><button onClick={printTestReceipt}><Printer size={15} /> اختيار طابعة من النظام</button><button onClick={() => void connectThermalPrinter()}><Bluetooth size={15} /> طابعة بلوتوث</button></div><details className="printer-usb-advanced"><summary><Search size={14} /> لدي كابل OTG وطابعة USB</summary><div><p>اضغط البحث فقط بعد وصل الطابعة بالهاتف عبر OTG. إن ظهرت أجهزة «مجهولة أو غير متوافقة»، ألغِ النافذة ولا تقرنها.</p><button onClick={() => void detectUsbThermalPrinter()}><Search size={14} /> بحث عن طابعة USB</button></div></details><span>مقاس الورق</span><div className="paper-presets"><button className={printerSettings.paperWidth === "58" ? "selected" : ""} onClick={() => setPrinterSettings((current) => ({ ...current, paperWidth: "58" }))}>58 مم</button><button className={printerSettings.paperWidth === "80" ? "selected" : ""} onClick={() => setPrinterSettings((current) => ({ ...current, paperWidth: "80" }))}>80 مم</button><button className={printerSettings.paperWidth === "A4" ? "selected" : ""} onClick={() => setPrinterSettings((current) => ({ ...current, paperWidth: "A4" }))}>A4</button></div><label className="printer-name"><span>اسم الطابعة</span><input value={printerSettings.deviceName} onChange={(event) => setPrinterSettings((current) => ({ ...current, deviceName: event.target.value }))} placeholder="اختياري — يُحفظ محليًا" /></label><label className="printer-name"><span>الطراز / رقم الملصق (اختياري)</span><input value={printerSettings.model} onChange={(event) => setPrinterSettings((current) => ({ ...current, model: event.target.value }))} placeholder="أي طابعة حرارية" /></label><label className="printer-name"><span>طريقة التوصيل</span><select value={printerSettings.connection} onChange={(event) => setPrinterSettings((current) => ({ ...current, connection: event.target.value as PrinterSettings["connection"] }))}><option value="system">اختيار من نافذة النظام</option><option value="usb">USB عبر وصلة OTG</option><option value="bluetooth">بلوتوث</option><option value="network">شبكة Wi‑Fi/LAN</option></select></label><p className="printer-help"><b>الخطوة الصحيحة أولًا:</b> اضغط «اختيار طابعة من النظام». إذا لم يظهر اسم الطابعة، افتح في أندرويد: <strong>الإعدادات ← الأجهزة المتصلة ← الطباعة</strong>، ثم فعّل خدمة طباعة متوافقة وأعد المحاولة. تحتاج طابعة USB إلى وصلة OTG أو اتصال شبكة قبل أن تصبح متاحة.</p></div></section>
                <section className="panel settings-card settings-card--install"><div className="setting-icon setting-icon--blue"><Download size={21} /></div><div><span className="section-kicker">تطبيق الهاتف</span><h3>ثبّت سوقنا على الشاشة</h3><p>افتحه من أيقونة مستقلة واستخدمه كمساعد يومي لمتجرك حتى عند انقطاع الإنترنت.</p></div><button className="action-button action-button--secondary" onClick={() => void installOnDevice()}><Download size={17} /> {installPrompt ? "تثبيت سوقنا الآن" : "إرشادات التثبيت"}</button></section>
                <section className="panel settings-card settings-card--readiness"><div className="setting-icon"><Check size={21} /></div><div><span className="section-kicker">جاهزية التشغيل</span><h3>حالة محلك على هذا الهاتف</h3><p>ملخص سريع للمكونات المحلية التي تحتاجها قبل بدء اليوم.</p></div><div className="readiness-list"><span><i /> التخزين المحلي: جاهز</span><span><i /> الطباعة: {printerSettings.deviceName || "اختيار الطابعة من النظام"}</span><span className={lastBackupAt ? "readiness-list__ok" : "readiness-list__attention"}><i /> النسخة الاحتياطية: {lastBackupAt ? `آخر تنزيل ${formatDate(lastBackupAt)}` : "صدّر نسخة أولى اليوم"}</span></div></section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--apricot"><Download size={21} /></div><div><span className="section-kicker">نسخة احتياطية</span><h3>تصدير بياناتك</h3><p>نزّل ملفًا واحدًا يحتوي على المنتجات والفواتير والذمم، واحفظه في مكان آمن.</p></div><button className="action-button action-button--secondary" onClick={exportData}><Download size={17} /> تصدير البيانات</button></section>
                <section className="panel settings-card"><div className="setting-icon setting-icon--sand"><Upload size={21} /></div><div><span className="section-kicker">استعادة</span><h3>استيراد نسخة</h3><p>يفحص سوقنا الملف ويعرض ملخصه قبل أن يستبدل بيانات هذا الجهاز.</p></div><input className="hidden-input" ref={fileInputRef} type="file" accept="application/json" onChange={(event) => { void importData(event.target.files?.[0]); event.currentTarget.value = ""; }} /><button className="action-button action-button--secondary" onClick={() => fileInputRef.current?.click()}><Upload size={17} /> استيراد نسخة</button></section>
                <section className="panel settings-card settings-card--notifications"><div className="setting-icon setting-icon--blue"><BellRing size={21} /></div><div><span className="section-kicker">تنبيهات مخصصة</span><h3>مركز إشعارات المحل</h3><p>اختر التنبيهات التي تظهر لك في الجرس. تبقى اختياراتك على هذا الجهاز.</p></div><div className="notification-settings"><button className={notificationPreferences.stock ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, stock: !current.stock }))}><span><Archive size={15} /> انخفاض المخزون</span><i aria-label={notificationPreferences.stock ? "مفعل" : "متوقف"} /></button><button className={notificationPreferences.debts ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, debts: !current.debts }))}><span><WalletCards size={15} /> الذمم المستحقة</span><i aria-label={notificationPreferences.debts ? "مفعل" : "متوقف"} /></button><button className={notificationPreferences.cash ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, cash: !current.cash }))}><span><CircleDollarSign size={15} /> سقف مصروفات اليوم</span><i aria-label={notificationPreferences.cash ? "مفعل" : "متوقف"} /></button><button className={notificationPreferences.goals ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, goals: !current.goals }))}><span><TrendingUp size={15} /> تحقيق هدف المبيعات</span><i aria-label={notificationPreferences.goals ? "مفعل" : "متوقف"} /></button><button className={notificationPreferences.backup ? "notification-setting--on" : ""} onClick={() => setNotificationPreferences((current) => ({ ...current, backup: !current.backup }))}><span><Download size={15} /> نسخة احتياطية يومية</span><i aria-label={notificationPreferences.backup ? "مفعل" : "متوقف"} /></button></div></section>
                <section className="panel settings-card settings-card--danger"><div className="setting-icon setting-icon--danger"><Trash2 size={21} /></div><div><span className="section-kicker">إعادة ضبط</span><h3>بدء محل جديد</h3><p>يحذف بيانات هذا المحل من الجهاز بالكامل ولا يضيف أي منتجات افتراضية. صدّر نسخة قبل المتابعة.</p></div><button className="action-button action-button--danger" onClick={resetData}><Trash2 size={17} /> حذف البيانات</button></section>
              </div>
              <section className="local-assurance" style={{ backgroundImage: `linear-gradient(90deg, rgba(31,76,60,.97), rgba(31,76,60,.88)), url(${receiptPatternUrl})` }}><img src={logoUrl} alt="" /><div><h3>محلك يستمر، حتى لو انقطع الإنترنت.</h3><p>سوقنا تطبيق محلي: الحسابات تعمل مباشرة على جهازك، ولا تحتاج إلى تسجيل دخول أو خادم لتتابع البيع.</p></div><span><WifiOff size={18} /> محلي بالكامل</span></section>
            </section>
          )}
        </div>
      </main>

      {showMonthlyGoalForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitMonthlySalesGoal} role="dialog" aria-modal="true" aria-label="ضبط هدف مبيعات شهري"><div className="modal-heading"><div><span className="section-kicker">مبيعات الشهر</span><h3>ضبط هدف شهري محلي</h3></div><button type="button" className="icon-button" onClick={() => setShowMonthlyGoalForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>الشهر</span><input name="month" type="month" defaultValue={currentMonthKey} required /></label><label className="field"><span>هدف المبيعات (د.ل) *</span><input name="target" autoFocus type="number" min="0.01" step="0.01" defaultValue={monthlyGoalProgress.active ? monthlyGoalProgress.target : ""} placeholder="مثال: 15000" required /></label></div><p className="modal-note">يُحسب إنجاز الهدف من صافي مبيعات الشهر المحفوظة على هذا الجهاز، بما فيها أي إرجاعات مسجلة.</p><div className="modal-actions">{monthlyGoalProgress.active && <button type="button" className="text-button" onClick={clearMonthlySalesGoal}>إزالة هدف الشهر</button>}<button type="button" className="action-button action-button--secondary" onClick={() => setShowMonthlyGoalForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><CalendarDays size={17} /> حفظ هدف الشهر</button></div></form></div>}
      {showDailyGoalForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitDailySalesGoal} role="dialog" aria-modal="true" aria-label="ضبط هدف مبيعات يومي"><div className="modal-heading"><div><span className="section-kicker">مبيعات اليوم</span><h3>ضبط هدف محلي</h3></div><button type="button" className="icon-button" onClick={() => setShowDailyGoalForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>تاريخ الهدف</span><input name="date" type="date" defaultValue={todayKey()} required /></label><label className="field"><span>هدف المبيعات (د.ل) *</span><input name="target" autoFocus type="number" min="0.01" step="0.01" defaultValue={dailyGoalProgress.active ? dailyGoalProgress.target : ""} placeholder="مثال: 500" required /></label></div><p className="modal-note">يُستخدم الهدف للمتابعة والتنبيه داخل هذا الجهاز فقط، ولا يرسل أي بيانات إلى الإنترنت.</p><div className="modal-actions">{dailyGoalProgress.active && <button type="button" className="text-button" onClick={clearDailySalesGoal}>إزالة هدف اليوم</button>}<button type="button" className="action-button action-button--secondary" onClick={() => setShowDailyGoalForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><TrendingUp size={17} /> حفظ الهدف</button></div></form></div>}
      {showProductForm && <div className="modal-backdrop" role="presentation"><form className="modal-card" onSubmit={saveProduct} role="dialog" aria-modal="true" aria-label={editingProduct ? "تعديل صنف" : "إضافة صنف"}><div className="modal-heading"><div><span className="section-kicker">المخزون</span><h3>{editingProduct ? "تعديل الصنف" : "إضافة صنف جديد"}</h3></div><button type="button" className="icon-button" onClick={() => { setShowProductForm(false); setEditingProduct(null); setPendingBarcode(""); setPendingProductImage(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field field--wide"><span>اسم الصنف *</span><input name="name" autoFocus placeholder="مثال: زيت نباتي 1 لتر" defaultValue={editingProduct?.name} required /></label><label className="field"><span>رمز الصنف</span><input name="sku" placeholder="1006" defaultValue={editingProduct?.sku || pendingBarcode} /></label><label className="field"><span>التصنيف</span><input name="category" placeholder="مواد أساسية" defaultValue={editingProduct?.category || "عام"} /></label><label className="field"><span>اسم المورد (اختياري)</span><input name="supplierName" placeholder="مثال: مورد الحي" defaultValue={editingProduct?.supplierName || ""} /></label><label className="field"><span>تاريخ الصلاحية (اختياري)</span><input name="expiryDate" type="date" defaultValue={editingProduct?.expiryDate || ""} /></label><label className="field"><span>الكمية الحالية *</span><input name="quantity" type="number" min="0" defaultValue={editingProduct?.quantity ?? "0"} required /></label><label className="field"><span>حد التنبيه *</span><input name="lowStockAt" type="number" min="0" defaultValue={editingProduct?.lowStockAt ?? "5"} required /></label><label className="field"><span>سعر الشراء (د.ل) *</span><input name="purchasePrice" type="number" step="0.01" min="0" defaultValue={editingProduct?.purchasePrice} required /></label><label className="field"><span>سعر البيع (د.ل) *</span><input name="salePrice" type="number" step="0.01" min="0" defaultValue={editingProduct?.salePrice} required /></label><label className="field"><span>هامش الربح الأدنى (%)</span><input name="minimumMarginPercent" type="number" min="0" max="100" step="0.1" inputMode="decimal" placeholder="اختياري" defaultValue={editingProduct?.minimumMarginPercent || ""} /></label><label className="field"><span>عرض كمية: من عدد</span><input name="quantityOfferMinimum" type="number" min="1" step="1" inputMode="numeric" placeholder="مثال: 3" defaultValue={editingProduct?.quantityOffers?.[0]?.minimumQuantity ?? ""} /></label><label className="field"><span>خصم عرض الكمية (%)</span><input name="quantityOfferDiscount" type="number" min="0.01" max="100" step="0.01" inputMode="decimal" placeholder="مثال: 5" defaultValue={editingProduct?.quantityOffers?.[0]?.discountPercent ?? ""} /></label><label className="field"><span>بداية العرض (اختيارية)</span><input name="quantityOfferStartDate" type="date" defaultValue={editingProduct?.quantityOffers?.[0]?.startDate ?? ""} /></label><label className="field"><span>نهاية العرض (اختيارية)</span><input name="quantityOfferEndDate" type="date" defaultValue={editingProduct?.quantityOffers?.[0]?.endDate ?? ""} /></label><p className="modal-note field--wide">حد هامش الربح اختياري؛ عند تحديده يمنع سوقنا اعتماد أي بيع أو خصم يجعل هامش الصنف دونه. اتركه فارغًا لإلغاء الحماية. عروض الكمية تطبق تلقائيًا عند بلوغ الحد المحدد.</p><div className="product-photo-field field field--wide"><span>صورة الصنف (اختيارية)</span><input className="hidden-input" ref={productImageInputRef} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={(event) => { uploadProductImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /><div>{pendingProductImage ? <img src={pendingProductImage} alt="معاينة صورة الصنف" /> : <span><Camera size={20} /> لم تضف صورة بعد</span>}<button type="button" className="action-button action-button--secondary" onClick={() => productImageInputRef.current?.click()}><Camera size={16} /> كاميرا أو معرض</button>{pendingProductImage && <button type="button" className="text-button" onClick={() => setPendingProductImage("")}>إزالة الصورة</button>}</div><small>تُصغّر الصورة وتُحفظ محليًا على هذا الهاتف.</small></div></div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setShowProductForm(false); setEditingProduct(null); setPendingBarcode(""); setPendingProductImage(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit">{editingProduct ? <Pencil size={17} /> : <PackagePlus size={17} />}{editingProduct ? " حفظ التعديلات" : " حفظ الصنف"}</button></div></form></div>}
      {showDebtForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={addDebt} role="dialog" aria-modal="true" aria-label="إضافة ذمة"><div className="modal-heading"><div><span className="section-kicker">دفتر الذمم</span><h3>إضافة ذمة يدوية</h3></div><button type="button" className="icon-button" onClick={() => setShowDebtForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>اسم الزبون *</span><input name="customer" autoFocus placeholder="اسم الزبون" required /></label><label className="field"><span>هاتف الزبون (اختياري)</span><input name="customerPhone" inputMode="tel" placeholder="091 000 0000" /></label><label className="field"><span>المبلغ (د.ل) *</span><input name="amount" type="number" min="0.01" step="0.01" required /></label><label className="field"><span>تاريخ الاستحقاق</span><input name="dueDate" type="date" /></label><label className="field field--wide"><span>ملاحظة</span><input name="note" placeholder="مثال: بضاعة اليوم" /></label></div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowDebtForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><WalletCards size={17} /> حفظ الذمة</button></div></form></div>}
      {collectionDebt && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitDebtCollection} role="dialog" aria-modal="true" aria-label="تحصيل ذمة"><div className="modal-heading"><div><span className="section-kicker">تحصيل ذمة</span><h3>{collectionDebt.customerName}</h3></div><button type="button" className="icon-button" onClick={() => { setCollectionDebt(null); setCollectionAmount(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>المتبقي حاليًا</span><strong dir="ltr">{money(Math.max(0, collectionDebt.amount - collectionDebt.paid))}</strong></div><label className="field"><span>المبلغ المقبوض (د.ل)</span><input autoFocus value={collectionAmount} onChange={(event) => setCollectionAmount(event.target.value)} type="number" min="0.01" step="0.01" inputMode="decimal" required /></label><p className="modal-note">عند إدخال المبلغ المتبقي كاملًا، تنتقل الذمة تلقائيًا إلى أرشيف الذمم المسددة.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setCollectionDebt(null); setCollectionAmount(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> حفظ الدفعة</button></div></form></div>}
      {showShelfLabels && <div className="modal-backdrop" role="presentation"><section className="modal-card modal-card--debt" role="dialog" aria-modal="true" aria-label="طباعة ملصقات أسعار"><div className="modal-heading"><div><span className="section-kicker">طباعة الرفوف</span><h3>اختر ملصقات الأسعار</h3></div><button type="button" className="icon-button" onClick={() => setShowShelfLabels(false)} aria-label="إغلاق"><X size={19} /></button></div><p className="modal-note">فعّل الصنف، ثم اكتب عدد ملصقاته. مثال: اختر «ماء» واكتب 20 لطباعة 20 ملصقًا له.</p><label className="field"><span>مقاس الملصق</span><select value={labelSize} onChange={(event) => setLabelSize(event.target.value as LabelSize)}>{(Object.entries(labelSizePresets) as Array<[LabelSize, typeof labelSizePresets[LabelSize]]>).map(([value, preset]) => <option key={value} value={value}>{preset.label}</option>)}</select></label><div className="notification-settings">{filteredInventory.map((product) => { const checked = selectedLabelProductIds.includes(product.id); const quantity = getShelfLabelQuantity(labelQuantities[product.id]); return <div key={product.id} className={checked ? "notification-setting--on" : ""}><button type="button" className="notification-setting" onClick={() => { setSelectedLabelProductIds((current) => checked ? current.filter((id) => id !== product.id) : [...current, product.id]); if (!checked) setLabelQuantities((current) => ({ ...current, [product.id]: current[product.id] || "1" })); }}><span><strong>{product.name}</strong><small dir="ltr">{money(product.salePrice)}</small></span><i aria-label={checked ? "مختار" : "غير مختار"} /></button>{checked && <label className="field"><span>عدد ملصقات {product.name}</span><input type="number" min="1" max="500" step="1" inputMode="numeric" value={labelQuantities[product.id] ?? "1"} onChange={(event) => setLabelQuantities((current) => ({ ...current, [product.id]: event.target.value }))} aria-label={`عدد ملصقات ${product.name}`} /></label>}</div>; })}</div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowShelfLabels(false)}>إلغاء</button><button type="button" className="action-button action-button--primary" onClick={printShelfLabels}><Printer size={17} /> طباعة المختار ({selectedLabelProductIds.reduce((total, productId) => total + getShelfLabelQuantity(labelQuantities[productId]), 0)} ملصق)</button></div></section></div>}
      {receivingProduct && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={receiveSupplierBatch} role="dialog" aria-modal="true" aria-label="استلام دفعة من المورد"><div className="modal-heading"><div><span className="section-kicker">سجل استلام المورد</span><h3>{receivingProduct.name}</h3></div><button type="button" className="icon-button" onClick={() => setReceivingProduct(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>المخزون الحالي</span><strong>{receivingProduct.quantity} وحدة</strong></div><div className="form-grid"><label className="field"><span>الكمية المستلمة *</span><input name="quantity" autoFocus type="number" min="1" step="1" defaultValue="1" required /></label><label className="field"><span>سعر شراء الدفعة (د.ل) *</span><input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={receivingProduct.purchasePrice} required /></label><label className="field"><span>المورد</span><input name="supplierName" defaultValue={receivingProduct.supplierName || ""} placeholder="اسم المورد" /></label>{store.localStaff.length > 0 && <label className="field"><span>الموظف المسؤول عن الاستلام</span><select value={receivingStaffMemberId} onChange={(event) => setReceivingStaffMemberId(event.target.value)}><option value="">بدون تحديد</option>{store.localStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}<label className="field"><span>مرجع فاتورة الشراء</span><input name="purchaseInvoiceRef" maxLength={100} placeholder="مثال: INV-2026-001" /></label><label className="field"><span>تاريخ الصلاحية</span><input name="expiryDate" type="date" defaultValue={receivingProduct.expiryDate || ""} /></label><label className="field field--wide"><span>ملاحظة الاستلام</span><input name="note" placeholder="مثال: استلام جزئي أو ملاحظة البضاعة" /></label></div><p className="modal-note">يضيف سوقنا الدفعة إلى السجل ويقترح بيع الدفعات الأقرب صلاحية أولًا.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setReceivingProduct(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><PackagePlus size={17} /> حفظ الاستلام</button></div></form></div>}
      {editingBatch && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitBatchEdit} role="dialog" aria-modal="true" aria-label="تعديل دفعة غير مستهلكة"><div className="modal-heading"><div><span className="section-kicker">تعديل دفعة آمن</span><h3>{editingBatch.product.name}</h3></div><button type="button" className="icon-button" onClick={() => setEditingBatch(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>الدفعة غير مستهلكة</span><strong>{editingBatch.batch.remainingQuantity} / {editingBatch.batch.quantity} وحدة</strong></div><div className="form-grid"><label className="field"><span>كمية الدفعة *</span><input name="quantity" autoFocus type="number" min="1" step="1" defaultValue={editingBatch.batch.quantity} required /></label><label className="field"><span>سعر الشراء (د.ل) *</span><input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={editingBatch.batch.purchasePrice} required /></label><label className="field"><span>المورد</span><input name="supplierName" defaultValue={editingBatch.batch.supplierName} /></label><label className="field"><span>مرجع فاتورة الشراء</span><input name="purchaseInvoiceRef" maxLength={100} defaultValue={editingBatch.batch.purchaseInvoiceRef || ""} /></label><label className="field"><span>تاريخ الصلاحية</span><input name="expiryDate" type="date" defaultValue={editingBatch.batch.expiryDate} /></label><label className="field field--wide"><span>ملاحظة الدفعة</span><input name="note" defaultValue={editingBatch.batch.note} /></label></div><p className="modal-note">لا يمكن تعديل أو إلغاء الدفعة بعد استهلاك أي جزء منها؛ لحماية دقة المخزون والفواتير.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setEditingBatch(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Pencil size={17} /> حفظ التعديل</button></div></form></div>}
      {wasteApprovalBatch && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitWasteApproval} role="dialog" aria-modal="true" aria-label="طلب اعتماد هدر دفعة منتهية"><div className="modal-heading"><div><span className="section-kicker">المرحلة الأولى</span><h3>طلب اعتماد هدر: {wasteApprovalBatch.product.name}</h3></div><button type="button" className="icon-button" onClick={() => setWasteApprovalBatch(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>دفعة منتهية</span><strong>{wasteApprovalBatch.batch.remainingQuantity} وحدة · {money(wasteApprovalBatch.batch.remainingQuantity * wasteApprovalBatch.batch.purchasePrice)}</strong></div><label className="field"><span>سبب الهدر *</span><input name="reason" autoFocus required placeholder="مثال: انتهاء الصلاحية أو تلف العبوة" /></label><p className="modal-note">سيُحفظ طلب الهدر مع السبب والتكلفة، ولن تُخصم الكمية إلا بعد اعتماد نهائي منفصل.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setWasteApprovalBatch(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> حفظ طلب الهدر</button></div></form></div>}
      {finalWasteApprovalBatch && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitFinalWasteApproval} role="dialog" aria-modal="true" aria-label="اعتماد نهائي لهدر الدفعة"><div className="modal-heading"><div><span className="section-kicker">المرحلة الثانية</span><h3>اعتماد نهائي: {finalWasteApprovalBatch.product.name}</h3></div><button type="button" className="icon-button" onClick={() => setFinalWasteApprovalBatch(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>سبب الطلب</span><strong>{finalWasteApprovalBatch.batch.wasteRequest?.reason}</strong></div><label className="field"><span>اكتب «اعتماد نهائي» للتأكيد *</span><input name="confirmation" autoFocus required placeholder="اعتماد نهائي" /></label><p className="modal-note">بعد التأكيد ستُخصم الكمية من المخزون ويُحفظ سجل الهدر بتاريخه وتكلفته.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setFinalWasteApprovalBatch(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> اعتماد نهائي</button></div></form></div>}
      {supplierReturnBatch && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitSupplierReturn} role="dialog" aria-modal="true" aria-label="إرجاع دفعة إلى المورد"><div className="modal-heading"><div><span className="section-kicker">إرجاع إلى المورد</span><h3>{supplierReturnBatch.product.name}</h3></div><button type="button" className="icon-button" onClick={() => setSupplierReturnBatch(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>{supplierReturnBatch.batch.supplierName || "المورد غير محدد"}</span><strong>{supplierReturnBatch.batch.quantity} وحدة · {money(supplierReturnBatch.batch.quantity * supplierReturnBatch.batch.purchasePrice)}</strong></div><label className="field"><span>سبب الإرجاع *</span><input name="reason" autoFocus required placeholder="مثال: خطأ في الاستلام أو تلف عند التسليم" /></label><p className="modal-note">يتاح الإرجاع فقط للدفعة غير المستهلكة بالكامل، ويُحفظ سبب العملية وتاريخها محليًا.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setSupplierReturnBatch(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><ArrowLeft size={17} /> اعتماد الإرجاع</button></div></form></div>}
      {supplierPaymentSupplier && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitSupplierPayment} role="dialog" aria-modal="true" aria-label="تسجيل دفع للمورد"><div className="modal-heading"><div><span className="section-kicker">مدفوعات الموردين</span><h3>دفع إلى {supplierPaymentSupplier}</h3></div><button type="button" className="icon-button" onClick={() => setSupplierPaymentSupplier(null)} aria-label="إغلاق"><X size={19} /></button></div><label className="field"><span>المبلغ المدفوع (د.ل) *</span><input name="amount" autoFocus required type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" /></label><label className="field"><span>ملاحظة الدفع</span><input name="note" placeholder="مثال: نقدًا أو رقم التحويل" /></label><p className="modal-note">سيُحفظ الدفع محليًا ضمن كشف المورد، ثم تُفتح نافذة النظام لمراجعة مستند الدفع وطباعته أو حفظه.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setSupplierPaymentSupplier(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><CircleDollarSign size={17} /> حفظ الدفع والمستند</button></div></form></div>}
      {showEmployeePurchaseForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={completeEmployeePurchase} role="dialog" aria-modal="true" aria-label="ترحيل سلة لموظف"><div className="modal-heading"><div><span className="section-kicker">مشتريات الموظف</span><h3>ترحيل السلة إلى حساب الموظف</h3></div><button type="button" className="icon-button" onClick={() => setShowEmployeePurchaseForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>إجمالي السلة الحالية</span><strong dir="ltr">{money(cartTotal)}</strong></div><div className="form-grid"><label className="field"><span>الموظف صاحب البضاعة *</span><select name="staffMemberId" autoFocus required defaultValue=""><option value="" disabled>اختر الموظف</option>{store.localStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label className="field"><span>شهر الخصم *</span><input name="month" type="month" defaultValue={advanceMonth || currentMonthKey} required /></label><label className="field field--wide"><span>ملاحظة الفاتورة</span><input name="note" maxLength={160} placeholder="مثال: بضاعة منزلية أو احتياجات شخصية" /></label></div><p className="modal-note">سيُنقص النظام الكمية من المخزون، ويسجل فاتورة بضاعة باسم الموظف، ثم يضيف قيمتها تلقائيًا إلى رصيده للخصم من راتب الشهر المحدد.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowEmployeePurchaseForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> اعتماد وترحيل الفاتورة</button></div></form></div>}

      {employeePurchaseReturnSale && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitEmployeePurchasePartialReturn} role="dialog" aria-modal="true" aria-label="إرجاع جزئي لمشتريات موظف"><div className="modal-heading"><div><span className="section-kicker">إرجاع مشتريات موظف</span><h3>حدّد الأصناف والكميات المُعادة</h3></div><button type="button" className="icon-button" onClick={() => setEmployeePurchaseReturnSale(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>{employeePurchaseReturnSale.employeePurchaseStaffMemberName}</span><strong dir="ltr">فاتورة #{employeePurchaseReturnSale.id.slice(-5)} · {money(employeePurchaseReturnSale.total)}</strong></div><div className="price-history-list">{employeePurchaseReturnSale.items.map((item) => { const returnedBefore = store.sales.filter((candidate) => candidate.returnOfSaleId === employeePurchaseReturnSale.id && candidate.isReturn).flatMap((candidate) => candidate.items).filter((candidate) => candidate.productId === item.productId).reduce((total, candidate) => total + Math.abs(candidate.quantity), 0); const available = Math.max(0, Math.abs(item.quantity) - returnedBefore); return <label className="price-history-row" key={item.productId}><span><strong>{item.name}</strong><small>من الفاتورة {Math.abs(item.quantity)} · سبق إرجاع {returnedBefore} · المتاح للإرجاع {available}</small></span><input type="number" min="0" max={available} step="1" inputMode="numeric" value={employeePurchaseReturnQuantities[item.productId] ?? ""} onChange={(event) => setEmployeePurchaseReturnQuantities((current) => ({ ...current, [item.productId]: event.target.value }))} aria-label={`كمية إرجاع ${item.name}`} /></label>; })}</div><p className="modal-note">تُعاد فقط الكميات التي تدخلها هنا. سيعيد سوقنا البضاعة إلى المخزون ويخفض حساب الموظف بقيمة الأصناف المُعادة، ثم يفتح مستند الإرجاع للطباعة.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setEmployeePurchaseReturnSale(null)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Undo2 size={17} /> اعتماد الإرجاع الجزئي</button></div></form></div>}

      {showEmployeeAdvanceForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitEmployeeAdvance} role="dialog" aria-modal="true" aria-label="تسجيل سلفة أو عهدة"><div className="modal-heading"><div><span className="section-kicker">مستحقات الموظف</span><h3>تسجيل سلفة أو عهدة عينية</h3></div><button type="button" className="icon-button" onClick={() => setShowEmployeeAdvanceForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>الموظف *</span><select name="staffMemberId" autoFocus required defaultValue={currentStaffMemberId || ""}><option value="" disabled>اختر الموظف</option>{store.localStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label className="field"><span>نوع المستحق *</span><select name="type" defaultValue="cash"><option value="cash">سلفة نقدية</option><option value="clothing">عهدة ملابس / غرض خارجي</option><option value="goods">بضاعة من المخزون</option></select></label><label className="field"><span>شهر الخصم *</span><input name="month" type="month" defaultValue={advanceMonth} required /></label><label className="field"><span>الوصف *</span><input name="description" placeholder="مثال: سلفة أسبوعية أو بدلة عمل" /></label><label className="field"><span>القيمة (د.ل) *</span><input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="للعهدة الخارجية أو النقدية" /></label><label className="field"><span>صنف المخزون</span><select name="productId" defaultValue=""><option value="">لا يوجد — عهدة خارجية أو نقدية</option>{store.products.filter((product) => product.quantity > 0).map((product) => <option key={product.id} value={product.id}>{product.name} · متاح {product.quantity} · تكلفة {money(product.purchasePrice)}</option>)}</select></label><label className="field"><span>كمية الصنف</span><input name="quantity" type="number" min="1" step="1" inputMode="numeric" defaultValue="1" /></label><label className="field field--wide"><span>ملاحظة</span><input name="note" maxLength={160} placeholder="مثال: تُعاد العهدة عند انتهاء العمل" /></label></div><p className="modal-note">في حالة «بضاعة من المخزون» تُحسب القيمة بسعر الشراء وتُنقص الكمية فورًا، ثم تُخصم تلقائيًا من راتب الشهر المحدد.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowEmployeeAdvanceForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> حفظ المستحق</button></div></form></div>}

      {showPayrollForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitPayroll} role="dialog" aria-modal="true" aria-label="تسجيل راتب موظف"><div className="modal-heading"><div><span className="section-kicker">كشف راتب محلي</span><h3>تسجيل راتب وسلف وخصومات</h3></div><button type="button" className="icon-button" onClick={() => setShowPayrollForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>الموظف *</span><select name="staffMemberId" autoFocus required defaultValue={currentStaffMemberId || ""}><option value="" disabled>اختر الموظف</option>{store.localStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label className="field"><span>الشهر *</span><input name="month" type="month" defaultValue={payrollMonth} required /></label><label className="field"><span>الراتب الأساسي *</span><input name="baseSalary" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" required /></label><label className="field"><span>السلف</span><input name="advances" type="number" min="0" step="0.01" inputMode="decimal" defaultValue="0" /></label><label className="field"><span>الخصومات</span><input name="deductions" type="number" min="0" step="0.01" inputMode="decimal" defaultValue="0" /></label><label className="field"><span>المبلغ المدفوع الآن</span><input name="paidAmount" type="number" min="0" step="0.01" inputMode="decimal" defaultValue="0" /></label><label className="field"><span>طريقة الدفع</span><select name="paymentMethod" defaultValue="cash"><option value="cash">نقدًا</option><option value="card">بطاقة مصرفية</option><option value="transfer">تحويل مصرفي</option></select></label><label className="field field--wide"><span>ملاحظة</span><input name="note" maxLength={160} placeholder="مثال: سلفة أسبوعية أو خصم غياب" /></label></div><p className="modal-note">صافي الاستحقاق = الراتب الأساسي − السلف − الخصومات. يمكنك تسجيل دفع جزئي ويبقى الفرق ظاهرًا في كشف الشهر.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowPayrollForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> حفظ كشف الراتب</button></div></form></div>}
      {showCashExpenseForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitCashExpense} role="dialog" aria-modal="true" aria-label="تسجيل مصروف نقدي"><div className="modal-heading"><div><span className="section-kicker">صندوق اليوم</span><h3>تسجيل مصروف نقدي</h3></div><button type="button" className="icon-button" onClick={() => setShowCashExpenseForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>المبلغ (د.ل) *</span><input name="amount" autoFocus required type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" /></label><label className="field"><span>التصنيف *</span><select name="category" defaultValue="نقل"><option value="نقل">نقل</option><option value="مشتريات تشغيلية">مشتريات تشغيلية</option><option value="كهرباء أو اتصال">كهرباء أو اتصال</option><option value="صيانة">صيانة</option><option value="أخرى">أخرى</option></select></label><label className="field"><span>تاريخ المصروف</span><input name="date" type="date" defaultValue={todayKey()} /></label><label className="field"><span>ملاحظة</span><input name="note" placeholder="مثال: توصيل بضاعة أو ماء للمحل" /></label></div><p className="modal-note">يُخصم المصروف من النقد المتوقع وصافي تشغيل اليوم، ويظل محفوظًا محليًا داخل النسخة الاحتياطية.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowCashExpenseForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> حفظ المصروف</button></div></form></div>}
      {showCashClosingForm && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitCashClosing} role="dialog" aria-modal="true" aria-label="إغلاق وردية يومي"><div className="modal-heading"><div><span className="section-kicker">إغلاق صندوق اليوم</span><h3>اعتماد الوردية وتسويتها</h3></div><button type="button" className="icon-button" onClick={() => setShowCashClosingForm(false)} aria-label="إغلاق"><X size={19} /></button></div><div className="form-grid"><label className="field"><span>تاريخ الوردية</span><input name="date" type="date" defaultValue={todayKey()} /></label><label className="field"><span>مسؤول الوردية (اختياري)</span><input name="responsibleName" defaultValue={todayCashClosing?.responsibleName ?? ""} placeholder="مثال: الكاشير المسائي" /></label><label className="field"><span>نقد بداية الوردية (د.ل) *</span><input name="openingCash" type="number" min="0" step="0.01" defaultValue={todayCashClosing?.openingCash ?? "0"} required /></label><label className="field"><span>النقد الفعلي اليدوي (د.ل)</span><input name="actualCash" autoFocus type="number" min="0" step="0.01" defaultValue={todayCashClosing?.actualCash ?? ""} placeholder="استخدمه عند عدم عدّ الفئات" /></label><label className="field field--wide"><span>ملاحظة الإغلاق</span><input name="note" defaultValue={todayCashClosing?.note ?? ""} placeholder="مثال: فرق بسبب فكة أو مصروف لم يسجل" /></label></div><section className="collection-summary"><span>عدّ النقد بالفئات (اختياري)</span><strong>{countedCashEntries.length ? `الإجمالي المحتسب ${money(countedCashTotal)}` : "أدخل عدد الأوراق أو العملات لتحسب تلقائيًا"}</strong><div className="form-grid">{CASH_DENOMINATIONS.map((denomination) => <label className="field" key={denomination}><span>{denomination} د.ل</span><input type="number" min="0" step="1" inputMode="numeric" value={cashDenominationCounts[denomination] ?? ""} onChange={(event) => setCashDenominationCounts((current) => ({ ...current, [denomination]: event.target.value }))} placeholder="0" /></label>)}</div></section><div className="collection-summary"><span>ملخص التسوية قبل الاعتماد</span><strong>مسؤول {todayCashClosing?.responsibleName || "غير محدد"} · نقد متوقع {money(todayCashSummary.expectedCash)} · صافي تشغيل {money(todayCashSummary.netOperatingProfit)}</strong></div><p className="modal-note">إذا أدخلت أي فئة، يعتمد سوقنا إجمالي العد بدل النقد اليدوي، ويحفظ المسؤول والتفاصيل داخل مستند الطباعة.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setShowCashClosingForm(false)}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Printer size={17} /> اعتماد وطباعة الإغلاق</button></div></form></div>}
      {showBarcodeStocktake && store.barcodeStocktakeDraft && <div className="modal-backdrop" role="presentation"><section className="modal-card modal-card--debt" role="dialog" aria-modal="true" aria-label="جولة جرد سريع بالباركود"><div className="modal-heading"><div><span className="section-kicker">جرد سريع بالباركود</span><h3>امسح القطع أو اكتب المجموع</h3></div><button type="button" className="icon-button" onClick={() => { setShowBarcodeStocktake(false); setShowBarcodeStocktakeScanner(false); }} aria-label="إغلاق"><X size={19} /></button></div><div className="report-stats"><StatCard label="أصناف معدودة" value={`${barcodeStocktakeProgress.countedProducts}/${store.products.length}`} detail={`${barcodeStocktakeProgress.uncountedProducts} لم تعد`} icon={ClipboardList} tone="olive" /><StatCard label="وحدات مسجلة" value={String(barcodeStocktakeProgress.scannedUnits)} detail="مسح أو إدخال يدوي" icon={Camera} tone="blue" /><StatCard label="فروقات" value={String(barcodeStocktakeProgress.differences)} detail="تراجع قبل الاعتماد" icon={CircleAlert} tone={barcodeStocktakeProgress.differences ? "apricot" : "sand"} /></div><label className="field"><span>ملاحظة الجولة</span><input value={store.barcodeStocktakeDraft.note} maxLength={160} onChange={(event) => setStore((current) => current.barcodeStocktakeDraft ? { ...current, barcodeStocktakeDraft: { ...current.barcodeStocktakeDraft, note: event.target.value, updatedAt: new Date().toISOString() } } : current)} placeholder="مثال: جرد الرفوف صباحًا" /></label><div className="inventory-page__actions"><button type="button" className="action-button action-button--primary" onClick={() => setShowBarcodeStocktakeScanner(true)}><Camera size={17} /> بدء المسح المتكرر</button><button type="button" className="action-button action-button--secondary" onClick={() => void exportBarcodeStocktakeExcel()}><Download size={17} /> الجولة Excel</button><button type="button" className={`action-button action-button--secondary ${barcodeStocktakeOnlyPending ? "selected" : ""}`} onClick={() => setBarcodeStocktakeOnlyPending((current) => !current)}><ClipboardList size={17} /> غير المعدود ({barcodeStocktakeProgress.uncountedProducts})</button></div><label className="search-box"><Search size={17} /><input value={barcodeStocktakeQuery} onChange={(event) => setBarcodeStocktakeQuery(event.target.value)} placeholder="ابحث باسم أو باركود..." /></label><div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>المسجل</th><th>المعدود</th><th>الفارق</th></tr></thead><tbody>{filteredBarcodeStocktakeEntries.map((entry) => <tr key={`barcode-stocktake-${entry.id}`}><td><strong>{entry.name}</strong><small dir="ltr">{entry.sku}</small></td><td>{entry.quantity}</td><td><div className="row-actions"><input aria-label={`الكمية المعدودة ${entry.name}`} value={entry.counted ? String(entry.actualQuantity) : ""} onChange={(event) => updateBarcodeStocktakeCount(entry.id, event.target.value)} type="number" min="0" step="1" inputMode="numeric" placeholder="لم يعد" /><button type="button" className="mini-icon" onClick={() => updateBarcodeStocktakeCount(entry.id, "0")} aria-label={`تأكيد عدم وجود ${entry.name}`}>0</button></div></td><td><span className={`status-badge ${entry.difference !== null && entry.difference !== 0 ? "status-badge--warning" : ""}`}>{entry.difference === null ? "—" : `${entry.difference > 0 ? "+" : ""}${entry.difference}`}</span></td></tr>)}</tbody></table></div>{!filteredBarcodeStocktakeEntries.length && <p className="modal-note">لا توجد أصناف مطابقة لهذا العرض. ألغِ التصفية أو امسح باركود صنف آخر.</p>}<p className="modal-note">كل مسح صحيح يزيد عدّ الصنف بوحدة واحدة. عند العد بالكرتون أو الرف، اكتب الإجمالي مباشرة. لا يتغير المخزون إلا بعد عدّ كل الأصناف ثم اعتماد الجولة.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setStore((current) => ({ ...current, barcodeStocktakeDraft: null })); setShowBarcodeStocktake(false); setShowBarcodeStocktakeScanner(false); }}>حذف الجولة</button><button type="button" className="action-button action-button--secondary" onClick={() => setShowBarcodeStocktake(false)}>حفظ للمتابعة لاحقًا</button><button type="button" className="action-button action-button--primary" disabled={!barcodeStocktakeProgress.completed} onClick={commitBarcodeStocktake}><Check size={17} /> اعتماد جرد الباركود</button></div></section></div>}
      {showBulkStocktake && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitBulkStocktake} role="dialog" aria-modal="true" aria-label="جرد جماعي للمخزون"><div className="modal-heading"><div><span className="section-kicker">جرد جماعي محلي</span><h3>راجع جميع الأصناف قبل الاعتماد</h3></div><button type="button" className="icon-button" onClick={() => { setShowBulkStocktake(false); setBulkStocktakeQuantities({}); }} aria-label="إغلاق"><X size={19} /></button></div><label className="field"><span>ملاحظة الجرد</span><input name="note" defaultValue="جرد جماعي" placeholder="مثال: جرد نهاية الأسبوع" /></label><div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>المسجل</th><th>الفعلي</th><th>الفارق</th></tr></thead><tbody>{store.products.map((product) => { const actualQuantity = Number(bulkStocktakeQuantities[product.id]); const difference = Number.isFinite(actualQuantity) ? actualQuantity - product.quantity : Number.NaN; return <tr key={`bulk-${product.id}`}><td><strong>{product.name}</strong><small dir="ltr">{product.sku}</small></td><td>{product.quantity}</td><td><input aria-label={`الكمية الفعلية ${product.name}`} value={bulkStocktakeQuantities[product.id] ?? ""} onChange={(event) => setBulkStocktakeQuantities((current) => ({ ...current, [product.id]: event.target.value }))} type="number" min="0" step="1" inputMode="numeric" required /></td><td><span className={`status-badge ${Number.isFinite(difference) && difference !== 0 ? "status-badge--warning" : ""}`}>{Number.isFinite(difference) ? `${difference > 0 ? "+" : ""}${difference}` : "—"}</span></td></tr>; })}</tbody></table></div><p className="modal-note">لن تُحدّث الكميات إلا بعد اعتماد النموذج. سيُسجل لكل صنف الرصيد المسجل والفعلي والفارق وقيمته بسعر الشراء.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setShowBulkStocktake(false); setBulkStocktakeQuantities({}); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> اعتماد الجرد الجماعي</button></div></form></div>}
      {pendingProtectedAction && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={verifySensitiveAction} role="dialog" aria-modal="true" aria-label="تأكيد العملية الحساسة"><div className="modal-heading"><div><span className="section-kicker">قفل محلي</span><h3>{pendingProtectedAction.title}</h3></div><button type="button" className="icon-button" onClick={() => { setPendingProtectedAction(null); setActionLockPin(""); }} aria-label="إغلاق"><X size={19} /></button></div><p className="modal-note">أدخل رمز القفل المحلي لتنفيذ العملية. لا يُرسل هذا الرمز إلى الإنترنت.</p><label className="field"><span>رمز القفل</span><input value={actionLockPin} onChange={(event) => setActionLockPin(event.target.value.replace(/\D/g, "").slice(0, 8))} type="password" inputMode="numeric" autoFocus required /></label><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setPendingProtectedAction(null); setActionLockPin(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><ShieldCheck size={17} /> تأكيد العملية</button></div></form></div>}
      {stocktakeProduct && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitStocktake} role="dialog" aria-modal="true" aria-label="جرد صنف بالكاميرا"><div className="modal-heading"><div><span className="section-kicker">جرد بالكاميرا</span><h3>{stocktakeProduct.name}</h3></div><button type="button" className="icon-button" onClick={() => { setStocktakeProduct(null); setStocktakeQuantity(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>الكمية المسجلة</span><strong>{stocktakeProduct.quantity} وحدة</strong></div><label className="field"><span>الكمية الفعلية بعد الجرد</span><input autoFocus value={stocktakeQuantity} onChange={(event) => setStocktakeQuantity(event.target.value)} type="number" min="0" step="1" inputMode="numeric" required /></label><p className="modal-note">قارن الكمية الفعلية بما في المخزون، ثم احفظ لتحديث رصيد الصنف محليًا.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setStocktakeProduct(null); setStocktakeQuantity(""); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Check size={17} /> اعتماد الجرد</button></div></form></div>}
      {returningSale && <div className="modal-backdrop" role="presentation"><form className="modal-card modal-card--debt" onSubmit={submitSaleReturn} role="dialog" aria-modal="true" aria-label="إرجاع بيع جزئي"><div className="modal-heading"><div><span className="section-kicker">إرجاع بيع جزئي</span><h3>فاتورة #{returningSale.id.slice(-5)}</h3></div><button type="button" className="icon-button" onClick={() => { setReturningSale(null); setReturnQuantities({}); }} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>قيمة الفاتورة الأصلية</span><strong dir="ltr">{money(returningSale.total)}</strong></div><div className="table-wrap"><table className="inventory-table"><thead><tr><th>الصنف</th><th>المباع</th><th>سبق إرجاعه</th><th>المتبقي</th><th>كمية الإرجاع</th></tr></thead><tbody>{getSaleReturnableItems(returningSale, store.sales).map((entry) => { const item = returningSale.items.find((candidate) => candidate.productId === entry.productId); return <tr key={`partial-return-${entry.productId}`}><td><strong>{item?.name || "صنف"}</strong></td><td>{entry.soldQuantity}</td><td>{entry.returnedQuantity}</td><td><b>{entry.remainingQuantity}</b></td><td><input aria-label={`كمية إرجاع ${item?.name || entry.productId}`} value={returnQuantities[entry.productId] ?? "0"} onChange={(event) => setReturnQuantities((current) => ({ ...current, [entry.productId]: event.target.value }))} type="number" min="0" max={entry.remainingQuantity} step="1" inputMode="numeric" /></td></tr>; })}</tbody></table></div><label className="field"><span>سبب الإرجاع *</span><input name="reason" autoFocus required placeholder="مثال: خطأ في الفاتورة أو إرجاع الزبون" /></label><p className="modal-note">يمكنك إرجاع جزء من الفاتورة فقط. تُعاد الكمية المختارة إلى المخزون وتُحسب قيمتها بعد الخصم النسبي، ولا يمكن تجاوز المتبقي من كل صنف.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => { setReturningSale(null); setReturnQuantities({}); }}>إلغاء</button><button className="action-button action-button--primary" type="submit"><Undo2 size={17} /> اعتماد الإرجاع الجزئي</button></div></form></div>}
      {returnCartSale && <div className="modal-backdrop" role="presentation"><section className="modal-card modal-card--debt" role="dialog" aria-modal="true" aria-label="سلة إرجاع بيع"><div className="modal-heading"><div><span className="section-kicker">سلة إرجاع</span><h3>فاتورة #{returnCartSale.id.slice(-5)}</h3></div><button type="button" className="icon-button" onClick={() => { setReturnCartSale(null); setReturnQuantities({}); setReturnCartReason(""); }} aria-label="إغلاق"><X size={19} /></button></div><div className="collection-summary"><span>الفاتورة الأصلية</span><strong dir="ltr">{money(returnCartSale.total)}</strong></div><div className="pos-layout"><section className="product-browser panel"><div className="panel-heading"><div><span className="section-kicker">أصناف الفاتورة</span><h3>أضف إلى سلة الإرجاع</h3></div><span className="status-badge">المتاح فقط</span></div><div className="product-grid">{returnCartAvailableItems.map((entry) => { const item = returnCartSale.items.find((candidate) => candidate.productId === entry.productId); const selectedQuantity = Number(returnQuantities[entry.productId]) || 0; return <button type="button" className="product-tile" key={`return-source-${entry.productId}`} disabled={entry.remainingQuantity <= selectedQuantity} onClick={() => updateReturnCartQuantity(entry.productId, 1)}><span className="product-tile__category">متاح {entry.remainingQuantity} · سبق إرجاعه {entry.returnedQuantity}</span><strong>{item?.name || "صنف"}</strong><div><b dir="ltr">{money(item?.price || 0)}</b><small>{entry.remainingQuantity <= selectedQuantity ? "بلغت الحد المتاح" : "اضغط للإضافة"}</small></div></button>; })}</div>{!returnCartAvailableItems.some((entry) => entry.remainingQuantity > 0) && <EmptyState icon={Undo2} title="لا توجد كميات متاحة للإرجاع" description="هذه الفاتورة أُرجعت كليًا أو لا يمكن إرجاعها الآن." />}</section><aside className="cart-panel"><div className="cart-panel__head"><div><span className="section-kicker">الإرجاع الحالي</span><h3>سلة الإرجاع</h3></div><span className="cart-count">{returnCartItems.reduce((total, item) => total + item.quantity, 0)}</span></div><div className="cart-items">{returnCartItems.length ? returnCartItems.map((item) => <div className="cart-item" key={`return-cart-${item.productId}`}><div className="cart-item__info"><strong>{item.name}</strong><small dir="ltr">{money(item.price)} للوحدة</small></div><div className="quantity-controls"><button type="button" onClick={() => updateReturnCartQuantity(item.productId, -1)} aria-label={`تقليل إرجاع ${item.name}`}><Minus size={15} /></button><b>{item.quantity}</b><button type="button" onClick={() => updateReturnCartQuantity(item.productId, 1)} aria-label={`زيادة إرجاع ${item.name}`}><Plus size={15} /></button></div><b className="cart-item__total" dir="ltr">{money(item.quantity * item.price)}</b><button type="button" className="mini-icon mini-icon--danger" onClick={() => setReturnQuantities((current) => ({ ...current, [item.productId]: "0" }))} aria-label={`حذف ${item.name} من سلة الإرجاع`}><Trash2 size={15} /></button></div>) : <EmptyState icon={Undo2} title="سلة الإرجاع فارغة" description="اضغط على أصناف الفاتورة لإضافتها إلى السلة." />}</div><label className="customer-field"><span>الموظف المسؤول *</span><select required value={returnStaffMemberId} onChange={(event) => { const id = event.target.value; setReturnStaffMemberId(id); setSelectedStaffMemberId(id); rememberStaffMemberId(id); }}><option value="">اختر الموظف قبل الاعتماد</option>{store.localStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label className="customer-field"><span>سبب الإرجاع *</span><input value={returnCartReason} onChange={(event) => setReturnCartReason(event.target.value)} placeholder="مثال: إرجاع الزبون أو خطأ بالفاتورة" /></label><div className="cart-total"><div><span>إجمالي التسوية</span><small>يحسب بعد خصم الفاتورة النسبي</small></div><strong dir="ltr">{money(returnCartTotal)}</strong></div><button type="button" className="action-button action-button--checkout" disabled={!returnCartItems.length || !selectedReturnStaffMember} onClick={commitReturnCart}><Undo2 size={19} /> اعتماد الإرجاع</button></aside></div><p className="modal-note">لن تتجاوز السلة الكميات المتاحة للإرجاع. عند الاعتماد تعود الكميات إلى المخزون، وتُخفض الذمة إن كانت الفاتورة آجلة، ويُحفظ سبب الإرجاع محليًا.</p><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setReturnQuantities(Object.fromEntries(returnCartAvailableItems.map((item) => [item.productId, "0"])))}>تفريغ السلة</button><button type="button" className="action-button action-button--secondary" onClick={() => { setReturnCartSale(null); setReturnQuantities({}); setReturnCartReason(""); }}>إلغاء</button></div></section></div>}
      {previewSale && <div className="modal-backdrop receipt-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewSale(null); }}><section className="modal-card receipt-preview-card" role="dialog" aria-modal="true" aria-label="معاينة الفاتورة"><div className="modal-heading"><div><span className="section-kicker">معاينة قبل الطباعة</span><h3>فاتورة #{previewSale.id.slice(-5)}</h3></div><button type="button" className="icon-button" onClick={() => setPreviewSale(null)} aria-label="إغلاق المعاينة"><X size={19} /></button></div><div className="receipt-preview-meta"><span>{formatDate(previewSale.createdAt)}</span>{previewSale.staffMemberName && <span>البائع: {previewSale.staffMemberName}</span>}</div><div className="receipt-preview-items">{previewSale.items.map((item) => <div className="receipt-preview-item" key={`${previewSale.id}-${item.productId}`}><span><strong>{item.name}</strong><small>{item.quantity} × {money(item.price)}</small></span><b dir="ltr">{money(item.quantity * item.price)}</b></div>)}</div><div className="receipt-preview-total"><span>الإجمالي</span><b dir="ltr">{money(Math.abs(previewSale.total))}</b></div><div className="receipt-preview-payments"><strong>{previewSale.paymentSplits?.length ? "تفاصيل الدفع المختلط" : "طريقة الدفع"}</strong>{(previewSale.paymentSplits?.length ? previewSale.paymentSplits : [{ paymentMethod: previewSale.paymentMethod, amount: Math.abs(previewSale.total), bankName: previewSale.bankName, posTerminalType: previewSale.posTerminalType }]).map((split, index) => <div className="receipt-preview-payment" key={`${split.paymentMethod}-${index}`}><span>{getPaymentMethodLabel(split.paymentMethod)}{split.bankName ? ` · ${split.bankName}` : ""}{split.posTerminalType ? ` · ${split.posTerminalType}` : ""}</span><b dir="ltr">{money(split.amount)}</b></div>)}</div><div className="modal-actions"><button type="button" className="action-button action-button--secondary" onClick={() => setPreviewSale(null)}>إغلاق</button><button type="button" className="action-button action-button--primary" onClick={() => { void printReceipt(previewSale); setPreviewSale(null); }}><Printer size={17} /> طباعة الفاتورة</button></div></section></div>}
      {showBarcodeScanner && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowBarcodeScanner(false)} />}
      {showReturnBarcodeScanner && <BarcodeScanner kicker="إرجاع بيع" heading="امسح باركود الصنف للإرجاع" closeLabel="العودة إلى سلة الإرجاع" onDetected={(barcode) => { setShowReturnBarcodeScanner(false); handleReturnBarcodeDetected(barcode); }} onClose={() => setShowReturnBarcodeScanner(false)} />}
      {showDirectReturnBarcodeScanner && <BarcodeScanner kicker="إرجاع مباشر" heading="امسح باركود الصنف" closeLabel="العودة إلى الإرجاع المباشر" onDetected={(barcode) => { setShowDirectReturnBarcodeScanner(false); handleDirectReturnBarcodeDetected(barcode); }} onClose={() => setShowDirectReturnBarcodeScanner(false)} />}
      {showPriceLookupScanner && <BarcodeScanner kicker="استعلام سعر" heading="امسح باركود الصنف" closeLabel="العودة إلى استعلام السعر" onDetected={(barcode) => { setShowPriceLookupScanner(false); lookupProductPrice(barcode); }} onClose={() => setShowPriceLookupScanner(false)} />}
      {showReceivingBarcodeScanner && <BarcodeScanner kicker="استلام البضاعة" heading="مسح باركود الاستلام" closeLabel="العودة إلى الاستلام" onDetected={(barcode) => { setShowReceivingBarcodeScanner(false); detectReceivingBarcode(barcode); }} onClose={() => setShowReceivingBarcodeScanner(false)} />}
      {showStocktakeScanner && <BarcodeScanner onDetected={handleStocktakeBarcodeDetected} onClose={() => setShowStocktakeScanner(false)} />}
      {showBarcodeStocktakeScanner && <BarcodeScanner continuous kicker="جولة جرد سريع" heading="امسح البضائع لتسجيل العدّ" closeLabel="العودة إلى جولة الجرد" onDetected={handleBarcodeStocktakeDetected} onClose={() => setShowBarcodeStocktakeScanner(false)} />}
      {showStoreSetup && <div className="modal-backdrop store-setup-backdrop" role="presentation"><form className="store-setup-card" onSubmit={finishStoreSetup} role="dialog" aria-modal="true" aria-label="إعداد محل جديد"><div className="store-setup-mark"><img src={logoUrl} alt="رمز سوقنا" /></div><span className="section-kicker">إعداد حقيقي لمحلّك</span><h2>لن نضيف أي أصناف<br/>بدلًا <em>عنك.</em></h2><p>ابدأ باسم محلك، ثم أضف أول صنف من مخزونك الفعلي. كل فاتورة وكمية وذمة تُحفظ محليًا على هذا الجهاز.</p><label className="field"><span>اسم المحل *</span><input name="storeName" autoFocus placeholder="مثال: بقالة الندى" required /></label><button className="action-button action-button--primary store-setup-submit" type="submit"><Store size={18} /> حفظ الاسم وإضافة أول صنف</button><small><WifiOff size={14} /> لا توجد بيانات تجريبية ولا يلزم اتصال بالإنترنت.</small></form></div>}
    </div>
  );
}
