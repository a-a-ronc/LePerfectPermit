import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  // Create vite config inline to bypass the problematic import
  const viteConfigInline = {
    plugins: [
      // Basic plugins without the problematic cartographer
      (await import("@vitejs/plugin-react")).default(),
      (await import("@replit/vite-plugin-runtime-error-modal")).default(),
      (await import("@replit/vite-plugin-shadcn-theme-json")).default(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "client", "src"),
        "@shared": path.resolve(process.cwd(), "shared"),
        "@assets": path.resolve(process.cwd(), "attached_assets"),
      },
    },
    root: path.resolve(process.cwd(), "client"),
    build: {
      outDir: path.resolve(process.cwd(), "dist/public"),
      emptyOutDir: true,
    },
  };

  const vite = await createViteServer({
    ...viteConfigInline,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );
      let template = fs.readFileSync(clientTemplate, "utf-8");

      template = await vite.transformIndexHtml(url, template);

      // Skip SSR for now to avoid document issues
      const html = template.replace(`<!--ssr-outlet-->`, '');

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      if (e instanceof Error) {
        vite.ssrFixStacktrace(e);
        console.log(e.stack);
        res.status(500).end(e.stack);
      }
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Make sure to build the project.`,
    );
  }

  app.use(express.static(distPath + "/public"));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath + "/public/index.html"));
  });
}