import type React from 'react';
import type { HostComponent, NativeMethods } from 'react-native';
import type { NativeMapboxViewProps } from './MapboxViewNativeComponent';

export type MapboxMapViewRef =
  React.ComponentRef<HostComponent<NativeMapboxViewProps>> & NativeMethods;
export type MapboxMap = null;
