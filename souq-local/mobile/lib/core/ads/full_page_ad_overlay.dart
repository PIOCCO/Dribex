import 'dart:async';
import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import '../models/models.dart';
import '../services/api_service.dart';
import '../services/media_url_resolver.dart';
import 'platform_ad_constants.dart';

/// Full-screen mobile interstitial for [PlatformAdPlacements.fullPage] campaigns.
class FullPageAdOverlay extends StatefulWidget {
  const FullPageAdOverlay({
    super.key,
    required this.ad,
    required this.adViewerId,
    required this.viewKey,
  });

  final PlatformAdvertisementModel ad;
  final String adViewerId;
  final String viewKey;

  @override
  State<FullPageAdOverlay> createState() => _FullPageAdOverlayState();
}

class _FullPageAdOverlayState extends State<FullPageAdOverlay> {
  VideoPlayerController? _videoController;
  var _impressionRecorded = false;
  var _closeAllowed = false;
  late int _secondsUntilClose;
  late Duration _closeDelay;
  var _imageFailed = false;
  var _videoFailed = false;
  var _videoInitializing = false;
  var _videoMuted = true;
  Timer? _closeTimer;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    final seconds = widget.ad.closeDelaySeconds;
    _closeDelay = Duration(seconds: seconds);
    _secondsUntilClose = seconds;
    _recordImpression();
    _startCloseCountdown();
    _initVideoIfNeeded();
  }

  void _startCloseCountdown() {
    _closeTimer = Timer(_closeDelay, () {
      if (!mounted) return;
      setState(() {
        _closeAllowed = true;
        _secondsUntilClose = 0;
      });
    });
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || _closeAllowed) {
        timer.cancel();
        return;
      }
      setState(() {
        _secondsUntilClose =
            (_secondsUntilClose - 1).clamp(0, _closeDelay.inSeconds);
      });
    });
  }

  Future<void> _recordImpression() async {
    if (_impressionRecorded) return;
    _impressionRecorded = true;
    try {
      await apiServiceProvider.recordAdImpression(
        campaignId: widget.ad.id,
        placement: PlatformAdPlacements.fullPage,
        viewKey: widget.viewKey,
        adViewerId: widget.adViewerId,
      );
    } on Object {
      // Ads must never break the buyer experience.
    }
  }

  Future<void> _initVideoIfNeeded() async {
    final videoUrl = widget.ad.videoUrl?.trim();
    if (videoUrl == null || videoUrl.isEmpty) return;
    _videoInitializing = true;
    final resolved = MediaUrlResolver.resolve(videoUrl);
    final controller = VideoPlayerController.networkUrl(Uri.parse(resolved));
    _videoController = controller;
    try {
      await controller.initialize();
      await controller.setLooping(true);
      // Muted autoplay is required on mobile; user can unmute after the close delay.
      await controller.setVolume(0);
      await controller.play();
      if (mounted) setState(() => _videoInitializing = false);
    } on Object {
      await controller.dispose();
      _videoController = null;
      _videoFailed = true;
      if (mounted) {
        setState(() => _videoInitializing = false);
        _dismissIfUnusable();
      }
    }
  }

  void _dismissIfUnusable() {
    final hasImage = !_imageFailed && widget.ad.imageUrl.trim().isNotEmpty;
    final hasVideo =
        _videoController != null && _videoController!.value.isInitialized;
    if (!hasImage && !hasVideo) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
      });
    }
  }

  @override
  void dispose() {
    _closeTimer?.cancel();
    _countdownTimer?.cancel();
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _openAd() async {
    if (widget.ad.targetUrl.trim().isEmpty) return;
    final clickKey =
        'click-${widget.ad.id}-${DateTime.now().millisecondsSinceEpoch}';
    final url = apiServiceProvider.buildAdClickUrl(
      ad: widget.ad,
      clickKey: clickKey,
    );
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _close() {
    if (!_closeAllowed) return;
    Navigator.of(context).pop();
  }

  Future<void> _toggleVideoMute() async {
    final controller = _videoController;
    if (controller == null || !controller.value.isInitialized) return;
    final nextMuted = !_videoMuted;
    await controller.setVolume(nextMuted ? 0 : 1);
    if (mounted) setState(() => _videoMuted = nextMuted);
  }

  @override
  Widget build(BuildContext context) {
    final media = _buildMedia(context);
    if (media == null && !_videoInitializing) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
      });
      return const Material(color: Colors.black);
    }

    final hasDestination = widget.ad.targetUrl.trim().isNotEmpty;
    final showVideo = _videoController != null &&
        _videoController!.value.isInitialized;

    return Material(
      color: Colors.black,
      child: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(
              child: GestureDetector(
                onTap: hasDestination ? () => _openAd() : null,
                child: media ?? const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                ),
              ),
            ),
            if (showVideo)
              Positioned(
                top: 8,
                left: 8,
                child: IconButton(
                  tooltip: _videoMuted ? 'Unmute' : 'Mute',
                  onPressed: _toggleVideoMute,
                  icon: Icon(
                    _videoMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                    color: Colors.white,
                  ),
                  style: IconButton.styleFrom(backgroundColor: Colors.black54),
                ),
              ),
            Positioned(
              top: 8,
              right: 8,
              child: _closeAllowed
                  ? IconButton(
                      tooltip: 'Close',
                      onPressed: _close,
                      icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.black54,
                      ),
                    )
                  : Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '$_secondsUntilClose',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
            ),
            if (widget.ad.title.isNotEmpty)
              Positioned(
                left: 16,
                right: 16,
                bottom: 20,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      widget.ad.title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget? _buildMedia(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final controller = _videoController;
    if (controller != null && controller.value.isInitialized) {
      return Center(
        child: SizedBox(
          width: size.width,
          height: size.height,
          child: FittedBox(
            fit: BoxFit.contain,
            child: SizedBox(
              width: controller.value.size.width,
              height: controller.value.size.height,
              child: VideoPlayer(controller),
            ),
          ),
        ),
      );
    }

    final imageUrl = MediaUrlResolver.resolve(widget.ad.imageUrl);
    if (imageUrl.isEmpty) {
      if (_videoFailed || _imageFailed) return null;
      return null;
    }
    return Center(
      child: SizedBox(
        width: size.width,
        height: size.height,
        child: CachedNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.contain,
          placeholder: (_, __) => const Center(
            child: CircularProgressIndicator(color: Colors.white),
          ),
          errorWidget: (_, __, ___) {
            if (!_imageFailed) {
              _imageFailed = true;
              _dismissIfUnusable();
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }
}

String generateAdViewKey(String campaignId) {
  final random = math.Random();
  return 'view-$campaignId-${DateTime.now().millisecondsSinceEpoch}-${random.nextInt(1 << 32)}';
}
