import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/design.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import 'document_vault_screen.dart';

class TripFeatureScreen extends StatefulWidget {
  const TripFeatureScreen({super.key, required this.trip, required this.feature});
  final Trip trip;
  final TripFeature feature;

  @override
  State<TripFeatureScreen> createState() => _TripFeatureScreenState();
}

enum TripFeature { itinerary, budget, packing, memories, bookings, emergency }

class _TripFeatureScreenState extends State<TripFeatureScreen> {
  late final TripService service;

  @override
  void initState() {
    super.initState();
    service = TripService(Supabase.instance.client);
  }

  @override
  Widget build(BuildContext context) {
    final meta = _meta(widget.feature);
    return Scaffold(
      body: TripMateWaveBackground(
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: () async => setState(() {}),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 96),
              children: [
                Row(children: [
                  IconButton.filledTonal(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.arrow_back_rounded)),
                  const Spacer(),
                  TripMateIconBubble(meta.icon, dark: true),
                ]),
                const SizedBox(height: 22),
                TripMatePageHeader(eyebrow: widget.trip.destination.toUpperCase(), title: meta.title, subtitle: meta.subtitle),
                const SizedBox(height: 22),
                TripMateSurface(
                  gradient: TripMateGradient.hero,
                  child: Row(children: [
                    Container(width: 58, height: 58, decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(20)), child: Icon(meta.icon, color: TripMateColors.ice, size: 30)),
                    const SizedBox(width: 15),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(widget.trip.title, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 3),
                      Text(meta.heroLine, style: const TextStyle(color: Colors.white70, height: 1.35, fontWeight: FontWeight.w600)),
                    ])),
                  ]),
                ),
                const SizedBox(height: 20),
                _content(),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: _canAdd(widget.feature)
          ? FloatingActionButton.extended(onPressed: _add, icon: const Icon(Icons.add_rounded), label: Text(meta.action))
          : null,
    );
  }

  Widget _content() {
    switch (widget.feature) {
      case TripFeature.itinerary:
        return _streamList(service.watchItinerary(widget.trip.id), Icons.route_rounded, 'Nothing planned yet', (x) => '${x['title'] ?? 'Plan'}', (x) => '${x['place'] ?? ''}');
      case TripFeature.budget:
        return StreamBuilder<List<Map<String, dynamic>>>(
          stream: service.watchExpenses(widget.trip.id),
          builder: (_, snap) {
            final items = snap.data ?? [];
            final spent = items.fold<double>(0, (sum, x) => sum + ((x['amount'] as num?)?.toDouble() ?? 0));
            final left = widget.trip.budget - spent;
            final progress = widget.trip.budget <= 0 ? 0.0 : (spent / widget.trip.budget).clamp(0.0, 1.0);
            return Column(children: [
              TripMateSurface(child: Column(children: [
                Row(children: [Expanded(child: _number('Budget', '₹${widget.trip.budget.toStringAsFixed(0)}')), Expanded(child: _number('Spent', '₹${spent.toStringAsFixed(0)}')), Expanded(child: _number('Left', '₹${left.toStringAsFixed(0)}'))]),
                const SizedBox(height: 14),
                ClipRRect(borderRadius: BorderRadius.circular(20), child: LinearProgressIndicator(value: progress, minHeight: 9)),
              ])),
              const SizedBox(height: 12),
              _items(items, Icons.account_balance_wallet_rounded, 'No expenses yet', (x) => '${x['title'] ?? 'Expense'}', (x) => '₹${((x['amount'] as num?)?.toDouble() ?? 0).toStringAsFixed(0)} • ${x['category'] ?? 'Other'}'),
            ]);
          },
        );
      case TripFeature.packing:
        return StreamBuilder<List<Map<String, dynamic>>>(
          stream: service.watchChecklist(widget.trip.id),
          builder: (_, snap) {
            final items = snap.data ?? [];
            if (items.isEmpty) return _empty(Icons.backpack_rounded, 'Your packing list starts here', 'Add essentials, outfits, chargers and anything you do not want to forget.');
            final doneCount = items.where((x) => x['is_done'] == true).length;
            return Column(children: [
              TripMateSurface(child: Row(children: [TripMateIconBubble(Icons.task_alt_rounded), const SizedBox(width: 12), Expanded(child: Text('$doneCount of ${items.length} packed', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)))])),
              const SizedBox(height: 12),
              ...items.map((x) {
                final done = x['is_done'] == true;
                return Padding(padding: const EdgeInsets.only(bottom: 10), child: TripMateSurface(padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12), child: Row(children: [
                  Checkbox(value: done, onChanged: (v) => service.setChecklistState('${x['id']}', v ?? false)),
                  const SizedBox(width: 8),
                  Expanded(child: Text('${x['title'] ?? 'Item'}', style: TextStyle(fontWeight: FontWeight.w800, decoration: done ? TextDecoration.lineThrough : null))),
                  IconButton(onPressed: () => service.deleteChecklistItem('${x['id']}'), icon: const Icon(Icons.close_rounded)),
                ])));
              }),
            ]);
          },
        );
      case TripFeature.memories:
        return StreamBuilder<List<Map<String, dynamic>>>(
          stream: service.watchMemories(widget.trip.id),
          builder: (_, snap) {
            final items = snap.data ?? [];
            if (items.isEmpty) return _empty(Icons.photo_library_rounded, 'No memories yet', 'Tap Add moment, choose a photo and save it to this trip.');
            return Column(children: items.map((x) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: TripMateSurface(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  const TripMateIconBubble(Icons.photo_rounded, size: 48),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${x['caption'] ?? 'Trip moment'}', style: const TextStyle(fontWeight: FontWeight.w900)), const SizedBox(height: 3), Text('Synced to your private trip memory vault', style: Theme.of(context).textTheme.bodySmall)])),
                  IconButton(onPressed: () => service.deleteMemory(x), icon: const Icon(Icons.delete_outline_rounded)),
                ]),
              ),
            )).toList());
          },
        );
      case TripFeature.bookings:
        return _streamList(service.watchBookings(widget.trip.id), Icons.confirmation_number_rounded, 'No bookings saved', (x) => '${x['title'] ?? 'Booking'}', (x) => '${x['provider'] ?? x['category'] ?? ''}');
      case TripFeature.emergency:
        return Column(children: [
          _EmergencyAction(icon: Icons.call_rounded, title: 'Emergency 112', text: 'Call India emergency assistance.', onTap: () => launchUrl(Uri.parse('tel:112'))),
          const SizedBox(height: 10),
          _EmergencyAction(icon: Icons.local_hospital_rounded, title: 'Nearby hospital', text: 'Open nearby hospitals in Maps.', onTap: () => launchUrl(Uri.parse('https://www.google.com/maps/search/hospital+near+me'), mode: LaunchMode.externalApplication)),
          const SizedBox(height: 10),
          _EmergencyAction(icon: Icons.local_pharmacy_rounded, title: 'Nearby pharmacy', text: 'Find a pharmacy close to you.', onTap: () => launchUrl(Uri.parse('https://www.google.com/maps/search/pharmacy+near+me'), mode: LaunchMode.externalApplication)),
          const SizedBox(height: 10),
          _EmergencyAction(icon: Icons.folder_special_rounded, title: 'Emergency documents', text: 'Open your private Travel Vault.', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => DocumentVaultScreen(trip: widget.trip)))),
        ]);
    }
  }

  Widget _streamList(Stream<List<Map<String, dynamic>>> stream, IconData icon, String emptyTitle, String Function(Map<String, dynamic>) title, String Function(Map<String, dynamic>) subtitle) => StreamBuilder<List<Map<String, dynamic>>>(stream: stream, builder: (_, snap) => _items(snap.data ?? [], icon, emptyTitle, title, subtitle));

  Widget _items(List<Map<String, dynamic>> items, IconData icon, String emptyTitle, String Function(Map<String, dynamic>) title, String Function(Map<String, dynamic>) subtitle) {
    if (items.isEmpty) return _empty(icon, emptyTitle, 'Tap the action button to add your first item.');
    return Column(children: items.map((x) => Padding(padding: const EdgeInsets.only(bottom: 10), child: TripMateSurface(padding: const EdgeInsets.all(15), child: Row(children: [
      TripMateIconBubble(icon, size: 46), const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title(x), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)), if (subtitle(x).trim().isNotEmpty) ...[const SizedBox(height: 3), Text(subtitle(x), style: Theme.of(context).textTheme.bodySmall)]])),
    ])))).toList());
  }

  Widget _empty(IconData icon, String title, String text) => TripMateSurface(child: Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: Column(children: [TripMateIconBubble(icon, size: 58), const SizedBox(height: 14), Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center), const SizedBox(height: 6), Text(text, style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center)])));
  Widget _number(String label, String value) => Column(children: [Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)), const SizedBox(height: 2), Text(label, style: Theme.of(context).textTheme.bodySmall)]);
  bool _canAdd(TripFeature feature) => feature != TripFeature.emergency;

  Future<void> _add() async {
    switch (widget.feature) {
      case TripFeature.itinerary:
        final result = await _twoFieldDialog('Add itinerary', 'Plan title', 'Place / location');
        if (result != null) await service.addItinerary(tripId: widget.trip.id, title: result.$1, place: result.$2, startsAt: DateTime.now());
        break;
      case TripFeature.budget:
        final result = await _twoFieldDialog('Add expense', 'Expense', 'Amount');
        if (result != null) await service.addExpense(tripId: widget.trip.id, category: 'Trip', title: result.$1, amount: double.tryParse(result.$2) ?? 0);
        break;
      case TripFeature.packing:
        final title = await _textDialog('Add packing item', 'What to pack?');
        if (title != null) await service.addChecklistItem(widget.trip.id, title);
        break;
      case TripFeature.memories:
        final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 88);
        if (file == null || !mounted) return;
        final caption = await _textDialog('Add memory', 'Caption (optional)', allowEmpty: true);
        await service.addMemory(tripId: widget.trip.id, file: file, caption: caption);
        break;
      case TripFeature.bookings:
        final result = await _twoFieldDialog('Add booking', 'Booking title', 'Provider / confirmation');
        if (result != null) await service.addBooking(tripId: widget.trip.id, title: result.$1, category: 'Travel', provider: result.$2);
        break;
      case TripFeature.emergency:
        break;
    }
  }

  Future<String?> _textDialog(String title, String hint, {bool allowEmpty = false}) async {
    final controller = TextEditingController();
    final value = await showDialog<String>(context: context, builder: (ctx) => AlertDialog(title: Text(title), content: TextField(controller: controller, autofocus: true, decoration: InputDecoration(hintText: hint)), actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(ctx, controller.text.trim()), child: const Text('Save'))]));
    controller.dispose();
    if (value == null) return null;
    return value.isEmpty && !allowEmpty ? null : value;
  }

  Future<(String, String)?> _twoFieldDialog(String title, String first, String second) async {
    final a = TextEditingController(); final b = TextEditingController();
    final value = await showDialog<(String, String)>(context: context, builder: (ctx) => AlertDialog(title: Text(title), content: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: a, decoration: InputDecoration(labelText: first)), const SizedBox(height: 10), TextField(controller: b, decoration: InputDecoration(labelText: second))]), actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(ctx, (a.text.trim(), b.text.trim())), child: const Text('Add'))]));
    a.dispose(); b.dispose();
    if (value == null || value.$1.isEmpty) return null;
    return value;
  }
}

