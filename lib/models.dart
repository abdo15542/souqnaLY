class Product {
  final int? id;
  final String name;
  final String category;
  final String unit;
  final String barcode;
  final double buyPrice;
  final double sellPrice;
  final double qty;
  final double minQty;
  final bool isActive;
  final String createdAt;
  final String updatedAt;

  Product({
    this.id,
    required this.name,
    this.category = '',
    this.unit = 'حبة',
    this.barcode = '',
    required this.buyPrice,
    required this.sellPrice,
    required this.qty,
    this.minQty = 0,
    this.isActive = true,
    this.createdAt = '',
    this.updatedAt = '',
  });

  Map<String, dynamic> toMap() {
    final now = DateTime.now().toIso8601String();
    return {
      'name': name,
      'category': category,
      'unit': unit,
      'barcode': barcode,
      'buy_price': buyPrice,
      'sell_price': sellPrice,
      'qty': qty,
      'min_qty': minQty,
      'is_active': isActive ? 1 : 0,
      'created_at': createdAt.isEmpty ? now : createdAt,
      'updated_at': now,
    };
  }

  factory Product.fromMap(Map<String, dynamic> m) => Product(
        id: m['id'] as int?,
        name: m['name'] as String,
        category: (m['category'] as String?) ?? '',
        unit: (m['unit'] as String?) ?? 'حبة',
        barcode: (m['barcode'] as String?) ?? '',
        buyPrice: (m['buy_price'] as num).toDouble(),
        sellPrice: (m['sell_price'] as num).toDouble(),
        qty: (m['qty'] as num).toDouble(),
        minQty: (m['min_qty'] as num?)?.toDouble() ?? 0,
        isActive: ((m['is_active'] as int?) ?? 1) == 1,
        createdAt: (m['created_at'] as String?) ?? '',
        updatedAt: (m['updated_at'] as String?) ?? '',
      );

  bool get isLow => qty <= minQty;
}

class CartLine {
  final Product product;
  double qty;
  CartLine({required this.product, required this.qty});
  double get total => product.sellPrice * qty;
}

class SaleItem {
  final int? id;
  final int saleId;
  final int? productId;
  final String name;
  final double price;
  final double cost;
  final double qty;

  SaleItem({
    this.id,
    required this.saleId,
    this.productId,
    required this.name,
    required this.price,
    required this.cost,
    required this.qty,
  });

  double get total => price * qty;
  double get profit => (price - cost) * qty;

  factory SaleItem.fromMap(Map<String, dynamic> m) => SaleItem(
        id: m['id'] as int?,
        saleId: m['sale_id'] as int,
        productId: m['product_id'] as int?,
        name: m['name'] as String,
        price: (m['price'] as num).toDouble(),
        cost: (m['cost_price'] as num?)?.toDouble() ?? 0,
        qty: (m['qty'] as num).toDouble(),
      );
}

class Sale {
  final int id;
  final double total;
  final double cost;
  final int? cashierId;
  final String createdAt;
  final List<SaleItem> items;
  final String? refundedAt;
  final int? refundedBy;
  final String refundNote;

  Sale({
    required this.id,
    required this.total,
    required this.cost,
    this.cashierId,
    required this.createdAt,
    required this.items,
    this.refundedAt,
    this.refundedBy,
    this.refundNote = '',
  });

  double get profit => total - cost;
  bool get isRefunded => refundedAt != null;

  factory Sale.fromMaps(
          Map<String, dynamic> s, List<Map<String, dynamic>> it) =>
      Sale(
        id: s['id'] as int,
        total: (s['total'] as num).toDouble(),
        cost: (s['cost'] as num?)?.toDouble() ?? 0,
        cashierId: s['cashier_id'] as int?,
        createdAt: s['created_at'] as String,
        items: it.map(SaleItem.fromMap).toList(),
        refundedAt: s['refunded_at'] as String?,
        refundedBy: s['refunded_by'] as int?,
        refundNote: (s['refund_note'] as String?) ?? '',
      );
}

class SalesStats {
  final int count;
  final double revenue;
  final double cost;
  final double profit;
  const SalesStats(
      {required this.count,
      required this.revenue,
      required this.cost,
      required this.profit});
  factory SalesStats.empty() =>
      const SalesStats(count: 0, revenue: 0, cost: 0, profit: 0);
}

