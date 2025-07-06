const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { notarizeApp } = require('./notarize');

// Build packager config conditionally
const packagerConfig = {
    asar: {
        unpack:
            '**/*.node,**/*.dylib,' +
            '**/node_modules/{sharp,@img}/**/*'
    },
    extraResource: ['./src/assets/SystemAudioDump'],
    name: 'Glass',
    icon: 'src/assets/logo',
    appBundleId: 'com.pickle.glass',
    protocols: [
        {
            name: 'PickleGlass Protocol',
            schemes: ['pickleglass']
        }
    ],
    asarUnpack: [
        "**/*.node",
        "**/*.dylib",
        "node_modules/@img/sharp-darwin-arm64/**",
        "node_modules/@img/sharp-libvips-darwin-arm64/**"
    ],
};

// Only add osxSign if we have the identity
if (process.env.APPLE_IDENTITY) {
    packagerConfig.osxSign = {
        identity: process.env.APPLE_IDENTITY,
        'hardened-runtime': true,
        entitlements: 'entitlements.plist',
        'entitlements-inherit': 'entitlements.plist',
    };
}

// Only add osxNotarize if we have the required credentials
if (process.env.APPLE_ID && process.env.APPLE_PASSWORD && process.env.APPLE_TEAM_ID) {
    packagerConfig.osxNotarize = {
        tool: 'notarytool',
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID
    };
}

module.exports = {
    packagerConfig,
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: 'pickle-glass',
                productName: 'Glass',
                shortcutName: 'Glass',
                createDesktopShortcut: true,
                createStartMenuShortcut: true,
            },
        },
        {
            name: '@electron-forge/maker-dmg',
            platforms: ['darwin'],
        },
        {
            name: '@electron-forge/maker-deb',
            config: {},
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {},
        },
    ],
    hooks: {
        afterSign: async (context, forgeConfig, platform, arch, appPath) => {
            // Only notarize if we have the credentials
            if (process.env.APPLE_ID && process.env.APPLE_PASSWORD) {
                await notarizeApp(context, forgeConfig, platform, arch, appPath);
            }
        },
    },
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: false,
        }),
    ],
};
