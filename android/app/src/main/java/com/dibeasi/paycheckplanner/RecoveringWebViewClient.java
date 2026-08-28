package com.dibeasi.paycheckplanner;

import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Extends Capacitor's default WebViewClient purely to add diagnostics and an
 * extra safety net -- it does not remove or change anything Capacitor already
 * does (server.errorPath still fires normally, since every override below
 * calls super() first).
 *
 * Added Aug 29, 2026: server.errorPath alone did not resolve a report of the
 * app getting stuck on Android's generic "This page couldn't load" screen on
 * a Galaxy S10+ (Android 12), even on a clean reinstall, even though the
 * server and the errorPath config were both confirmed correct byte-for-byte
 * in the shipped build. Two gaps this closes:
 *
 *  1. Real error codes now get logged (Log.e, tag "PPWebView") so a future
 *     `adb logcat` / Chrome remote-debugging capture shows exactly what
 *     failed (DNS, TLS, timeout, HTTP status, etc.) instead of guessing.
 *  2. onRenderProcessGone gets an explicit reload on top of whatever
 *     Capacitor's plugin-listener mechanism does. Capacitor's own
 *     BridgeWebViewClient only reports the crash as "handled" if some
 *     plugin registered a listener for it; this app registers none, so an
 *     unhandled render-process crash could otherwise kill the whole app
 *     instead of recovering.
 */
public class RecoveringWebViewClient extends BridgeWebViewClient {

    private static final String TAG = "PPWebView";
    private static final String FALLBACK_URL = "https://paycheckplanner.ai";

    public RecoveringWebViewClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        super.onReceivedError(view, request, error);
        if (request != null && request.isForMainFrame()) {
            Log.e(
                TAG,
                "Main frame load error. code=" + error.getErrorCode() + " description=" + error.getDescription() + " url=" + request.getUrl()
            );
        }
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
        super.onReceivedHttpError(view, request, errorResponse);
        if (request != null && request.isForMainFrame()) {
            Log.e(TAG, "Main frame HTTP error. status=" + errorResponse.getStatusCode() + " url=" + request.getUrl());
        }
    }

    @Override
    public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
        boolean handledByPlugins = super.onRenderProcessGone(view, detail);
        Log.e(TAG, "Render process gone. didCrash=" + detail.didCrash() + " handledByPlugins=" + handledByPlugins);
        if (view != null) {
            view.post(() -> {
                String current = view.getUrl();
                view.loadUrl(current != null && !current.isEmpty() ? current : FALLBACK_URL);
            });
        }
        // Always report handled so Android does not kill the whole app.
        return true;
    }
}
