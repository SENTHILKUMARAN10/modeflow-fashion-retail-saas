import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/design.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import 'story_studio_screen.dart';

enum GenZTool { timeCapsule, crewRadar, moodMap, memoryRemix, travelStreaks, orbitRooms }

class GenZToolScreen extends StatefulWidget {
  const GenZToolScreen({super.key, required this.tool});
  final GenZTool tool;

  @override
  State<GenZToolScreen> createState() => _GenZToolScreenState();
}

class _GenZToolScreenState extends State<GenZToolScreen> {
  late final TripService service;
  String? selectedTripId;

  @override
  void initState() {
    super.initState();
    service = TripService(Supabase.instance.client);
  }

  @override
  Widget build(BuildContext context) {
    final meta = _meta(widget.tool);
    return Scaffold(
      body: TripMateWaveBackground(
        child: SafeArea(
          child: StreamBuilder<List<Trip>>(
            stream: service.watchTrips(),
            builder: (context, snapshot) {
              final trips = snapshot.data ?? [];
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final currentId = selectedTripId ?? (trips.isNotEmpty ? trips.first.id : null);
              final trip = currentId == null ? null : trips.where((x) => x.id == currentId).firstOrNull;
              return RefreshIndicator(
                onRefresh: () async => setState(() {}),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 36),
                  children: [
                    Row(children: [
                      IconButton.filledTonal(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.arrow_back_rounded)),
                      const Spacer(),
                      TripMateIconBubble(meta.icon, dark: true),
                    ]),
                    const SizedBox(height: 22),
                    TripMatePageHeader(eyebrow: 'NEXT-GEN TRAVEL', title: meta.title, subtitle: meta.subtitle),
                    const SizedBox(height: 20),
                    TripMateSurface(
                      gradient: TripMateGradient.hero,
                      child: Row(children: [
                        TripMateIconBubble(meta.icon, size: 58),
                        const SizedBox(width: 14),
                        Expanded(child: Text(meta.hero, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900, height: 1.35))),
                      ]),
                    ),
                    const SizedBox(height: 18),
                    if (trips.isEmpty)
                      _emptyTrips()
                    else ...[
                      TripMateSurface(
                        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 8),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: currentId,
                            isExpanded: true,
                            icon: const Icon(Icons.keyboard_arrow_down_rounded),
                            items: trips.map((t) => DropdownMenuItem(value: t.id, child: Text('${t.destination} • ${t.title}', overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)))).toList(),
                            onChanged: (v) => setState(() => selectedTripId = v),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (trip != null) _toolBody(trip),
                    ],
                  ],
                ),
              );
            },
          ),
        ),
      ),
      floatingActionButton: _hasAdd(widget.tool)
          ? FloatingActionButton.extended(
              onPressed: selectedTripId == null ? null : () async {
                final trips = await service.watchTrips().first;
                if (!mounted || trips.isEmpty) return;
                final id = selectedTripId ?? trips.first.id;
                final trip = trips.firstWhere((x) => x.id == id, orElse: () => trips.first);
                await _add(trip);
              },
              icon: const Icon(Icons.add_rounded),
              label: Text(_meta(widget.tool).action),
            )
          : null,
    );
  }

  Widget _toolBody(Trip trip) {
    if (widget.tool == GenZTool.memoryRemix) {
      return TripMateSurface(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => StoryStudioScreen(trip: trip))),
        child: Column(children: [
          const TripMateIconBubble(Icons.auto_awesome_motion_rounded, size: 68, dark: true),
          const SizedBox(height: 16),
          Text('Build ${trip.destination} Remix', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 6),
          Text('Turn this journey into a share-ready recap using your trip details and memories.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
          FilledButton.icon(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => StoryStudioScreen(trip: trip))), icon: const Icon(Icons.auto_awesome_rounded), label: const Text('Create remix')),
        ]),
      );
    }

    final kind = _kind(widget.tool);
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: service.watchNotes(trip.id),
      builder: (context, snapshot) {
        final all = snapshot.data ?? [];
        final items = all.where((x) => '${x['kind']}' == kind).toList();
        if (items.isEmpty) {
          return TripMateSurface(child: Padding(padding: const EdgeInsets.symmetric(vertical: 28), child: Column(children: [
            TripMateIconBubble(_meta(widget.tool).icon, size: 62),
            const SizedBox(height: 14),
            Text(_emptyTitle(widget.tool), textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(_emptyText(widget.tool), textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
          ])));
        }
        return Column(children: items.map((x) => _itemCard(x)).toList());
      },
    );
  }

  Widget _itemCard(Map<String, dynamic> item) {
    final body = '${item['body'] ?? ''}';
    final locked = widget.tool == GenZTool.timeCapsule && _isLocked(body);
    final display = locked ? 'Locked until ${_unlockLabel(body)}' : _cleanBody(body);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TripMateSurface(
        padding: const EdgeInsets.all(15),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          TripMateIconBubble(locked ? Icons.lock_clock_rounded : _meta(widget.tool).icon),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${item['title'] ?? _meta(widget.tool).title}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
            if (display.trim().isNotEmpty) ...[const SizedBox(height: 4), Text(display, style: Theme.of(context).textTheme.bodySmall)],
          ])),
          IconButton(onPressed: () => service.deleteNote('${item['id']}'), icon: const Icon(Icons.delete_outline_rounded)),
        ]),
      ),
    );
  }

  Future<void> _add(Trip trip) async {
    switch (widget.tool) {
      case GenZTool.timeCapsule:
        final title = TextEditingController();
        final message = TextEditingController();
        DateTime unlock = trip.endDate.add(const Duration(days: 1));
        final ok = await showModalBottomSheet<bool>(context: context, isScrollControlled: true, builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => Padding(
          padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('Seal a time capsule', style: Theme.of(ctx).textTheme.headlineSmall),
            const SizedBox(height: 14),
            TextField(controller: title, decoration: const InputDecoration(labelText: 'Capsule title')),
            const SizedBox(height: 10),
            TextField(controller: message, maxLines: 3, decoration: const InputDecoration(labelText: 'Message for future you')),
            const SizedBox(height: 10),
            OutlinedButton.icon(onPressed: () async { final d = await showDatePicker(context: ctx, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 3650)), initialDate: unlock); if (d != null) setLocal(() => unlock = d); }, icon: const Icon(Icons.lock_clock_rounded), label: Text('Unlock ${unlock.day}/${unlock.month}/${unlock.year}')),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Seal capsule')),
          ]),
        )));
        if (ok == true && title.text.trim().isNotEmpty) await service.addNote(tripId: trip.id, title: title.text.trim(), body: 'unlock=${unlock.toIso8601String()}|${message.text.trim()}', kind: _kind(widget.tool));
        title.dispose(); message.dispose();
        break;
      case GenZTool.moodMap:
        final result = await _twoField('Add a mood pin', 'Place', 'Mood / what it felt like');
        if (result != null) await service.addNote(tripId: trip.id, title: result.$1, body: result.$2, kind: _kind(widget.tool));
        break;
      case GenZTool.crewRadar:
        final result = await _twoField('Update crew signal', 'Status', 'Meetup point / note');
        if (result != null) await service.addNote(tripId: trip.id, title: result.$1, body: result.$2, kind: _kind(widget.tool));
        break;
      case GenZTool.travelStreaks:
        final result = await _twoField('Log travel streak', 'Challenge', 'What did you complete?');
        if (result != null) await service.addNote(tripId: trip.id, title: result.$1, body: result.$2, kind: _kind(widget.tool));
        break;
      case GenZTool.orbitRooms:
        final result = await _twoField('Create an Orbit Room', 'Room name', 'Room purpose / crew note');
        if (result != null) await service.addNote(tripId: trip.id, title: result.$1, body: result.$2, kind: _kind(widget.tool));
        break;
      case GenZTool.memoryRemix:
        break;
    }
  }

  Future<(String, String)?> _twoField(String title, String aLabel, String bLabel) async {
    final a = TextEditingController();
    final b = TextEditingController();
    final result = await showDialog<(String, String)>(context: context, builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: a, decoration: InputDecoration(labelText: aLabel)), const SizedBox(height: 10), TextField(controller: b, maxLines: 2, decoration: InputDecoration(labelText: bLabel))]),
      actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(ctx, (a.text.trim(), b.text.trim())), child: const Text('Save'))],
    ));
    a.dispose(); b.dispose();
    if (result == null || result.$1.isEmpty) return null;
    return result;
  }

  Widget _emptyTrips() => TripMateSurface(child: Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: Column(children: [
    const TripMateIconBubble(Icons.luggage_rounded, size: 60),
    const SizedBox(height: 14),
    Text('Create a trip first', style: Theme.of(context).textTheme.titleLarge),
    const SizedBox(height: 6),
    Text('This tool attaches to a real journey so everything stays organised and syncs through Supabase.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
  ])));
}

