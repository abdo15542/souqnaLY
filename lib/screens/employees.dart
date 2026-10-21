import 'package:flutter/material.dart';
import '../cashier_session.dart';
import '../db.dart';
import '../models.dart';
import '../utils.dart';

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});
  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;
  int _tabIndex = 0;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _tab.addListener(() {
      setState(() => _tabIndex = _tab.index);
    });
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الموظفون والرواتب'),
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(text: 'الموظفون'),
            Tab(text: 'الرواتب'),
            Tab(text: 'السلف'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          if (_tabIndex == 0) _addEmployee();
          if (_tabIndex == 1) _addPayroll();
          if (_tabIndex == 2) _addAdvance();
        },
        child: const Icon(Icons.add),
      ),
      body: TabBarView(
        controller: _tab,
        children: const [
          _EmployeesTab(),
          _PayrollTab(),
          _AdvancesTab(),
        ],
      ),
    );
  }

  Future<void> _addEmployee() async {
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => const _EmployeeForm());
    if (saved == true && mounted) setState(() {});
  }

  Future<void> _addPayroll() async {
    final emps = await LocalDB.getEmployees();
    if (!mounted) return;
    if (emps.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('أضف موظفًا أولًا')));
      return;
    }
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => _PayrollForm(employees: emps));
    if (saved == true && mounted) setState(() {});
  }

  Future<void> _addAdvance() async {
    final emps = await LocalDB.getEmployees();
    if (!mounted) return;
    if (emps.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('أضف موظفًا أولًا')));
      return;
    }
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => _AdvanceForm(employees: emps));
    if (saved == true && mounted) setState(() {});
  }
}

class _EmployeesTab extends StatefulWidget {
  const _EmployeesTab();
  @override
  State<_EmployeesTab> createState() => _EmployeesTabState();
}

class _EmployeesTabState extends State<_EmployeesTab> {
  bool _loading = true;
  String _search = '';
  List<Employee> _list = [];
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final l = await LocalDB.getEmployees(search: _search);
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _list = l;
      _settings = s;
      _loading = false;
    });
  }

  Future<void> _openForm([Employee? e]) async {
    final saved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => _EmployeeForm(employee: e));
    if (saved == true) _load();
  }

  Future<void> _delete(Employee e) async {
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('حذف موظف'),
              content: Text('حذف "${e.name}"؟ سيُحذف تاريخ رواتبه وسلفه.'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('حذف')),
              ],
            ));
    if (ok == true && e.id != null) {
      await LocalDB.deleteEmployee(e.id!);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
              onChanged: (v) {
                _search = v;
                _load();
              },
              decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: 'ابحث بالاسم/الوظيفة/الهاتف',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14)))),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _list.isEmpty
                  ? const Center(child: Text('لا يوجد موظفون'))
                  : ListView.builder(
                      itemCount: _list.length,
                      itemBuilder: (ctx, i) {
                        final e = _list[i];
                        final sub = [
                          if (e.role.isNotEmpty) 'وظيفة: ${e.role}',
                          if (e.phone.isNotEmpty) 'هاتف: ${e.phone}',
                          'راتب أساسي: ${formatMoney(e.baseSalary, cur)}',
                          if (e.hiredAt.isNotEmpty) 'تعيين: ${e.hiredAt}',
                        ].join('\n');
                        return ListTile(
                          leading: const Icon(Icons.person),
                          title: Text(e.name),
                          subtitle: Text(sub),
                          isThreeLine: true,
                          trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                    onPressed: () => _openForm(e),
                                    icon: const Icon(Icons.edit)),
                                IconButton(
                                    onPressed: () => _delete(e),
                                    icon:
                                        const Icon(Icons.delete, color: Colors.red)),
                              ]),
                        );
                      }),
        ),
      ],
    );
  }
}

class _PayrollTab extends StatefulWidget {
  const _PayrollTab();
  @override
  State<_PayrollTab> createState() => _PayrollTabState();
}

