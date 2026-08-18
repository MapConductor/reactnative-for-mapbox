#import "MapConductorMapboxViewManager.h"

// 実装は MCReactNativeMapViewManagerBase（js-sdk-react/ios）にある。
// ここに書くのは「どの Swift ビューか」「JS でのコンポーネント名は何か」だけ。
@implementation MapConductorMapboxViewManager

RCT_EXPORT_MODULE(MapboxMapView)

- (NSString *)mapViewClassName
{
  return @"MCMapboxReactNativeView";
}


// イベント / prop / コマンドの宣言。RN は Commands をこのクラス自身の
// メソッド一覧からしか組み立てないため、基底に置けず各クラスで展開する。
MC_REACT_NATIVE_MAP_VIEW_MANAGER_BODY
@end

__attribute__((constructor)) static void MCMapboxRegisterLegacyInterop(void)
{
  MCReactNativeRegisterLegacyViewManagerInterop(@"MapboxMapView");
}
