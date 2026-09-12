import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/trip.dart';
import '../services/trip_service.dart';

class DocumentVaultScreen extends StatefulWidget {
  const DocumentVaultScreen({super.key, required this.trip});
  final Trip trip;

  @override
  State<DocumentVaultScreen> createState() => _DocumentVaultScreenState();
}

class _DocumentVaultScreenState extends State<DocumentVaultScreen> {
  late final TripService service;
  bool uploading = false;

  @override
  void initState() {
    super.initState();
    service = TripService(Supabase.instance.client);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Travel vault')),
      body: StreamBuilder<List<Map<String, dynamic>>>(
        stream: service.watchDocuments(widget.trip.id),
        builder: (context, snapshot) {
          final docs = snapshot.data ?? [];
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
            children: [
              _VaultHero(destination: widget.trip.destination, count: docs.length),
              const SizedBox(height: 18),
              Text('Keep essentials ready', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 5),
              Text('Store IDs, tickets and booking proofs privately so you can reach them quickly while travelling.', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 16),
              const _CategoryStrip(),
              const SizedBox(height: 22),
              Row(children: [
                Expanded(child: Text('Your documents', style: Theme.of(context).textTheme.titleLarge)),
                FilledButton.tonalIcon(
                  onPressed: uploading ? null : _pickAndUpload,
                  icon: uploading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.add_rounded),
                  label: const Text('Add'),
                ),
              ]),
              const SizedBox(height: 12),
              if (snapshot.hasError)
                _InfoCard(icon: Icons.info_outline_rounded, title: 'Vault setup needed', text: 'The secure document table is not active yet. Run the latest TripMate Supabase migration once, then reopen this screen.')
              else if (!snapshot.hasData)
                const Padding(padding: EdgeInsets.all(30), child: Center(child: CircularProgressIndicator()))
              else if (docs.isEmpty)
                _InfoCard(icon: Icons.lock_outline_rounded, title: 'Your vault is empty', text: 'Add Aadhaar, PAN, bus/train/flight tickets, hotel confirmation, insurance, visa or any emergency document.')
              else
                ...docs.map((doc) => _DocumentCard(
                      doc: doc,
                      onOpen: () => _openDocument(doc),
                      onDelete: () => _deleteDocument(doc),
                    )),
              const SizedBox(height: 18),
              const _SafetyNote(),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: uploading ? null : _pickAndUpload,
        icon: const Icon(Icons.upload_file_rounded),
        label: const Text('Add document'),
      ),
    );
  }

  Future<void> _pickAndUpload() async {
    const typeGroup = XTypeGroup(
      label: 'travel documents',
      extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
    );
    final file = await openFile(acceptedTypeGroups: const [typeGroup]);
    if (file == null) return;

    final bytes = await file.readAsBytes();
    if (bytes.isEmpty) return;

    final fileName = file.name;
    final extension = fileName.contains('.') ? fileName.split('.').last : null;

    if (!mounted) return;
    final details = await showModalBottomSheet<_DocDetails>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _DocumentDetailsSheet(defaultTitle: fileName),
    );
    if (details == null) return;

    setState(() => uploading = true);
    try {
      await service.uploadDocument(
        tripId: widget.trip.id,
        title: details.title,
        category: details.category,
        fileName: fileName,
        bytes: bytes,
        mimeType: _mimeFor(extension),
      );
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Document saved securely.')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not upload document: $e')));
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  String? _mimeFor(String? ext) {
    switch (ext?.toLowerCase()) {
      case 'pdf': return 'application/pdf';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'webp': return 'image/webp';
      default: return null;
    }
  }

  Future<void> _openDocument(Map<String, dynamic> doc) async {
    final path = doc['storage_path'] as String?;
    if (path == null) return;
    final url = await service.documentUrl(path);
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  Future<void> _deleteDocument(Map<String, dynamic> doc) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete document?'),
        content: const Text('This removes the file from your private TripMate vault.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok == true) await service.deleteDocument(doc);
  }
}

class _VaultHero extends StatelessWidget {
  const _VaultHero({required this.destination, required this.count});
  final String destination;
  final int count;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          gradient: const LinearGradient(colors: [Color(0xFF1E3733), Color(0xFF315C55), Color(0xFFB7754C)]),
          boxShadow: const [BoxShadow(color: Color(0x241B453E), blurRadius: 28, offset: Offset(0, 14))],
        ),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('PRIVATE TRAVEL VAULT', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w900, letterSpacing: 1.2, fontSize: 10)),
            const SizedBox(height: 10),
            Text(destination, style: const TextStyle(color: Colors.white, fontSize: 29, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text('$count saved ${count == 1 ? 'document' : 'documents'}', style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
          ])),
          Container(width: 64, height: 64, decoration: BoxDecoration(color: Colors.white.withValues(alpha: .12), borderRadius: BorderRadius.circular(22)), child: const Icon(Icons.folder_special_rounded, color: Color(0xFFFFD9BF), size: 33)),
        ]),
      );
}

