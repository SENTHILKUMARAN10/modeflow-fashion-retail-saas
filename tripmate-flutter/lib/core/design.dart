import 'dart:math' as math;

import 'package:flutter/material.dart';

class TripMateColors {
  static const navy950 = Color(0xFF071326);
  static const navy900 = Color(0xFF0B1D36);
  static const navy800 = Color(0xFF12345B);
  static const blue700 = Color(0xFF28699F);
  static const blue600 = Color(0xFF3B82B8);
  static const blue500 = Color(0xFF5AA9E6);
  static const blue400 = Color(0xFF84C8F4);
  static const ice = Color(0xFFDDF3FF);
  static const mint = Color(0xFFDDF8F0);
  static const peach = Color(0xFFFFE8D8);
  static const lavender = Color(0xFFEDE7FF);
  static const canvas = Color(0xFFF6F9FD);
  static const white = Color(0xFFFFFFFF);
  static const text = Color(0xFF081528);
  static const muted = Color(0xFF6E7D93);
}

class TripMateGradient {
  static const hero = LinearGradient(
    colors: [TripMateColors.navy950, TripMateColors.navy800, TripMateColors.blue700],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const electric = LinearGradient(
    colors: [Color(0xFF12345B), Color(0xFF3B82B8), Color(0xFF84C8F4)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const soft = LinearGradient(
    colors: [Color(0xFFFAFCFF), Color(0xFFF1F7FD), Color(0xFFE7F4FC)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

class TripMateMark extends StatelessWidget {
  const TripMateMark({super.key, this.size = 54, this.onDark = false});
  final double size;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final fg = onDark ? Colors.white : TripMateColors.navy950;
    final accent = onDark ? TripMateColors.ice : TripMateColors.blue500;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _TripMateMarkPainter(fg: fg, accent: accent)),
    );
  }
}

class _TripMateMarkPainter extends CustomPainter {
  const _TripMateMarkPainter({required this.fg, required this.accent});
  final Color fg;
  final Color accent;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final p1 = Paint()..color = accent;
    final p2 = Paint()..color = fg;

    final upper = Path()
      ..moveTo(w * .17, w * .28)
      ..lineTo(w * .63, w * .09)
      ..lineTo(w * .78, w * .23)
      ..lineTo(w * .34, w * .53)
      ..close();
    canvas.drawPath(upper, p1);

    final lower = Path()
      ..moveTo(w * .34, w * .53)
      ..lineTo(w * .59, w * .39)
      ..lineTo(w * .83, w * .74)
      ..lineTo(w * .61, w * .87)
      ..close();
    canvas.drawPath(lower, p2);

    final dot = Paint()..color = accent.withValues(alpha: .95);
    canvas.drawCircle(Offset(w * .25, w * .73), w * .055, dot);
  }

  @override
  bool shouldRepaint(covariant _TripMateMarkPainter oldDelegate) => oldDelegate.fg != fg || oldDelegate.accent != accent;
}

class TripMateSurface extends StatelessWidget {
  const TripMateSurface({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.gradient,
    this.color,
    this.radius = 30,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final Gradient? gradient;
  final Color? color;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final content = AnimatedContainer(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      margin: margin,
      padding: padding ?? const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: gradient == null ? (color ?? Colors.white.withValues(alpha: .94)) : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: gradient == null ? Colors.white.withValues(alpha: .95) : Colors.white.withValues(alpha: .12),
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x120B1D36), blurRadius: 32, offset: Offset(0, 14)),
          BoxShadow(color: Color(0x08FFFFFF), blurRadius: 6, offset: Offset(0, -1)),
        ],
      ),
      child: child,
    );

    if (onTap == null) return content;
    return _Pressable(onTap: onTap!, child: content);
  }
}

class TripMatePageHeader extends StatelessWidget {
  const TripMatePageHeader({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.subtitle,
    this.trailing,
  });

  final String eyebrow;
  final String title;
  final String subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: TripMateColors.ice,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  eyebrow.toUpperCase(),
                  style: const TextStyle(
                    color: TripMateColors.blue700,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                title,
                style: const TextStyle(
                  color: TripMateColors.text,
                  fontSize: 34,
                  height: 1.02,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -1.35,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: const TextStyle(
                  color: TripMateColors.muted,
                  fontSize: 15,
                  height: 1.45,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 12), trailing!],
      ],
    );
  }
}

class TripMateIconBubble extends StatelessWidget {
  const TripMateIconBubble(this.icon, {super.key, this.size = 50, this.dark = false});
  final IconData icon;
  final double size;
  final bool dark;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          gradient: dark
              ? TripMateGradient.electric
              : const LinearGradient(colors: [Color(0xFFF1FAFF), TripMateColors.ice]),
          borderRadius: BorderRadius.circular(size * .34),
          border: Border.all(color: dark ? Colors.white12 : Colors.white),
          boxShadow: dark
              ? const [BoxShadow(color: Color(0x22071326), blurRadius: 18, offset: Offset(0, 8))]
              : const [],
        ),
        child: Icon(icon, color: dark ? Colors.white : TripMateColors.navy800, size: size * .45),
      );
}

class TripMateWaveBackground extends StatefulWidget {
  const TripMateWaveBackground({super.key, required this.child});
  final Widget child;

  @override
  State<TripMateWaveBackground> createState() => _TripMateWaveBackgroundState();
}

class _TripMateWaveBackgroundState extends State<TripMateWaveBackground> with SingleTickerProviderStateMixin {
  late final AnimationController controller;

  @override
  void initState() {
    super.initState();
    controller = AnimationController(vsync: this, duration: const Duration(seconds: 10))..repeat(reverse: true);
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: controller,
        builder: (_, child) => Container(
          decoration: const BoxDecoration(gradient: TripMateGradient.soft),
          child: Stack(
            children: [
              Positioned(top: -95 + 24 * controller.value, right: -70, child: _orb(240, TripMateColors.ice.withValues(alpha: .68))),
              Positioned(top: 230 - 25 * controller.value, left: -110, child: _orb(230, TripMateColors.blue400.withValues(alpha: .13))),
              Positioned(bottom: -110 + 18 * controller.value, right: -65, child: _orb(250, TripMateColors.lavender.withValues(alpha: .38))),
              child!,
            ],
          ),
        ),
        child: widget.child,
      );

  Widget _orb(double size, Color color) => Transform.rotate(
        angle: math.pi / 9,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(size * .42)),
        ),
      );
}

class _Pressable extends StatefulWidget {
  const _Pressable({required this.onTap, required this.child});
  final VoidCallback onTap;
  final Widget child;

  @override
  State<_Pressable> createState() => _PressableState();
}

class _PressableState extends State<_Pressable> {
  bool down = false;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTapDown: (_) => setState(() => down = true),
        onTapCancel: () => setState(() => down = false),
        onTapUp: (_) => setState(() => down = false),
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: down ? .975 : 1,
          duration: const Duration(milliseconds: 120),
          curve: Curves.easeOut,
          child: widget.child,
        ),
      );
}
