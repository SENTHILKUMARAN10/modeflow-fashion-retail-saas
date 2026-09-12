import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';

class TripDetailScreen extends StatefulWidget {
  const TripDetailScreen({super.key, required this.trip});
  final Trip trip;

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController tabs;
  late final TripService service;

  @override
  void initState() {
    super.initState();
    tabs = TabController(length: 5, vsync: this);
    service = TripService(Supabase.instance.client);
  }

  @override
  void dispose() {
    tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;
    final days = trip.endDate.difference(trip.startDate).inDays + 1;

    return Scaffold(
      appBar: AppBar(
        title: Text(trip.destination),
        actions: [
          IconButton(
            tooltip: 'Share trip',
            onPressed: () => Share.share(
              '${trip.title} • ${trip.destination}\n${DateFormat.yMMMd().format(trip.startDate)} - ${DateFormat.yMMMd().format(trip.endDate)}\nPlanned with TripMate',
            ),
            icon: const Icon(Icons.ios_share_rounded),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: Column(
        children: [
          _TripHero(trip: trip, days: days),
          Container(
            margin: const EdgeInsets.fromLTRB(16, 8, 16, 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
            ),
            child: TabBar(
              controller: tabs,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              dividerColor: Colors.transparent,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(14),
              ),
              labelColor: Theme.of(context).colorScheme.primary,
              unselectedLabelColor: Theme.of(context).colorScheme.onSurfaceVariant,
              labelStyle: const TextStyle(fontWeight: FontWeight.w800),
              padding: const EdgeInsets.all(4),
              tabs: const [
                Tab(text: 'Plan'),
                Tab(text: 'Budget'),
                Tab(text: 'Pack'),
                Tab(text: 'Memories'),
                Tab(text: 'Travel hub'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: tabs,
              children: [
                _ItineraryTab(service: service, tripId: trip.id),
                _BudgetTab(service: service, tripId: trip.id, budget: trip.budget),
                _ChecklistTab(service: service, tripId: trip.id),
                _MemoriesTab(service: service, tripId: trip.id),
                _TravelHubTab(service: service, trip: trip),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TripHero extends StatelessWidget {
  const _TripHero({required this.trip, required this.days});
  final Trip trip;
  final int days;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 6),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF244B45), Color(0xFF4C746C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x1F173D36), blurRadius: 26, offset: Offset(0, 12)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .13),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.explore_rounded, color: Colors.white, size: 15),
                    SizedBox(width: 6),
                    Text('TRIP SPACE', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1)),
                  ],
                ),
              ),
              const Spacer(),
              Text('$days days', style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            trip.title,
            style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: -.5),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.location_on_rounded, color: Color(0xFFFFC8A6), size: 18),
              const SizedBox(width: 5),
              Expanded(
                child: Text(trip.destination, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _HeroStat(
                  icon: Icons.calendar_month_rounded,
                  label: 'Dates',
                  value: '${DateFormat.MMMd().format(trip.startDate)} – ${DateFormat.MMMd().format(trip.endDate)}',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _HeroStat(
                  icon: Icons.account_balance_wallet_rounded,
                  label: 'Budget',
                  value: '₹${trip.budget.toStringAsFixed(0)}',
                ),
              ),
            ],
          ),
          if ((trip.notes ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(trip.notes!, style: TextStyle(color: cs.onPrimary.withValues(alpha: .78), height: 1.35)),
          ],
        ],
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .10),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withValues(alpha: .10)),
        ),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFFFFC8A6), size: 20),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
                  const SizedBox(height: 2),
                  Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ],
        ),
      );
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.subtitle, this.action});
  final String title;
  final String subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 2),
                Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
          if (action != null) action!,
        ],
      );
}

