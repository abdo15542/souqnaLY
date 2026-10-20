String formatMoney(double value, String currency) => '${value.toStringAsFixed(2)} $currency';
String formatQty(double value) => value == value.roundToDouble() ? value.toStringAsFixed(0) : value.toStringAsFixed(2);
String formatDateTime(String iso) {
  final dt = DateTime.tryParse(iso) ?? DateTime.now();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${dt.year}-${two(dt.month)}-${two(dt.day)} ${two(dt.hour)}:${two(dt.minute)}';
}
String formatDate(String iso) {
  final dt = DateTime.tryParse(iso) ?? DateTime.now();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${dt.year}-${two(dt.month)}-${two(dt.day)}';
}
