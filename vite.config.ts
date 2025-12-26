import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { generatePrerender } from './scripts/prerender-html'

// Plugin to inject pre-rendered HTML for instant FCP
function prerenderPlugin(): Plugin {
  return {
    name: 'prerender',
    apply: 'build',
    transformIndexHtml(html) {
      const prerenderedHtml = generatePrerender()
      // Inject before #root so it shows instantly, React will remove it
      return html.replace(
        '<div id="root"></div>',
        `${prerenderedHtml}<div id="root"></div>`
      )
    }
  }
}

// Plugin to inline only main CSS into HTML (not lazy-loaded chunks)
function inlineCssPlugin(): Plugin {
  return {
    name: 'inline-css',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        if (!bundle) return html

        // Find main CSS file (index.css), skip chunk CSS (like Lightbox)
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (fileName.endsWith('.css') && chunk.type === 'asset') {
            // Only inline index/main CSS, not component chunks
            const isMainCss = fileName.includes('index')

            if (isMainCss) {
              const cssContent = chunk.source as string

              // Replace link tag with inline style
              html = html.replace(
                new RegExp(`<link[^>]*href="[^"]*${fileName.split('/').pop()}"[^>]*>`),
                `<style>${cssContent}</style>`
              )

              // Remove inlined CSS from bundle
              delete bundle[fileName]
            }
          }
        }

        return html
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), prerenderPlugin(), inlineCssPlugin()],
  build: {
    cssCodeSplit: true,
  }
})
