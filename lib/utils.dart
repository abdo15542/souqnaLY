String formatMoney(double v, String c) => '${v.toStringAsFixed(2)} $c';

String formatQty(double v) =>
    v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(2);

String formatDateTime(String iso) {
  final d = DateTime.tryParse(iso) ?? DateTime.now();
  String t(int n) => n.toString().padLeft(2, '0');
  return '${d.year}-${t(d.month)}-${t(d.day)} ${t(d.hour)}:${t(d.minute)}';
}

String formatDate(String iso) {
  final d = DateTime.tryParse(iso) ?? DateTime.now();
  String t(int n) => n.toString().padLeft(2, '0');
  return '${d.year}-${t(d.month)}-${t(d.day)}';
}