class RefundsSummary {
  final int count;
  final double total;
  const RefundsSummary({required this.count, required this.total});
  factory RefundsSummary.empty() => const RefundsSummary(count: 0, total: 0);
}

class Expense {
  final int? id;
  final String category;
  final double amount;
  final String note;
  final int? cashierId;
  final String createdAt;

  Expense(
      {this.id,
      required this.category,
      required this.amount,
      this.note = '',
      this.cashierId,
      required this.createdAt});

  Map<String, dynamic> toMap() => {
        'category': category,
        'amount': amount,
        'note': note,
        'cashier_id': cashierId,
        'created_at': createdAt,
      };

  factory Expense.fromMap(Map<String, dynamic> m) => Expense(
        id: m['id'] as int?,
        category: m['category'] as String,
        amount: (m['amount'] as num).toDouble(),
        note: (m['note'] as String?) ?? '',
        cashierId: m['cashier_id'] as int?,
        createdAt: m['created_at'] as String,
      );
}

class ExpensesSummary {
  final int count;
  final double total;
  const ExpensesSummary({required this.count, required this.total});
  factory ExpensesSummary.empty() => const ExpensesSummary(count: 0, total: 0);
}

class Cashier {
  final int? id;
  final String name;
  final String pinHash;
  final String pinSalt;
  final bool isActive;
  final String createdAt;

  Cashier(
      {this.id,
      required this.name,
      this.pinHash = '',
      this.pinSalt = '',
      this.isActive = true,
      this.createdAt = ''});

  factory Cashier.fromMap(Map<String, dynamic> m) => Cashier(
        id: m['id'] as int?,
        name: m['name'] as String,
        pinHash: (m['pin_hash'] as String?) ?? '',
        pinSalt: (m['pin_salt'] as String?) ?? '',
        isActive: ((m['is_active'] as int?) ?? 1) == 1,
        createdAt: (m['created_at'] as String?) ?? '',
      );
}

class StockTake {
  final int id;
  final int? cashierId;
  final String cashierName;
  final String note;
  final int itemsCount;
  final double totalDiff;
  final String createdAt;

  StockTake(
      {required this.id,
      this.cashierId,
      required this.cashierName,
      required this.note,
      required this.itemsCount,
      required this.totalDiff,
      required this.createdAt});

  factory StockTake.fromMap(Map<String, dynamic> m) => StockTake(
        id: m['id'] as int,
        cashierId: m['cashier_id'] as int?,
        cashierName: (m['cashier_name'] as String?) ?? '',
        note: (m['note'] as String?) ?? '',
        itemsCount: (m['items_count'] as int?) ?? 0,
        totalDiff: (m['total_diff'] as num?)?.toDouble() ?? 0,
        createdAt: m['created_at'] as String,
      );
}

class StockTakeItem {
  final int? id;
  final int takeId;
  final int? productId;
  final String name;
  final double previousQty;
  final double countedQty;

  StockTakeItem(
      {this.id,
      required this.takeId,
      this.productId,
      required this.name,
      required this.previousQty,
      required this.countedQty});

  double get diff => countedQty - previousQty;

  factory StockTakeItem.fromMap(Map<String, dynamic> m) => StockTakeItem(
        id: m['id'] as int?,
        takeId: m['take_id'] as int,
        productId: m['product_id'] as int?,
        name: m['name'] as String,
        previousQty: (m['previous_qty'] as num).toDouble(),
        countedQty: (m['counted_qty'] as num).toDouble(),
      );
}

class StockTakeLine {
  final Product product;
  final double countedQty;
  StockTakeLine({required this.product, required this.countedQty});
  double get diff => countedQty - product.qty;
}

class AuditEntry {
  final int? id;
  final int? cashierId;
  final String cashierName;
  final String action;
  final String entity;
  final int? entityId;
  final String details;
  final String createdAt;

  AuditEntry(
      {this.id,
      this.cashierId,
      required this.cashierName,
      required this.action,
      required this.entity,
      this.entityId,
      required this.details,
      required this.createdAt});

