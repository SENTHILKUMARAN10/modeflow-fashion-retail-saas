import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../models/trip.dart';

class TripService {
  TripService(this.client);
  final SupabaseClient client;
  static const _uuid = Uuid();

  String get userId => client.auth.currentUser!.id;

  Stream<List<Trip>> watchTrips() {
    return client
        .from('trips')
        .stream(primaryKey: ['id'])
        .eq('user_id', userId)
        .order('start_date')
        .map((rows) => rows.map(Trip.fromMap).toList());
  }

  Future<Trip> createTrip({required String title, required String destination, required DateTime startDate, required DateTime endDate, required double budget, String? notes}) async {
    final row = await client.from('trips').insert({
      'user_id': userId,
      'title': title,
      'destination': destination,
      'start_date': startDate.toIso8601String().split('T').first,
      'end_date': endDate.toIso8601String().split('T').first,
      'budget': budget,
      'notes': notes,
    }).select().single();
    return Trip.fromMap(row);
  }

  Future<void> deleteTrip(String id) async => client.from('trips').delete().eq('id', id).eq('user_id', userId);

  Stream<List<Map<String, dynamic>>> watchItinerary(String tripId) => client.from('itinerary_items').stream(primaryKey: ['id']).eq('trip_id', tripId).order('starts_at');

  Future<void> addItinerary({required String tripId, required String title, required DateTime startsAt, String? place, String? notes}) async {
    await client.from('itinerary_items').insert({'trip_id': tripId, 'user_id': userId, 'title': title, 'starts_at': startsAt.toIso8601String(), 'place': place, 'notes': notes});
  }

  Future<void> deleteItinerary(String id) async => client.from('itinerary_items').delete().eq('id', id).eq('user_id', userId);

  Stream<List<Map<String, dynamic>>> watchExpenses(String tripId) => client.from('expenses').stream(primaryKey: ['id']).eq('trip_id', tripId).order('spent_at', ascending: false);

  Future<void> addExpense({required String tripId, required String category, required String title, required double amount}) async {
    await client.from('expenses').insert({'trip_id': tripId, 'user_id': userId, 'category': category, 'title': title, 'amount': amount, 'spent_at': DateTime.now().toIso8601String()});
  }

  Future<void> deleteExpense(String id) async => client.from('expenses').delete().eq('id', id).eq('user_id', userId);

  Stream<List<Map<String, dynamic>>> watchChecklist(String tripId) => client.from('checklist_items').stream(primaryKey: ['id']).eq('trip_id', tripId).order('created_at');

  Future<void> addChecklistItem(String tripId, String title) async {
    await client.from('checklist_items').insert({'trip_id': tripId, 'user_id': userId, 'title': title, 'is_done': false});
  }

  Future<void> setChecklistState(String id, bool done) async => client.from('checklist_items').update({'is_done': done}).eq('id', id).eq('user_id', userId);
  Future<void> deleteChecklistItem(String id) async => client.from('checklist_items').delete().eq('id', id).eq('user_id', userId);

  Stream<List<Map<String, dynamic>>> watchMemories(String tripId) => client.from('trip_memories').stream(primaryKey: ['id']).eq('trip_id', tripId).order('taken_at', ascending: false);

  Future<void> addMemory({required String tripId, required XFile file, String? caption}) async {
    final bytes = await file.readAsBytes();
    final original = file.name.toLowerCase();
    final ext = original.contains('.') ? original.split('.').last : 'jpg';
    final safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].contains(ext) ? ext : 'jpg';
    final storagePath = '$userId/$tripId/${_uuid.v4()}.$safeExt';
    await client.storage.from('trip-memories').uploadBinary(storagePath, bytes, fileOptions: const FileOptions(upsert: false));
    await client.from('trip_memories').insert({'trip_id': tripId, 'user_id': userId, 'caption': caption?.trim().isEmpty == true ? null : caption?.trim(), 'storage_path': storagePath, 'taken_at': DateTime.now().toIso8601String()});
  }

  Future<String> memoryUrl(String storagePath) => client.storage.from('trip-memories').createSignedUrl(storagePath, 3600);

  Future<void> deleteMemory(Map<String, dynamic> memory) async {
    final path = memory['storage_path'] as String?;
    if (path != null && path.isNotEmpty) await client.storage.from('trip-memories').remove([path]);
    await client.from('trip_memories').delete().eq('id', memory['id']).eq('user_id', userId);
  }

  Stream<List<Map<String, dynamic>>> watchBookings(String tripId) => client.from('trip_bookings').stream(primaryKey: ['id']).eq('trip_id', tripId).order('created_at', ascending: false);

  Future<void> addBooking({required String tripId, required String title, required String category, String? provider, String? confirmationCode, DateTime? startsAt, String? notes}) async {
    await client.from('trip_bookings').insert({'trip_id': tripId, 'user_id': userId, 'title': title, 'category': category, 'provider': provider, 'confirmation_code': confirmationCode, 'starts_at': startsAt?.toIso8601String(), 'notes': notes});
  }

  Future<void> deleteBooking(String id) async => client.from('trip_bookings').delete().eq('id', id).eq('user_id', userId);

  Stream<List<Map<String, dynamic>>> watchNotes(String tripId) => client.from('trip_notes').stream(primaryKey: ['id']).eq('trip_id', tripId).order('created_at', ascending: false);

  Future<void> addNote({required String tripId, required String title, String? body, String kind = 'note'}) async {
    await client.from('trip_notes').insert({'trip_id': tripId, 'user_id': userId, 'title': title, 'body': body, 'kind': kind});
  }

  Future<void> deleteNote(String id) async => client.from('trip_notes').delete().eq('id', id).eq('user_id', userId);

  Stream<List<Map<String, dynamic>>> watchDocuments(String tripId) => client.from('trip_documents').stream(primaryKey: ['id']).eq('trip_id', tripId).order('created_at', ascending: false);

  Future<void> uploadDocument({required String tripId, required String title, required String category, required String fileName, required Uint8List bytes, String? mimeType}) async {
    final extension = fileName.contains('.') ? '.${fileName.split('.').last.toLowerCase()}' : '';
    final storagePath = '$userId/$tripId/${_uuid.v4()}$extension';
    await client.storage.from('trip-documents').uploadBinary(storagePath, bytes, fileOptions: FileOptions(upsert: false, contentType: mimeType));
    await client.from('trip_documents').insert({
      'trip_id': tripId,
      'user_id': userId,
      'title': title,
      'category': category,
      'file_name': fileName,
      'storage_path': storagePath,
      'mime_type': mimeType,
    });
  }

  Future<String> documentUrl(String storagePath) => client.storage.from('trip-documents').createSignedUrl(storagePath, 600);

  Future<void> deleteDocument(Map<String, dynamic> document) async {
    final path = document['storage_path'] as String?;
    if (path != null && path.isNotEmpty) await client.storage.from('trip-documents').remove([path]);
    await client.from('trip_documents').delete().eq('id', document['id']).eq('user_id', userId);
  }
}
