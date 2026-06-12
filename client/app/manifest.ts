import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EthioHelperAI',
    short_name: 'EthioHelper',
    description: 'AI-Powered Guide to Ethiopian Services, Education, Health, and Business Processes',
    start_url: '/',
    display: 'standalone',
    background_color: '#efefef',
    theme_color: '#efefef',
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
