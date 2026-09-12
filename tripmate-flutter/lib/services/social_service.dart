import 'package:supabase_flutter/supabase_flutter.dart';

class SocialService {
  SocialService(this.client);
  final SupabaseClient client;

  String get userId => client.auth.currentUser!.id;

  Future<Map<String, dynamic>?> myProfile() async {
    return client.from('profiles').select().eq('id', userId).maybeSingle();
  }

  Future<void> updateProfile({
    required String username,
    required String fullName,
    String? bio,
    String? homeCity,
    String? travelStyle,
  }) async {
    await client.from('profiles').upsert({
      'id': userId,
      'username': username.trim().toLowerCase(),
      'full_name': fullName.trim(),
      'bio': bio?.trim(),
      'home_city': homeCity?.trim(),
      'travel_style': travelStyle?.trim(),
      'updated_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> searchProfiles(String query) async {
    final q = query.trim().replaceAll('@', '');
    if (q.length < 2) return [];
    final rows = await client
        .from('profiles')
        .select('id, username, full_name, bio, home_city, travel_style, avatar_url')
        .or('username.ilike.%$q%,full_name.ilike.%$q%')
        .neq('id', userId)
        .limit(20);
    return List<Map<String, dynamic>>.from(rows);
  }

  Future<void> sendFriendRequest(String addresseeId) async {
    await client.from('friendships').upsert({
      'requester_id': userId,
      'addressee_id': addresseeId,
      'status': 'pending',
      'updated_at': DateTime.now().toIso8601String(),
    }, onConflict: 'requester_id,addressee_id');
  }

  Stream<List<Map<String, dynamic>>> watchFriendships() {
    return client
        .from('friendships')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .map((rows) => rows
            .where((row) => row['requester_id'] == userId || row['addressee_id'] == userId)
            .toList());
  }

  Future<void> acceptFriendRequest(String friendshipId) async {
    await client.from('friendships').update({
      'status': 'accepted',
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', friendshipId).eq('addressee_id', userId);
  }

  Future<Map<String, dynamic>?> profileById(String id) async {
    return client
        .from('profiles')
        .select('id, username, full_name, bio, home_city, travel_style, avatar_url')
        .eq('id', id)
        .maybeSingle();
  }

  Future<void> addTripMember({required String tripId, required String memberId}) async {
    await client.from('trip_members').upsert({
      'trip_id': tripId,
      'user_id': memberId,
      'added_by': userId,
      'role': 'traveler',
    }, onConflict: 'trip_id,user_id');
  }

  Future<List<Map<String, dynamic>>> tripMembers(String tripId) async {
    final rows = await client.from('trip_members').select('user_id, role, joined_at').eq('trip_id', tripId);
    return List<Map<String, dynamic>>.from(rows);
  }

  Future<String> openDirectConversation(String otherUserId) async {
    final mine = await client.from('conversation_members').select('conversation_id').eq('user_id', userId);
    final theirs = await client.from('conversation_members').select('conversation_id').eq('user_id', otherUserId);
    final mineIds = mine.map((e) => e['conversation_id'] as String).toSet();
    final common = theirs.map((e) => e['conversation_id'] as String).where(mineIds.contains).toList();

    for (final id in common) {
      final members = await client.from('conversation_members').select('user_id').eq('conversation_id', id);
      if (members.length == 2) return id;
    }

    final row = await client.from('conversations').insert({}).select('id').single();
    final id = row['id'] as String;
    await client.from('conversation_members').insert([
      {'conversation_id': id, 'user_id': userId},
      {'conversation_id': id, 'user_id': otherUserId},
    ]);
    return id;
  }

  Stream<List<Map<String, dynamic>>> watchMessages(String conversationId) {
    return client
        .from('messages')
        .stream(primaryKey: ['id'])
        .eq('conversation_id', conversationId)
        .order('created_at');
  }

  Future<void> sendMessage(String conversationId, String body) async {
    final text = body.trim();
    if (text.isEmpty) return;
    await client.from('messages').insert({
      'conversation_id': conversationId,
      'sender_id': userId,
      'body': text,
    });
  }

  Future<List<Map<String, dynamic>>> myConversations() async {
    final memberships = await client.from('conversation_members').select('conversation_id').eq('user_id', userId);
    final results = <Map<String, dynamic>>[];
    for (final item in memberships) {
      final conversationId = item['conversation_id'] as String;
      final otherMembers = await client
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', userId);
      if (otherMembers.isEmpty) continue;
      final profile = await profileById(otherMembers.first['user_id'] as String);
      final last = await client
          .from('messages')
          .select('body, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', ascending: false)
          .limit(1);
      results.add({
        'conversation_id': conversationId,
        'profile': profile,
        'last_message': last.isEmpty ? null : last.first,
      });
    }
    return results;
  }

  Stream<List<Map<String, dynamic>>> watchVibeDrops() {
    return client
        .from('vibe_drops')
        .stream(primaryKey: ['id'])
        .gte('expires_at', DateTime.now().toIso8601String())
        .order('created_at', ascending: false);
  }

  Future<void> createVibeDrop({String? tripId, required String vibe, String? caption, String? place}) async {
    await client.from('vibe_drops').insert({
      'user_id': userId,
      'trip_id': tripId,
      'vibe': vibe,
      'caption': caption?.trim(),
      'place': place?.trim(),
    });
  }
}
