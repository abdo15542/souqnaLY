class Perm {
  static const sale = 'sale';
  static const returns = 'returns';
  static const print = 'print';
  static const barcode = 'barcode';
  static const shifts = 'shifts';
  static const debts = 'debts';
  static const expenses = 'expenses';
  static const payroll = 'payroll';
  static const reports = 'reports';
  static const profits = 'profits';
  static const costs = 'costs';
  static const inventoryView = 'inventory_view';
  static const inventoryEdit = 'inventory_edit';
  static const purchase = 'purchase';
  static const suppliers = 'suppliers';
  static const batches = 'batches';
  static const insights = 'insights';
  static const alerts = 'alerts';
  static const salesHistory = 'sales_history';
  static const cashiers = 'cashiers';
  static const audit = 'audit';
  static const settings = 'settings';
  static const devices = 'devices';
  static const backup = 'backup';

  static const ownerWildcard = '*';

  static final List<String> allSub = <String>[
    sale,
    returns,
    print,
    barcode,
    shifts,
    debts,
    expenses,
    payroll,
    reports,
    profits,
    costs,
    inventoryView,
    inventoryEdit,
    purchase,
    suppliers,
    batches,
    insights,
    alerts,
    salesHistory,
    cashiers,
    audit,
    settings,
    devices,
    backup,
  ];

  static final Map<String, List<String>> presets = <String, List<String>>{
    'cashier': <String>[
      sale,
      returns,
      print,
      barcode,
      shifts,
      debts,
    ],
    'warehouse': <String>[
      inventoryView,
      inventoryEdit,
      purchase,
      suppliers,
      batches,
      barcode,
    ],
    'manager': <String>[
      reports,
      profits,
      costs,
      expenses,
      payroll,
      debts,
      inventoryView,
      purchase,
      suppliers,
      batches,
      shifts,
      alerts,
      insights,
      salesHistory,
    ],
  };

  static final Map<String, String> labels = <String, String>{
    sale: 'البيع',
    returns: 'الترجيع',
    print: 'الطباعة',
    barcode: 'مسح الباركود',
    shifts: 'النوبات والورديات',
    debts: 'الديون',
    expenses: 'المصروفات',
    payroll: 'الرواتب والسلف',
    reports: 'التقارير',
    profits: 'عرض الأرباح',
    costs: 'عرض أسعار الشراء',
    inventoryView: 'عرض المخزون',
    inventoryEdit: 'تعديل المخزون',
    purchase: 'أوامر الشراء',
    suppliers: 'الموردون',
    batches: 'الدفعات والصلاحية',
    insights: 'العقل المحلي',
    alerts: 'التنبيهات',
    salesHistory: 'سجل الفواتير',
    cashiers: 'الكاشيرين',
    audit: 'سجل التدقيق',
    settings: 'الإعدادات',
    devices: 'إدارة الهواتف',
    backup: 'النسخ الاحتياطي',
    ownerWildcard: 'كل الصلاحيات',
  };

  static String label(String p) {
    if (p == ownerWildcard) return 'كل الصلاحيات';
    return labels[p] ?? p;
  }

  static String roleLabel(String r) {
    switch (r) {
      case 'owner':
        return 'مالك';
      case 'cashier':
        return 'كاشير';
      case 'warehouse':
        return 'مخزن';
      case 'manager':
        return 'مدير';
      case 'pending':
        return 'بانتظار التفعيل';
      default:
        return r;
    }
  }
}
