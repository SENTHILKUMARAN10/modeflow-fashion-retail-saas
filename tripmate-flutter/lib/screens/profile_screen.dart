import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/design.dart';
import '../services/social_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final SocialService social;
  Future<Map<String, dynamic>?>? profile;

  @override
  void initState() {
    super.initState();
    social = SocialService(Supabase.instance.client);
    profile = social.myProfile();
  }

  Future<void> _refresh() async {
    setState(() => profile = social.myProfile());
    await profile;
  }

  @override
  Widget build(BuildContext context) {
    final authUser = Supabase.instance.client.auth.currentUser;
    return Scaffold(
      body: TripMateWaveBackground(
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _refresh,
            color: TripMateColors.navy800,
            child: FutureBuilder<Map<String, dynamic>?>(
              future: profile,
              builder: (context, snapshot) {
                final p = snapshot.data;
                final fullName = '${p?['full_name'] ?? authUser?.userMetadata?['full_name'] ?? 'Traveler'}';
                final username = '${p?['username'] ?? 'traveler'}';
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 120),
                  children: [
                    TripMatePageHeader(
                      eyebrow: 'PROFILE',
                      title: 'Your travel identity.',
                      subtitle: 'One profile for your trips, crew, messages, memories and privacy settings.',
                      trailing: IconButton.filledTonal(onPressed: _refresh, icon: const Icon(Icons.refresh_rounded)),
                    ),
                    const SizedBox(height: 18),
                    TripMateSurface(
                      gradient: TripMateGradient.hero,
                      padding: const EdgeInsets.all(20),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          CircleAvatar(radius: 35, backgroundColor: Colors.white12, child: Text(fullName.isEmpty ? '?' : fullName.characters.first.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 25, fontWeight: FontWeight.w900))),
                          const SizedBox(width: 14),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(fullName, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
                            const SizedBox(height: 3),
                            Text('@$username', style: const TextStyle(color: TripMateColors.ice, fontWeight: FontWeight.w800)),
                          ])),
                          IconButton.filledTonal(onPressed: () => _editProfile(p), icon: const Icon(Icons.edit_rounded)),
                        ]),
                        if ('${p?['bio'] ?? ''}'.trim().isNotEmpty) ...[
                          const SizedBox(height: 16),
                          Text('${p?['bio']}', style: const TextStyle(color: Colors.white70, height: 1.4, fontWeight: FontWeight.w600)),
                        ],
                        const SizedBox(height: 14),
                        Wrap(spacing: 8, runSpacing: 8, children: [
                          if ('${p?['home_city'] ?? ''}'.trim().isNotEmpty) _Chip(icon: Icons.location_city_rounded, text: '${p?['home_city']}'),
                          if ('${p?['travel_style'] ?? ''}'.trim().isNotEmpty) _Chip(icon: Icons.explore_rounded, text: '${p?['travel_style']}'),
                        ]),
                      ]),
                    ),
                    const SizedBox(height: 26),
                    Text('Account & settings', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 10),
                    _tile(Icons.person_outline_rounded, 'Personal details', authUser?.email ?? 'Account details', () => _editProfile(p)),
                    _tile(Icons.alternate_email_rounded, 'Username', '@$username', () => _editProfile(p)),
                    _tile(Icons.notifications_none_rounded, 'Notifications', 'Trip reminders, crew messages, vibe drops', () => _openInfo('Notifications', 'Notification controls will cover itinerary reminders, ticket alerts, crew messages and trip countdowns.')),
                    _tile(Icons.lock_outline_rounded, 'Privacy & safety', 'Visibility, tags and location sharing', () => _openInfo('Privacy & safety', 'Location features stay opt-in. Travel Vault stays private. You control who can find, tag or message you.')),
                    _tile(Icons.palette_outlined, 'Appearance', 'TripMate blue design system', () => _openInfo('Appearance', 'TripMate now uses one consistent visual system across the app, built around the new blue palette.')),
                    const SizedBox(height: 22),
                    Text('About TripMate', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 10),
                    _tile(Icons.info_outline_rounded, 'Product', 'Your all-in-one travel companion', () => _openInfo('About TripMate', 'TripMate combines planning, crew collaboration, documents, bookings, budgets, memories, safety tools and social travel features in one app.')),
                    _tile(Icons.shield_outlined, 'Data & security', 'Supabase Auth, RLS and private storage', () => _openInfo('Data & security', 'TripMate uses authenticated access and database policies so private trip data is scoped to the right users.')),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(onPressed: () => Supabase.instance.client.auth.signOut(), icon: const Icon(Icons.logout_rounded), label: const Text('Sign out')),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _tile(IconData icon, String title, String subtitle, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(bottom: 9),
        child: TripMateSurface(
          onTap: onTap,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          child: Row(children: [
            TripMateIconBubble(icon, size: 44),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w900)), const SizedBox(height: 2), Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall)])),
            const Icon(Icons.chevron_right_rounded),
          ]),
        ),
      );

  Future<void> _editProfile(Map<String, dynamic>? current) async {
    final authUser = Supabase.instance.client.auth.currentUser;
    final username = TextEditingController(text: '${current?['username'] ?? ''}');
    final fullName = TextEditingController(text: '${current?['full_name'] ?? authUser?.userMetadata?['full_name'] ?? ''}');
    final bio = TextEditingController(text: '${current?['bio'] ?? ''}');
    final city = TextEditingController(text: '${current?['home_city'] ?? ''}');
    final style = TextEditingController(text: '${current?['travel_style'] ?? ''}');

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(ctx).bottom + 24),
        child: SingleChildScrollView(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
            Text('Edit profile', style: Theme.of(ctx).textTheme.headlineSmall),
            const SizedBox(height: 16),
            TextField(controller: fullName, decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.badge_outlined))),
            const SizedBox(height: 10),
            TextField(controller: username, decoration: const InputDecoration(labelText: 'Username', prefixText: '@ ')),
            const SizedBox(height: 10),
            TextField(controller: bio, maxLines: 2, decoration: const InputDecoration(labelText: 'Bio', prefixIcon: Icon(Icons.notes_rounded))),
            const SizedBox(height: 10),
            TextField(controller: city, decoration: const InputDecoration(labelText: 'Home city', prefixIcon: Icon(Icons.location_city_outlined))),
            const SizedBox(height: 10),
            TextField(controller: style, decoration: const InputDecoration(labelText: 'Travel style', hintText: 'Backpacker, road trips, luxury, foodie...')),
            const SizedBox(height: 14),
            FilledButton(
              onPressed: () async {
                if (username.text.trim().length < 3 || fullName.text.trim().isEmpty) return;
                try {
                  await social.updateProfile(username: username.text, fullName: fullName.text, bio: bio.text, homeCity: city.text, travelStyle: style.text);
                  if (ctx.mounted) Navigator.pop(ctx);
                  await _refresh();
                } catch (_) {
                  if (ctx.mounted) ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Username may already be taken.')));
                }
              },
              child: const Text('Save profile'),
            ),
          ]),
        ),
      ),
    );
  }

  Future<void> _openInfo(String title, String text) => showModalBottomSheet(
        context: context,
        builder: (ctx) => Padding(
          padding: const EdgeInsets.fromLTRB(22, 8, 22, 28),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: Theme.of(ctx).textTheme.headlineSmall), const SizedBox(height: 10), Text(text, style: Theme.of(ctx).textTheme.bodyLarge)]),
        ),
      );
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(20)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, color: TripMateColors.ice, size: 15), const SizedBox(width: 5), Text(text, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700))]),
      );
}
