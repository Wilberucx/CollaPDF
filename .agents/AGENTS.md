# CollaPDF - Project Rules and Architectural Decisions

This file contains crucial project-scoped lessons, rules, and architectural decisions discovered during development. Any agent working on this codebase MUST review these rules.

## Capacitor v8 Bridge & Native Plugins

1. **Capacitor API deprecations (v3 to v8):**
   - **DO NOT** use `window.Capacitor.isNative` to check if running in a native environment. It has been removed since Capacitor v3.
   - **DO** use `typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()` instead.
   - **DO** use `window.Capacitor.getPlatform()` to detect the platform.

2. **jsPDF Interception (Instance vs Prototype):**
   - In the UMD build of jsPDF v2.5.1 running under Android WebView, the `.save` method is assigned directly to each instance during construction (as an own property), rather than being inherited from `jsPDF.prototype`.
   - Modifying `window.jspdf.jsPDF.prototype.save` has **NO EFFECT** because the instance-level property shadows it.
   - To intercept PDF saving on Capacitor (to route it to the Filesystem and Share APIs), **DO NOT** patch the prototype.
   - Instead, decorate the constructor `window.jspdf.jsPDF` to override `instance.save` on every instantiated object:
     ```javascript
     var originalJsPDF = window.jspdf.jsPDF;
     window.jspdf.jsPDF = function() {
       var instance = new (Function.prototype.bind.apply(originalJsPDF, [null].concat(Array.prototype.slice.call(arguments))));
       var originalInstanceSave = instance.save;
       instance.save = function(filename) {
         // Custom save behavior (e.g. Capacitor Filesystem/Share capture)
       };
       return instance;
     };
     window.jspdf.jsPDF.prototype = originalJsPDF.prototype;
     ```

3. **Export PDF Timing & Async Interception:**
   - Instead of patching jsPDF globally, intercept `window.app.exportPDF` directly at the app level.
   - This ensures the UI loader animations and disabled buttons remain synchronized with the asynchronous Capacitor Filesystem and Share dialog flows.
