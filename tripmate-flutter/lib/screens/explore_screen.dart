import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/design.dart';
import '../services/social_service.dart';
import 'genz_tools_screen.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  late final SocialService social;
  int refreshKey = 0;

  @override
  void initState() {
    super.initState();
    social = SocialService(Supabase.instance.client);
  }

  Future<void> _refresh() async {
    setState(() => refreshKey++);
    await Future<void>.delayed(const Duration(milliseconds: 350));
  }

  Future<void> _dropVibe() async {
    String vibe = '✨';
    final caption = TextEditingController();
    final place = TextEditingController();
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => Padding(
          padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('Drop your vibe', style: Theme.of(ctx).textTheme.headlineSmall),
            const SizedBox(height: 5),
            Text('A 24-hour travel mood. Fast, real and temporary.', style: Theme.of(ctx).textTheme.bodyMedium),
            const SizedBox(height: 16),
            Wrap(spacing: 8, runSpacing: 8, children: ['✨', '🌧️', '🌿', '🔥', '🥶', '🌅', '🛵', '🍜'].map((x) => ChoiceChip(selected: vibe == x, label: Text(x, style: const TextStyle(fontSize: 20)), onSelected: (_) => setLocal(() => vibe = x))).toList()),
            const SizedBox(height: 14),
            TextField(controller: caption, decoration: const InputDecoration(labelText: 'What is happening?', prefixIcon: Icon(Icons.bolt_rounded))),
            const SizedBox(height: 10),
            TextField(controller: place, decoration: const InputDecoration(labelText: 'Place (optional)', prefixIcon: Icon(Icons.location_on_outlined))),
            const SizedBox(height: 16),
            FilledButton.icon(onPressed: () async { await social.createVibeDrop(vibe: vibe, caption: caption.text, place: place.text); if (ctx.mounted) Navigator.pop(ctx); }, icon: const Icon(Icons.bolt_rounded), label: const Text('Drop for 24 hours')),
          ]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: TripMateWaveBackground(
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _refresh,
            color: TripMateColors.navy800,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 120),
              children: [
                TripMatePageHeader(
                  eyebrow: 'TRIPVERSE',
                  title: 'Travel, happening now.',
                  subtitle: 'A social layer built around real trips — temporary, expressive and made for the moment.',
                  trailing: Container(decoration: BoxDecoration(gradient: TripMateGradient.hero, borderRadius: BorderRadius.circular(18)), child: IconButton(onPressed: _dropVibe, icon: const Icon(Icons.bolt_rounded, color: TripMateColors.ice))),
                ),
                const SizedBox(height: 20),
                _Entrance(delay: 60, child: _hero()),
                const SizedBox(height: 26),
                Text('Live drops', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 3),
                Text('24-hour moments from travelers', style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 12),
                StreamBuilder<List<Map<String, dynamic>>>(
                  key: ValueKey(refreshKey),
                  stream: social.watchVibeDrops(),
                  builder: (context, snapshot) {
                    final drops = snapshot.data ?? [];
                    if (snapshot.hasError || drops.isEmpty) {
                      return TripMateSurface(
                        color: TripMateColors.ice,
                        onTap: _dropVibe,
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Column(children: [TripMateIconBubble(Icons.bolt_rounded, size: 60, dark: true), SizedBox(height: 14), Text('Start the energy', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)), SizedBox(height: 5), Text('Drop a tiny travel moment. It disappears after 24 hours.', textAlign: TextAlign.center, style: TextStyle(color: TripMateColors.muted))]),
                        ),
                      );
                    }
                    return Column(children: List.generate(drops.take(8).length, (i) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _vibeCard(drops[i]))));
                  },
                ),
                const SizedBox(height: 26),
                const TripMatePageHeader(eyebrow: 'FUTURE-NATIVE', title: 'Travel tools that actually work.', subtitle: 'Tap any tool. Each one has its own live trip workspace and syncs through Supabase.'),
                const SizedBox(height: 14),
                _futureGrid(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _hero() => TripMateSurface(
        gradient: TripMateGradient.hero,
        padding: const EdgeInsets.all(22),
        onTap: _dropVibe,
        child: Stack(children: [
          Positioned(right: -45, top: -55, child: Container(width: 180, height: 180, decoration: BoxDecoration(color: Colors.white.withValues(alpha: .05), borderRadius: BorderRadius.circular(80)))),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(20)), child: const Text('⚡ VIBE DROP', style: TextStyle(color: TripMateColors.ice, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.1))), const Spacer(), const Icon(Icons.blur_on_rounded, color: TripMateColors.ice)]),
            const SizedBox(height: 42),
            const Text('No feed.\nJust the moment.', style: TextStyle(color: Colors.white, fontSize: 35, height: 1.0, fontWeight: FontWeight.w900, letterSpacing: -1.2)),
            const SizedBox(height: 11),
            const Text('Share where you are and how the trip feels. It vanishes in 24 hours.', style: TextStyle(color: Colors.white70, height: 1.45, fontWeight: FontWeight.w600)),
            const SizedBox(height: 20),
            FilledButton.tonalIcon(onPressed: _dropVibe, icon: const Icon(Icons.bolt_rounded), label: const Text('Drop a vibe')),
          ]),
        ]),
      );

  Widget _vibeCard(Map<String, dynamic> data) => TripMateSurface(
        padding: const EdgeInsets.all(15),
        child: Row(children: [
          Container(width: 54, height: 54, alignment: Alignment.center, decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFFE8F4FF), TripMateColors.ice]), borderRadius: BorderRadius.circular(18)), child: Text('${data['vibe'] ?? '✨'}', style: const TextStyle(fontSize: 25))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${data['caption'] ?? 'Travel moment'}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)), if ('${data['place'] ?? ''}'.trim().isNotEmpty) ...[const SizedBox(height: 3), Row(children: [const Icon(Icons.location_on_rounded, size: 13, color: TripMateColors.blue600), const SizedBox(width: 3), Expanded(child: Text('${data['place']}', style: Theme.of(context).textTheme.bodySmall))])]])),
          const Icon(Icons.timelapse_rounded, size: 19, color: TripMateColors.muted),
        ]),
      );

  Widget _futureGrid() {
    const items = [
      (Icons.lock_clock_rounded, 'Time Capsule', 'Seal moments now. Unlock later.', GenZTool.timeCapsule),
      (Icons.radar_rounded, 'Crew Radar', 'Live trip crew signals.', GenZTool.crewRadar),
      (Icons.graphic_eq_rounded, 'MoodMap', 'Map places by how they felt.', GenZTool.moodMap),
      (Icons.auto_awesome_motion_rounded, 'Memory Remix', 'Build a shareable trip recap.', GenZTool.memoryRemix),
      (Icons.local_fire_department_rounded, 'Travel Streaks', 'Log challenges and missions.', GenZTool.travelStreaks),
      (Icons.bubble_chart_rounded, 'Orbit Rooms', 'Trip-specific temporary spaces.', GenZTool.orbitRooms),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: .95, crossAxisSpacing: 11, mainAxisSpacing: 11),
      itemBuilder: (_, i) {
        final x = items[i];
        return TripMateSurface(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => GenZToolScreen(tool: x.$4))),
          padding: const EdgeInsets.all(15),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [TripMateIconBubble(x.$1, size: 44), const Spacer(), Text(x.$2, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)), const SizedBox(height: 3), Text(x.$3, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall), const SizedBox(height: 5), const Align(alignment: Alignment.centerRight, child: Icon(Icons.arrow_outward_rounded, size: 17, color: TripMateColors.blue600))]),
        );
      },
    );
  }
}

class _Entrance extends StatelessWidget {
  const _Entrance({required this.child, required this.delay});
  final Widget child;
  final int delay;
  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: Duration(milliseconds: 440 + delay),
        curve: Curves.easeOutCubic,
        builder: (_, value, child) => Opacity(opacity: value, child: Transform.translate(offset: Offset(0, 14 * (1 - value)), child: child)),
        child: child,
      );
}
