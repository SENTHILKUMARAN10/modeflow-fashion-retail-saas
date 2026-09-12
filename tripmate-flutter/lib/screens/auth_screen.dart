import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/design.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  final name = TextEditingController();
  bool signUp = false;
  bool loading = false;
  bool showPassword = false;
  String? error;
  String? success;

  Future<void> submit() async {
    if (loading) return;
    FocusScope.of(context).unfocus();
    final emailValue = email.text.trim();
    final passwordValue = password.text;
    final nameValue = name.text.trim();
    if (emailValue.isEmpty || passwordValue.isEmpty || (signUp && nameValue.isEmpty)) {
      setState(() => error = 'Please fill in all fields.');
      return;
    }
    setState(() { loading = true; error = null; success = null; });
    try {
      final auth = Supabase.instance.client.auth;
      if (signUp) {
        final response = await auth.signUp(email: emailValue, password: passwordValue, data: {'full_name': nameValue}).timeout(const Duration(seconds: 20));
        if (!mounted) return;
        setState(() => success = response.session == null ? 'Account created. Verify your email, then sign in.' : 'Account created successfully.');
      } else {
        await auth.signInWithPassword(email: emailValue, password: passwordValue).timeout(const Duration(seconds: 20));
      }
    } on TimeoutException {
      if (mounted) setState(() => error = 'The request is taking too long. Check your connection and try again.');
    } on AuthException catch (e) {
      if (!mounted) return;
      final message = e.message.toLowerCase();
      setState(() {
        if (message.contains('rate limit') || message.contains('security purposes')) {
          error = 'Too many attempts. Wait a little, then try again.';
        } else if (message.contains('email not confirmed')) {
          error = 'Verify your email first, then sign in.';
        } else {
          error = e.message;
        }
      });
    } catch (_) {
      if (mounted) setState(() => error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    email.dispose(); password.dispose(); name.dispose(); super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: TripMateWaveBackground(
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 28),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight - 44),
                child: Column(
                  children: [
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 700),
                      curve: Curves.easeOutCubic,
                      builder: (_, value, child) => Opacity(opacity: value, child: Transform.translate(offset: Offset(0, 18 * (1 - value)), child: child)),
                      child: _brandHero(),
                    ),
                    const SizedBox(height: 16),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 320),
                      child: TripMateSurface(
                        key: ValueKey(signUp),
                        padding: const EdgeInsets.all(20),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                          Text(signUp ? 'Create your travel identity' : 'Welcome back', style: Theme.of(context).textTheme.headlineSmall),
                          const SizedBox(height: 5),
                          Text(signUp ? 'One account for plans, crew, memories and every trip.' : 'Pick up exactly where your last journey stopped.', style: Theme.of(context).textTheme.bodyMedium),
                          const SizedBox(height: 20),
                          if (signUp) ...[
                            TextField(controller: name, textInputAction: TextInputAction.next, decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline_rounded))),
                            const SizedBox(height: 11),
                          ],
                          TextField(controller: email, keyboardType: TextInputType.emailAddress, textInputAction: TextInputAction.next, autocorrect: false, decoration: const InputDecoration(labelText: 'Email address', prefixIcon: Icon(Icons.alternate_email_rounded))),
                          const SizedBox(height: 11),
                          TextField(
                            controller: password,
                            obscureText: !showPassword,
                            onSubmitted: (_) => submit(),
                            decoration: InputDecoration(labelText: 'Password', prefixIcon: const Icon(Icons.lock_outline_rounded), suffixIcon: IconButton(onPressed: () => setState(() => showPassword = !showPassword), icon: Icon(showPassword ? Icons.visibility_off_rounded : Icons.visibility_rounded))),
                          ),
                          if (error != null) ...[const SizedBox(height: 12), _notice(error!, false)],
                          if (success != null) ...[const SizedBox(height: 12), _notice(success!, true)],
                          const SizedBox(height: 16),
                          FilledButton(onPressed: loading ? null : submit, child: loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(signUp ? 'Create account' : 'Sign in')),
                          const SizedBox(height: 4),
                          TextButton(onPressed: loading ? null : () => setState(() { signUp = !signUp; error = null; success = null; }), child: Text(signUp ? 'Already have an account? Sign in' : 'New to TripMate? Create account')),
                        ]),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text('Private by design • Powered by Supabase', style: TextStyle(color: TripMateColors.muted, fontSize: 12, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _brandHero() => TripMateSurface(
        gradient: TripMateGradient.hero,
        padding: const EdgeInsets.fromLTRB(22, 22, 22, 24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const TripMateIconBubble(Icons.flight_takeoff_rounded, size: 56),
            const Spacer(),
            Container(padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7), decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(30)), child: const Text('TRAVEL OS', style: TextStyle(color: TripMateColors.ice, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.3))),
          ]),
          const SizedBox(height: 34),
          const Text('TripMate', style: TextStyle(color: Colors.white, fontSize: 42, fontWeight: FontWeight.w900, letterSpacing: -1.5)),
          const SizedBox(height: 7),
          Text(signUp ? 'Your whole trip starts with one profile.' : 'Every trip. One beautiful space.', style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          const Text('Plan, invite, chat, store documents, track money and keep the moments worth remembering.', style: TextStyle(color: Colors.white70, height: 1.45, fontWeight: FontWeight.w600)),
        ]),
      );

  Widget _notice(String text, bool positive) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: positive ? TripMateColors.ice : const Color(0xFFFFE8E8), borderRadius: BorderRadius.circular(16)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(positive ? Icons.check_circle_outline_rounded : Icons.info_outline_rounded, size: 18, color: positive ? TripMateColors.navy800 : Colors.red.shade700), const SizedBox(width: 8), Expanded(child: Text(text, style: const TextStyle(fontWeight: FontWeight.w700)))]),
      );
}
