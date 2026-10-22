import 'package:flutter/material.dart';

import 'db.dart';
import 'screens/onboarding.dart';
import 'services/device_service.dart';
import 'services/vendor_license_service.dart';
import 'theme_state.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final mode = await LocalDB.getThemeMode();
  appTheme.value = _toMode(mode);

  await DeviceService.bootstrap();

  try {
    await VendorLicenseService.bootstrap();
  } catch (_) {}

  runApp(const SouqnaApp());
}

ThemeMode _toMode(String s) {
  switch (s) {
    case 'light':
      return ThemeMode.light;
    case 'dark':
      return ThemeMode.dark;
    default:
      return ThemeMode.system;
  }
}

class SouqnaApp extends StatelessWidget {
  const SouqnaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: appTheme,
      builder: (context, mode, _) => MaterialApp(
        title: 'سوقنا',
        debugShowCheckedModeBanner: false,
        themeMode: mode,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E)),
          useMaterial3: true,
        ),
        darkTheme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF0F766E),
            brightness: Brightness.dark,
          ),
          useMaterial3: true,
        ),
        builder: (context, child) => Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        ),
        home: const RootScreen(),
      ),
    );
  }
}
