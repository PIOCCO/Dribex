import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Minimum time between full-page interstitials for the same marketplace context.
const fullPageInterstitialCooldown = Duration(minutes: 3);

String fullPageAdContextKey(String? marketplaceSlug) {
  final slug = (marketplaceSlug ?? '').trim();
  return slug.isEmpty ? '__all__' : slug;
}

class FullPageMarketplaceAdSession {
  const FullPageMarketplaceAdSession({
    this.shownCampaignIds = const {},
    this.lastDismissedAt,
  });

  final Set<String> shownCampaignIds;
  final DateTime? lastDismissedAt;

  FullPageMarketplaceAdSession copyWith({
    Set<String>? shownCampaignIds,
    DateTime? lastDismissedAt,
  }) {
    return FullPageMarketplaceAdSession(
      shownCampaignIds: shownCampaignIds ?? this.shownCampaignIds,
      lastDismissedAt: lastDismissedAt ?? this.lastDismissedAt,
    );
  }
}

final fullPageMarketplaceAdSessionsProvider =
    StateProvider<Map<String, FullPageMarketplaceAdSession>>((ref) => const {});
