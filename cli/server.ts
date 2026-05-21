const HTML_PATH = "inline.html";
const PORT = 8080;

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      const html = await Deno.readTextFile(HTML_PATH);
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {
      return new Response("inline.html not found — run build-inline.sh first.", { status: 500 });
    }
  }
  return new Response("Not Found", { status: 404 });
}

console.log(`CollaPDF v1.4`);
console.log(`Servidor activo → http://localhost:${PORT}`);
console.log(`Abrí esa URL en tu navegador (Chrome, Firefox, etc.)`);

const openUrl = `http://localhost:${PORT}`;

try {
  const cmd =
    Deno.build.os === "windows"
      ? "cmd.exe"
      : Deno.build.os === "darwin"
        ? "open"
        : "xdg-open";

  const args =
    Deno.build.os === "windows" ? ["/c", "start", openUrl] : [openUrl];

  new Deno.Command(cmd, { args, stdout: "null", stderr: "null" }).spawn();
} catch {
  // No display available (Termux, headless server) — silently ignore
}

await Deno.serve({ port: PORT }, handler);
