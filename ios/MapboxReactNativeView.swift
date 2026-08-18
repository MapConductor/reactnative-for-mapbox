import MapConductorCore
@_spi(MapConductorDriver) import MapConductorForMapbox
import MapConductorReactMarkerClustering
import MapConductorReactNativeCore
import MapboxMaps
import UIKit

/// RN の Mapbox ビュー。
///
/// コマンドの受け口・マーカー取り込み・スクリーン座標の通知は
/// ``MCReactNativeMapViewBase``（js-sdk-react/ios）が全部持っているので、ここは
/// プロバイダ固有のアダプタを差すだけ。android の `MapboxMapViewWrapper` が
/// `createMapboxViewController()` を呼ぶだけになっているのと同じ形。
@objc(MCMapboxReactNativeView)
public final class MapboxReactNativeView: MCReactNativeMapViewBase {
    public override func makeHost() -> MCReactNativeMapHost {
        MapboxReactNativeHost()
    }
}

/// `MapboxMapHost`（ios-sdk）を RN の基底クラスが扱える非ジェネリックな形へ翻訳する。
@MainActor
final class MapboxReactNativeHost: MCReactNativeMapHost {
    weak var mcDelegate: MCReactNativeMapHostDelegate?

    private let state = MapboxViewState()
    private lazy var mapHost: MapboxMapHost = {
        Self.applyAccessTokenFromInfoPlist()
        return MapboxMapHost(
            state: state,
            projection: .mercator,
            handlers: MapViewHandlers(
                onMapLoaded: { [weak self] _ in self?.mcDelegate?.mcMapLoaded() },
                onMapClick: { [weak self] point in self?.mcDelegate?.mcMapClick(point) },
                onMapLongClick: { [weak self] point in self?.mcDelegate?.mcMapLongClick(point) },
                onCameraMoveStart: { [weak self] camera in self?.mcDelegate?.mcCameraMoveStart(camera) },
                onCameraMove: { [weak self] camera in self?.mcDelegate?.mcCameraMove(camera) },
                onCameraMoveEnd: { [weak self] camera in self?.mcDelegate?.mcCameraMoveEnd(camera) }
            )
        )
    }()

    /// Info.plist の `MBXAccessToken` をアクセストークンとして適用する。
    ///
    /// MapboxMaps は同じキーを自前でも読むが、**`$(...)` が残っていても素通しする**。
    /// そのまま使うとタイルが 401 になり「地図が真っ白」という原因の分かりにくい形でしか
    /// 出ないので、展開されていないビルド設定のプレースホルダはここで弾く。
    /// `MapTilerMapHost.resolveApiKey` と同じ扱い。
    /// android は `MapboxInitSDK` が AndroidManifest の `MAPBOX_ACCESS_TOKEN` を読む
    /// （あちらは未設定なら例外を投げる）。
    private static func applyAccessTokenFromInfoPlist() {
        guard let token = Bundle.main.object(forInfoDictionaryKey: "MBXAccessToken") as? String,
              !token.isEmpty,
              !token.contains("$(")
        else {
            MCLog.map("Mapbox: MBXAccessToken が未設定か未展開。地図は読み込まれない")
            return
        }
        initializeMapbox(accessToken: token)
    }

    var mcServiceRegistry: MutableMapServiceRegistry { state.serviceRegistry }
    var mcCameraZoom: Double { state.cameraPosition.zoom }

    func mcMakeMapView(content: MapViewContent) -> UIView {
        mapHost.makeMapView(cameraRestriction: nil, content: content)
    }

    func mcUpdateContent(_ content: MapViewContent) {
        mapHost.updateContent(content)
        mapHost.updateInfoBubbleLayouts()
    }

    func mcSyncNativeViewSettings() {
        mapHost.syncNativeViewSettings()
    }

    func mcUnbind() {
        mapHost.unbind()
    }

    func mcSetMapDesign(id: String?) {
        // JS が渡すのは id でも `getValue()` でもなく**スタイル URI**
        // （`MapboxView.native.tsx` を参照）。id は 3 プラットフォームで揃っておらず、
        // web の `getValue()` は合成形なので、URI が唯一の共通鍵。
        guard let uri = id, !uri.isEmpty else { return }
        state.mapDesignType = MapboxMapDesign(id: uri, styleURI: uri)
    }

    func mcMoveCamera(_ camera: MapCameraPosition, durationMillis: Int64?) {
        if let durationMillis {
            state.moveCameraTo(cameraPosition: camera, durationMillis: durationMillis)
        } else {
            state.moveCameraTo(cameraPosition: camera)
        }
    }

    func mcFitBounds(_ bounds: GeoRectBounds, padding: Int) {
        state.fitBounds(bounds: bounds, padding: padding)
    }

    func mcApplyUISettings(_ settings: MapUISettings) {
        state.uiSettings = settings
    }

    func mcToScreenOffset(_ position: GeoPointProtocol) -> CGPoint? {
        state.getMapViewHolder()?.toScreenOffset(position: position)
    }

    func mcMakeLocalExtensionRenderer(
        type: String,
        extensionId: String,
        eventSink: @escaping NativeMapExtensionEventSink
    ) -> NativeMapExtensionRenderer? {
        guard type == "marker-clustering" else { return nil }
        return MarkerClusterExtensionRenderer<MapboxActualMarker>(extensionId: extensionId, eventSink: eventSink)
    }
}
