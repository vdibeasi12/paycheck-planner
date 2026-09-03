package com.dibeasi.paycheckplanner;

import android.net.http.SslError;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
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
 * Added Aug 29, 2026, revised same day: the first version of this file
 * tried to show the real error by calling view.loadDataWithBaseURL(...) to
 * replace the WebView's own content on failure. Tested on the actual
 * device (Galaxy S10+, Android 12) and it did NOT work -- the phone kept
 * showing Android System WebView's own built-in "This page couldn't load"
 * screen instead of our replacement HTML. Root cause: modern Android
 * System WebView renders that screen as a *committed* Chromium
 * interstitial (the same mechanism behind the SSL warning page in desktop
 * Chrome) -- it becomes the actual committed navigation entry for that
 * failed load, so a second load call issued from inside/after
 * onReceivedError loses the race and gets overridden right back by the
 * interstitial finishing its own commit.
 *
 * Fix: stop trying to inject content into the WebView's document at all.
 * Instead this class only reports what happened through a plain callback
 * (DiagnosticListener) to MainActivity, which shows it in a native Android
 * view stacked on top of the WebView -- completely outside Chromium's
 * rendering pipeline, so nothing the WebView does internally can hide it.
 */
public class RecoveringWebViewClient extends BridgeWebViewClient {

    private static final String TAG = "PPWebView";

    /** Reports a failure to the host Activity so it can show it natively. */
    public interface DiagnosticListener {
        void onDiagnostic(String title, String line1, String line2, String url);
    }

    private final DiagnosticListener listener;

    public RecoveringWebViewClient(Bridge bridge, DiagnosticListener listener) {
        super(bridge);
        this.listener = listener;
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        super.onReceivedError(view, request, error);
        if (request != null && request.isForMainFrame()) {
            Log.e(
                TAG,
                "Main frame load error. code=" + error.getErrorCode() + " description=" + error.getDescription() + " url=" + request.getUrl()
            );
            listener.onDiagnostic(
                "LOAD ERROR",
                "code: " + error.getErrorCode(),
                "description: " + error.getDescription(),
                String.valueOf(request.getUrl())
            );
        }
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
        super.onReceivedHttpError(view, request, errorResponse);
        if (request != null && request.isForMainFrame()) {
            Log.e(TAG, "Main frame HTTP error. status=" + errorResponse.getStatusCode() + " url=" + request.getUrl());
            listener.onDiagnostic(
                "HTTP ERROR",
                "status: " + errorResponse.getStatusCode(),
                "reason: " + errorResponse.getReasonPhrase(),
                String.valueOf(request.getUrl())
            );
        }
    }

    @Override
    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
        // Deliberately NOT calling handler.proceed() -- that would bypass
        // certificate validation and is never safe, no matter what this
        // screen shows. We still cancel exactly like the platform default;
        // we just make the failure visible instead of silent.
        String msg = "SSL error. primaryError=" + error.getPrimaryError() + " url=" + error.getUrl();
        Log.e(TAG, msg);
        listener.onDiagnostic("SSL ERROR", "primaryError: " + error.getPrimaryError(), sslErrorName(error.getPrimaryError()), String.valueOf(error.getUrl()));
        super.onReceivedSslError(view, handler, error);
    }

    @Override
    public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
        boolean handledByPlugins = super.onRenderProcessGone(view, detail);
        Log.e(TAG, "Render process gone. didCrash=" + detail.didCrash() + " handledByPlugins=" + handledByPlugins);
        String current = view != null ? view.getUrl() : null;
        listener.onDiagnostic("RENDER PROCESS GONE", "didCrash: " + detail.didCrash(), "handledByPlugins: " + handledByPlugins, String.valueOf(current));
        // Always report handled so Android does not kill the whole app.
        return true;
    }

    private static String sslErrorName(int primaryError) {
        switch (primaryError) {
            case SslError.SSL_NOTYETVALID: return "SSL_NOTYETVALID (cert not yet valid)";
            case SslError.SSL_EXPIRED: return "SSL_EXPIRED (cert expired)";
            case SslError.SSL_IDMISMATCH: return "SSL_IDMISMATCH (hostname mismatch)";
            case SslError.SSL_UNTRUSTED: return "SSL_UNTRUSTED (untrusted cert / broken chain)";
            case SslError.SSL_DATE_INVALID: return "SSL_DATE_INVALID (device clock wrong)";
            case SslError.SSL_INVALID: return "SSL_INVALID (generic)";
            default: return "unknown (" + primaryError + ")";
        }
    }
}