class _ItineraryTab extends StatelessWidget {
  const _ItineraryTab({required this.service, required this.tripId});
  final TripService service;
  final String tripId;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: service.watchItinerary(tripId),
      builder: (context, snapshot) {
        final items = snapshot.data ?? [];
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
          children: [
            _SectionHeader(
              title: 'Your itinerary',
              subtitle: 'Build a simple timeline for every day.',
              action: IconButton.filledTonal(
                onPressed: () => _addItineraryDialog(context, service, tripId),
                icon: const Icon(Icons.add_rounded),
              ),
            ),
            const SizedBox(height: 16),
            if (items.isEmpty)
              _EmptyPanel(
                icon: Icons.route_rounded,
                title: 'No plans yet',
                text: 'Add sightseeing, food stops, hotel check-ins or anything you do not want to miss.',
                button: 'Add first activity',
                onTap: () => _addItineraryDialog(context, service, tripId),
              )
            else
              ...List.generate(items.length, (i) {
                final x = items[i];
                final dt = DateTime.parse(x['starts_at'] as String).toLocal();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Card(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(24),
                      onLongPress: () => _confirmDelete(context, 'Delete this activity?', () => service.deleteItinerary(x['id'] as String)),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 54,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.primaryContainer,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Column(
                                children: [
                                  Text(DateFormat.Hm().format(dt), style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w900)),
                                  const SizedBox(height: 2),
                                  Text(DateFormat.MMMd().format(dt), style: const TextStyle(fontSize: 10)),
                                ],
                              ),
                            ),
                            const SizedBox(width: 13),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${x['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                                  if ('${x['place'] ?? ''}'.trim().isNotEmpty) ...[
                                    const SizedBox(height: 5),
                                    Row(children: [
                                      const Icon(Icons.place_rounded, size: 15),
                                      const SizedBox(width: 4),
                                      Expanded(child: Text('${x['place']}', style: Theme.of(context).textTheme.bodyMedium)),
                                    ]),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }),
          ],
        );
      },
    );
  }
}

Future<void> _addItineraryDialog(BuildContext context, TripService service, String tripId) async {
  final title = TextEditingController();
  final place = TextEditingController();
  final notes = TextEditingController();
  DateTime date = DateTime.now().add(const Duration(hours: 1));
  TimeOfDay time = TimeOfDay.fromDateTime(date);
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setLocal) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Add to itinerary', style: Theme.of(ctx).textTheme.headlineSmall),
              const SizedBox(height: 6),
              const Text('Save the time, place and a small note so your day stays organized.'),
              const SizedBox(height: 18),
              TextField(controller: title, decoration: const InputDecoration(labelText: 'Activity', prefixIcon: Icon(Icons.auto_awesome_rounded))),
              const SizedBox(height: 10),
              TextField(controller: place, decoration: const InputDecoration(labelText: 'Place', prefixIcon: Icon(Icons.place_outlined))),
              const SizedBox(height: 10),
              TextField(controller: notes, decoration: const InputDecoration(labelText: 'Notes (optional)', prefixIcon: Icon(Icons.notes_rounded))),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final d = await showDatePicker(
                          context: ctx,
                          firstDate: DateTime.now().subtract(const Duration(days: 3650)),
                          lastDate: DateTime.now().add(const Duration(days: 3650)),
                          initialDate: date,
                        );
                        if (d != null) setLocal(() => date = DateTime(d.year, d.month, d.day));
                      },
                      icon: const Icon(Icons.calendar_month_rounded),
                      label: Text(DateFormat.MMMd().format(date)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final t = await showTimePicker(context: ctx, initialTime: time);
                        if (t != null) setLocal(() => time = t);
                      },
                      icon: const Icon(Icons.schedule_rounded),
                      label: Text(time.format(ctx)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              FilledButton(
                onPressed: () async {
                  if (title.text.trim().isEmpty) return;
                  final startsAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
                  await service.addItinerary(
                    tripId: tripId,
                    title: title.text.trim(),
                    startsAt: startsAt,
                    place: place.text.trim().isEmpty ? null : place.text.trim(),
                    notes: notes.text.trim().isEmpty ? null : notes.text.trim(),
                  );
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Save activity'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _BudgetTab extends StatelessWidget {
  const _BudgetTab({required this.service, required this.tripId, required this.budget});
  final TripService service;
  final String tripId;
  final double budget;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: service.watchExpenses(tripId),
      builder: (context, snapshot) {
        final items = snapshot.data ?? [];
        final spent = items.fold<double>(0, (sum, x) => sum + ((x['amount'] as num?)?.toDouble() ?? 0));
        final remaining = budget - spent;
        final progress = budget <= 0 ? 0.0 : (spent / budget).clamp(0.0, 1.0);
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
          children: [
            _SectionHeader(
              title: 'Trip budget',
              subtitle: 'Know where your money goes while you travel.',
              action: IconButton.filledTonal(onPressed: () => _addExpenseDialog(context, service, tripId), icon: const Icon(Icons.add_rounded)),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1F2A27),
                borderRadius: BorderRadius.circular(26),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('SPENDING OVERVIEW', style: TextStyle(color: Colors.white60, fontWeight: FontWeight.w800, letterSpacing: 1, fontSize: 11)),
                  const SizedBox(height: 15),
                  Row(children: [
                    Expanded(child: _DarkMoneyStat(label: 'Spent', value: spent)),
                    Expanded(child: _DarkMoneyStat(label: 'Remaining', value: remaining)),
                  ]),
                  const SizedBox(height: 16),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: LinearProgressIndicator(value: progress, minHeight: 8, backgroundColor: Colors.white12, color: const Color(0xFFE9905B)),
                  ),
                  const SizedBox(height: 8),
                  Text('${(progress * 100).round()}% of ₹${budget.toStringAsFixed(0)} budget used', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 18),
            if (items.isEmpty)
              _EmptyPanel(
                icon: Icons.payments_outlined,
                title: 'No expenses yet',
                text: 'Track food, hotel, tickets, transport and shopping in one place.',
                button: 'Add expense',
                onTap: () => _addExpenseDialog(context, service, tripId),
              )
            else ...[
              Text('Recent expenses', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 10),
              ...items.map((x) => Padding(
                    padding: const EdgeInsets.only(bottom: 9),
                    child: Card(
                      child: ListTile(
                        onLongPress: () => _confirmDelete(context, 'Delete this expense?', () => service.deleteExpense(x['id'] as String)),
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                          child: Icon(_expenseIcon('${x['category'] ?? ''}'), color: Theme.of(context).colorScheme.onSecondaryContainer),
                        ),
                        title: Text('${x['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                        subtitle: Text('${x['category'] ?? 'Other'}'),
                        trailing: Text('₹${((x['amount'] as num?)?.toDouble() ?? 0).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                      ),
                    ),
                  )),
            ],
          ],
        );
      },
    );
  }
}