  factory AuditEntry.fromMap(Map<String, dynamic> m) => AuditEntry(
        id: m['id'] as int?,
        cashierId: m['cashier_id'] as int?,
        cashierName: (m['cashier_name'] as String?) ?? '',
        action: m['action'] as String,
        entity: (m['entity'] as String?) ?? '',
        entityId: m['entity_id'] as int?,
        details: (m['details'] as String?) ?? '',
        createdAt: m['created_at'] as String,
      );
}

class Debt {
  final int? id;
  final String customer;
  final String phone;
  final double amount;
  final double paid;
  final String note;
  final String dueDate;
  final String createdAt;

  Debt(
      {this.id,
      required this.customer,
      this.phone = '',
      required this.amount,
      this.paid = 0,
      this.note = '',
      this.dueDate = '',
      required this.createdAt});

  double get remaining => amount - paid;
  bool get isOverdue =>
      remaining > 0.001 && dueDate.isNotEmpty && _isPast(dueDate);

  static bool _isPast(String d) {
    final dt = DateTime.tryParse(d);
    if (dt == null) return false;
    final today = DateTime.now();
    final t = DateTime(today.year, today.month, today.day);
    return dt.isBefore(t);
  }

  Map<String, dynamic> toNewMap() => {
        'customer': customer,
        'phone': phone,
        'amount': amount,
        'paid': paid,
        'note': note,
        'due_date': dueDate,
        'created_at': createdAt,
      };

  factory Debt.fromMap(Map<String, dynamic> m) => Debt(
        id: m['id'] as int?,
        customer: m['customer'] as String,
        phone: (m['phone'] as String?) ?? '',
        amount: (m['amount'] as num).toDouble(),
        paid: (m['paid'] as num?)?.toDouble() ?? 0,
        note: (m['note'] as String?) ?? '',
        dueDate: (m['due_date'] as String?) ?? '',
        createdAt: m['created_at'] as String,
      );
}

class DebtPayment {
  final int? id;
  final int debtId;
  final double amount;
  final String createdAt;

  DebtPayment(
      {this.id,
      required this.debtId,
      required this.amount,
      required this.createdAt});

  factory DebtPayment.fromMap(Map<String, dynamic> m) => DebtPayment(
        id: m['id'] as int?,
        debtId: m['debt_id'] as int,
        amount: (m['amount'] as num).toDouble(),
        createdAt: m['created_at'] as String,
      );
}

class DebtsSummary {
  final int count;
  final double total;
  final double paid;
  final double remaining;
  const DebtsSummary(
      {required this.count,
      required this.total,
      required this.paid,
      required this.remaining});
  factory DebtsSummary.empty() =>
      const DebtsSummary(count: 0, total: 0, paid: 0, remaining: 0);
}

class Supplier {
  final int? id;
  final String name;
  final String phone;
  final String address;
  final String note;
  final bool isActive;
  final String createdAt;
  final String updatedAt;

  Supplier({
    this.id,
    required this.name,
    this.phone = '',
    this.address = '',
    this.note = '',
    this.isActive = true,
    this.createdAt = '',
    this.updatedAt = '',
  });

  Map<String, dynamic> toMap() {
    final now = DateTime.now().toIso8601String();
    return {
      'name': name,
      'phone': phone,
      'address': address,
      'note': note,
      'is_active': isActive ? 1 : 0,
      'created_at': createdAt.isEmpty ? now : createdAt,
      'updated_at': now,
    };
  }

  factory Supplier.fromMap(Map<String, dynamic> m) => Supplier(
        id: m['id'] as int?,
        name: m['name'] as String,
        phone: (m['phone'] as String?) ?? '',
        address: (m['address'] as String?) ?? '',
        note: (m['note'] as String?) ?? '',
        isActive: ((m['is_active'] as int?) ?? 1) == 1,
        createdAt: (m['created_at'] as String?) ?? '',
        updatedAt: (m['updated_at'] as String?) ?? '',
      );
}

class POLine {
  final Product product;
  double qty;
  double cost;
  POLine({required this.product, required this.qty, required this.cost});
  double get total => qty * cost;
}

class PurchaseOrderItem {
  final int? id;
  final int poId;
  final int? productId;
  final String name;
  final double qty;
  final double costPrice;
  final double receivedQty;

