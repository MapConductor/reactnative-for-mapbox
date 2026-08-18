module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath:
          'import com.mapconductor.react.mapbox.MapConductorMapboxPackage;',
        packageInstance: 'new MapConductorMapboxPackage()',
      },
      ios: {
        sourceDir: './ios',
      },
    },
  },
};
