---
name: react-native-reanimated requires react-native-worklets
description: reanimated v4's Babel plugin is a direct re-export of react-native-worklets/plugin — removing worklets breaks Metro bundling.
---

# react-native-reanimated v4 requires react-native-worklets

## The Rule
`react-native-worklets` must stay in `devDependencies` even though no app code imports it directly.

**Why:** `react-native-reanimated@4.x`'s Babel plugin (`react-native-reanimated/plugin/index.js`) is literally:
```js
const plugin = require('react-native-worklets/plugin');
module.exports = plugin;
```
Removing `react-native-worklets` causes Metro to crash at bundle time:
`Cannot find module 'react-native-worklets/plugin'`

The peer dependency range is `"react-native-worklets": "0.5 - 0.8"`. Use `0.5.1` for Expo SDK 54 / RN 0.81.

**How to apply:** When auditing unused packages in the mobile app, never remove `react-native-worklets` — it has no direct imports but is a hard Babel-time dependency of reanimated. Check `react-native-reanimated/plugin/index.js` before deciding any package is "unused".