class _DarkMoneyStat extends StatelessWidget {
  const _DarkMoneyStat({required this.label, required this.value});
  final String label;
  final double value;
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.white60, fontSize: 12)),
          const SizedBox(height: 4),
          Text('₹${value.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
        ],
      );
}

IconData _expenseIcon(String category) {
  switch (category.toLowerCase()) {
    case 'food': return Icons.restaurant_rounded;
    case 'stay': return Icons.bed_rounded;
    case 'transport': return Icons.directions_car_rounded;
    case 'shopping': return Icons.shopping_bag_rounded;
    case 'tickets': return Icons.confirmation_number_rounded;
    default: return Icons.receipt_long_rounded;
  }
}

Future<void> _addExpenseDialog(BuildContext context, TripService service, String tripId) async {
  final title = TextEditingController();
  final amount = TextEditingController();
  String category = 'Food';
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setLocal) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Add expense', style: Theme.of(ctx).textTheme.headlineSmall),
            const SizedBox(height: 16),
            TextField(controller: title, decoration: const InputDecoration(labelText: 'What did you pay for?', prefixIcon: Icon(Icons.receipt_long_rounded))),
            const SizedBox(height: 10),
            TextField(controller: amount, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Amount', prefixText: '₹ ')),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: category,
              items: const ['Food','Stay','Transport','Shopping','Tickets','Other'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
              onChanged: (v) => setLocal(() => category = v ?? 'Other'),
              decoration: const InputDecoration(labelText: 'Category'),
            ),
            const SizedBox(height: 14),
            FilledButton(
              onPressed: () async {
                final value = double.tryParse(amount.text);
                if (title.text.trim().isEmpty || value == null) return;
                await service.addExpense(tripId: tripId, category: category, title: title.text.trim(), amount: value);
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Save expense'),
            ),
          ],
        ),
      ),
    ),
  );
}

