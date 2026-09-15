import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'YouTube Auto Subtitle Extractor V6.0',
        namespace: 'http://tampermonkey.net/',
        version: '7.1.0',
        description: 'Trích xuất phụ đề YouTube và Menu nổi phân tích câu hỏi TOEIC trên mọi trang web',
        match: ['*://*.youtube.com/*', '*://*/*'],
        'run-at': 'document-start',
        grant: ['GM_xmlhttpRequest', 'GM_setValue', 'GM_getValue'],
        connect: [
          'translate.googleapis.com',
          'api.openai.com',
          'script.google.com',
          'googleusercontent.com',
          'script.googleusercontent.com',
          'api.shopaikey.com',
          '*'
        ],
        updateURL: 'https://raw.githubusercontent.com/thangvn0987/youtube-sub-extractor-byThang/main/dist/youtube-sub-extractor.user.js',
	downloadURL: 'https://raw.githubusercontent.com/thangvn0987/youtube-sub-extractor-byThang/main/dist/youtube-sub-extractor.user.js',
      },
    }),
  ],
});