  PurchaseOrderItem({
    this.id,
    required this.poId,
    this.productId,
    required this.name,
    required this.qty,
    required this.costPrice,
    this.receivedQty = 0,
  });

  double get total => qty * costPrice;
  double get remaining => qty - receivedQty;

  factory PurchaseOrderItem.fromMap(Map<String, dynamic> m) =>
      PurchaseOrderItem(
        id: m['id'] as int?,
        poId: m['po_id'] as int,
        productId: m['product_id'] as int?,
        name: m['name'] as String,
        qty: (m['qty'] as num).toDouble(),
        costPrice: (m['cost_price'] as num?)?.toDouble() ?? 0,
        receivedQty: (m['received_qty'] as num?)?.toDouble() ?? 0,
      );
}

class PurchaseOrder {
  final int id;
  final int? supplierId;
  final String supplierName;
  final String status;
  final double total;
  final String note;
  final int? createdBy;
  final String createdAt;
  final String? receivedAt;
  final List<PurchaseOrderItem> items;

  PurchaseOrder({
    required this.id,
    this.supplierId,
    required this.supplierName,
    required this.status,
    required this.total,
    required this.note,
    this.createdBy,
    required this.createdAt,
    this.receivedAt,
    required this.items,
  });

  bool get isReceived => status == 'received';
  bool get isCancelled => status == 'cancelled';
  bool get isDraft => status == 'draft';

  factory PurchaseOrder.fromMaps(
          Map<String, dynamic> p, List<Map<String, dynamic>> it) =>
      PurchaseOrder(
        id: p['id'] as int,
        supplierId: p['supplier_id'] as int?,
        supplierName: (p['supplier_name'] as String?) ?? '',
        status: (p['status'] as String?) ?? 'draft',
        total: (p['total'] as num?)?.toDouble() ?? 0,
        note: (p['note'] as String?) ?? '',
        createdBy: p['created_by'] as int?,
        createdAt: p['created_at'] as String,
        receivedAt: p['received_at'] as String?,
        items: it.map(PurchaseOrderItem.fromMap).toList(),
      );
}

class PriceChange {
  final int? id;
  final int? productId;
  final String productName;
  final double oldPrice;
  final double newPrice;
  final int? poId;
  final String createdAt;

  PriceChange({
    this.id,
    this.productId,
    required this.productName,
    required this.oldPrice,
    required this.newPrice,
    this.poId,
    required this.createdAt,
  });

  double get diff => newPrice - oldPrice;

  factory PriceChange.fromMap(Map<String, dynamic> m) => PriceChange(
        id: m['id'] as int?,
        productId: m['product_id'] as int?,
        productName: (m['product_name'] as String?) ?? '',
        oldPrice: (m['old_price'] as num?)?.toDouble() ?? 0,
        newPrice: (m['new_price'] as num?)?.toDouble() ?? 0,
        poId: m['po_id'] as int?,
        createdAt: m['created_at'] as String,
      );
}

class AppSettings {
  final String shopName;
  final String phone;
  final String address;
  final String currency;
  const AppSettings(
      {required this.shopName,
      required this.phone,
      required this.address,
      required this.currency});
  factory AppSettings.defaults() => const AppSettings(
      shopName: 'سوقنا', phone: '', address: '', currency: 'د.ل');
}

class Employee {
  final int? id;
  final String name;
  final String phone;
  final String role;
  final double baseSalary;
  final String hiredAt;
  final bool isActive;
  final String createdAt;
  final String updatedAt;

  Employee({
    this.id,
    required this.name,
    this.phone = '',
    this.role = '',
    required this.baseSalary,
    this.hiredAt = '',
    this.isActive = true,
    this.createdAt = '',
    this.updatedAt = '',
  });

  Map<String, dynamic> toMap() {
    final now = DateTime.now().toIso8601String();
    return {
      'name': name,
      'phone': phone,
      'role': role,
      'base_salary': baseSalary,
      'hired_at': hiredAt,
      'is_active': isActive ? 1 : 0,
      'created_at': createdAt.isEmpty ? now : createdAt,
      'updated_at': now,
    };
  }

