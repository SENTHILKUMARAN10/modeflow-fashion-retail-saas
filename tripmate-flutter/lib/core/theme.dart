import 'package:flutter/material.dart';

import 'design.dart';

class AppTheme {
  static ThemeData light() {
    const scheme = ColorScheme.light(
      primary: TripMateColors.navy800,
      onPrimary: Colors.white,
      primaryContainer: TripMateColors.ice,
      onPrimaryContainer: TripMateColors.navy950,
      secondary: TripMateColors.blue600,
      onSecondary: Colors.white,
      secondaryContainer: Color(0xFFE7F4FF),
      onSecondaryContainer: TripMateColors.navy950,
      tertiary: TripMateColors.blue400,
      onTertiary: TripMateColors.navy950,
      surface: Colors.white,
      onSurface: TripMateColors.text,
      surfaceContainerHighest: Color(0xFFEDF4FA),
      onSurfaceVariant: TripMateColors.muted,
      outline: Color(0xFFCCD9E6),
      outlineVariant: Color(0xFFE4ECF3),
      error: Color(0xFFB42318),
    );

    final text = Typography.material2021().black.apply(
          bodyColor: TripMateColors.text,
          displayColor: TripMateColors.text,
          fontFamily: 'Roboto',
        );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: TripMateColors.canvas,
      fontFamily: 'Roboto',
      visualDensity: VisualDensity.standard,
      splashFactory: InkSparkle.splashFactory,
      textTheme: text.copyWith(
        displaySmall: const TextStyle(fontSize: 39, fontWeight: FontWeight.w900, letterSpacing: -1.7, color: TripMateColors.text),
        headlineLarge: const TextStyle(fontSize: 33, fontWeight: FontWeight.w900, letterSpacing: -1.2, color: TripMateColors.text),
        headlineMedium: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -.9, color: TripMateColors.text),
        headlineSmall: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900, letterSpacing: -.55, color: TripMateColors.text),
        titleLarge: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: -.3, color: TripMateColors.text),
        titleMedium: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: TripMateColors.text),
        bodyLarge: const TextStyle(fontSize: 16, height: 1.5, color: TripMateColors.text, fontWeight: FontWeight.w500),
        bodyMedium: const TextStyle(fontSize: 14, height: 1.48, color: TripMateColors.muted, fontWeight: FontWeight.w500),
        bodySmall: const TextStyle(fontSize: 12, height: 1.4, color: Color(0xFF8290A4), fontWeight: FontWeight.w500),
        labelLarge: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: .05),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0,
        titleTextStyle: TextStyle(fontSize: 21, fontWeight: FontWeight.w900, letterSpacing: -.45, color: TripMateColors.text),
        iconTheme: IconThemeData(color: TripMateColors.navy950),
        actionsIconTheme: IconThemeData(color: TripMateColors.navy950),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: FadeForwardsPageTransitionsBuilder(),
        },
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white.withValues(alpha: .96),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
        labelStyle: const TextStyle(color: TripMateColors.muted, fontWeight: FontWeight.w700),
        hintStyle: const TextStyle(color: Color(0xFF9AA8B8), fontWeight: FontWeight.w500),
        prefixIconColor: TripMateColors.blue600,
        suffixIconColor: TripMateColors.navy800,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: const BorderSide(color: Color(0xFFDEE8F1))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: const BorderSide(color: Color(0xFFDEE8F1))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: const BorderSide(color: TripMateColors.blue600, width: 1.8)),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white.withValues(alpha: .96),
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30), side: const BorderSide(color: Color(0xFFE5EDF4))),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 56),
          backgroundColor: TripMateColors.navy950,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 54),
          foregroundColor: TripMateColors.navy950,
          side: const BorderSide(color: Color(0xFFD8E3ED)),
          backgroundColor: Colors.white.withValues(alpha: .72),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: TripMateColors.blue700, textStyle: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          backgroundColor: Colors.white.withValues(alpha: .65),
          foregroundColor: TripMateColors.navy950,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(17)),
        ),
      ),
      chipTheme: ChipThemeData(
        side: const BorderSide(color: Color(0xFFDDE7F0)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        backgroundColor: Colors.white.withValues(alpha: .9),
        selectedColor: TripMateColors.ice,
        padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 4),
        labelStyle: const TextStyle(fontWeight: FontWeight.w800),
      ),
      navigationBarTheme: NavigationBarThemeData(
        elevation: 0,
        backgroundColor: Colors.white.withValues(alpha: .94),
        indicatorColor: TripMateColors.ice,
        height: 72,
        labelTextStyle: const WidgetStatePropertyAll(TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: TripMateColors.navy950,
        foregroundColor: Colors.white,
        elevation: 8,
        shape: StadiumBorder(),
      ),
      dividerTheme: const DividerThemeData(color: Color(0xFFE6EDF4), thickness: 1),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: Colors.white.withValues(alpha: .98),
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        modalBarrierColor: const Color(0x70071326),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: TripMateColors.navy950,
        contentTextStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
    );
  }
}
