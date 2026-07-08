package com.collapdf.app;

import android.content.Intent;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;

@CapacitorPlugin(name = "FileWriter")
public class FileWriterPlugin extends Plugin {

    @PluginMethod
    public void writeBinary(PluginCall call) {
        String filename = call.getString("filename");
        String base64Data = call.getString("data");
        String directory = call.getString("directory", "cache");

        if (filename == null || base64Data == null) {
            call.reject("filename and data are required");
            return;
        }

        try {
            byte[] decoded = Base64.decode(base64Data, Base64.DEFAULT);

            File file;
            if ("documents".equals(directory)) {
                // Write to app-private storage directly.
                // Priority:
                //   1. getExternalFilesDir(DIRECTORY_DOCUMENTS) — app-private, no permissions needed
                //   2. getFilesDir() — internal storage fallback
                File privDir = getContext().getExternalFilesDir(
                    android.os.Environment.DIRECTORY_DOCUMENTS);
                if (privDir == null) privDir = getContext().getFilesDir();
                file = new File(privDir, filename);
                File parent = file.getParentFile();
                if (parent != null) parent.mkdirs();
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(decoded);
                }
            } else {
                File dir = getContext().getCacheDir();
                file = new File(dir, filename);
                File parent = file.getParentFile();
                if (parent != null) parent.mkdirs();
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(decoded);
                }
            }

            // Return both file:// and content:// URIs
            android.net.Uri fileUri = android.net.Uri.fromFile(file);
            android.net.Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );

            JSObject result = new JSObject();
            result.put("uri", fileUri.toString());           // file:// — compatible
            result.put("contentUri", contentUri.toString());  // content:// — secure
            result.put("filePath", file.getAbsolutePath());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("FileWriter error: " + e.getMessage());
        }
    }

    /**
     * Share PDF files via Android Intent with explicit application/pdf MIME type.
     * This bypasses the Capacitor Share plugin limitation that sets wildcard MIME for multiple files.
     */
    @PluginMethod
    public void sharePdfs(PluginCall call) {
        JSArray filesArray = call.getArray("files");
        String dialogTitle = call.getString("dialogTitle", "Compartir PDF");

        if (filesArray == null || filesArray.length() == 0) {
            call.reject("No files to share");
            return;
        }

        try {
            String authority = getContext().getPackageName() + ".fileprovider";
            ArrayList<android.net.Uri> contentUris = new ArrayList<>();

            // Convert each file:// URI to content:// via FileProvider
            for (int i = 0; i < filesArray.length(); i++) {
                String fileUriStr = filesArray.getString(i);
                if (fileUriStr == null) continue;
                android.net.Uri fileUri = android.net.Uri.parse(fileUriStr);
                File file = new File(fileUri.getPath());
                android.net.Uri contentUri = FileProvider.getUriForFile(
                    getContext(), authority, file);
                contentUris.add(contentUri);
            }

            if (contentUris.isEmpty()) {
                call.reject("No valid files to share");
                return;
            }

            Intent intent;
            if (contentUris.size() == 1) {
                intent = new Intent(Intent.ACTION_SEND);
                intent.putExtra(Intent.EXTRA_STREAM, contentUris.get(0));
            } else {
                intent = new Intent(Intent.ACTION_SEND_MULTIPLE);
                intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, contentUris);
            }

            intent.setType("application/pdf");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            // Also add FLAG_ACTIVITY_NEW_TASK since we might be calling from a non-activity context
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Intent chooser = Intent.createChooser(intent, dialogTitle);
            // Use Activity context when available for proper activity stack (Android 12+)
            if (getActivity() != null) {
                getActivity().startActivity(chooser);
            } else {
                getContext().startActivity(chooser);
            }

            call.resolve(new JSObject());
        } catch (Exception e) {
            call.reject("Share error: " + e.getMessage());
        }
    }
}
