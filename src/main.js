import { setupInterceptors, SubtitleState } from './subtitle_parser.js';
import { injectUI, updateLayout, resetLayout, getTranscriptHTML, UIState, safeHTML } from './ui.js';

// 1. Kích hoạt tính năng đánh chặn mạng (Interceptor) ngay lập tức khi load trang
// Điều này đảm bảo chúng ta chặn được request phụ đề của YouTube từ sớm nhất
setupInterceptors();

// 2. Gắn các sự kiện (hooks) vào video player
function setupVideoHooks() {
    const video = document.querySelector('video');
    if (!video) return;

    // Chỉ gắn hook 1 lần duy nhất cho mỗi video element
    if (!video.dataset.hooked) {
        video.dataset.hooked = 'true';

        // Xử lý sự kiện khi video TẠM DỪNG
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
                const result = getTranscriptHTML(video.currentTime);
                textArea.innerHTML = safeHTML(result.html);
                UIState.lastContextText = result.context;
            }
            updateLayout();
        });

        // Xử lý sự kiện khi video PHÁT TIẾP
        video.addEventListener('play', () => {
            resetLayout();
        });

        // Xử lý sự kiện đồng bộ chữ chạy theo thời gian thực (Time Update)
        video.addEventListener('timeupdate', () => {
            if (!UIState.isUiInjected || !UIState.isMenuPinned) return;
            const panel = document.getElementById('custom-sub-panel');
            
            if (panel && panel.style.display !== 'none') {
                const currentTime = video.currentTime;
                if (!SubtitleState.parsedSubs || SubtitleState.parsedSubs.length === 0) return;

                let currentIndex = -1;
                const captionSegments = document.querySelectorAll('.ytp-caption-segment');
                let currentUiText = Array.from(captionSegments).map(span => span.textContent).join(' ').trim();

                if (currentUiText) {
                    let cleanUiText = currentUiText.toLowerCase().replace(/[.,!?\n]/g, '').replace(/\s+/g, ' ');
                    for (let i = 0; i < SubtitleState.parsedSubs.length; i++) {
                        let sub = SubtitleState.parsedSubs[i];
                        if (Math.abs(currentTime - sub.start) <= 5.0 || Math.abs(currentTime - sub.end) <= 5.0) {
                            let cleanSubText = sub.text.toLowerCase().replace(/[.,!?\n]/g, '').replace(/\s+/g, ' ');
                            if (cleanSubText.includes(cleanUiText) || cleanUiText.includes(cleanSubText)) {
                                currentIndex = i;
                                break;
                            }
                        }
                    }
                }

                if (currentIndex === -1) {
                    for (let i = 0; i < SubtitleState.parsedSubs.length; i++) {
                        if (currentTime >= SubtitleState.parsedSubs[i].start && currentTime <= SubtitleState.parsedSubs[i].end + 0.2) {
                            currentIndex = i;
                            break;
                        }
                    }
                }

                if (currentIndex !== -1 && currentIndex !== UIState.lastRenderedIndex) {
                    UIState.lastRenderedIndex = currentIndex;
                    const result = getTranscriptHTML(currentTime);
                    const textArea = document.getElementById('custom-sub-text');

                    if (textArea) {
                        // Hiệu ứng mượt mà (smooth transition) khi chuyển đoạn
                        if (result.startIndex !== UIState.lastStartIndex && UIState.lastStartIndex !== -1) {
                            UIState.lastStartIndex = result.startIndex;

                            textArea.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
                            textArea.style.opacity = '0';
                            textArea.style.transform = 'translateY(-10px)';

                            setTimeout(() => {
                                textArea.innerHTML = safeHTML(result.html);

                                textArea.style.transition = 'none';
                                textArea.style.transform = 'translateY(10px)';
                                void textArea.offsetHeight; // Kích hoạt reflow

                                textArea.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
                                textArea.style.opacity = '1';
                                textArea.style.transform = 'translateY(0)';
                            }, 150);

                        } else {
                            UIState.lastStartIndex = result.startIndex;
                            textArea.innerHTML = safeHTML(result.html);
                        }

                        UIState.lastContextText = result.context;
                    }
                }
            }
        });
    }
}

// Lắng nghe sự kiện xoay màn hình điện thoại / đổi size cửa sổ
window.addEventListener('resize', () => {
    const panel = document.getElementById('custom-sub-panel');
    if (panel && panel.style.display !== 'none') {
        updateLayout();
    }
});

// Vòng lặp kiểm tra liên tục xem video đã xuất hiện trên trang chưa để gắn hook
setInterval(() => {
    if (window.location.pathname.includes('/watch') || document.querySelector('video')) {
        setupVideoHooks();
    }
}, 1500);