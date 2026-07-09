package com.collapdf.app;

import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
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
import java.io.OutputStream;
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

            File file = null;
            android.net.Uri resultUri = null;
            boolean isMediaStore = false;
            String cleanName = filename;

            if ("documents".equals(directory)) {
                // Ensure filename doesn't contain path separators for public storage
                int slashIdx = filename.lastIndexOf('/');
                if (slashIdx >= 0) cleanName = filename.substring(slashIdx + 1);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    // Android 10+: use MediaStore to write to public Documents/CollaPDF/
                    try {
                        String uniqueName = resolveUniqueMediaStoreName(cleanName);

                        android.net.Uri collection = MediaStore.Files.getContentUri("external");

                        ContentValues values = new ContentValues();
                        values.put(MediaStore.MediaColumns.DISPLAY_NAME, uniqueName);
                        values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                        values.put(MediaStore.MediaColumns.RELATIVE_PATH,
                            Environment.DIRECTORY_DOCUMENTS + "/CollaPDF/");
                        values.put("is_pending", 1);

                        android.net.Uri mediaUri = getContext().getContentResolver()
                            .insert(collection, values);

                        if (mediaUri != null) {
                            try (OutputStream out = getContext().getContentResolver()
                                    .openOutputStream(mediaUri)) {
                                if (out != null) {
                                    out.write(decoded);
                                    out.flush();
                                } else {
                                    throw new Exception("Cannot open output stream");
                                }
                            }

                            // Clear pending flag to make file visible to other apps
                            ContentValues updateValues = new ContentValues();
                            updateValues.put("is_pending", 0);
                            getContext().getContentResolver().update(mediaUri, updateValues, null, null);

                            cleanName = uniqueName;
                            resultUri = mediaUri;
                            isMediaStore = true;
                        } else {
                            throw new Exception("MediaStore insert returned null");
                        }
                    } catch (Exception e) {
                        android.util.Log.w("CollaPDF-FP", "MediaStore failed: " + e.getMessage() + " — falling back to cache");
                        // Fallback: write to app-private cache
                        File cacheDir = getContext().getCacheDir();
                        file = resolveUniqueFile(cacheDir, filename);
                        File parent = file.getParentFile();
                        if (parent != null) parent.mkdirs();
                        try (FileOutputStream fos = new FileOutputStream(file)) {
                            fos.write(decoded);
                        }
                        resultUri = android.net.Uri.fromFile(file);
                    }
                } else {
                    // Android 9 and below: direct write to public Documents/
                    File pubDir = Environment.getExternalStoragePublicDirectory(
                        Environment.DIRECTORY_DOCUMENTS);
                    file = resolveUniqueFile(pubDir, "CollaPDF/" + cleanName);
                    File parent = file.getParentFile();
                    if (parent != null) parent.mkdirs();
                    try (FileOutputStream fos = new FileOutputStream(file)) {
                        fos.write(decoded);
                    }
                    resultUri = android.net.Uri.fromFile(file);
                }
            } else {
                File dir = getContext().getCacheDir();
                file = resolveUniqueFile(dir, filename);
                File parent = file.getParentFile();
                if (parent != null) parent.mkdirs();
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(decoded);
                }
                resultUri = android.net.Uri.fromFile(file);
            }

            JSObject result = new JSObject();
            result.put("uri", resultUri.toString());
            if (!isMediaStore && file != null) {
                android.net.Uri contentUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    file
                );
                result.put("contentUri", contentUri.toString());
                result.put("filePath", file.getAbsolutePath());
                result.put("filename", file.getName());
            } else if (isMediaStore) {
                result.put("contentUri", resultUri.toString());
                result.put("filePath", Environment.DIRECTORY_DOCUMENTS + "/CollaPDF/" + cleanName);
                result.put("filename", cleanName);
            }
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

            // Convert each URI to content:// for sharing
            for (int i = 0; i < filesArray.length(); i++) {
                String uriStr = filesArray.getString(i);
                if (uriStr == null) continue;
                android.net.Uri parsed = android.net.Uri.parse(uriStr);

                if ("content".equals(parsed.getScheme())) {
                    // Already a content:// URI (e.g. from MediaStore), use directly
                    contentUris.add(parsed);
                } else {
                    // file:// URI — convert via FileProvider for secure sharing
                    File file = new File(parsed.getPath());
                    android.net.Uri contentUri = FileProvider.getUriForFile(
                        getContext(), authority, file);
                    contentUris.add(contentUri);
                }
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

    /**
     * Resolve a unique filename within the MediaStore Documents/CollaPDF/ collection.
     * Queries MediaStore for existing files with the same base name and appends
     * a counter suffix (_1, _2, ...) if needed.
     */
    private String resolveUniqueMediaStoreName(String cleanName) {
        android.net.Uri collection = MediaStore.Files.getContentUri("external");
        String relPath = Environment.DIRECTORY_DOCUMENTS + "/CollaPDF/";

        String baseName = cleanName;
        String ext = "";
        int dot = cleanName.lastIndexOf('.');
        if (dot > 0) {
            baseName = cleanName.substring(0, dot);
            ext = cleanName.substring(dot);
        }

        if (!mediaStoreFileExists(collection, cleanName, relPath)) {
            return cleanName;
        }

        for (int counter = 1; counter <= 999; counter++) {
            String candidate = baseName + "_" + counter + ext;
            if (!mediaStoreFileExists(collection, candidate, relPath)) {
                return candidate;
            }
        }

        return baseName + "_" + System.currentTimeMillis() + ext;
    }

    /**
     * Check if a file with the given display name exists in the MediaStore collection.
     */
    private boolean mediaStoreFileExists(android.net.Uri collection, String displayName, String relPath) {
        String selection = MediaStore.MediaColumns.DISPLAY_NAME + " = ? AND " +
            MediaStore.MediaColumns.RELATIVE_PATH + " = ?";
        String[] args = new String[]{displayName, relPath};
        try (Cursor cursor = getContext().getContentResolver().query(
                collection, new String[]{MediaStore.MediaColumns._ID},
                selection, args, null)) {
            return cursor != null && cursor.getCount() > 0;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Resolve a unique file path by appending a counter suffix if the file already exists.
     * This prevents overwriting existing files when exporting multiple PDFs with the same name.
     */
    private File resolveUniqueFile(File dir, String filename) {
        File file = new File(dir, filename);
        if (!file.exists()) return file;

        String name = filename;
        String ext = "";
        int dot = filename.lastIndexOf('.');
        if (dot > 0) {
            name = filename.substring(0, dot);
            ext = filename.substring(dot);
        }

        for (int counter = 1; counter <= 999; counter++) {
            String uniqueName = name + "_" + counter + ext;
            File candidate = new File(dir, uniqueName);
            if (!candidate.exists()) return candidate;
        }

        // Fallback: append timestamp (microsecond precision)
        String tsName = name + "_" + System.currentTimeMillis() + ext;
        return new File(dir, tsName);
    }
}
