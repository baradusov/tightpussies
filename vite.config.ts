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

// Plugin to inline all CSS into HTML
function inlineCssPlugin(): Plugin {
  return {
    name: 'inline-css',
    enforce: 'post',
    apply: 'build',
    generateBundle(_, bundle) {
      // Find the HTML file and all CSS files
      let htmlFile: { fileName: string; source: string } | null = null
      const cssFiles: { fileName: string; source: string }[] = []

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.html') && chunk.type === 'asset') {
          htmlFile = { fileName, source: chunk.source as string }
        }
        if (fileName.endsWith('.css') && chunk.type === 'asset') {
          cssFiles.push({ fileName, source: chunk.source as string })
        }
      }

      if (!htmlFile || cssFiles.length === 0) return

      let html = htmlFile.source

      // Inline all CSS files
      for (const css of cssFiles) {
        const cssFileName = css.fileName.split('/').pop()
        // Replace link tag with inline style
        html = html.replace(
          new RegExp(`<link[^>]*href="[^"]*${cssFileName}"[^>]*>`),
          `<style>${css.source}</style>`
        )
        // Remove CSS file from bundle
        delete bundle[css.fileName]
      }

      // Update HTML in bundle
      ;(bundle[htmlFile.fileName] as { source: string }).source = html
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), prerenderPlugin(), inlineCssPlugin()],
  build: {
    cssCodeSplit: false,
  }
})
