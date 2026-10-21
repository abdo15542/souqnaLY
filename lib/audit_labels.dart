import 'package:flutter/material.dart';

const Map<String, String> auditActionLabels = {
  'sale_created': 'إتمام بيع',
  'sale_voided': 'إلغاء فاتورة',
  'product_added': 'إضافة صنف',
  'product_updated': 'تعديل صنف',
  'product_deleted': 'حذف صنف',
  'expense_added': 'إضافة مصروف',
  'debt_added': 'إضافة دين',
  'debt_paid': 'تسديد دين',
  'cashier_added': 'إضافة كاشير',
  'cashier_updated': 'تعديل كاشير',
  'cashier_deleted': 'حذف كاشير',
  'stock_take_done': 'اعتماد جرد',
  'backup_restored': 'استرجاع نسخة',
};

String auditActionLabel(String a) => auditActionLabels[a] ?? a;

IconData auditActionIcon(String a) {
  switch (a) {
    case 'sale_created':
      return Icons.point_of_sale;
    case 'sale_voided':
      return Icons.block;
    case 'product_added':
      return Icons.add_box;
    case 'product_updated':
      return Icons.edit;
    case 'product_deleted':
      return Icons.delete;
    case 'expense_added':
      return Icons.money_off;
    case 'debt_added':
      return Icons.book;
    case 'debt_paid':
      return Icons.check_circle;
    case 'cashier_added':
      return Icons.person_add;
    case 'cashier_updated':
      return Icons.manage_accounts;
    case 'cashier_deleted':
      return Icons.person_off;
    case 'stock_take_done':
      return Icons.playlist_add_check;
    case 'backup_restored':
      return Icons.restore;
    default:
      return Icons.history;
  }
}

Color auditActionColor(String a) {
  switch (a) {
    case 'sale_created':
      return Colors.teal;
    case 'sale_voided':
      return Colors.red;
    case 'product_added':
      return Colors.blue;
    case 'product_updated':
      return Colors.indigo;
    case 'product_deleted':
      return Colors.red;
    case 'expense_added':
      return Colors.orange;
    case 'debt_added':
      return Colors.brown;
    case 'debt_paid':
      return Colors.green;
    case 'cashier_added':
      return Colors.purple;
    case 'cashier_updated':
      return Colors.deepPurple;
    case 'cashier_deleted':
      return Colors.redAccent;
    case 'stock_take_done':
      return Colors.cyan;
    case 'backup_restored':
      return Colors.amber;
    default:
      return Colors.grey;
  }
}