class _ChecklistTab extends StatelessWidget {
  const _ChecklistTab({required this.service, required this.tripId});
  final TripService service;
  final String tripId;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: service.watchChecklist(tripId),
      builder: (context, snapshot) {
        final items = snapshot.data ?? [];
        final doneCount = items.where((x) => x['is_done'] == true).length;
        final progress = items.isEmpty ? 0.0 : doneCount / items.length;
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
          children: [
            _SectionHeader(
              title: 'Packing & tasks',
              subtitle: items.isEmpty ? 'Never leave an important thing behind.' : '$doneCount of ${items.length} completed',
              action: IconButton.filledTonal(onPressed: () => _addChecklistDialog(context, service, tripId), icon: const Icon(Icons.add_rounded)),
            ),
            const SizedBox(height: 14),
            if (items.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(30),
                child: LinearProgressIndicator(value: progress, minHeight: 9),
              ),
              const SizedBox(height: 14),
            ],
            if (items.isEmpty)
              _EmptyPanel(
                icon: Icons.checklist_rounded,
                title: 'Your checklist is empty',
                text: 'Add passport, charger, medicines, outfits, tickets or tasks before departure.',
                button: 'Add first item',
                onTap: () => _addChecklistDialog(context, service, tripId),
              )
            else
              ...items.map((x) {
                final done = x['is_done'] == true;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 9),
                  child: Card(
                    child: CheckboxListTile(
                      value: done,
                      onChanged: (v) => service.setChecklistState(x['id'] as String, v ?? false),
                      secondary: IconButton(
                        icon: const Icon(Icons.close_rounded, size: 19),
                        onPressed: () => service.deleteChecklistItem(x['id'] as String),
                      ),
                      title: Text('${x['title'] ?? ''}', style: TextStyle(fontWeight: FontWeight.w700, decoration: done ? TextDecoration.lineThrough : null)),
                    ),
                  ),
                );
              }),
          ],
        );
      },
    );
  }
}

Future<void> _addChecklistDialog(BuildContext context, TripService service, String tripId) async {
  final title = TextEditingController();
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => Padding(
      padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Add packing item', style: Theme.of(ctx).textTheme.headlineSmall),
          const SizedBox(height: 16),
          TextField(controller: title, autofocus: true, decoration: const InputDecoration(labelText: 'Item or task', prefixIcon: Icon(Icons.check_circle_outline_rounded))),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: () async {
              if (title.text.trim().isEmpty) return;
              await service.addChecklistItem(tripId, title.text.trim());
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Add to checklist'),
          ),
        ],
      ),
    ),
  );
}

class _MemoriesTab extends StatefulWidget {
  const _MemoriesTab({required this.service, required this.tripId});
  final TripService service;
  final String tripId;

  @override
  State<_MemoriesTab> createState() => _MemoriesTabState();
}

class _MemoriesTabState extends State<_MemoriesTab> {
  bool uploading = false;

  Future<void> _pickMemory() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 88, maxWidth: 1800);
    if (file == null || !mounted) return;
    final caption = TextEditingController();
    final save = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Save this memory', style: Theme.of(ctx).textTheme.headlineSmall),
            const SizedBox(height: 6),
            const Text('Add a caption so this moment still means something years later.'),
            const SizedBox(height: 16),
            TextField(controller: caption, decoration: const InputDecoration(labelText: 'Caption (optional)', prefixIcon: Icon(Icons.favorite_border_rounded))),
            const SizedBox(height: 14),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Add to trip memories')),
          ],
        ),
      ),
    );
    if (save != true || !mounted) return;
    setState(() => uploading = true);
    try {
      await widget.service.addMemory(tripId: widget.tripId, file: file, caption: caption.text);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not upload photo: $e')));
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: widget.service.watchMemories(widget.tripId),
      builder: (context, snapshot) {
        final items = snapshot.data ?? [];
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
          children: [
            _SectionHeader(
              title: 'Memorable moments',
              subtitle: 'A private visual diary for this trip.',
              action: uploading
                  ? const Padding(padding: EdgeInsets.all(10), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))
                  : IconButton.filledTonal(onPressed: _pickMemory, icon: const Icon(Icons.add_photo_alternate_rounded)),
            ),
            const SizedBox(height: 16),
            if (items.isEmpty)
              _EmptyPanel(
                icon: Icons.photo_library_outlined,
                title: 'Your trip story starts here',
                text: 'Add the photos that matter most — views, food, people, little surprises and unforgettable moments.',
                button: 'Add a photo',
                onTap: _pickMemory,
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: .82),
                itemCount: items.length,
                itemBuilder: (_, i) => _MemoryCard(memory: items[i], service: widget.service),
              ),
          ],
        );
      },
    );
  }
}

class _MemoryCard extends StatelessWidget {
  const _MemoryCard({required this.memory, required this.service});
  final Map<String, dynamic> memory;
  final TripService service;

