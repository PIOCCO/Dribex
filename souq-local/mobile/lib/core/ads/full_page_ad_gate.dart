import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/buyer_discovery_providers.dart';
import '../providers/city_providers.dart';
import '../providers/subscription_providers.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/app_storage.dart';
import 'full_page_ad_overlay.dart';
import 'full_page_ad_session.dart';
import 'platform_ad_constants.dart';
import '../../features/buyer/buyer_home_screen.dart';

/// Shows full-page mobile ads at natural opportunities (marketplace change, return to home tab).
class FullPageAdGate extends ConsumerStatefulWidget {
  const FullPageAdGate({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<FullPageAdGate> createState() => _FullPageAdGateState();
}

class _FullPageAdGateState extends ConsumerState<FullPageAdGate> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeShowFullPageAd());
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<String?>(buyerMarketplaceSlugProvider, (previous, next) {
      if (previous != next) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _maybeShowFullPageAd());
      }
    });
    ref.listen<int>(buyerTabIndexProvider, (previous, next) {
      if (previous != null && previous != 0 && next == 0) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _maybeShowFullPageAd());
      }
    });
    return widget.child;
  }

  Future<void> _maybeShowFullPageAd() async {
    if (!mounted) return;

    final marketplaces = ref.read(buyerMarketplacesProvider).valueOrNull ?? const [];
    final marketplaceSlug = validatedMarketplaceSlug(
      ref.read(buyerMarketplaceSlugProvider),
      marketplaces,
    );
    final contextKey = fullPageAdContextKey(marketplaceSlug);
    final sessions = ref.read(fullPageMarketplaceAdSessionsProvider);
    final session = sessions[contextKey] ?? const FullPageMarketplaceAdSession();

    final lastDismissed = session.lastDismissedAt;
    if (lastDismissed != null &&
        DateTime.now().difference(lastDismissed) < fullPageInterstitialCooldown) {
      return;
    }

    EntitlementsBundleModel? entitlements;
    try {
      entitlements = await ref.read(myEntitlementsProvider.future);
    } on Object {
      entitlements = ref.read(myEntitlementsProvider).valueOrNull;
    }
    if (!shouldShowPromotionalAds(entitlements)) return;

    final storage = ref.read(appStorageProvider);
    if (storage == null) return;
    final adViewerId = storage.ensureAdViewerId();
    final city = ref.read(buyerCityProvider);
    final sessionAuth = ref.read(userSessionProvider);
    final isAuthenticated = sessionAuth != null && !sessionAuth.isGuest;

    try {
      final ads = await apiServiceProvider.fetchActiveAds(
        placement: PlatformAdPlacements.fullPage,
        adViewerId: adViewerId,
        city: city,
        marketplaceSlug: marketplaceSlug,
        excludeCampaignIds: session.shownCampaignIds.toList(),
        auth: isAuthenticated,
        limit: 1,
      );
      if (!mounted || ads.isEmpty) return;

      final ad = ads.first;
      final viewKey = generateAdViewKey(ad.id);
      await showGeneralDialog<void>(
        context: context,
        barrierDismissible: false,
        barrierColor: Colors.black,
        pageBuilder: (context, animation, secondaryAnimation) {
          return FullPageAdOverlay(
            ad: ad,
            adViewerId: adViewerId,
            viewKey: viewKey,
          );
        },
      );

      if (!mounted) return;
      final updatedShown = {...session.shownCampaignIds, ad.id};
      ref.read(fullPageMarketplaceAdSessionsProvider.notifier).state = {
        ...ref.read(fullPageMarketplaceAdSessionsProvider),
        contextKey: session.copyWith(
          shownCampaignIds: updatedShown,
          lastDismissedAt: DateTime.now(),
        ),
      };
    } on Object {
      // Ads must never block buyer navigation.
    }
  }
}
