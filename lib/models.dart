class Product {
  final int? id;
  final String name;
  final double buyPrice;
  final double sellPrice;
  final double qty;
  Product({this.id, required this.name, required this.buyPrice, required this.sellPrice, required this.qty});
  
  Map<String, dynamic> toMap() => {'name': name, 'buy_price': buyPrice, 'sell_price': sellPrice, 'qty': qty};
  factory Product.fromMap(Map<String, dynamic> m) => Product(id: m['id'] as int?, name: m['name'] as String, buyPrice: (m['buy_price'] as num).toDouble(), sellPrice: (m['sell_price'] as num).toDouble(), qty: (m['qty'] as num).toDouble());
}

class CartLine {
  final Product product;
  double qty;
  CartLine({required this.product, required this.qty});
  double get total => product.sellPrice * qty;
}

class Sale {
  final int id;
  final double total;
  final String createdAt;
  Sale({required this.id, required this.total, required this.createdAt});
}

class AppSettings {
  final String shopName;
  final String currency;
  const AppSettings({required this.shopName, required this.currency});
  factory AppSettings.defaults() => const AppSettings(shopName: 'سوقنا', currency: 'د.ل');
}
