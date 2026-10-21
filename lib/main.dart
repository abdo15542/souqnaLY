import 'package:flutter/material.dart';
import 'screens/home.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SouqnaApp());
}

class SouqnaApp extends StatelessWidget {
  const SouqnaApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'سوقنا',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E)),
          useMaterial3: true,
        ),
        builder: (context, child) => Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        ),
        home: const HomeScreen(),
      );
}