  @override
  Widget build(BuildContext context) {
    final path = '${memory['storage_path'] ?? ''}';
    final caption = '${memory['caption'] ?? ''}'.trim();
    return GestureDetector(
      onLongPress: () => _confirmDelete(context, 'Delete this memory?', () => service.deleteMemory(memory)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          fit: StackFit.expand,
          children: [
            FutureBuilder<String>(
              future: service.memoryUrl(path),
              builder: (context, snap) {
                if (!snap.hasData) return Container(color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Center(child: CircularProgressIndicator(strokeWidth: 2)));
                return Image.network(snap.data!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.broken_image_outlined)));
              },
            ),
            const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(colors: [Colors.transparent, Color(0xCC000000)], begin: Alignment.topCenter, end: Alignment.bottomCenter, stops: [.52, 1]))),
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Text(caption.isEmpty ? 'Trip memory' : caption, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ),
    );
  }
}

class _TravelHubTab extends StatelessWidget {
  const _TravelHubTab({required this.service, required this.trip});
  final TripService service;
  final Trip trip;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
      children: [
        const _SectionHeader(title: 'Travel hub', subtitle: 'Bookings, important notes and useful tools in one place.'),
        const SizedBox(height: 16),
        _QuickTools(destination: trip.destination),
        const SizedBox(height: 22),
        Row(
          children: [
            Expanded(child: Text('Bookings & reservations', style: Theme.of(context).textTheme.titleMedium)),
            TextButton.icon(onPressed: () => _addBookingDialog(context, service, trip.id), icon: const Icon(Icons.add_rounded), label: const Text('Add')),
          ],
        ),
        StreamBuilder<List<Map<String, dynamic>>>(
          stream: service.watchBookings(trip.id),
          builder: (context, snap) {
            final items = snap.data ?? [];
            if (items.isEmpty) return const _MiniEmpty(text: 'Save hotel, train, flight or activity confirmation details here.');
            return Column(
              children: items.map((x) => Padding(
                    padding: const EdgeInsets.only(bottom: 9),
                    child: Card(
                      child: ListTile(
                        onLongPress: () => _confirmDelete(context, 'Delete this booking?', () => service.deleteBooking(x['id'] as String)),
                        leading: CircleAvatar(child: Icon(_bookingIcon('${x['category'] ?? ''}'))),
                        title: Text('${x['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                        subtitle: Text([
                          '${x['provider'] ?? ''}'.trim(),
                          '${x['confirmation_code'] ?? ''}'.trim().isEmpty ? '' : 'Ref ${x['confirmation_code']}',
                        ].where((e) => e.isNotEmpty).join(' • ')),
                      ),
                    ),
                  )).toList(),
            );
          },
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(child: Text('Important notes', style: Theme.of(context).textTheme.titleMedium)),
            TextButton.icon(onPressed: () => _addNoteDialog(context, service, trip.id), icon: const Icon(Icons.add_rounded), label: const Text('Add')),
          ],
        ),
        StreamBuilder<List<Map<String, dynamic>>>(
          stream: service.watchNotes(trip.id),
          builder: (context, snap) {
            final items = snap.data ?? [];
            if (items.isEmpty) return const _MiniEmpty(text: 'Keep hotel addresses, emergency info, local tips or anything you may need quickly.');
            return Column(
              children: items.map((x) => Padding(
                    padding: const EdgeInsets.only(bottom: 9),
                    child: Card(
                      child: ListTile(
                        onLongPress: () => _confirmDelete(context, 'Delete this note?', () => service.deleteNote(x['id'] as String)),
                        leading: CircleAvatar(child: Icon('${x['kind']}' == 'emergency' ? Icons.health_and_safety_rounded : Icons.sticky_note_2_rounded)),
                        title: Text('${x['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                        subtitle: '${x['body'] ?? ''}'.trim().isEmpty ? null : Text('${x['body']}', maxLines: 2, overflow: TextOverflow.ellipsis),
                      ),
                    ),
                  )).toList(),
            );
          },
        ),
      ],
    );
  }
}

class _QuickTools extends StatelessWidget {
  const _QuickTools({required this.destination});
  final String destination;

  Future<void> _open(Uri uri) => launchUrl(uri, mode: LaunchMode.externalApplication);

