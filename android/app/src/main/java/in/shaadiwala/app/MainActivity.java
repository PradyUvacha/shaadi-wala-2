package in.shaadiwala.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        // Honor width=device-width. A wide viewport with overview mode lays the
        // page out near 980px and scales it down, which is the half-width phone bug.
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        webView.setInitialScale(0);
    }
}