  factory Employee.fromMap(Map<String, dynamic> m) => Employee(
        id: m['id'] as int?,
        name: m['name'] as String,
        phone: (m['phone'] as String?) ?? '',
        role: (m['role'] as String?) ?? '',
        baseSalary: (m['base_salary'] as num?)?.toDouble() ?? 0,
        hiredAt: (m['hired_at'] as String?) ?? '',
        isActive: ((m['is_active'] as int?) ?? 1) == 1,
        createdAt: (m['created_at'] as String?) ?? '',
        updatedAt: (m['updated_at'] as String?) ?? '',
      );
}

class PayrollEntry {
  final int? id;
  final int employeeId;
  final String employeeName;
  final double amount;
  final String period;
  final String note;
  final int? cashierId;
  final String createdAt;

  PayrollEntry({
    this.id,
    required this.employeeId,
    required this.employeeName,
    required this.amount,
    required this.period,
    this.note = '',
    this.cashierId,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        'employee_id': employeeId,
        'employee_name': employeeName,
        'amount': amount,
        'period': period,
        'note': note,
        'cashier_id': cashierId,
        'created_at': createdAt,
      };

  factory PayrollEntry.fromMap(Map<String, dynamic> m) => PayrollEntry(
        id: m['id'] as int?,
        employeeId: m['employee_id'] as int,
        employeeName: (m['employee_name'] as String?) ?? '',
        amount: (m['amount'] as num).toDouble(),
        period: (m['period'] as String?) ?? '',
        note: (m['note'] as String?) ?? '',
        cashierId: m['cashier_id'] as int?,
        createdAt: m['created_at'] as String,
      );
}

class Advance {
  final int? id;
  final int employeeId;
  final String employeeName;
  final double amount;
  final String reason;
  final String status;
  final String createdAt;
  final String? settledAt;

  Advance({
    this.id,
    required this.employeeId,
    required this.employeeName,
    required this.amount,
    this.reason = '',
    this.status = 'pending',
    required this.createdAt,
    this.settledAt,
  });

  bool get isPending => status == 'pending';

  Map<String, dynamic> toMap() => {
        'employee_id': employeeId,
        'employee_name': employeeName,
        'amount': amount,
        'reason': reason,
        'status': status,
        'created_at': createdAt,
        'settled_at': settledAt,
      };

  factory Advance.fromMap(Map<String, dynamic> m) => Advance(
        id: m['id'] as int?,
        employeeId: m['employee_id'] as int,
        employeeName: (m['employee_name'] as String?) ?? '',
        amount: (m['amount'] as num).toDouble(),
        reason: (m['reason'] as String?) ?? '',
        status: (m['status'] as String?) ?? 'pending',
        createdAt: m['created_at'] as String,
        settledAt: m['settled_at'] as String?,
      );
}

class InsightSettings {
  final int leadTimeDays;
  final double safetyFactor;
  final int staleDays;
  final double voidAlertRate;
  final double abcA;
  final double abcB;

  const InsightSettings({
    required this.leadTimeDays,
    required this.safetyFactor,
    required this.staleDays,
    required this.voidAlertRate,
    required this.abcA,
    required this.abcB,
  });

  factory InsightSettings.defaults() => const InsightSettings(
        leadTimeDays: 7,
        safetyFactor: 0.5,
        staleDays: 60,
        voidAlertRate: 0.10,
        abcA: 0.80,
        abcB: 0.95,
      );
}

class PurchaseSuggestion {
  final Product product;
  final double avgDaily;
  final double reorderPoint;
  final double suggestedQty;
  final double urgency;
  final String reason;

  PurchaseSuggestion({
    required this.product,
    required this.avgDaily,
    required this.reorderPoint,
    required this.suggestedQty,
    required this.urgency,
    required this.reason,
  });
}

class AbcXyzItem {
  final Product product;
  final double revenue;
  final double revenueShare;
  final double cumulativeShare;
  final String abc;
  final String xyz;
  final String matrix;
  final String recommendation;

  AbcXyzItem({
    required this.product,
    required this.revenue,
    required this.revenueShare,
    required this.cumulativeShare,
    required this.abc,
    required this.xyz,
    required this.matrix,
    required this.recommendation,
  });
}

class AnomalyFlag {
  final String title;
  final String details;
  final String severity;

