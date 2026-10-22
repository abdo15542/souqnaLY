import 'package:flutter/material.dart';

import 'screens/dashboard.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SouqnaAdminApp());
}

class SouqnaAdminApp extends StatelessWidget {
  const SouqnaAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'سوقنا كونسول',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F766E),
        ),
        useMaterial3: true,
      ),
      builder: (context, child) => Directionality(
        textDirection: TextDirection.rtl,
        child: child ?? const SizedBox.shrink(),
      ),
      home: const DashboardScreen(),
    );
  }
}
