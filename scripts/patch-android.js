/* Makes the Android app truly full-screen (edge-to-edge):
   - draws behind the status bar and the navigation bar
   - hides the status bar entirely
   - lets the WebView fill the whole window

   Capacitor generates the android/ project during the build, so the
   native files can't live in the repo -- this script writes them
   right after "cap add android" / "cap sync android".

   Run automatically by "npm run apk" and "npm run sync". */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ANDROID = path.join(ROOT, "android");

if (!fs.existsSync(ANDROID)) {
  console.log("  ! android/ haipo bado, script imerukwa");
  process.exit(0);
}

/* ---------- 1. MainActivity: hide the status bar ---------- */

function findMainActivity(dir) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(full);
      if (found) return found;
    } else if (entry.name === "MainActivity.java") {
      return full;
    }
  }
  return null;
}

const activityPath = findMainActivity(path.join(ANDROID, "app/src/main/java"));

if (!activityPath) {
  console.log("  ! MainActivity.java haipo, imerukwa");
  process.exit(0);
}

const activityPackage = (() => {
  const src = fs.readFileSync(activityPath, "utf8");
  const match = src.match(/package\s+([\w.]+);/);
  return match ? match[1] : "com.wellxai.niite";
})();

fs.writeFileSync(
  activityPath,
  `package ${activityPackage};

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Draw behind the status bar and navigation bar (edge-to-edge)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Let the WebView use the full window
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);

        // Hide the status bar completely
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.statusBars());
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
    }
}
`
);

console.log("  + MainActivity.java (edge-to-edge, status bar imefichwa)");

/* ---------- 2. Manifest: no action bar, keep INTERNET ---------- */

const manifestPath = path.join(ANDROID, "app/src/main/AndroidManifest.xml");

if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, "utf8");

  if (!manifest.includes('android:name=".MainActivity"')) {
    manifest = manifest.replace(
      /<activity/,
      `<activity\n            android:exported="true"\n            android:name=".MainActivity"`
    );
  }

  if (!manifest.includes("android:theme")) {
    manifest = manifest.replace(
      /<application/,
      `<application\n        android:theme="@style/AppTheme.NoActionBar"`
    );
  }

  if (!manifest.includes("android:windowSoftInputMode")) {
    manifest = manifest.replace(
      /android:name="\.MainActivity"/,
      `android:name=".MainActivity"\n            android:windowSoftInputMode="adjustResize"`
    );
  }

  fs.writeFileSync(manifestPath, manifest);
  console.log("  + AndroidManifest.xml (no action bar, adjustResize)");
}

/* ---------- 3. Styles: transparent bars, no title ---------- */

const stylesPath = path.join(ANDROID, "app/src/main/res/values/styles.xml");

if (fs.existsSync(stylesPath)) {
  fs.writeFileSync(
    stylesPath,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:windowBackground">@android:color/black</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:windowTranslucentStatus">true</item>
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
    </style>
</resources>
`
  );
  console.log("  + styles.xml (status/nav bars wazi)");
}

/* ---------- 4. Gradle: androidx.core for WindowCompat ---------- */

const appGradle = path.join(ANDROID, "app/build.gradle");

if (fs.existsSync(appGradle)) {
  let gradle = fs.readFileSync(appGradle, "utf8");
  if (!gradle.includes("androidx.core:core")) {
    gradle = gradle.replace(
      /dependencies\s*\{/,
      `dependencies {\n    implementation "androidx.core:core:1.13.1"`
    );
    fs.writeFileSync(appGradle, gradle);
    console.log("  + build.gradle (androidx.core imeongezwa)");
  }
}

console.log("\nAndroid imepatchiwa — app itafunika screen nzima.");