  AnomalyFlag({
    required this.title,
    required this.details,
    required this.severity,
  });
}

class ForecastPoint {
  final String day;
  final double predictedUnits;
  final double predictedRevenue;

  ForecastPoint({
    required this.day,
    required this.predictedUnits,
    required this.predictedRevenue,
  });
}

class Batch {
  final int? id;
  final int? productId;
  final String productName;
  final double qty;
  final double costPrice;
  final String producedAt;
  final String expiresAt;
  final String note;
  final String createdAt;

  Batch({
    this.id,
    this.productId,
    required this.productName,
    required this.qty,
    this.costPrice = 0,
    this.producedAt = '',
    required this.expiresAt,
    this.note = '',
    required this.createdAt,
  });

  factory Batch.fromMap(Map<String, dynamic> m) => Batch(
        id: m['id'] as int?,
        productId: m['product_id'] as int?,
        productName: (m['product_name'] as String?) ?? '',
        qty: (m['qty'] as num?)?.toDouble() ?? 0,
        costPrice: (m['cost_price'] as num?)?.toDouble() ?? 0,
        producedAt: (m['produced_at'] as String?) ?? '',
        expiresAt: m['expiry_date'] as String,
        note: (m['note'] as String?) ?? '',
        createdAt: m['created_at'] as String,
      );
}

class EoqItem {
  final Product product;
  final double annualDemand;
  final double dailyDemand;
  final double eoq;
  final double reorderPoint;
  final double daysOnHand;
  final double turnover;
  final double urgency;
  final String abcClass;

  EoqItem({
    required this.product,
    required this.annualDemand,
    required this.dailyDemand,
    required this.eoq,
    required this.reorderPoint,
    required this.daysOnHand,
    required this.turnover,
    required this.urgency,
    required this.abcClass,
  });
}

class BasketPair {
  final String nameA;
  final String nameB;
  final double support;
  final double confidenceAB;
  final double confidenceBA;
  final double lift;
  final int bothCount;

  BasketPair({
    required this.nameA,
    required this.nameB,
    required this.support,
    required this.confidenceAB,
    required this.confidenceBA,
    required this.lift,
    required this.bothCount,
  });
}

class AuditChainRecord {
  final int seq;
  final int auditId;
  final String action;
  final String details;
  final String createdAt;
  final String prevHash;
  final String recordHash;

  AuditChainRecord({
    required this.seq,
    required this.auditId,
    required this.action,
    required this.details,
    required this.createdAt,
    required this.prevHash,
    required this.recordHash,
  });

  factory AuditChainRecord.fromMap(Map<String, dynamic> m) => AuditChainRecord(
        seq: (m['seq'] as num?)?.toInt() ?? 0,
        auditId: (m['audit_id'] as num?)?.toInt() ?? 0,
        action: (m['action'] as String?) ?? '',
        details: (m['details'] as String?) ?? '',
        createdAt: (m['created_at'] as String?) ?? '',
        prevHash: (m['prev_hash'] as String?) ?? '',
        recordHash: (m['record_hash'] as String?) ?? '',
      );
}

class ChainVerifyResult {
  final bool ok;
  final int checked;
  final int? brokenAtSeq;
  final String message;

  const ChainVerifyResult({
    required this.ok,
    required this.checked,
    this.brokenAtSeq,
    required this.message,
  });
}


class ShiftBreakdown {
  final double sales;
  final double debtPaid;
  final double expenses;
  final double payroll;
  final double expectedDelta;
  final double openingCash;
  final double expectedDrawer;

  const ShiftBreakdown({
    required this.sales,
    required this.debtPaid,
    required this.expenses,
    required this.payroll,
    required this.expectedDelta,
    required this.openingCash,
    required this.expectedDrawer,
  });