  @override
  Widget build(BuildContext context) {
    final tools = <({String label, IconData icon, VoidCallback action})>[
      (label: 'Maps', icon: Icons.map_rounded, action: () => _open(Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(destination)}'))),
      (label: 'Weather', icon: Icons.wb_sunny_rounded, action: () => _open(Uri.https('www.google.com', '/search', {'q': 'weather $destination'}))),
      (label: 'Translate', icon: Icons.translate_rounded, action: () => _open(Uri.parse('https://translate.google.com/'))),
      (label: 'Currency', icon: Icons.currency_exchange_rounded, action: () => _open(Uri.https('www.google.com', '/search', {'q': 'currency converter'}))),
      (label: 'Hospitals', icon: Icons.local_hospital_rounded, action: () => _open(Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent('hospital near $destination')}'))),
      (label: 'Emergency', icon: Icons.sos_rounded, action: () => _open(Uri.parse('tel:112'))),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: tools.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.03),
      itemBuilder: (_, i) {
        final t = tools[i];
        return Material(
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant)),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: t.action,
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(t.icon, color: Theme.of(context).colorScheme.primary, size: 25),
                  const SizedBox(height: 8),
                  Text(t.label, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

IconData _bookingIcon(String category) {
  switch (category.toLowerCase()) {
    case 'flight': return Icons.flight_rounded;
    case 'train': return Icons.train_rounded;
    case 'bus': return Icons.directions_bus_rounded;
    case 'hotel': return Icons.hotel_rounded;
    case 'activity': return Icons.local_activity_rounded;
    default: return Icons.bookmark_rounded;
  }
}

Future<void> _addBookingDialog(BuildContext context, TripService service, String tripId) async {
  final title = TextEditingController();
  final provider = TextEditingController();
  final code = TextEditingController();
  String category = 'Hotel';
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setLocal) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Save booking', style: Theme.of(ctx).textTheme.headlineSmall),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: category,
                decoration: const InputDecoration(labelText: 'Type'),
                items: const ['Hotel','Flight','Train','Bus','Activity','Other'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                onChanged: (v) => setLocal(() => category = v ?? 'Other'),
              ),
              const SizedBox(height: 10),
              TextField(controller: title, decoration: const InputDecoration(labelText: 'Booking title')),
              const SizedBox(height: 10),
              TextField(controller: provider, decoration: const InputDecoration(labelText: 'Provider / property')),
              const SizedBox(height: 10),
              TextField(controller: code, decoration: const InputDecoration(labelText: 'Confirmation / PNR')),
              const SizedBox(height: 14),
              FilledButton(
                onPressed: () async {
                  if (title.text.trim().isEmpty) return;
                  await service.addBooking(
                    tripId: tripId,
                    title: title.text.trim(),
                    category: category,
                    provider: provider.text.trim().isEmpty ? null : provider.text.trim(),
                    confirmationCode: code.text.trim().isEmpty ? null : code.text.trim(),
                  );
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Save booking'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

Future<void> _addNoteDialog(BuildContext context, TripService service, String tripId) async {
  final title = TextEditingController();
  final body = TextEditingController();
  bool emergency = false;
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setLocal) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Important note', style: Theme.of(ctx).textTheme.headlineSmall),
              const SizedBox(height: 16),
              TextField(controller: title, decoration: const InputDecoration(labelText: 'Title')),
              const SizedBox(height: 10),
              TextField(controller: body, minLines: 3, maxLines: 5, decoration: const InputDecoration(labelText: 'Details')),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: emergency,
                onChanged: (v) => setLocal(() => emergency = v),
                title: const Text('Mark as emergency info'),
                subtitle: const Text('Useful for medical, insurance or emergency contact details.'),
              ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: () async {
                  if (title.text.trim().isEmpty) return;
                  await service.addNote(tripId: tripId, title: title.text.trim(), body: body.text.trim(), kind: emergency ? 'emergency' : 'note');
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Save note'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _MiniEmpty extends StatelessWidget {
  const _MiniEmpty({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: .45), borderRadius: BorderRadius.circular(18)),
        child: Text(text, style: Theme.of(context).textTheme.bodyMedium),
      );
}

class _EmptyPanel extends StatelessWidget {
  const _EmptyPanel({required this.icon, required this.title, required this.text, required this.button, required this.onTap});
  final IconData icon;
  final String title;
  final String text;
  final String button;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        ),
        child: Column(
          children: [
            CircleAvatar(radius: 30, backgroundColor: Theme.of(context).colorScheme.primaryContainer, child: Icon(icon, color: Theme.of(context).colorScheme.primary, size: 30)),
            const SizedBox(height: 14),
            Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
            const SizedBox(height: 7),
            Text(text, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 16),
            FilledButton.tonal(onPressed: onTap, child: Text(button)),
          ],
        ),
      );
}

Future<void> _confirmDelete(BuildContext context, String title, Future<void> Function() action) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: const Text('This cannot be undone.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
      ],
    ),
  );
  if (ok == true) await action();
}
