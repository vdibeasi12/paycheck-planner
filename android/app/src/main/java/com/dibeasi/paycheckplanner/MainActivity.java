package com.dibeasi.paycheckplanner;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Swap in a WebViewClient that adds crash recovery + real error
        // logging on top of everything Capacitor's default already does.
        // Must happen after super.onCreate() so this.bridge is initialized.
        // Added Aug 29, 2026 -- see RecoveringWebViewClient for why.
        this.bridge.getWebView().setWebViewClient(new RecoveringWebViewClient(this.bridge));

        // Enable Chrome remote debugging (chrome://inspect on a computer
        // with the phone plugged in via USB, USB debugging on) even for
        // release builds, so a future "app won't load" report can be
        // diagnosed directly instead of guessing. Safe: this only exposes
        // DevTools access, not a network-facing risk, and only matters if
        // someone already has physical USB access to an unlocked device.
        WebView.setWebContentsDebuggingEnabled(true);
    }
}
