class Trip {
  final String id;
  final String userId;
  final String title;
  final String destination;
  final DateTime startDate;
  final DateTime endDate;
  final double budget;
  final String? coverUrl;
  final String? notes;
  final DateTime createdAt;

  const Trip({
    required this.id,
    required this.userId,
    required this.title,
    required this.destination,
    required this.startDate,
    required this.endDate,
    required this.budget,
    this.coverUrl,
    this.notes,
    required this.createdAt,
  });

  factory Trip.fromMap(Map<String, dynamic> map) => Trip(
        id: map['id'] as String,
        userId: map['user_id'] as String,
        title: map['title'] as String,
        destination: map['destination'] as String,
        startDate: DateTime.parse(map['start_date'] as String),
        endDate: DateTime.parse(map['end_date'] as String),
        budget: (map['budget'] as num?)?.toDouble() ?? 0,
        coverUrl: map['cover_url'] as String?,
        notes: map['notes'] as String?,
        createdAt: DateTime.parse(map['created_at'] as String),
      );
}
