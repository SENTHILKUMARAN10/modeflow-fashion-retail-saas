import 'package:flutter/material.dart';

import '../core/design.dart';
import 'circle_screen.dart';
import 'explore_screen.dart';
import 'home_screen.dart';
import 'messages_screen.dart';
import 'profile_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int index = 0;

  static const pages = <Widget>[
    HomeScreen(),
    ExploreScreen(),
    CircleScreen(),
    MessagesScreen(),
    ProfileScreen(),
  ];

  static const items = <_DockItem>[
    _DockItem(Icons.home_rounded, 'Home'),
    _DockItem(Icons.auto_awesome_rounded, 'Verse'),
    _DockItem(Icons.people_alt_rounded, 'Circle'),
    _DockItem(Icons.chat_bubble_rounded, 'Inbox'),
    _DockItem(Icons.person_rounded, 'You'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 330),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        transitionBuilder: (child, animation) => FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(begin: const Offset(.025, .012), end: Offset.zero).animate(animation),
            child: child,
          ),
        ),
        child: KeyedSubtree(key: ValueKey(index), child: pages[index]),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: Container(
          height: 74,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            gradient: TripMateGradient.hero,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: Colors.white.withValues(alpha: .10)),
            boxShadow: const [BoxShadow(color: Color(0x3D021024), blurRadius: 30, offset: Offset(0, 14))],
          ),
          child: Row(
            children: List.generate(items.length, (i) {
              final selected = i == index;
              final item = items[i];
              return Expanded(
                child: Semantics(
                  button: true,
                  selected: selected,
                  label: item.label,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => setState(() => index = i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 260),
                      curve: Curves.easeOutBack,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        color: selected ? TripMateColors.ice : Colors.transparent,
                      ),
                      child: Center(
                        child: AnimatedScale(
                          duration: const Duration(milliseconds: 220),
                          scale: selected ? 1.08 : 1,
                          child: Icon(item.icon, size: 25, color: selected ? TripMateColors.navy950 : Colors.white60),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _DockItem {
  const _DockItem(this.icon, this.label);
  final IconData icon;
  final String label;
}
