import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/design.dart';
import '../services/social_service.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  late final SocialService social;
  Future<List<Map<String, dynamic>>>? conversations;

  @override
  void initState() {
    super.initState();
    social = SocialService(Supabase.instance.client);
    conversations = social.myConversations();
  }

  Future<void> _refresh() async {
    setState(() => conversations = social.myConversations());
    await conversations;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: TripMateWaveBackground(
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _refresh,
            color: TripMateColors.navy800,
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: conversations,
              builder: (context, snapshot) => ListView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 120),
                children: [
                  TripMatePageHeader(
                    eyebrow: 'INBOX',
                    title: 'Crew chat, without leaving the trip.',
                    subtitle: 'Plans, random ideas and travel chaos live together here.',
                    trailing: IconButton.filledTonal(onPressed: _refresh, icon: const Icon(Icons.refresh_rounded)),
                  ),
                  const SizedBox(height: 20),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
                  else if (snapshot.hasError || (snapshot.data ?? []).isEmpty)
                    TripMateSurface(
                      color: TripMateColors.ice,
                      child: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 22),
                        child: Column(children: [
                          TripMateIconBubble(Icons.forum_rounded, size: 62, dark: true),
                          SizedBox(height: 14),
                          Text('No messages yet', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
                          SizedBox(height: 6),
                          Text('Find someone in Circle and start your first TripMate DM.', textAlign: TextAlign.center, style: TextStyle(color: TripMateColors.muted, height: 1.4)),
                        ]),
                      ),
                    )
                  else
                    ...snapshot.data!.map((item) {
                      final profile = (item['profile'] as Map<String, dynamic>?) ?? {};
                      final last = item['last_message'] as Map<String, dynamic>?;
                      final name = '${profile['full_name'] ?? profile['username'] ?? 'Traveler'}';
                      final username = '${profile['username'] ?? ''}';
                      final body = '${last?['body'] ?? 'Start a conversation'}';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: TripMateSurface(
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(conversationId: item['conversation_id'] as String, title: name))).then((_) => _refresh()),
                          padding: const EdgeInsets.all(14),
                          child: Row(children: [
                            CircleAvatar(radius: 26, backgroundColor: TripMateColors.ice, child: Text(name.isEmpty ? '?' : name.characters.first.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900, color: TripMateColors.navy950))),
                            const SizedBox(width: 12),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(children: [Expanded(child: Text(name, style: const TextStyle(fontWeight: FontWeight.w900))), Text('@$username', style: Theme.of(context).textTheme.bodySmall)]),
                              const SizedBox(height: 4),
                              Text(body, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodyMedium),
                            ])),
                            const Icon(Icons.chevron_right_rounded),
                          ]),
                        ),
                      );
                    }),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.conversationId, required this.title});
  final String conversationId;
  final String title;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late final SocialService social;
  final message = TextEditingController();
  bool sending = false;

  @override
  void initState() {
    super.initState();
    social = SocialService(Supabase.instance.client);
  }

  @override
  void dispose() {
    message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (message.text.trim().isEmpty || sending) return;
    final body = message.text;
    message.clear();
    setState(() => sending = true);
    try {
      await social.sendMessage(widget.conversationId, body);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not send message.')));
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: TripMateWaveBackground(
        child: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
              child: Row(children: [
                IconButton.filledTonal(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.arrow_back_rounded)),
                const SizedBox(width: 10),
                const TripMateIconBubble(Icons.person_rounded, size: 42),
                const SizedBox(width: 10),
                Expanded(child: Text(widget.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900))),
              ]),
            ),
            Expanded(
              child: StreamBuilder<List<Map<String, dynamic>>>(
                stream: social.watchMessages(widget.conversationId),
                builder: (context, snapshot) {
                  final items = snapshot.data ?? [];
                  if (snapshot.hasError) return const Center(child: Text('Chat is unavailable right now.'));
                  if (items.isEmpty) return const Center(child: Text('Say hi 👋'));
                  return ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 18),
                    itemCount: items.length,
                    itemBuilder: (_, index) {
                      final x = items[items.length - 1 - index];
                      final mine = x['sender_id'] == social.userId;
                      return Align(
                        alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .76),
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                          decoration: BoxDecoration(
                            gradient: mine ? TripMateGradient.hero : null,
                            color: mine ? null : Colors.white,
                            borderRadius: BorderRadius.only(topLeft: const Radius.circular(18), topRight: const Radius.circular(18), bottomLeft: Radius.circular(mine ? 18 : 5), bottomRight: Radius.circular(mine ? 5 : 18)),
                            boxShadow: const [BoxShadow(color: Color(0x0F052659), blurRadius: 12, offset: Offset(0, 6))],
                          ),
                          child: Text('${x['body']}', style: TextStyle(color: mine ? Colors.white : TripMateColors.text, height: 1.35, fontWeight: FontWeight.w600)),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                child: TripMateSurface(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  child: Row(children: [
                    Expanded(child: TextField(controller: message, textInputAction: TextInputAction.send, onSubmitted: (_) => _send(), decoration: const InputDecoration(hintText: 'Message...', border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, fillColor: Colors.transparent))),
                    IconButton.filled(onPressed: sending ? null : _send, icon: sending ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.arrow_upward_rounded)),
                  ]),
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