class _ToolMeta {
  const _ToolMeta(this.title, this.subtitle, this.hero, this.action, this.icon);
  final String title; final String subtitle; final String hero; final String action; final IconData icon;
}

_ToolMeta _meta(GenZTool tool) => switch (tool) {
  GenZTool.timeCapsule => const _ToolMeta('Time Capsule', 'Seal a moment and unlock it later.', 'Write something during the trip that future-you can only open after the date you choose.', 'Seal capsule', Icons.lock_clock_rounded),
  GenZTool.crewRadar => const _ToolMeta('Crew Radar', 'A live trip-specific crew signal board.', 'Post meetup status, checkpoints and quick crew signals so everyone knows the plan.', 'Post signal', Icons.radar_rounded),
  GenZTool.moodMap => const _ToolMeta('MoodMap', 'Map places by how they felt.', 'Turn locations into emotional pins — calm, chaotic, unreal, comfort, main-character energy.', 'Add mood pin', Icons.graphic_eq_rounded),
  GenZTool.memoryRemix => const _ToolMeta('Memory Remix', 'Turn your trip into something shareable.', 'Use your real journey as the base for a polished recap ready for Story Studio.', 'Create remix', Icons.auto_awesome_motion_rounded),
  GenZTool.travelStreaks => const _ToolMeta('Travel Streaks', 'Make the trip feel like a game.', 'Log local missions, detours and small challenges you actually completed.', 'Log streak', Icons.local_fire_department_rounded),
  GenZTool.orbitRooms => const _ToolMeta('Orbit Rooms', 'Temporary spaces built around one trip.', 'Create lightweight crew rooms for plans, meetups and temporary trip-only context.', 'Create room', Icons.bubble_chart_rounded),
};