class _PayrollTabState extends State<_PayrollTab> {
  bool _loading = true;
  List<PayrollEntry> _list = [];
  AppSettings _settings = AppSettings.defaults();
  double _total = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final l = await LocalDB.getPayrollEntries();
    final s = await LocalDB.getAppSettings();
    double t = 0;
    for (final e in l) {
      t += e.amount;
    }
    if (!mounted) return;
    setState(() {
      _list = l;
      _settings = s;
      _total = t;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Column(
      children: [
        Card(
            margin: const EdgeInsets.all(12),
            child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _mini('عمليات', '${_list.length}'),
                      _mini('إجمالي المدفوع', formatMoney(_total, cur)),
                    ]))),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _list.isEmpty
                  ? const Center(child: Text('لا توجد قيود رواتب'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                          itemCount: _list.length,
                          itemBuilder: (ctx, i) {
                            final e = _list[i];
                            return ListTile(
                              leading: const Icon(Icons.payments),
                              title: Text(e.employeeName),
                              subtitle: Text(
                                  'فترة: ${e.period.isEmpty ? '—' : e.period}\n${formatDateTime(e.createdAt)}'),
                              isThreeLine: true,
                              trailing: Text(formatMoney(e.amount, cur),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.red)),
                            );
                          }),
                    ),
        ),
      ],
    );
  }

  Widget _mini(String t, String v) => Column(children: [
        Text(t, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 4),
        Text(v, style: const TextStyle(fontWeight: FontWeight.bold)),
      ]);
}

class _AdvancesTab extends StatefulWidget {
  const _AdvancesTab();
  @override
  State<_AdvancesTab> createState() => _AdvancesTabState();
}

class _AdvancesTabState extends State<_AdvancesTab> {
  bool _loading = true;
  String _filter = 'pending';
  List<Advance> _list = [];
  AppSettings _settings = AppSettings.defaults();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final l = await LocalDB.getAdvances(status: _filter);
    final s = await LocalDB.getAppSettings();
    if (!mounted) return;
    setState(() {
      _list = l;
      _settings = s;
      _loading = false;
    });
  }

  Future<void> _settle(Advance a) async {
    if (a.id == null) return;
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: const Text('تسوية السلفة'),
              content: Text('تسوية سلفة "${a.employeeName}"؟'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('إلغاء')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('تسوية')),
              ],
            ));
    if (ok == true) {
      await LocalDB.settleAdvance(a.id!);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final cur = _settings.currency;
    return Column(
      children: [
        Padding(
            padding: const EdgeInsets.all(12),
            child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'pending', label: Text('معلقة')),
                  ButtonSegment(value: 'settled', label: Text('مسوّاة')),
                  ButtonSegment(value: '', label: Text('الكل')),
                ],
                selected: {_filter},
                onSelectionChanged: (s) {
                  setState(() => _filter = s.first);
                  _load();
                })),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _list.isEmpty
                  ? const Center(child: Text('لا توجد سلف'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                          itemCount: _list.length,
                          itemBuilder: (ctx, i) {
                            final a = _list[i];
                            return ListTile(
                              leading: Icon(
                                  a.isPending
                                      ? Icons.pending
                                      : Icons.check_circle,
                                  color: a.isPending
                                      ? Colors.orange
                                      : Colors.green),
                              title: Text(a.employeeName),
                              subtitle: Text(
                                  '${a.reason.isEmpty ? 'سلفة' : a.reason}\n${formatDateTime(a.createdAt)}'),
                              isThreeLine: true,
                              trailing: a.isPending
                                  ? FilledButton(
                                      onPressed: () => _settle(a),
                                      child: const Text('تسوية'))
                                  : Text(formatMoney(a.amount, cur),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold)),
                            );
                          }),
                    ),
        ),
      ],
    );
  }
}

class _EmployeeForm extends StatefulWidget {
  final Employee? employee;
  const _EmployeeForm({this.employee});
  @override
  State<_EmployeeForm> createState() => _EmployeeFormState();
}

class _EmployeeFormState extends State<_EmployeeForm> {
  final _k = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.employee?.name ?? '');
  late final _phone = TextEditingController(text: widget.employee?.phone ?? '');
  late final _role = TextEditingController(text: widget.employee?.role ?? '');
  late final _salary =
      TextEditingController(text: widget.employee?.baseSalary.toString() ?? '');
  late final _hired = TextEditingController(text: widget.employee?.hiredAt ?? '');
  late bool _active = widget.employee?.isActive ?? true;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _role.dispose();
    _salary.dispose();
    _hired.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_k.currentState!.validate()) return;
    await LocalDB.saveEmployee(Employee(
      id: widget.employee?.id,
      name: _name.text.trim(),
      phone: _phone.text.trim(),
      role: _role.text.trim(),
      baseSalary: double.tryParse(_salary.text.trim()) ?? 0,
      hiredAt: _hired.text.trim(),
      isActive: _active,
      createdAt: widget.employee?.createdAt ?? '',
      updatedAt: widget.employee?.updatedAt ?? '',
    ));
    if (!mounted) return;
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final isNew = widget.employee == null;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _k,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(isNew ? 'موظف جديد' : 'تعديل موظف',
                  style:
                      const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'الاسم'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'مطلوب' : null),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _role,
                  decoration: const InputDecoration(labelText: 'الوظيفة')),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'الهاتف')),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _salary,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'الراتب الأساسي'),
                  validator: (v) {
                    final n = double.tryParse(v?.trim() ?? '');
                    if (n == null || n < 0) return 'رقم غير صالح';
                    return null;
                  }),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _hired,
                  decoration:
                      const InputDecoration(labelText: 'تاريخ التعيين (اختياري)')),
              const SizedBox(height: 8),
              SwitchListTile(
                  title: const Text('نشط'),
                  value: _active,
                  onChanged: (v) => setState(() => _active = v)),
              const SizedBox(height: 16),
              FilledButton(
                  onPressed: _save,
                  child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 14),
                      child: Text('حفظ'))),
            ],
          ),
        ),
      ),
    );
  }
}

