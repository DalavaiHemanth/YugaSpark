import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
    modulePreload: {
      resolveDependencies: (_filename, deps, { hostType }) => {
        if (hostType === "html") {
          return deps.filter(
            (dep) =>
              !dep.includes("vendor-charts") &&
              !dep.includes("InsightsPanel") &&
              !dep.includes("ClubLegacyShowcase") &&
              !dep.includes("xlsx")
          );
        }
        return deps;
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/recharts")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-lucide";
          }
        },
      },
    },
  },
});
