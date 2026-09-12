class AppConfig {
  static const supabaseUrl = 'https://bgyfwwbkdoyayktayhwd.supabase.co';
  static const supabaseAnonKey = 'sb_publishable_qjoWdNTudpXpe_1LSpEM7g_brHJ2i-E';

  static bool get isConfigured =>
      supabaseUrl.trim().isNotEmpty && supabaseAnonKey.trim().isNotEmpty;
}