class _PayrollForm extends StatefulWidget {
  final List<Employee> employees;
  const _PayrollForm({required this.employees});
  @override
  State<_PayrollForm> createState() => _PayrollFormState();
}

class _PayrollFormState extends State<_PayrollForm> {
  final _k = GlobalKey<FormState>();
  Employee? _emp;
  final _amount = TextEditingController();
  final _period = TextEditingController();
  final _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _period.text =
        '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _amount.dispose();
    _period.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_k.currentState!.validate() || _emp == null) return;
    await LocalDB.addPayrollEntry(PayrollEntry(
      employeeId: _emp!.id!,
      employeeName: _emp!.name,
      amount: double.tryParse(_amount.text.trim()) ?? 0,
      period: _period.text.trim(),
      note: _note.text.trim(),
      cashierId: CashierSession.cashierId,
      createdAt: DateTime.now().toIso8601String(),
    ));
    if (!mounted) return;
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _k,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('صرف راتب',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              DropdownButtonFormField<Employee>(
                  value: _emp,
                  decoration: const InputDecoration(labelText: 'الموظف'),
                  items: widget.employees
                      .map((e) =>
                          DropdownMenuItem(value: e, child: Text(e.name)))
                      .toList(),
                  onChanged: (v) => setState(() => _emp = v),
                  validator: (v) => v == null ? 'مطلوب' : null),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _amount,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'المبلغ'),
                  validator: (v) {
                    final n = double.tryParse(v?.trim() ?? '');
                    if (n == null || n <= 0) return 'غير صالح';
                    return null;
                  }),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _period,
                  decoration:
                      const InputDecoration(labelText: 'الفترة (YYYY-MM)')),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _note,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'ملاحظة')),
              const SizedBox(height: 16),
              FilledButton(
                  onPressed: _save,
                  child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 14),
                      child: Text('تسجيل الصرف'))),
            ],
          ),
        ),
      ),
    );
  }
}

class _AdvanceForm extends StatefulWidget {
  final List<Employee> employees;
  const _AdvanceForm({required this.employees});
  @override
  State<_AdvanceForm> createState() => _AdvanceFormState();
}

class _AdvanceFormState extends State<_AdvanceForm> {
  final _k = GlobalKey<FormState>();
  Employee? _emp;
  final _amount = TextEditingController();
  final _reason = TextEditingController();

  @override
  void dispose() {
    _amount.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_k.currentState!.validate() || _emp == null) return;
    await LocalDB.addAdvance(Advance(
      employeeId: _emp!.id!,
      employeeName: _emp!.name,
      amount: double.tryParse(_amount.text.trim()) ?? 0,
      reason: _reason.text.trim(),
      status: 'pending',
      createdAt: DateTime.now().toIso8601String(),
    ));
    if (!mounted) return;
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _k,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('سلفة جديدة',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              DropdownButtonFormField<Employee>(
                  value: _emp,
                  decoration: const InputDecoration(labelText: 'الموظف'),
                  items: widget.employees
                      .map((e) =>
                          DropdownMenuItem(value: e, child: Text(e.name)))
                      .toList(),
                  onChanged: (v) => setState(() => _emp = v),
                  validator: (v) => v == null ? 'مطلوب' : null),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _amount,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'المبلغ'),
                  validator: (v) {
                    final n = double.tryParse(v?.trim() ?? '');
                    if (n == null || n <= 0) return 'غير صالح';
                    return null;
                  }),
              const SizedBox(height: 12),
              TextFormField(
                  controller: _reason,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'السبب')),
              const SizedBox(height: 16),
              FilledButton(
                  onPressed: _save,
                  child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 14),
                      child: Text('تسجيل السلفة'))),
            ],
          ),
        ),
      ),
    );
  }
}
