import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/design.dart';
import '../services/trip_service.dart';

class CreateTripScreen extends StatefulWidget {
  const CreateTripScreen({super.key});

  @override
  State<CreateTripScreen> createState() => _CreateTripScreenState();
}

class _CreateTripScreenState extends State<CreateTripScreen> {
  final title = TextEditingController();
  final destination = TextEditingController();
  final budget = TextEditingController();
  final notes = TextEditingController();
  DateTime? start;
  DateTime? end;
  bool saving = false;

  Future<void> pickDate(bool isStart) async {
    final selected = await showDatePicker(context: context, firstDate: DateTime.now().subtract(const Duration(days: 1)), lastDate: DateTime.now().add(const Duration(days: 3650)), initialDate: isStart ? (start ?? DateTime.now()) : (end ?? start ?? DateTime.now()));
    if (selected != null) {
      setState(() {
        if (isStart) {
          start = selected;
          if (end != null && end!.isBefore(selected)) end = selected;
        } else {
          end = selected;
        }
      });
    }
  }

  Future<void> save() async {
    FocusScope.of(context).unfocus();
    if (title.text.trim().isEmpty || destination.text.trim().isEmpty || start == null || end == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add a trip name, destination and travel dates.')));
      return;
    }
    setState(() => saving = true);
    try {
      final service = TripService(Supabase.instance.client);
      final trip = await service.createTrip(title: title.text.trim(), destination: destination.text.trim(), startDate: start!, endDate: end!, budget: double.tryParse(budget.text) ?? 0, notes: notes.text.trim().isEmpty ? null : notes.text.trim());
      if (mounted) Navigator.pop(context, trip);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not create trip: $e')));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  void dispose() {
    title.dispose(); destination.dispose(); budget.dispose(); notes.dispose(); super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tripDays = start != null && end != null ? end!.difference(start!).inDays + 1 : null;
    return Scaffold(
      body: TripMateWaveBackground(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 36),
            children: [
              Row(children: [IconButton.filledTonal(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.arrow_back_rounded)), const Spacer(), const TripMateIconBubble(Icons.add_location_alt_rounded, dark: true)]),
              const SizedBox(height: 20),
              const TripMatePageHeader(eyebrow: 'NEW JOURNEY', title: 'Turn an idea into a trip.', subtitle: 'Start simple. TripMate will create the space for plans, bookings, money, crew, documents and memories.'),
              const SizedBox(height: 18),
              TripMateSurface(
                gradient: TripMateGradient.hero,
                child: const Row(children: [TripMateIconBubble(Icons.explore_rounded, size: 54), SizedBox(width: 14), Expanded(child: Text('Your destination becomes a complete travel workspace — not just a note.', style: TextStyle(color: Colors.white, fontSize: 16, height: 1.4, fontWeight: FontWeight.w800)))]),
              ),
              const SizedBox(height: 20),
              TripMateSurface(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Trip essentials', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 14),
                  TextField(controller: title, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Trip name', hintText: 'Weekend escape', prefixIcon: Icon(Icons.auto_awesome_rounded))),
                  const SizedBox(height: 11),
                  TextField(controller: destination, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Destination', hintText: 'Ooty, Goa, Bali...', prefixIcon: Icon(Icons.place_rounded))),
                  const SizedBox(height: 18),
                  Text('Travel dates', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 10),
                  Row(children: [Expanded(child: _DateCard(label: 'Start', value: start, icon: Icons.flight_takeoff_rounded, onTap: () => pickDate(true))), const SizedBox(width: 10), Expanded(child: _DateCard(label: 'End', value: end, icon: Icons.flight_land_rounded, onTap: () => pickDate(false)))]),
                  if (tripDays != null) ...[const SizedBox(height: 10), Text('$tripDays-day journey', style: const TextStyle(color: TripMateColors.blue600, fontWeight: FontWeight.w900))],
                  const SizedBox(height: 20),
                  TextField(controller: budget, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Estimated budget', prefixText: '₹ ', prefixIcon: Icon(Icons.account_balance_wallet_rounded))),
                  const SizedBox(height: 11),
                  TextField(controller: notes, minLines: 3, maxLines: 5, decoration: const InputDecoration(labelText: 'Trip note (optional)', hintText: 'Why are you taking this trip? Any important plan?', prefixIcon: Icon(Icons.notes_rounded))),
                ]),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(onPressed: saving ? null : save, icon: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.arrow_forward_rounded), label: Text(saving ? 'Creating trip...' : 'Create trip space')),
            ],
          ),
        ),
      ),
    );
  }
}

class _DateCard extends StatelessWidget {
  const _DateCard({required this.label, required this.value, required this.icon, required this.onTap});
  final String label;
  final DateTime? value;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => TripMateSurface(
        onTap: onTap,
        padding: const EdgeInsets.all(14),
        color: const Color(0xFFF8FBFF),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [TripMateIconBubble(icon, size: 40), const SizedBox(height: 10), Text(label, style: Theme.of(context).textTheme.bodySmall), const SizedBox(height: 3), Text(value == null ? 'Choose date' : DateFormat.MMMd().format(value!), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15))]),
      );
}
