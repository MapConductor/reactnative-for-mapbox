import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createGeoPoint } from '@mapconductor/js-sdk-core';
import { buildPackage } from './helpers/buildPackage.mjs';

// MapboxMapViewHolder は投影を JS に持たない（ネイティブ側の WebMercatorScreenProjection と
// タップ判定が一致しなくなるため）。その約束と、ref の差し替えへの追従を確かめる。
const { mod, cleanup } = await buildPackage('holder-tests');
after(cleanup);
const { MapboxMapViewHolder, ReactNativeMapViewHolder } = mod;

test('the holder exposes the current native view and no JS map', () => {
  const ref = { current: null };
  const holder = new MapboxMapViewHolder(ref);
  assert.ok(holder instanceof ReactNativeMapViewHolder);
  assert.equal(holder.map, null);
  assert.equal(holder.mapView, null);
  const view = { nodeHandle: 1 };
  ref.current = view;
  assert.equal(holder.mapView, view, 'follows the ref once the native view mounts');
});

test('projection stays on the native side: both directions return null', () => {
  const holder = new MapboxMapViewHolder({ current: { nodeHandle: 1 } });
  assert.equal(holder.toScreenOffset(createGeoPoint({ latitude: 35, longitude: 139 })), null);
  assert.equal(holder.fromScreenOffsetSync({ x: 10, y: 20 }), null);
});
