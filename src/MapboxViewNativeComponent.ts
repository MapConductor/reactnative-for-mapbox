import { requireNativeComponent } from 'react-native';
import type {
  NativeMapViewEvent,
  NativeMapViewProps,
} from '@mapconductor/js-sdk-react/internal';

// 共通のブリッジ props / イベント型は js-sdk-react に集約してある。
export type NativeMapboxViewEvent<T> = NativeMapViewEvent<T>;

export interface NativeMapboxViewProps extends NativeMapViewProps {
}

export {
  toNativeCameraPosition,
  toNativeMarkerTilingOptions,
  type NativeMarkerTilingOptions,
} from '@mapconductor/js-sdk-react/internal';

export default requireNativeComponent<NativeMapboxViewProps>(
  // Align to android/src/main/java/com/mapconductor/react/mapbox/MapConductorMapboxViewManager.kt (REACT_CLASS)
  'MapboxMapView'
);
