import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createGeoPoint, createMapCameraPosition } from '@mapconductor/js-sdk-core';
import { buildPackage } from './helpers/buildPackage.mjs';

// MapboxMapView は共有の NativeMapViewHost に「どのネイティブビューか」「デザインを
// どう文字列化するか」を渡すだけの薄い層。その受け渡しを、React を描画せずに
// 関数として呼んで返ってきた要素の props で確かめる。
// 特に Mapbox はデザインを id でも getValue() でもなくスタイル URI で渡す
// （MapboxView.native.tsx のコメント参照）ので、そこを固定する。
const { mod, cleanup } = await buildPackage('mapview-tests');
after(cleanup);
const { MapboxMapView, MapboxDesign, MapboxViewState, MapboxViewController, NativeMapViewHost, ReactNativeBridgeMapViewController } = mod;

test('the shared native host is rendered with the MapboxMapView native view', () => {
  const state = new MapboxViewState();
  const element = MapboxMapView({ state });
  assert.equal(element.type, NativeMapViewHost);
  // Android の REACT_CLASS / iOS の RCT_EXPORT_MODULE と揃っていないと
  // 「View config not found」で落ちる名前。
  assert.deepEqual(element.props.nativeComponent, { nativeViewName: 'MapboxMapView' });
  // Mapbox は API キー等のプロバイダ固有 prop を持たない。
  assert.equal(element.props.nativeProps, undefined);
});

test('a URI style is handed over as the style URI itself, not the id or the web composite value', () => {
  const state = new MapboxViewState({ mapDesignType: MapboxDesign.Streets });
  const value = MapboxMapView({ state }).props.mapDesignValue;
  assert.equal(value, 'mapbox://styles/mapbox/streets-v12');
  assert.notEqual(value, MapboxDesign.Streets.id);
  assert.notEqual(value, MapboxDesign.Streets.getValue());

  state.mapDesignType = MapboxDesign.OsmBrightJa;
  assert.equal(
    MapboxMapView({ state }).props.mapDesignValue,
    'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json'
  );
});

test('an object style (from a vector tile layer) is handed over as JSON text', () => {
  const style = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background' }] };
  const state = new MapboxViewState({ mapDesignType: new MapboxDesign('vt-1234', style) });
  const value = MapboxMapView({ state }).props.mapDesignValue;
  assert.equal(typeof value, 'string');
  assert.deepEqual(JSON.parse(value), style);
});

test('app props pass through to the host untouched', () => {
  const state = new MapboxViewState();
  const onMapClick = () => {};
  const markerTilingOptions = { enabled: false, debugTileOverlay: false, minMarkerCount: 1, cacheSize: 1, iconScaleCallback: null, declutterPx: 0 };
  const props = MapboxMapView({ state, onMapClick, markerTilingOptions, minZoom: 3, children: 'child' }).props;
  assert.equal(props.state, state);
  assert.equal(props.onMapClick, onMapClick);
  assert.equal(props.markerTilingOptions, markerTilingOptions);
  assert.equal(props.minZoom, 3);
  assert.equal(props.children, 'child');
});

test('createController builds a MapboxViewController bound to the native ref and initial camera', () => {
  const state = new MapboxViewState();
  const { createController } = MapboxMapView({ state }).props;
  const view = { nodeHandle: 7 };
  const ref = { current: view };
  const camera = createMapCameraPosition({ position: createGeoPoint({ latitude: 35.68, longitude: 139.76 }), zoom: 12 });
  const controller = createController(ref, camera);
  assert.ok(controller instanceof MapboxViewController);
  assert.ok(controller instanceof ReactNativeBridgeMapViewController);
  assert.equal(controller.getCameraPosition(), camera);
  assert.equal(controller.holder.mapView, view);
  assert.equal(controller.holder.map, null);
  controller.destroy();
});
