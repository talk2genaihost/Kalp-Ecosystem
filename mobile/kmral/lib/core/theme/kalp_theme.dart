import 'package:flutter/material.dart';

/// KALP visual foundation. Apps may extend this theme but should not fork
/// the core brand tokens without a documented product exception.
class KalpTheme {
  static const Color primary = Color(0xFF173B7A);
  static const Color accent = Color(0xFFF4B400);
  static const Color success = Color(0xFF18864B);
  static const Color danger = Color(0xFFC62828);
  static const Color surface = Color(0xFFF7F8FA);

  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: surface,
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
      ),
      cardTheme: const CardThemeData(margin: EdgeInsets.zero),
    );
  }
}
