// ═══════════════════════════════════════════
//  CAPACITOR BRIDGE — Native Android features
//  Included only in Capacitor builds (dist/)
// ═══════════════════════════════════════════

(function() {
  function toast(msg, type) {
    if (window.app && window.app.showToast) {
      try { window.app.showToast(msg, type || 'info'); } catch(e) {}
    } else if (window.showToast) {
      try { window.showToast(msg, type || 'info'); } catch(e) {}
    }
  }

  // Detect Capacitor v8 environment
  var hasCapWin   = typeof window !== 'undefined' && !!window.Capacitor;
  var _isNative   = hasCapWin && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform();

  var isCapacitor = hasCapWin && _isNative;
  if (!isCapacitor) return;

  var Plugins = window.Capacitor.Plugins;
  window.__capacitorMode = true; // signals pdf.js to always use blob approach

  // ── StatusBar ──
  try {
    if (Plugins.StatusBar) {
      Plugins.StatusBar.setStyle({ style: 'DARK' });
      Plugins.StatusBar.setBackgroundColor({ color: '#0c0c0c' });
      Plugins.StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (e) {}

  // ── Override window.app.exportPDF ──
  // Strategy: DON'T wrap jsPDF — pdf.js already collects blobs on mobile
  // and stores them in window.__pendingExports.
  // We just hook the share dialog buttons for native save/share.
  function installExportOverride() {
    if (!window.app || !window.app.exportPDF) {
      return false;
    }
    if (window.app.exportPDF.__capacitorPatched) return true;

    if (!Plugins.Filesystem) {
      toast('ERROR: Filesystem plugin no disponible', 'error');
      return false;
    }

    var _originalExportPDF = window.app.exportPDF;

    // Save references to restore in case of failure
    var _originalShareSave   = window.app.shareDialogSave;
    var _originalShareShare  = window.app.shareDialogShare;

    window.app.exportPDF = async function() {
      // 1) Check jsPDF is loaded
      if (!window.jspdf || !window.jspdf.jsPDF) {
        toast('Error: jsPDF no cargó correctamente.', 'error');
        return _originalExportPDF.apply(this, arguments);
      }

      var docs = window.app.getDocuments ? window.app.getDocuments() : [];
      var docsWithImages = docs.filter(function(d) { return d.images.length > 0; });

      if (!docsWithImages.length) {
        toast('Agregá imágenes antes de exportar.', 'error');
        return;
      }

      // 2) Reset pending exports and set up capacitor-specific dialog buttons
      //    BEFORE calling the original export (pdf.js will show the dialog)
      window.__pendingExports = [];

      window.app.shareDialogSave = function() {
        // Show saving state
        if (window.app.showShareSaving) {
          window.app.showShareSaving();
        }

        // Save in background via FileWriter
        setTimeout(function() {
          saveToDevice(function(err, savedUris) {
            if (err) {
              // Show error state in dialog
              if (window.app.showShareError) {
                window.app.showShareError(err);
              }
            } else {
              // Show success state with real saved filenames
              var exports = window.__pendingExports || [];
              var filenames = exports.map(function(e) { return e.filename; });
              var msg;
              if (filenames.length === 1) {
                msg = 'Documents/CollaPDF/' + filenames[0];
              } else {
                msg = 'Documents/CollaPDF/: ' + filenames.join(', ');
              }
              if (window.app.showShareSuccess) {
                window.app.showShareSuccess(msg);
              }
            }
            window.__pendingExports = [];
          });
        }, 200);
      };

      window.app.shareDialogShare = function() {
        window.app.closeShareDialog();
        setTimeout(function() {
          saveToDevice(function(err, savedUris) {
            if (!err && savedUris && savedUris.length && Plugins.FileWriter) {
              // Use custom native share method that sets explicit application/pdf MIME type.
              // Bypasses Capacitor Share plugin which defaults to */* for multiple files.
              Plugins.FileWriter.sharePdfs({
                files: savedUris,
                dialogTitle: 'Compartir PDF'
              }).catch(function(err) {
                console.warn('[CAP] sharePdfs error:', err);
              });
            }
            window.__pendingExports = [];
          });
        }, 200);
      };

      // 3) Run the original exportPDF
      //    On mobile, pdf.js collects blobs in window.__pendingExports
      //    and calls showShareDialog() with the toast "PDF generado con éxito."
      try {
        await _originalExportPDF.apply(this, arguments);
      } catch(e) {
        console.warn('[CAP] exportPDF error:', e);
      }

      // 4) Verify exports were captured
      var exports = window.__pendingExports || [];
      if (!exports.length) {
        // pdf.js already showed the error toast — just restore default dialog buttons
        window.app.shareDialogSave   = _originalShareSave;
        window.app.shareDialogShare  = _originalShareShare;
      }
    };

    // ── Helper: save PDFs to device via FileWriter plugin ──
    // Calls callback(null, savedUris) on success, callback(errorMessage) on error
    function saveToDevice(callback) {
      var exports = window.__pendingExports || [];
      if (!exports.length) { if (callback) callback(null, []); return; }

      if (!Plugins.FileWriter) {
        if (callback) callback('FileWriter plugin no disponible');
        return;
      }

      var savedUris = [];
      var pending = exports.length;
      var hasError = false;

      exports.forEach(function(item) {
        var reader = new FileReader();
        reader.onload = function() {
          if (hasError) return;
          var base64Data = reader.result.split(',')[1];
          Plugins.FileWriter.writeBinary({
            filename: 'CollaPDF/' + item.filename,
            data: base64Data,
            directory: 'documents'
          }).then(function(result) {
            if (hasError) return;
            savedUris.push(result.uri);
            pending--;
            if (pending === 0) {
              if (callback) callback(null, savedUris);
            }
          }).catch(function(err) {
            if (hasError) return;
            hasError = true;
            console.warn('[CAP] FileWriter error:', err);
            if (callback) callback('Error al escribir archivo: ' + (err.message || err));
          });
        };
        reader.onerror = function() {
          if (hasError) return;
          hasError = true;
          if (callback) callback('Error al leer el blob del PDF');
        };
        reader.readAsDataURL(item.blob);
      });
    }

    window.app.exportPDF.__capacitorPatched = true;
    return true;
  }

  // Try immediately, then retry in case window.app isn't ready yet
  if (!installExportOverride()) {
    setTimeout(function() {
      if (!installExportOverride()) {
        setTimeout(installExportOverride, 1000);
      }
    }, 300);
  }
})();
