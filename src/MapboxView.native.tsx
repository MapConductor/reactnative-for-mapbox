import { NativeMapViewHost } from '@mapconductor/js-sdk-react/internal';
import type { MapboxViewStateInterface } from '@mapconductor/react-for-mapbox/state';
import { MapboxViewController } from './MapboxViewController.native';
import type { MapboxMapViewProps } from './MapboxViewProps.native';
import type { MapboxMapViewRef } from './MapboxTypeAlias.native';
import NativeMapboxMapView from './MapboxViewNativeComponent';

/**
 * ネイティブイベントの配線・オーバーレイ収集・InfoBubble レイヤは全 RN プロバイダで
 * 同一なので {@link NativeMapViewHost} に集約してある。ここで渡すのは
 * 「どのネイティブビューか」「デザインをどう文字列化するか」だけ。
 */
export function MapboxMapView(props: MapboxMapViewProps) {
  return (
    <NativeMapViewHost<MapboxMapViewRef, MapboxViewStateInterface>
      {...props}
      nativeComponent={NativeMapboxMapView}
      // **id でも `getValue()` でもなく `styleJsonURL`（スタイル URI そのもの）を渡す。**
      //
      // - id は 3 プラットフォームで揃っていない（web は "streets"、android/iOS は "streets-v12"）
      // - web の `getValue()` は `mapDesign_id=streets,style=mapbox://...` という**合成形**で、
      //   そのまま `loadStyle` に渡すと `Failed to parse style: Invalid value` になる（実機で確認）
      // - android/iOS の `getValue()` はスタイル URI そのもの
      //
      // よって 3 つを貫く実体は URI だけ。ネイティブは受け取った URI をそのまま
      // `loadStyle` / `styleURI` へ流す。
      // MapTiler / Longdo は id を渡している。**写経して揃えないこと。**
      mapDesignValue={props.state.mapDesignType.styleJsonURL}
      createController={(ref, camera) => new MapboxViewController(ref, camera)}
    />
  );
}
