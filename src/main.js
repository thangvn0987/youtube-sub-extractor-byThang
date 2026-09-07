import { setupInterceptors, SubtitleState } from './subtitle_parser.js';
import { injectUI, updateLayout, resetLayout, syncTranscript, UIState } from './ui.js';

setupInterceptors();

function setupVideoHooks() {
    const video = document.querySelector('video');
    if (!video) return;

    if (!video.dataset.hooked) {
        video.dataset.hooked = 'true';

        video.addEventListener('pause', () => {
            let vid = new URLSearchParams(window.location.search).get('v');
            if (!vid && window.location.pathname.includes('/shorts/')) {
                vid = window.location.pathname.split('/shorts/')[1];
            }
            if (!vid) vid = 'unknown_test_id';
            SubtitleState.currentVideoId = vid;

            injectUI();

            const textArea = document.getElementById('custom-sub-text');
            if (textArea) {
                UIState.lastRenderedIndex = -1;
                UIState.lastStartIndex = -1;
                UIState.lazyWindow = { start: -1, end: -1 };
                syncTranscript(video.currentTime);
            }
            updateLayout();
        });

        video.addEventListener('play', () => {
            resetLayout();
        });

        video.addEventListener('timeupdate', () => {
            if (!UIState.isUiInjected || !UIState.isMenuPinned) return;
            const panel = document.getElementById('custom-sub-panel');
            
            if (panel && panel.style.display !== 'none') {
                syncTranscript(video.currentTime);
            }
        });
    }
}

window.addEventListener('resize', () => {
    const panel = document.getElementById('custom-sub-panel');
    if (panel && panel.style.display !== 'none') {
        updateLayout();
    }
});

setInterval(() => {
    if (window.location.pathname.includes('/watch') || document.querySelector('video')) {
        setupVideoHooks();
    }
}, 1500);