String _kind(GenZTool tool) => switch (tool) {
  GenZTool.timeCapsule => 'time_capsule', GenZTool.crewRadar => 'crew_radar', GenZTool.moodMap => 'mood_map', GenZTool.memoryRemix => 'memory_remix', GenZTool.travelStreaks => 'travel_streak', GenZTool.orbitRooms => 'orbit_room',
};

bool _hasAdd(GenZTool tool) => tool != GenZTool.memoryRemix;
String _emptyTitle(GenZTool tool) => switch (tool) {
  GenZTool.timeCapsule => 'No capsules sealed yet', GenZTool.crewRadar => 'No crew signals yet', GenZTool.moodMap => 'Your MoodMap is empty', GenZTool.memoryRemix => 'Ready to remix', GenZTool.travelStreaks => 'No streaks logged yet', GenZTool.orbitRooms => 'No Orbit Rooms yet',
};
String _emptyText(GenZTool tool) => switch (tool) {
  GenZTool.timeCapsule => 'Seal a message now and give it an unlock date.', GenZTool.crewRadar => 'Post a meetup signal or trip checkpoint for your crew.', GenZTool.moodMap => 'Add a place and describe exactly how it felt.', GenZTool.memoryRemix => 'Open Story Studio and create your trip recap.', GenZTool.travelStreaks => 'Log a local mission, detour or travel challenge.', GenZTool.orbitRooms => 'Create a temporary room for a part of this journey.',
};

bool _isLocked(String body) {
  if (!body.startsWith('unlock=')) return false;
  final split = body.split('|').first.replaceFirst('unlock=', '');
  final date = DateTime.tryParse(split);
  return date != null && DateTime.now().isBefore(date);
}
String _unlockLabel(String body) {
  final raw = body.split('|').first.replaceFirst('unlock=', '');
  final d = DateTime.tryParse(raw);
  return d == null ? 'later' : '${d.day}/${d.month}/${d.year}';
}
String _cleanBody(String body) => body.startsWith('unlock=') && body.contains('|') ? body.substring(body.indexOf('|') + 1) : body;

extension _FirstOrNull<E> on Iterable<E> { E? get firstOrNull => isEmpty ? null : first; }
