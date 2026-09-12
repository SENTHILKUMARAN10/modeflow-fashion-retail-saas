# TripMate — Premium Social Travel Companion

TripMate is a real-time Flutter + Supabase travel companion designed as an all-in-one space for planning, travelling, collaborating and preserving memories.

## Core travel features
- Email signup / login
- Real-time trips
- Premium home dashboard
- Day-by-day itinerary
- Budget and expense tracking
- Packing and travel checklist
- Bookings and reservation details
- Memorable Moments photo journal
- Important notes and emergency information
- Travel tools
- Secure Travel Vault for IDs, tickets and documents
- End-of-trip Story Studio for shareable travel recaps

## Social + Gen Z layer
- Unique usernames and profiles
- Friend search and requests
- Trip Crew / tag travel companions
- Direct messaging
- TripVerse discovery
- Vibe Drops
- Pull-to-refresh
- Premium icon-only bottom navigation
- Profile and Settings pages

## Backend
Supabase provides Authentication, PostgreSQL, Realtime, Storage and Row Level Security.

Database migrations are stored under `supabase/migrations/`.

## Automated Android build
GitHub Actions generates the Android platform files, analyzes the Flutter project, builds a release APK and uploads it as the `TripMate-Android-APK` artifact.

## Local setup
```bash
flutter create . --platforms=android,ios --project-name=tripmate --org=com.senthilkumaran.tripmate
flutter pub get
flutter run
```

## Release build
```bash
flutter build apk --release
```

For Play Store:
```bash
flutter build appbundle --release
```