  factory ShiftBreakdown.empty() => const ShiftBreakdown(
        sales: 0,
        debtPaid: 0,
        expenses: 0,
        payroll: 0,
        expectedDelta: 0,
        openingCash: 0,
        expectedDrawer: 0,
      );
}

class Shift {
  final int id;
  final int? openedByCashierId;
  final String openedByName;
  final String openedAt;
  final String? closedAt;
  final String status;
  final double openingCash;
  final double? countedCash;
  final double salesTotal;
  final double debtPaidTotal;
  final double expenseTotal;
  final double payrollTotal;
  final double expectedDelta;
  final double expectedDrawer;
  final double? difference;
  final String note;

  Shift({
    required this.id,
    this.openedByCashierId,
    required this.openedByName,
    required this.openedAt,
    this.closedAt,
    required this.status,
    required this.openingCash,
    this.countedCash,
    required this.salesTotal,
    required this.debtPaidTotal,
    required this.expenseTotal,
    required this.payrollTotal,
    required this.expectedDelta,
    required this.expectedDrawer,
    this.difference,
    required this.note,
  });

  bool get isOpen => status == 'open';
  bool get isClosed => status == 'closed';

  factory Shift.fromMap(Map<String, dynamic> m) => Shift(
        id: m['id'] as int,
        openedByCashierId: m['opened_by_cashier_id'] as int?,
        openedByName: (m['opened_by_name'] as String?) ?? '',
        openedAt: m['opened_at'] as String,
        closedAt: m['closed_at'] as String?,
        status: (m['status'] as String?) ?? 'open',
        openingCash: (m['opening_cash'] as num?)?.toDouble() ?? 0,
        countedCash: (m['counted_cash'] as num?)?.toDouble(),
        salesTotal: (m['sales_total'] as num?)?.toDouble() ?? 0,
        debtPaidTotal: (m['debt_paid_total'] as num?)?.toDouble() ?? 0,
        expenseTotal: (m['expense_total'] as num?)?.toDouble() ?? 0,
        payrollTotal: (m['payroll_total'] as num?)?.toDouble() ?? 0,
        expectedDelta: (m['expected_delta'] as num?)?.toDouble() ?? 0,
        expectedDrawer: (m['expected_drawer'] as num?)?.toDouble() ?? 0,
        difference: (m['difference'] as num?)?.toDouble(),
        note: (m['note'] as String?) ?? '',
      );
}


class ProductBatch {
  final int? id;
  final int productId;
  final String productName;
  final String batchNo;
  final double qty;
  final double cost;
  final String expiryDate;
  final String note;
  final String createdAt;
  final String updatedAt;

  ProductBatch({
    this.id,
    required this.productId,
    required this.productName,
    this.batchNo = '',
    required this.qty,
    required this.cost,
    this.expiryDate = '',
    this.note = '',
    this.createdAt = '',
    this.updatedAt = '',
  });

  double get totalValue => qty * cost;

  Map<String, dynamic> toMap() {
    final now = DateTime.now().toIso8601String();
    return {
      'product_id': productId,
      'product_name': productName,
      'batch_no': batchNo,
      'qty': qty,
      'cost': cost,
      'expiry_date': expiryDate,
      'note': note,
      'created_at': createdAt.isEmpty ? now : createdAt,
      'updated_at': now,
    };
  }

  factory ProductBatch.fromMap(Map<String, dynamic> m) => ProductBatch(
        id: m['id'] as int?,
        productId: m['product_id'] as int,
        productName: (m['product_name'] as String?) ?? '',
        batchNo: (m['batch_no'] as String?) ?? '',
        qty: (m['qty'] as num?)?.toDouble() ?? 0,
        cost: (m['cost'] as num?)?.toDouble() ?? 0,
        expiryDate: (m['expiry_date'] as String?) ?? '',
        note: (m['note'] as String?) ?? '',
        createdAt: (m['created_at'] as String?) ?? '',
        updatedAt: (m['updated_at'] as String?) ?? '',
      );
}

class BatchExpirySummary {
  final int total;
  final int expiringSoon;
  final int expired;
  final double soonValue;
  final double expiredValue;

  const BatchExpirySummary({
    required this.total,
    required this.expiringSoon,
    required this.expired,
    required this.soonValue,
    required this.expiredValue,
  });

  factory BatchExpirySummary.empty() => const BatchExpirySummary(
        total: 0,
        expiringSoon: 0,
        expired: 0,
        soonValue: 0,
        expiredValue: 0,
      );
}
