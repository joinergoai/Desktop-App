const { notarize } = require('@electron/notarize');

exports.notarizeApp = async function (context, forgeConfig, platform, arch, appPath) {
  // Handle both electron-builder and electron-forge contexts
  let electronPlatformName, appOutDir, appName, actualAppPath;
  
  if (context.electronPlatformName !== undefined) {
    // electron-builder context
    electronPlatformName = context.electronPlatformName;
    appOutDir = context.appOutDir;
    appName = context.packager.appInfo.productFilename;
    actualAppPath = `${appOutDir}/${appName}.app`;
  } else {
    // electron-forge context
    electronPlatformName = platform || 'darwin';
    actualAppPath = appPath;
  }

  if (electronPlatformName !== 'darwin') {
    return;
  }

  console.log(' notarizing a macOS build!');

  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD || !process.env.APPLE_TEAM_ID) {
    throw new Error('APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID environment variables are required for notarization.');
  }

  await notarize({
    appBundleId: 'com.ergo.live',
    appPath: actualAppPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  console.log(`Successfully notarized ${actualAppPath}`);
}; 