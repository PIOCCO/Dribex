import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Marketplace slugs (or `__all__`) that already received a full-page ad this session.
final fullPageAdShownContextKeysProvider =
    StateProvider<Set<String>>((ref) => const {});

String fullPageAdContextKey(String? marketplaceSlug) {
  final slug = (marketplaceSlug ?? '').trim();
  return slug.isEmpty ? '__all__' : slug;
}
