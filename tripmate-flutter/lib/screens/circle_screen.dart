import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/design.dart';
import '../services/social_service.dart';
import 'messages_screen.dart';

class CircleScreen extends StatefulWidget {
  const CircleScreen({super.key});

  @override
  State<CircleScreen> createState() => _CircleScreenState();
}

class _CircleScreenState extends State<CircleScreen> {
  late final SocialService social;
  final search = TextEditingController();
  List<Map<String, dynamic>> results = [];
  bool searching = false;
  int refreshKey = 0;

  @override
  void initState() {
    super.initState();
    social = SocialService(Supabase.instance.client);
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> _runSearch(String value) async {
    if (value.trim().length < 2) {
      setState(() => results = []);
      return;
    }
    setState(() => searching = true);
    try {
      final rows = await social.searchProfiles(value);
      if (mounted) setState(() => results = rows);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Social features are not available right now.')));
    } finally {
      if (mounted) setState(() => searching = false);
    }
  }

  Future<void> _refresh() async {
    setState(() => refreshKey++);
    await _runSearch(search.text);
  }

  Future<void> _message(Map<String, dynamic> profile) async {
    try {
      final conversationId = await social.openDirectConversation(profile['id'] as String);
      if (!mounted) return;
      Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(conversationId: conversationId, title: '${profile['full_name'] ?? profile['username'] ?? 'Traveler'}')));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open conversation.')));
    }
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
                const TripMatePageHeader(
                  eyebrow: 'YOUR CIRCLE',
                  title: 'Travel feels better together.',
                  subtitle: 'Find people by @username, build your trip crew and jump into direct messages.',
                  trailing: TripMateIconBubble(Icons.people_alt_rounded, dark: true),
                ),
                const SizedBox(height: 18),
                TripMateSurface(
                  padding: const EdgeInsets.all(12),
                  child: TextField(
                    controller: search,
                    onChanged: _runSearch,
                    decoration: InputDecoration(
                      hintText: 'Search @username or name',
                      prefixIcon: const Icon(Icons.search_rounded),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      fillColor: Colors.transparent,
                      suffixIcon: searching
                          ? const Padding(padding: EdgeInsets.all(14), child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)))
                          : search.text.isNotEmpty
                              ? IconButton(onPressed: () { search.clear(); setState(() => results = []); }, icon: const Icon(Icons.close_rounded))
                              : null,
                    ),
                  ),
                ),
                if (results.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  Text('People nearby in your network', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 10),
                  ...results.map((p) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _personCard(p),
                      )),
                ],
                const SizedBox(height: 26),
                Row(children: [
                  Expanded(child: Text('Friend requests & crew', style: Theme.of(context).textTheme.titleLarge)),
                  IconButton.filledTonal(onPressed: _refresh, icon: const Icon(Icons.refresh_rounded)),
                ]),
                const SizedBox(height: 10),
                StreamBuilder<List<Map<String, dynamic>>>(
                  key: ValueKey(refreshKey),
                  stream: social.watchFriendships(),
                  builder: (context, snapshot) {
                    final rows = snapshot.data ?? [];
                    if (snapshot.hasError || rows.isEmpty) {
                      return TripMateSurface(
                        color: TripMateColors.ice,
                        child: const Row(children: [
                          TripMateIconBubble(Icons.group_add_rounded, size: 52, dark: true),
                          SizedBox(width: 13),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('Build your travel circle', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
                            SizedBox(height: 4),
                            Text('Search a friend, send a request, then tag accepted friends into your trips.', style: TextStyle(color: TripMateColors.muted, height: 1.4)),
                          ])),
                        ]),
                      );
                    }
                    return Column(children: rows.map((row) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _friendshipTile(row))).toList());
                  },
                ),
                const SizedBox(height: 18),
                TripMateSurface(
                  gradient: TripMateGradient.hero,
                  child: const Row(children: [
                    TripMateIconBubble(Icons.groups_3_rounded, size: 56),
                    SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Trip Crew', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                      SizedBox(height: 4),
                      Text('Tag your people into a journey so plans, memories and chats become one shared trip space.', style: TextStyle(color: Colors.white70, height: 1.4, fontWeight: FontWeight.w600)),
                    ])),
                  ]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _personCard(Map<String, dynamic> profile) {
    final name = '${profile['full_name'] ?? 'Traveler'}';
    final username = '${profile['username'] ?? ''}';
    return TripMateSurface(
      child: Row(children: [
        CircleAvatar(radius: 25, backgroundColor: TripMateColors.ice, child: Text(name.isEmpty ? '?' : name.characters.first.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900, color: TripMateColors.navy950))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)), Text('@$username', style: Theme.of(context).textTheme.bodySmall)])),
        IconButton.filledTonal(onPressed: () => _message(profile), icon: const Icon(Icons.chat_bubble_outline_rounded)),
        const SizedBox(width: 4),
        IconButton.filled(onPressed: () async {
          await social.sendFriendRequest(profile['id'] as String);
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Friend request sent to @$username')));
        }, icon: const Icon(Icons.person_add_alt_1_rounded)),
      ]),
    );
  }

  Widget _friendshipTile(Map<String, dynamic> row) {
    final mine = social.userId;
    final incoming = row['addressee_id'] == mine;
    final otherId = incoming ? row['requester_id'] as String : row['addressee_id'] as String;
    final status = '${row['status'] ?? 'pending'}';
    return FutureBuilder<Map<String, dynamic>?>(
      future: social.profileById(otherId),
      builder: (context, snapshot) {
        final p = snapshot.data;
        final label = p == null ? 'Traveler' : '${p['full_name'] ?? p['username'] ?? 'Traveler'}';
        final username = p == null ? '' : '@${p['username'] ?? ''}';
        return TripMateSurface(
          child: Row(children: [
            const TripMateIconBubble(Icons.person_rounded, size: 46),
            const SizedBox(width: 11),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: const TextStyle(fontWeight: FontWeight.w900)), Text(username, style: Theme.of(context).textTheme.bodySmall)])),
            if (status == 'pending' && incoming)
              FilledButton.tonal(onPressed: () => social.acceptFriendRequest(row['id'] as String), child: const Text('Accept'))
            else
              Text(status == 'accepted' ? 'Friends' : 'Requested', style: const TextStyle(color: TripMateColors.blue600, fontWeight: FontWeight.w900)),
          ]),
        );
      },
    );
  }
}
