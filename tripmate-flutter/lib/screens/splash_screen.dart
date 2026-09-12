import 'package:flutter/material.dart';

import '../core/design.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.onFinished});
  final VoidCallback onFinished;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late final AnimationController flight;
  late final AnimationController pulse;

  @override
  void initState() {
    super.initState();
    flight = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..forward();
    pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);
    Future<void>.delayed(const Duration(milliseconds: 2100), widget.onFinished);
  }

  @override
  void dispose() {
    flight.dispose();
    pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TripMateColors.navy950,
      body: Stack(
        children: [
          const Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(colors: [TripMateColors.navy950, TripMateColors.navy800, Color(0xFF0B3B76)], begin: Alignment.topLeft, end: Alignment.bottomRight)))),
          Positioned(top: -80, right: -70, child: _orb(240, TripMateColors.blue400.withValues(alpha: .22))),
          Positioned(bottom: -90, left: -80, child: _orb(250, TripMateColors.ice.withValues(alpha: .12))),
          SafeArea(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedBuilder(
                    animation: flight,
                    builder: (_, __) => Transform.translate(
                      offset: Offset(-60 + 60 * flight.value, 16 - 16 * flight.value),
                      child: Transform.rotate(
                        angle: -.22 + .22 * flight.value,
                        child: ScaleTransition(
                          scale: Tween<double>(begin: .55, end: 1).animate(CurvedAnimation(parent: flight, curve: Curves.easeOutBack)),
                          child: Container(
                            width: 92,
                            height: 92,
                            decoration: BoxDecoration(color: Colors.white.withValues(alpha: .12), borderRadius: BorderRadius.circular(30), border: Border.all(color: Colors.white24)),
                            child: const Icon(Icons.flight_takeoff_rounded, color: TripMateColors.ice, size: 48),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  FadeTransition(
                    opacity: CurvedAnimation(parent: flight, curve: const Interval(.25, 1)),
                    child: const Text('TripMate', style: TextStyle(color: Colors.white, fontSize: 42, fontWeight: FontWeight.w900, letterSpacing: -1.5)),
                  ),
                  const SizedBox(height: 8),
                  FadeTransition(
                    opacity: CurvedAnimation(parent: flight, curve: const Interval(.45, 1)),
                    child: const Text('Plan • Go • Remember', style: TextStyle(color: TripMateColors.ice, fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 1.8)),
                  ),
                  const SizedBox(height: 34),
                  AnimatedBuilder(
                    animation: pulse,
                    builder: (_, __) => Container(
                      width: 76 + 16 * pulse.value,
                      height: 4,
                      decoration: BoxDecoration(color: TripMateColors.ice.withValues(alpha: .5 + .4 * pulse.value), borderRadius: BorderRadius.circular(20)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _orb(double size, Color color) => Container(width: size, height: size, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(size * .4)));
}
