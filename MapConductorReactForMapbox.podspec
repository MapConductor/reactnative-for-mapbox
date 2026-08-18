require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name = "MapConductorReactForMapbox"
  s.version = package["version"]
  s.summary = package["description"]
  s.license = package["license"]
  s.author = package["author"]
  s.homepage = "https://github.com/mapconductor/react-sdk"
  s.source = { :path => __dir__ }
  # ios-for-mapbox の podspec に合わせる（Package.swift が `.iOS(.v17)`）。
  s.platform = :ios, "17.0"
  s.source_files = "ios/*.{h,m,mm,swift}"
  # MapConductorForMapbox は source pod（ios-sdk/ios-for-mapbox の podspec を参照）。
  # ベンダの `MapboxMaps` は CocoaPods trunk にあり、その依存（MapboxCoreMaps /
  # MapboxCommon）は Mapbox の CDN から降りてくる。**実行時には公開アクセストークンが
  # 別途必要**（Info.plist の `MBXAccessToken` か `MapboxOptions.accessToken`）。
  s.dependency "React-Core"
  s.dependency "MapConductorCore"
  s.dependency "MapConductorReactNativeCore"
  s.dependency "MapConductorReactMarkerClustering"
  s.dependency "MapConductorForMapbox"
  s.dependency "MapboxMaps", "~> 11.26"
end