class _FeatureMeta {
  const _FeatureMeta(this.title, this.subtitle, this.heroLine, this.action, this.icon);
  final String title; final String subtitle; final String heroLine; final String action; final IconData icon;
}

_FeatureMeta _meta(TripFeature feature) => switch (feature) {
  TripFeature.itinerary => const _FeatureMeta('Itinerary', 'Build the flow of your trip, one moment at a time.', 'Your day-by-day route, plans and timing live here.', 'Add plan', Icons.route_rounded),
  TripFeature.budget => const _FeatureMeta('Budget', 'Know what you planned, spent and still have left.', 'A live money view made for this journey.', 'Add expense', Icons.account_balance_wallet_rounded),
  TripFeature.packing => const _FeatureMeta('Packing', 'A smart checklist so essentials never stay home.', 'Tap items as you pack and sync the list instantly.', 'Add item', Icons.backpack_rounded),
  TripFeature.memories => const _FeatureMeta('Memories', 'Your private collection of photos from this trip.', 'Pick photos, add captions and sync them to your memory vault.', 'Add moment', Icons.photo_library_rounded),
  TripFeature.bookings => const _FeatureMeta('Bookings', 'Keep transport, stays and confirmation details together.', 'PNR, hotel, bus, train and flight details stay in one place.', 'Add booking', Icons.confirmation_number_rounded),
  TripFeature.emergency => const _FeatureMeta('Emergency', 'Critical travel actions without digging through chats.', 'Call help, find hospitals or pharmacies and open your emergency documents.', 'Open', Icons.health_and_safety_rounded),
};

class _EmergencyAction extends StatelessWidget {
  const _EmergencyAction({required this.icon, required this.title, required this.text, required this.onTap});
  final IconData icon; final String title; final String text; final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => TripMateSurface(onTap: onTap, child: Row(children: [TripMateIconBubble(icon), const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w900)), const SizedBox(height: 3), Text(text, style: Theme.of(context).textTheme.bodySmall)])), const Icon(Icons.arrow_outward_rounded, color: TripMateColors.blue600)]));
}
