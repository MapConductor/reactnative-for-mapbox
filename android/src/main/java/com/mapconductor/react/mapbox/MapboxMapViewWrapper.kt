package com.mapconductor.react.mapbox

import android.content.Context
import android.view.View
import androidx.compose.ui.geometry.Offset
import com.mapbox.maps.MapInitOptions
import com.mapbox.maps.MapView
import com.mapconductor.core.features.GeoPointInterface
import com.mapconductor.core.map.AttributionRule
import com.mapconductor.core.map.MapCameraPosition
import com.mapconductor.core.map.MutableMapServiceRegistry
import com.mapconductor.core.marker.MarkerTilingOptions
import com.mapconductor.mapbox.MapboxDesignType
import com.mapconductor.mapbox.MapboxInitSDK
import com.mapconductor.mapbox.MapboxMapDesign
import com.mapconductor.mapbox.MapboxMapViewController
import com.mapconductor.mapbox.MapboxMapViewHolder
import com.mapconductor.mapbox.MapboxMapViewScope
import com.mapconductor.mapbox.createMapboxViewController
import com.mapconductor.mapbox.toCameraOptions
import com.mapconductor.react.wrapper.MapConductorMapViewWrapperBase
import com.mapconductor.react.wrapper.MapConductorReactNativeHost
import com.mapconductor.react.wrapper.MapConductorReactNativeHostDelegate

/**
 * RN の Mapbox ビュー。
 *
 * コマンドの受け口・マーカー取り込み・スクリーン座標の通知・拡張の Compose レイヤは
 * [MapConductorMapViewWrapperBase]（js-sdk-react/android）が全部持っているので、
 * ここはプロバイダ固有のアダプタを差すだけ。
 */
class MapboxMapViewWrapper(context: Context) : MapConductorMapViewWrapperBase(context) {
    override val host: MapConductorReactNativeHost = MapboxReactNativeHost()
}

/**
 * JS から届いたスタイル URI をそのまま返すデザイン。
 *
 * ## ★ Mapbox だけ id が 3 プラットフォームで揃っていない
 *
 * - web  : `MapboxDesign.Streets` の id は `"streets"`。しかも `getValue()` は
 *   `mapDesign_id=streets,style=mapbox://...` という**合成形**（そのまま `loadStyle`
 *   に渡すと `Failed to parse style: Invalid value` になる。実機で踏んだ）
 * - android / iOS: id は `"streets-v12"`、`getValue()` はスタイル URI そのもの
 *
 * 3 つを貫く実体は**スタイル URI だけ**。RN は web の `styleJsonURL` を送るので、
 * ネイティブ側は受け取った URI をそのまま `loadStyle` へ流せばよい。
 * MapTiler / Longdo が id を渡しているのと**あえて違う**ので、写経しないこと。
 *
 * android の [MapboxMapDesign] は sealed class なのでモジュール外では継承できず、
 * `Custom(layerId)` は `mapbox://styles/mapbox/<layerId>` を組み立ててしまうため
 * OSM 等の http スタイル URL に使えない。そこで型（`MapDesignTypeInterface<String>`）を
 * 直接実装する。
 */
private data class StyleUriDesign(
    override val id: String,
) : MapboxDesignType {
    override val attributionRules: List<AttributionRule> = emptyList()

    override fun getValue(): String = id
}

/**
 * Mapbox の地図一式を RN のラッパー基底が扱える形へ翻訳する。
 *
 * **Compose は経由しない。** Mapbox は GL のネイティブマーカーを持つので、マーカーを
 * Compose オーバーレイで描く必要がない（Longdo / MapTiler とはそこが違う）。
 * MapLibre と同じ「素の MapView を作ってファクトリでコントローラを組む」形。
 */
private class MapboxReactNativeHost : MapConductorReactNativeHost {
    override val providerName = "Mapbox"
    override val extensionScope = MapboxMapViewScope()
    override val serviceRegistry = MutableMapServiceRegistry()

    private var mapView: MapView? = null
    private var holder: MapboxMapViewHolder? = null
    private var controller: MapboxMapViewController? = null
    private var mapDesign: MapboxDesignType = MapboxMapDesign.Standard

    override fun createMapView(
        context: Context,
        initialCamera: MapCameraPosition,
        markerTiling: MarkerTilingOptions,
        delegate: MapConductorReactNativeHostDelegate,
    ): View {
        MapboxInitSDK(context)

        val options =
            MapInitOptions(
                context = context,
                // Compose 版と同じく textureView。false にすると RN のビュー階層で
                // 地図が他のビューを突き抜けて描画される。
                textureView = true,
                styleUri = mapDesign.getValue(),
                cameraOptions = initialCamera.toCameraOptions(),
            )
        val nativeMapView = MapView(context, options)
        nativeMapView.onStart()
        mapView = nativeMapView

        val mapHolder = MapboxMapViewHolder(nativeMapView, nativeMapView.mapboxMap)
        holder = mapHolder
        // **Compose 版とまったく同じファクトリを通す。** ここでコントローラを直接
        // 組み直すと、片方だけ配線が増えて食い違う。
        val viewController =
            createMapboxViewController(
                holder = mapHolder,
                markerTiling = markerTiling,
                serviceRegistry = serviceRegistry,
            )
        controller = viewController
        delegate.onControllerReady(viewController)

        // 地図の準備完了はスタイル読み込み完了で判断する。コントローラ生成時に
        // 鳴らしてはいけない（まだ何も描けない）。
        //
        // **初期カメラの送出はここでは行わない。** MapboxMapViewController 自身が
        // `subscribeStyleLoaded` の中で `sendInitialCameraUpdate()` を呼んでいる
        // （MapLibre のコントローラは呼ばないので、あちらの RN ラッパーは自前で
        // 呼んでいる。写経して二重に送らないこと）。
        nativeMapView.mapboxMap.subscribeStyleLoaded {
            if (!delegate.isAttached) return@subscribeStyleLoaded
            delegate.onMapLoaded()
        }
        return nativeMapView
    }

    override fun setMapDesign(id: String?) {
        // JS が渡すのはスタイル URI（`MapboxView.native.tsx` を参照）。
        mapDesign = id?.takeIf { it.isNotBlank() }?.let { StyleUriDesign(it) } ?: MapboxMapDesign.Standard
        controller?.setMapDesignType(mapDesign)
    }

    /** 投影は Mapbox のネイティブ API をホルダーが持つ。JS 側へ逃がさないこと。 */
    override fun toScreenOffset(position: GeoPointInterface): Offset? = holder?.toScreenOffset(position)

    override fun destroy() {
        controller?.destroy()
        controller = null
        holder = null
        mapView?.onStop()
        mapView = null
    }
}