class _CategoryStrip extends StatelessWidget {
  const _CategoryStrip();
  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.badge_outlined, 'ID'),
      (Icons.confirmation_number_outlined, 'Tickets'),
      (Icons.hotel_outlined, 'Stay'),
      (Icons.health_and_safety_outlined, 'Insurance'),
      (Icons.flight_takeoff_rounded, 'Visa'),
    ];
    return SizedBox(
      height: 88,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (_, i) => Container(
          width: 92,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Theme.of(context).colorScheme.outlineVariant)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(items[i].$1, color: Theme.of(context).colorScheme.primary), const Spacer(), Text(items[i].$2, style: const TextStyle(fontWeight: FontWeight.w800))]),
        ),
      ),
    );
  }
}

class _DocumentCard extends StatelessWidget {
  const _DocumentCard({required this.doc, required this.onOpen, required this.onDelete});
  final Map<String, dynamic> doc;
  final VoidCallback onOpen;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final category = '${doc['category'] ?? 'Other'}';
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Container(width: 48, height: 48, decoration: BoxDecoration(color: Theme.of(context).colorScheme.primaryContainer, borderRadius: BorderRadius.circular(16)), child: Icon(_iconFor(category), color: Theme.of(context).colorScheme.primary)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${doc['title'] ?? doc['file_name']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 3),
              Text('$category • ${doc['file_name'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
            ])),
            IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline_rounded)),
          ]),
        ),
      ),
    );
  }

  static IconData _iconFor(String category) {
    final c = category.toLowerCase();
    if (c.contains('ticket')) return Icons.confirmation_number_outlined;
    if (c.contains('aadhaar') || c.contains('pan') || c.contains('id')) return Icons.badge_outlined;
    if (c.contains('hotel')) return Icons.hotel_outlined;
    if (c.contains('visa')) return Icons.flight_takeoff_rounded;
    if (c.contains('insurance')) return Icons.health_and_safety_outlined;
    return Icons.description_outlined;
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.icon, required this.title, required this.text});
  final IconData icon;
  final String title;
  final String text;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: Theme.of(context).colorScheme.outlineVariant)),
        child: Column(children: [Icon(icon, size: 38, color: Theme.of(context).colorScheme.primary), const SizedBox(height: 12), Text(title, style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: 5), Text(text, textAlign: TextAlign.center)]),
      );
}

class _SafetyNote extends StatelessWidget {
  const _SafetyNote();
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: const Color(0xFFFFF1E7), borderRadius: BorderRadius.circular(20)),
        child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.shield_outlined, color: Color(0xFF9C5B37)),
          SizedBox(width: 10),
          Expanded(child: Text('Security tip: use this vault as an emergency copy. Keep original IDs and tickets protected separately, and avoid storing sensitive documents on shared devices.')),
        ]),
      );
}

class _DocDetails {
  const _DocDetails(this.title, this.category);
  final String title;
  final String category;
}

class _DocumentDetailsSheet extends StatefulWidget {
  const _DocumentDetailsSheet({required this.defaultTitle});
  final String defaultTitle;
  @override
  State<_DocumentDetailsSheet> createState() => _DocumentDetailsSheetState();
}

class _DocumentDetailsSheetState extends State<_DocumentDetailsSheet> {
  late final TextEditingController title;
  String category = 'Ticket';
  final categories = const ['Aadhaar / ID', 'PAN', 'Ticket', 'Return ticket', 'Hotel booking', 'Visa', 'Insurance', 'Medical', 'Other'];

  @override
  void initState() {
    super.initState();
    title = TextEditingController(text: widget.defaultTitle.split('.').first);
  }

  @override
  void dispose() {
    title.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(20, 10, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Save to travel vault', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 18),
          TextField(controller: title, decoration: const InputDecoration(labelText: 'Document name', prefixIcon: Icon(Icons.edit_note_rounded))),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(initialValue: category, items: categories.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: (v) => setState(() => category = v ?? 'Other'), decoration: const InputDecoration(labelText: 'Category', prefixIcon: Icon(Icons.category_outlined))),
          const SizedBox(height: 18),
          FilledButton(onPressed: () { if (title.text.trim().isNotEmpty) Navigator.pop(context, _DocDetails(title.text.trim(), category)); }, child: const Text('Save securely')),
        ]),
      );
}
