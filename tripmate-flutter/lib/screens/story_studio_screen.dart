import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:screenshot/screenshot.dart';
import 'package:share_plus/share_plus.dart';

import '../models/trip.dart';

class StoryStudioScreen extends StatefulWidget {
  const StoryStudioScreen({super.key, required this.trip});
  final Trip trip;

  @override
  State<StoryStudioScreen> createState() => _StoryStudioScreenState();
}

class _StoryStudioScreenState extends State<StoryStudioScreen> {
  int selected = 0;
  bool sharing = false;
  final controller = ScreenshotController();

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;
    return Scaffold(
      appBar: AppBar(title: const Text('Story studio')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
        children: [
          Text('Turn the trip into a story', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 5),
          Text('Create a ready-to-share 9:16 travel card for Instagram Story, WhatsApp Status, Snapchat or any social app.', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 18),
          AspectRatio(
            aspectRatio: 9 / 16,
            child: Screenshot(
              controller: controller,
              child: _StoryTemplate(trip: trip, styleIndex: selected),
            ),
          ),
          const SizedBox(height: 18),
          Text('Choose a look', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _StyleChoice(label: 'Forest', colors: const [Color(0xFF173D36), Color(0xFF6E8F87)], selected: selected == 0, onTap: () => setState(() => selected = 0))),
            const SizedBox(width: 10),
            Expanded(child: _StyleChoice(label: 'Sunset', colors: const [Color(0xFF5C392A), Color(0xFFE3986B)], selected: selected == 1, onTap: () => setState(() => selected = 1))),
            const SizedBox(width: 10),
            Expanded(child: _StyleChoice(label: 'Night', colors: const [Color(0xFF121827), Color(0xFF334A7D)], selected: selected == 2, onTap: () => setState(() => selected = 2))),
          ]),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: sharing ? null : _share,
            icon: sharing ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.ios_share_rounded),
            label: Text(sharing ? 'Preparing story…' : 'Share story / status'),
          ),
          const SizedBox(height: 10),
          const Text('TripMate branding stays subtle at the bottom, so every shared trip can naturally introduce the app to friends.', textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Future<void> _share() async {
    setState(() => sharing = true);
    try {
      final bytes = await controller.capture(pixelRatio: 3);
      if (bytes == null) return;
      final destination = widget.trip.destination.replaceAll(RegExp(r'[^A-Za-z0-9]+'), '-').toLowerCase();
      await Share.shareXFiles(
        [XFile.fromData(bytes, mimeType: 'image/png', name: 'tripmate-$destination-story.png')],
        text: 'My ${widget.trip.destination} trip ✈️\nPlanned & remembered with TripMate.',
      );
    } finally {
      if (mounted) setState(() => sharing = false);
    }
  }
}

class _StoryTemplate extends StatelessWidget {
  const _StoryTemplate({required this.trip, required this.styleIndex});
  final Trip trip;
  final int styleIndex;

  List<Color> get colors => switch (styleIndex) {
        1 => const [Color(0xFF5C392A), Color(0xFFB86C49), Color(0xFFE9B28B)],
        2 => const [Color(0xFF111622), Color(0xFF22314F), Color(0xFF526FA8)],
        _ => const [Color(0xFF163A34), Color(0xFF315C55), Color(0xFF91AFA7)],
      };

  @override
  Widget build(BuildContext context) {
    final days = trip.endDate.difference(trip.startDate).inDays + 1;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Stack(children: [
        Positioned(right: -60, top: -30, child: Container(width: 210, height: 210, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: .08)))),
        Positioned(left: -90, bottom: 170, child: Container(width: 250, height: 250, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: .05)))),
        Padding(
          padding: const EdgeInsets.all(26),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7), decoration: BoxDecoration(color: Colors.white.withValues(alpha: .12), borderRadius: BorderRadius.circular(30)), child: const Text('TRAVEL STORY', style: TextStyle(color: Colors.white, fontSize: 10, letterSpacing: 1.6, fontWeight: FontWeight.w900))),
              const Spacer(),
              const Icon(Icons.flight_takeoff_rounded, color: Colors.white, size: 25),
            ]),
            const Spacer(flex: 2),
            const Text('I left with a plan.\nI came back with a story.', style: TextStyle(color: Colors.white70, fontSize: 17, height: 1.25, fontWeight: FontWeight.w600)),
            const SizedBox(height: 18),
            Text(trip.destination.toUpperCase(), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 39, height: .96, fontWeight: FontWeight.w900, letterSpacing: -1.5)),
            const SizedBox(height: 10),
            Text(trip.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white70, fontSize: 15, fontWeight: FontWeight.w600)),
            const Spacer(),
            Row(children: [
              Expanded(child: _StoryStat(label: 'DAYS', value: '$days')),
              const SizedBox(width: 10),
              Expanded(child: _StoryStat(label: 'DATES', value: '${DateFormat.MMMd().format(trip.startDate)} – ${DateFormat.MMMd().format(trip.endDate)}')),
            ]),
            const SizedBox(height: 12),
            _StoryStat(label: 'BEST PART', value: 'The memories I brought home'),
            const Spacer(flex: 2),
            Container(height: 1, color: Colors.white24),
            const SizedBox(height: 14),
            const Row(children: [
              Text('TRIPMATE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1.7, fontSize: 11)),
              Spacer(),
              Text('plan • go • remember', style: TextStyle(color: Colors.white60, fontSize: 10)),
            ]),
          ]),
        ),
      ]),
    );
  }
}

class _StoryStat extends StatelessWidget {
  const _StoryStat({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: .10), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withValues(alpha: .10))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: Colors.white54, fontSize: 9, letterSpacing: 1.2, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(value, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.15, fontWeight: FontWeight.w800)),
        ]),
      );
}

class _StyleChoice extends StatelessWidget {
  const _StyleChoice({required this.label, required this.colors, required this.selected, required this.onTap});
  final String label;
  final List<Color> colors;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: selected ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.outlineVariant, width: selected ? 2 : 1)),
          child: Column(children: [
            Container(height: 54, decoration: BoxDecoration(borderRadius: BorderRadius.circular(13), gradient: LinearGradient(colors: colors))),
            const SizedBox(height: 7),
            Text(label, style: TextStyle(fontWeight: selected ? FontWeight.w900 : FontWeight.w600)),
          ]),
        ),
      );
}
