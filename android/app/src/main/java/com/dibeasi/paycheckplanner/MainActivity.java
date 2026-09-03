package com.dibeasi.paycheckplanner;

import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.method.ScrollingMovementMethod;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends BridgeActivity {

    private LinearLayout diagnosticOverlay;
    private TextView diagnosticText;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.bridge.getWebView();

        // Native overlay for RecoveringWebViewClient's diagnostics. Added
        // Aug 29, 2026: an earlier attempt tried to show the real error by
        // loading replacement HTML into the WebView itself, and on the
        // actual device that lost every time to Android System WebView's
        // own built-in "This page couldn't load" screen (a committed
        // Chromium interstitial -- see RecoveringWebViewClient's comment).
        // This overlay is a plain native Android view stacked on top of
        // the WebView, entirely outside Chromium's rendering, so nothing
        // the WebView does internally can cover it back up.
        ViewGroup parent = (ViewGroup) webView.getParent();

        diagnosticOverlay = new LinearLayout(this);
        diagnosticOverlay.setOrientation(LinearLayout.VERTICAL);
        diagnosticOverlay.setBackgroundColor(Color.BLACK);
        diagnosticOverlay.setPadding(48, 120, 48, 48);
        diagnosticOverlay.setVisibility(View.GONE);

        diagnosticText = new TextView(this);
        diagnosticText.setTextColor(Color.WHITE);
        diagnosticText.setTextSize(14);
        diagnosticText.setTypeface(Typeface.MONOSPACE);
        diagnosticText.setMovementMethod(new ScrollingMovementMethod());
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0,
            1f
        );
        diagnosticOverlay.addView(diagnosticText, textParams);

        Button retryButton = new Button(this);
        retryButton.setText("Retry now");
        retryButton.setOnClickListener(v -> {
            diagnosticOverlay.setVisibility(View.GONE);
            webView.reload();
        });
        diagnosticOverlay.addView(
            retryButton,
            new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        );

        parent.addView(
            diagnosticOverlay,
            new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        );
        diagnosticOverlay.bringToFront();

        // Swap in a WebViewClient that adds crash recovery + real error
        // diagnostics (reported through the native overlay above) on top
        // of everything Capacitor's default already does. Must happen
        // after super.onCreate() so this.bridge is initialized.
        this.bridge.getWebView().setWebViewClient(
            new RecoveringWebViewClient(this.bridge, (title, line1, line2, url) ->
                runOnUiThread(() -> {
                    String timestamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());
                    diagnosticText.setText(
                        "TIME: " + timestamp + "\n\n" + title + "\n" + line1 + "\n" + line2 + "\nurl: " + url
                    );
                    diagnosticOverlay.setVisibility(View.VISIBLE);
                    diagnosticOverlay.bringToFront();
                })
            )
        );

        // Enable Chrome remote debugging (chrome://inspect on a computer
        // with the phone plugged in via USB, USB debugging on) even for
        // release builds, so a future "app won't load" report can be
        // diagnosed directly instead of guessing. Safe: this only exposes
        // DevTools access, not a network-facing risk, and only matters if
        // someone already has physical USB access to an unlocked device.
        WebView.setWebContentsDebuggingEnabled(true);
    }
}
