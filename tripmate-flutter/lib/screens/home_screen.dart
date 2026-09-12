import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/design.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import 'create_trip_screen.dart';
import 'document_vault_screen.dart';
import 'story_studio_screen.dart';
import 'trip_detail_screen.dart';
import 'trip_feature_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final TripService service;
  int refreshKey = 0;

  @override
  void initState() {
    super.initState();
    service = TripService(Supabase.instance.client);
  }

  Future<void> _refresh() async {
    setState(() => refreshKey++);
    await Future<void>.delayed(const Duration(milliseconds: 300));
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final firstName = (user?.userMetadata?['full_name'] as String?)?.split(' ').first ?? 'Traveler';
    return Scaffold(
      body: TripMateWaveBackground(
        child: SafeArea(
          child: StreamBuilder<List<Trip>>(
            key: ValueKey(refreshKey),
            stream: service.watchTrips(),
            builder: (context, snapshot) {
              final trips = snapshot.data ?? [];
              final active = trips.isEmpty ? null : trips.first;
              return RefreshIndicator(
                onRefresh: _refresh,
                color: TripMateColors.navy800,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 120),
                  children: [
                    Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('TRIPMATE', style: TextStyle(color: TripMateColors.blue600, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.7)),
                        const SizedBox(height: 3),
                        Text('Hey, $firstName 👋', style: Theme.of(context).textTheme.headlineLarge),
                        Text('Everything for the journey, in one place.', style: Theme.of(context).textTheme.bodyMedium),
                      ])),
                      TripMateIconBubble(Icons.travel_explore_rounded, dark: true),
                    ]),
                    const SizedBox(height: 20),
                    active == null ? _emptyHero() : _activeHero(active),
                    const SizedBox(height: 20),
                    _stats(trips),
                    const SizedBox(height: 28),
                    const TripMatePageHeader(eyebrow: 'TRAVEL OS', title: 'Your tools.', subtitle: 'Every feature opens its own live workspace — not one repeated page.'),
                    const SizedBox(height: 14),
                    _featureGrid(active),
                    const SizedBox(height: 30),
                    Row(children: [Expanded(child: Text('Your journeys', style: Theme.of(context).textTheme.titleLarge)), TextButton.icon(onPressed: _createTrip, icon: const Icon(Icons.add_rounded), label: const Text('New trip'))]),
                    const SizedBox(height: 10),
                    if (trips.isEmpty) _emptyLibrary() else ...trips.map(_tripTile),
                  ],
                ),
              );
            },
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(onPressed: _createTrip, icon: const Icon(Icons.add_rounded), label: const Text('New trip')),
    );
  }

  Widget _activeHero(Trip trip) {
    final days = trip.endDate.difference(trip.startDate).inDays + 1;
    return TripMateSurface(
      onTap: () => _openTrip(trip),
      gradient: TripMateGradient.hero,
      padding: const EdgeInsets.all(22),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Container(padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7), decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(30)), child: const Text('ACTIVE TRIP', style: TextStyle(color: TripMateColors.ice, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.1))), const Spacer(), const Icon(Icons.arrow_outward_rounded, color: Colors.white)]),
        const SizedBox(height: 28),
        Text(trip.destination, style: const TextStyle(color: Colors.white, fontSize: 38, fontWeight: FontWeight.w900, letterSpacing: -1.4)),
        const SizedBox(height: 4),
        Text(trip.title, style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w700)),
        const SizedBox(height: 20),
        Row(children: [Expanded(child: _heroMeta(Icons.calendar_month_rounded, '${DateFormat.MMMd().format(trip.startDate)} – ${DateFormat.MMMd().format(trip.endDate)}', '$days days')), const SizedBox(width: 10), Expanded(child: _heroMeta(Icons.wallet_rounded, '₹${trip.budget.toStringAsFixed(0)}', 'budget'))]),
      ]),
    );
  }

  Widget _emptyHero() => TripMateSurface(
    gradient: TripMateGradient.hero,
    padding: const EdgeInsets.all(24),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const TripMateIconBubble(Icons.flight_takeoff_rounded, size: 58), const SizedBox(height: 25),
      const Text('Your next trip starts here.', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: -1)),
      const SizedBox(height: 8),
      const Text('Create one journey first. Then every tool below becomes a separate real-time workspace for that trip.', style: TextStyle(color: Colors.white70, height: 1.45, fontWeight: FontWeight.w600)),
      const SizedBox(height: 18),
      FilledButton.tonalIcon(onPressed: _createTrip, icon: const Icon(Icons.add_rounded), label: const Text('Create journey')),
    ]),
  );

  Widget _heroMeta(IconData icon, String top, String bottom) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.white.withValues(alpha: .09), borderRadius: BorderRadius.circular(18)),
    child: Row(children: [Icon(icon, color: TripMateColors.ice, size: 18), const SizedBox(width: 8), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(top, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)), const SizedBox(height: 2), Text(bottom, style: const TextStyle(color: Colors.white54, fontSize: 10))]))]),
  );

  Widget _stats(List<Trip> trips) {
    final places = trips.map((e) => e.destination.trim().toLowerCase()).where((e) => e.isNotEmpty).toSet().length;
    final budget = trips.fold<double>(0, (sum, t) => sum + t.budget);
    return Row(children: [Expanded(child: _stat(Icons.luggage_rounded, '${trips.length}', 'Trips')), const SizedBox(width: 10), Expanded(child: _stat(Icons.public_rounded, '$places', 'Places')), const SizedBox(width: 10), Expanded(child: _stat(Icons.wallet_rounded, '₹${_compactMoney(budget)}', 'Planned'))]);
  }

  Widget _stat(IconData icon, String value, String label) => TripMateSurface(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14), child: Column(children: [TripMateIconBubble(icon, size: 38), const SizedBox(height: 7), Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17)), Text(label, style: Theme.of(context).textTheme.bodySmall)]));

  Widget _featureGrid(Trip? trip) {
    final features = <(IconData, String, String, TripFeature)>[
      (Icons.route_rounded, 'Itinerary', 'Plans & timing', TripFeature.itinerary),
      (Icons.wallet_rounded, 'Budget', 'Spend in real time', TripFeature.budget),
      (Icons.backpack_rounded, 'Packing', 'Live checklist', TripFeature.packing),
      (Icons.photo_library_rounded, 'Memories', 'Photos & captions', TripFeature.memories),
      (Icons.confirmation_number_rounded, 'Bookings', 'Tickets & stays', TripFeature.bookings),
      (Icons.health_and_safety_rounded, 'Emergency', 'Safety actions', TripFeature.emergency),
    ];
    return Column(children: [
      GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: features.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 1.12, crossAxisSpacing: 12, mainAxisSpacing: 12),
        itemBuilder: (_, i) {
          final f = features[i];
          return TripMateSurface(
            onTap: () => trip == null ? _needTrip(f.$2) : Navigator.push(context, MaterialPageRoute(builder: (_) => TripFeatureScreen(trip: trip, feature: f.$4))),
            padding: const EdgeInsets.all(15),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [TripMateIconBubble(f.$1, size: 46), const Spacer(), Text(f.$2, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)), const SizedBox(height: 2), Text(f.$3, style: Theme.of(context).textTheme.bodySmall), const Align(alignment: Alignment.centerRight, child: Icon(Icons.arrow_outward_rounded, size: 16, color: TripMateColors.blue600))]),
          );
        },
      ),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: TripMateSurface(onTap: () => trip == null ? _needTrip('Travel Vault') : Navigator.push(context, MaterialPageRoute(builder: (_) => DocumentVaultScreen(trip: trip))), color: TripMateColors.ice, child: const Row(children: [TripMateIconBubble(Icons.folder_special_rounded, size: 44, dark: true), SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Travel Vault', style: TextStyle(fontWeight: FontWeight.w900)), Text('IDs • tickets • docs', style: TextStyle(fontSize: 11, color: TripMateColors.muted))]))]))),
        const SizedBox(width: 10),
        Expanded(child: TripMateSurface(onTap: () => trip == null ? _needTrip('Story Studio') : Navigator.push(context, MaterialPageRoute(builder: (_) => StoryStudioScreen(trip: trip))), gradient: const LinearGradient(colors: [TripMateColors.blue400, TripMateColors.blue600]), child: const Row(children: [TripMateIconBubble(Icons.auto_awesome_rounded, size: 44), SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Story Studio', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white)), Text('Create your recap', style: TextStyle(fontSize: 11, color: Colors.white70))]))]))),
      ]),
    ]);
  }

  Future<void> _needTrip(String feature) => showModalBottomSheet(
    context: context,
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(22, 8, 22, 28),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const TripMateIconBubble(Icons.luggage_rounded, size: 62, dark: true), const SizedBox(height: 14),
        Text('$feature needs a trip', style: Theme.of(ctx).textTheme.headlineSmall, textAlign: TextAlign.center),
        const SizedBox(height: 7),
        Text('Create a journey once. After that, $feature opens directly as its own workspace.', style: Theme.of(ctx).textTheme.bodyMedium, textAlign: TextAlign.center),
        const SizedBox(height: 16),
        FilledButton.icon(onPressed: () { Navigator.pop(ctx); _createTrip(); }, icon: const Icon(Icons.add_rounded), label: const Text('Create trip')),
      ]),
    ),
  );

  Widget _emptyLibrary() => TripMateSurface(onTap: _createTrip, child: Padding(padding: const EdgeInsets.symmetric(vertical: 22), child: Column(children: [const TripMateIconBubble(Icons.explore_rounded, size: 60), const SizedBox(height: 14), Text('No journeys yet', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 5), Text('Create your first trip to activate the travel workspaces.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium)])));

  Widget _tripTile(Trip trip) => Padding(padding: const EdgeInsets.only(bottom: 10), child: TripMateSurface(onTap: () => _openTrip(trip), padding: const EdgeInsets.all(15), child: Row(children: [TripMateIconBubble(Icons.near_me_rounded), const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(trip.destination, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)), const SizedBox(height: 3), Text('${DateFormat.MMMd().format(trip.startDate)} • ${trip.title}', style: Theme.of(context).textTheme.bodySmall)])), const Icon(Icons.chevron_right_rounded)])));

  void _openTrip(Trip trip) => Navigator.push(context, MaterialPageRoute(builder: (_) => TripDetailScreen(trip: trip)));

  Future<void> _createTrip() async {
    final trip = await Navigator.push<Trip>(context, MaterialPageRoute(builder: (_) => const CreateTripScreen()));
    if (trip != null && mounted) _openTrip(trip);
  }
}

String _compactMoney(double value) {
  if (value >= 100000) return '${(value / 100000).toStringAsFixed(value >= 1000000 ? 0 : 1)}L';
  if (value >= 1000) return '${(value / 1000).toStringAsFixed(value >= 10000 ? 0 : 1)}K';
  return value.toStringAsFixed(0);
}
