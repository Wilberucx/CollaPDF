package com.collapdf.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(FileWriterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
