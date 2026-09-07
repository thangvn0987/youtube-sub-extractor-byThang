import { Config } from './config.js';
import { API } from './api.js';
import { SubtitleState } from './subtitle_parser.js';

export const UIState = {
    isUiInjected: false,
    lastContextText: "",
    isMenuPinned: false,
    lastRenderedIndex: -1,
    lastStartIndex: -1,
    lazyWindow: { start: -1, end: -1 },
    isUserScrolling: false,
    userScrollTimer: null
};

let ttPolicy;
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
        ttPolicy = window.trustedTypes.createPolicy('ytse-policy', {
            createHTML: (string) => string
        });
    } catch (e) {}
}

export function safeHTML(htmlString) {
    return ttPolicy ? ttPolicy.createHTML(htmlString) : htmlString;
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    return escapeHtml(str).replace(/`/g, '&#096;');
}

function injectToolButtonStyles() {
    if (document.getElementById('ytse-tool-style')) return;
    const style = document.createElement('style');
    style.id = 'ytse-tool-style';
    style.textContent = `
        #custom-sub-panel .ytse-tool-btn {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.14);
            background: rgba(255,255,255,0.045);
            color: #d7d7d7;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background .16s ease, border-color .16s ease, color .16s ease, transform .12s ease;
            padding: 0;
            outline: none;
            box-sizing: border-box;
        }
        #custom-sub-panel .ytse-tool-btn:hover {
            background: rgba(255,255,255,0.10);
            border-color: rgba(255,255,255,0.28);
            color: #ffffff;
            transform: translateY(-1px);
        }
        #custom-sub-panel .ytse-tool-btn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
            transform: none;
        }
        #custom-sub-panel .ytse-tool-btn svg {
            width: 21px;
            height: 21px;
            stroke-width: 2;
        }
        #custom-sub-panel .ytse-tool-btn.ytse-success {
            color: #38d996;
            border-color: rgba(56,217,150,0.45);
            background: rgba(56,217,150,0.10);
        }
        #custom-sub-panel .ytse-tool-btn.ytse-error {
            color: #ff6b6b;
            border-color: rgba(255,107,107,0.45);
            background: rgba(255,107,107,0.10);
        }
        @keyframes ytse-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        #custom-sub-panel .ytse-spin {
            animation: ytse-spin .8s linear infinite;
        }
        #custom-sub-panel .sub-block {
            color: #777777;
            font-weight: normal;
            margin-bottom: 12px;
            line-height: 1.4;
            position: relative;
            transition: color 0.25s ease, text-shadow 0.25s ease;
        }
        #custom-sub-panel .sub-block.ytse-active {
            color: #ffffff;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}

function iconSvg(name) {
    const icons = {
        language: `
            <path d="M4 5h7" />
            <path d="M9 3v2c0 4.418 -2.239 8 -5 8" />
            <path d="M5 9c0 2.144 2.952 3.908 6.7 4" />
            <path d="M12 20l4 -9l4 9" />
            <path d="M19.1 18h-6.2" />
        `,
        sparkles: `
            <path d="M12 3l1.8 5.2l5.2 1.8l-5.2 1.8l-1.8 5.2l-1.8 -5.2l-5.2 -1.8l5.2 -1.8z" />
            <path d="M19 3l.7 2l2 .7l-2 .7l-.7 2l-.7 -2l-2 -.7l2 -.7z" />
            <path d="M5 16l.9 2.6l2.6 .9l-2.6 .9l-.9 2.6l-.9 -2.6l-2.6 -.9l2.6 -.9z" />
        `,
        bookmarkPlus: `
            <path d="M6 4a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v18l-6 -4l-6 4z" />
            <path d="M12 7v6" />
            <path d="M9 10h6" />
        `,
        microphonePlus: `
            <path d="M9 5a3 3 0 0 1 6 0v5a3 3 0 0 1 -6 0z" />
            <path d="M5 10a7 7 0 0 0 11 5.74" />
            <path d="M12 17v4" />
            <path d="M8 21h8" />
            <path d="M18 16v6" />
            <path d="M15 19h6" />
        `,
        playerPlay: `
            <path d="M7 4v16l13 -8z" />
        `,
        rewind: `
            <path d="M21 5v14l-8 -7z" />
            <path d="M10 5v14l-8 -7z" />
        `,
        settings: `
            <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
            <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
        `,
        check: `
            <path d="M5 12l5 5l10 -10" />
        `,
        x: `
            <path d="M18 6l-12 12" />
            <path d="M6 6l12 12" />
        `,
        loader: `
            <path d="M12 3a9 9 0 1 0 9 9" />
        `,
        pin: `
            <path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4" />
            <path d="M9 15l-4.5 4.5" />
            <path d="M14.5 4l5.5 5.5" />
        `
    };

    const spinClass = name === 'loader' ? 'ytse-spin' : '';
    return `
        <svg class="${spinClass}" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
             xmlns="http://www.w3.org/2000/svg">
            ${icons[name] || icons.x}
        </svg>
    `;
}

function createToolButton(iconName, title) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ytse-tool-btn';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.dataset.icon = iconName;
    btn.innerHTML = safeHTML(iconSvg(iconName));
    return btn;
}

function setToolButtonState(btn, state) {
    btn.classList.remove('ytse-success', 'ytse-error');
    btn.disabled = false;

    if (state === 'loading') {
        btn.disabled = true;
        btn.innerHTML = safeHTML(iconSvg('loader'));
        return;
    }
    if (state === 'success') {
        btn.classList.add('ytse-success');
        btn.innerHTML = safeHTML(iconSvg('check'));
        return;
    }
    if (state === 'error') {
        btn.classList.add('ytse-error');
        btn.innerHTML = safeHTML(iconSvg('x'));
        return;
    }
    btn.innerHTML = safeHTML(iconSvg(btn.dataset.icon));
}

function getSelectedSubInfo() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText || selection.rangeCount === 0) {
        return {
            selectedText: '',
            sourceSentence: '',
            targetBlock: null
        };
    }

    let container = selection.getRangeAt(0).commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
    }

    const targetBlock = container.closest ? container.closest('.sub-block') : null;
    let sourceSentence = '';

    if (targetBlock) {
        sourceSentence = targetBlock.dataset.text || targetBlock.innerText || '';
        sourceSentence = sourceSentence.replace(/\s+/g, ' ').trim();
    }

    if (!sourceSentence) {
        sourceSentence = UIState.lastContextText || selectedText;
    }

    return {
        selectedText,
        sourceSentence,
        targetBlock
    };
}

function createInlineBox(targetBlock, typeColor) {
    const transEl = document.createElement('div');
    transEl.style.cssText = `
        color: ${typeColor};
        font-size: 15px;
        font-style: italic;
        margin-top: 5px;
        padding: 8px;
        background: rgba(255,255,255,0.05);
        border-left: 3px solid ${typeColor};
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        cursor: pointer;
        font-weight: normal;
    `;
    const textSpan = document.createElement('span');
    textSpan.innerText = "Đang dịch...";
    textSpan.style.flexGrow = "1";

    const closeSpan = document.createElement('span');
    closeSpan.innerText = "×";
    closeSpan.style.cssText = "color:#888; font-size:16px; padding-left:10px; font-weight:bold;";

    transEl.appendChild(textSpan);
    transEl.appendChild(closeSpan);

    transEl.addEventListener('click', (e) => {
        e.stopPropagation();
        transEl.remove();
    });

    targetBlock.appendChild(transEl);
    return textSpan;
}

export function updateLayout() {
    const panel = document.getElementById('custom-sub-panel');
    if (!panel) return;
    panel.style.display = 'flex';

    const isLandscape = window.innerWidth > window.innerHeight;
    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video');
    const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.body;

    if (panel.parentElement !== fsElement) {
        fsElement.appendChild(panel);
    }

    if (isLandscape) {
        if (player) {
            player.style.setProperty('width', '70vw', 'important');
            player.style.setProperty('left', '0', 'important');
        }
        if (video) {
            video.style.setProperty('width', '100%', 'important');
            video.style.setProperty('object-fit', 'contain', 'important');
        }
        panel.style.cssText = `
            display: flex;
            position: absolute;
            top: 0;
            right: 0;
            width: 30vw;
            height: 100vh;
            background: #111111;
            color: white;
            z-index: 2147483647;
            flex-direction: column;
            padding: 10px;
            box-sizing: border-box;
            border-left: 1px solid #333;
            pointer-events: auto !important;
        `;
    } else {
        if (player) {
            player.style.removeProperty('width');
            player.style.removeProperty('left');
        }
        if (video) {
            video.style.removeProperty('width');
            video.style.removeProperty('object-fit');
        }
        
        // VẤN ĐỀ 1: Fix lỗi che thanh tua bằng cách đo khung player tổng và cộng thêm offset an toàn
        const referenceElement = player || video;
        const refRect = referenceElement ? referenceElement.getBoundingClientRect() : { bottom: 250 };
        // Cộng 15px vào cạnh dưới của trình phát để tránh thanh progress bar hoàn toàn
        const topPosition = (refRect.bottom > 0 ? refRect.bottom : 250) + 15;
        
        panel.style.cssText = `
            display: flex;
            position: absolute;
            top: ${topPosition}px;
            left: 0;
            width: 100vw;
            height: calc(100vh - ${topPosition}px);
            background: #111111;
            color: white;
            z-index: 2147483647;
            flex-direction: column;
            padding: 10px;
            box-sizing: border-box;
            border-top: 1px solid #333;
            pointer-events: auto !important;
        `;
    }
}

export function resetLayout() {
    if (UIState.isMenuPinned) return;
    const panel = document.getElementById('custom-sub-panel');
    if (panel) {
        panel.style.display = 'none';
    }
    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('video');
    if (player) {
        player.style.removeProperty('width');
        player.style.removeProperty('left');
    }
    if (video) {
        video.style.removeProperty('width');
        video.style.removeProperty('object-fit');
    }
}

function findSubIndex(subs, t) {
    if (!subs || subs.length === 0) return -1;
    let low = 0;
    let high = subs.length - 1;
    let best = -1;

    while (low <= high) {
        const mid = (low + high) >> 1;
        const sub = subs[mid];
        if (t >= sub.start && t <= sub.end + 0.2) {
            return mid;
        }
        if (sub.start <= t) {
            best = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return best;
}

export function buildSubBlockHtml(sub, index, isActive) {
    const activeClass = isActive ? "ytse-active" : "";
    let html = `<div class="sub-block ${activeClass}" data-index="${index}" data-start="${sub.start}" data-end="${sub.end}" data-text="${escapeAttr(sub.text)}">`;
    html += escapeHtml(sub.text);

    if (Config.autoVi && sub.text_vi) {
        html += `<br><span style="color: #66aa66; font-size: 15px; font-weight: normal;">${escapeHtml(sub.text_vi)}</span>`;
    }
    html += `</div>`;
    return html;
}

function smartScrollIntoView(container, targetEl) {
    if (!container || !targetEl || UIState.isUserScrolling) return;

    requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        const offsetTop = targetRect.top - containerRect.top;
        const offsetBottom = targetRect.bottom - containerRect.bottom;

        // Chỉ cuộn khi phần tử active lệch ra khỏi vùng hiển thị thoải mái (đệm 30px)
        if (offsetTop < 30 || offsetBottom > -30) {
            const idealTop = targetEl.offsetTop - (container.clientHeight / 2) + (targetEl.clientHeight / 2);
            container.scrollTo({
                top: Math.max(0, idealTop),
                behavior: 'smooth'
            });
        }
    });
}

export function syncTranscript(currentTime) {
    const subs = SubtitleState.parsedSubs;
    if (!subs || subs.length === 0) {
        const textArea = document.getElementById('custom-sub-text');
        if (textArea && !textArea.innerText.includes("Vui lòng bật")) {
            textArea.innerHTML = "Vui lòng bật hiển thị phụ đề CC trên video để hệ thống bắt dữ liệu.";
        }
        return;
    }

    // Áp dụng bù trừ thời gian để nhận diện câu nhanh chóng
    const t = currentTime + Number(Config.timeOffset || 0);
    const currentIndex = findSubIndex(subs, t);

    if (currentIndex === -1) return;
    if (currentIndex === UIState.lastRenderedIndex) return;
    UIState.lastRenderedIndex = currentIndex;

    const textArea = document.getElementById('custom-sub-text');
    if (!textArea) return;

    // Cấu hình LazyColumn: Đệm quá khứ (3 câu) và Đệm tương lai (8-12 câu)
    const PREV_BUFFER = 3;
    const NEXT_BUFFER = Math.max(8, Number(Config.ctx || 3) * 3);

    const win = UIState.lazyWindow;
    // Kiểm tra xem câu hiện tại có nằm an toàn trong cửa sổ LazyColumn đang hiển thị không
    const inWindow = (win.start !== -1 && currentIndex >= win.start && currentIndex <= win.end - 2);

    if (inWindow) {
        // Tối ưu đỉnh cao: Không xóa/vẽ lại DOM! Chỉ đổi class active tức thì trong 0.01ms
        const prevActive = textArea.querySelector('.ytse-active');
        if (prevActive) {
            prevActive.classList.remove('ytse-active');
        }
        const currentBlock = textArea.querySelector(`[data-index="${currentIndex}"]`);
        if (currentBlock) {
            currentBlock.classList.add('ytse-active');
            smartScrollIntoView(textArea, currentBlock);
            UIState.lastContextText = currentBlock.dataset.text || '';
        }
    } else {
        // Trượt cửa sổ (Slide Window): Chỉ render một lát cắt nhỏ (~12 câu)
        const newStart = Math.max(0, currentIndex - PREV_BUFFER);
        const newEnd = Math.min(subs.length - 1, currentIndex + NEXT_BUFFER);

        let html = "";
        let contextText = "";
        for (let i = newStart; i <= newEnd; i++) {
            const sub = subs[i];
            const isActive = (i === currentIndex);
            if (isActive) contextText = sub.text;
            html += buildSubBlockHtml(sub, i, isActive);
        }

        UIState.lazyWindow = { start: newStart, end: newEnd };
        UIState.lastContextText = contextText;

        // Render trực tiếp vào container, không nhấp nháy, không tụt khung hình
        textArea.innerHTML = safeHTML(html);

        const activeBlock = textArea.querySelector('.ytse-active');
        if (activeBlock) {
            smartScrollIntoView(textArea, activeBlock);
        }
    }
}

export function injectUI() {
    if (document.getElementById('custom-sub-panel')) return;

    injectToolButtonStyles();

    const panel = document.createElement('div');
    panel.id = 'custom-sub-panel';
    panel.style.display = 'none';

    let btnRewind;

    const stopProp = (e) => e.stopPropagation();
    ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup', 'click'].forEach(evt => {
        panel.addEventListener(evt, stopProp);
    });

    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #333;
        padding-bottom: 5px;
        margin-bottom: 10px;
    `;
    const titleText = document.createElement('div');
    titleText.innerText = "Transcript";
    titleText.style.cssText = "font-size: 14px; color: #aaaaaa; text-transform: uppercase; letter-spacing: .04em;";

    const btnPin = createToolButton('pin', 'Ghim menu (Luôn hiển thị)');
    btnPin.style.width = "36px";
    btnPin.style.height = "36px";
    btnPin.style.borderRadius = "10px";
    btnPin.style.marginRight = "5px";

    const btnSetting = createToolButton('settings', 'Cài đặt');
    btnSetting.style.width = "36px";
    btnSetting.style.height = "36px";
    btnSetting.style.borderRadius = "10px";

    const topActions = document.createElement('div');
    topActions.style.display = 'flex';
    topActions.style.alignItems = 'center';
    topActions.appendChild(btnPin);
    topActions.appendChild(btnSetting);

    header.appendChild(titleText);
    header.appendChild(topActions);
    panel.appendChild(header);

    const settingOverlay = document.createElement('div');
    settingOverlay.style.cssText = `
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #1a1a1a;
        z-index: 10;
        padding: 15px;
        box-sizing: border-box;
        flex-direction: column;
        overflow-y: auto;
        color: white;
    `;
    settingOverlay.innerHTML = safeHTML(`
        <h3 style="margin-top:0; border-bottom:1px solid #444; padding-bottom:5px;">CÀI ĐẶT HỆ THỐNG</h3>
        <label style="font-size:13px; margin-top:10px;">Số câu ngữ cảnh hiển thị 0-10:</label>
        <input type="number" id="cfg-ctx" min="0" max="10" value="${Config.ctx}" style="width:100%; padding:8px; margin-top:5px; background:#333; color:white; border:1px solid #555; border-radius:4px;">

        <label style="font-size:13px; margin-top:10px;">Độ bù trừ thời gian sáng chữ (giây):</label>
        <input type="number" step="0.1" id="cfg-timeoffset" value="${Config.timeOffset}" style="width:100%; padding:8px; margin-top:5px; background:#333; color:white; border:1px solid #555; border-radius:4px;">

        <label style="font-size:13px; margin-top:10px;">Số giây tua lại (1s - 10s):</label>
        <input type="number" id="cfg-rewind-sec" min="1" max="10" value="${Config.rewindSec}" style="width:100%; padding:8px; margin-top:5px; background:#333; color:white; border:1px solid #555; border-radius:4px;">

        <label style="font-size:13px; margin-top:10px; display:flex; align-items:center; cursor:pointer;">
            <input type="checkbox" id="cfg-autovi" ${Config.autoVi ? 'checked' : ''} style="margin-right:8px; width:18px; height:18px;">
            Tự động hiển thị Vietsub gốc của video
        </label>
        <label style="font-size:13px; margin-top:10px; display:flex; align-items:center; cursor:pointer; color:#00ffcc;">
            <input type="checkbox" id="cfg-overlap" ${Config.overlap ? 'checked' : ''} style="margin-right:8px; width:18px; height:18px;">
            Chuyển trang gối đầu (Smart Overlap)
        </label>

        <h4 style="margin-top:15px; margin-bottom:5px; color:#ffaa00;">Cấu hình AI chuẩn OpenAI</h4>
        <label style="font-size:13px;">URL Endpoint:</label>
        <input type="text" id="cfg-ai-url" value="${Config.aiUrl}" style="width:100%; padding:8px; margin-top:5px; background:#333; color:white; border:1px solid #555; border-radius:4px;">

        <label style="font-size:13px; margin-top:10px;">API Key:</label>
        <input type="password" id="cfg-ai-key" value="${Config.aiKey}" style="width:100%; padding:8px; margin-top:5px; background:#333; color:white; border:1px solid #555; border-radius:4px;">

        <label style="font-size:13px; margin-top:10px;">Tên Model:</label>
        <input type="text" id="cfg-ai-model" value="${Config.aiModel}" style="width:100%; padding:8px; margin-top:5px; background:#333; color:white; border:1px solid #555; border-radius:4px;">

        <button id="btn-save-setting" style="margin-top:20px; padding:12px; background:#007bff; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">LƯU & ĐÓNG</button>
    `);
    panel.appendChild(settingOverlay);

    btnSetting.addEventListener('click', () => {
        settingOverlay.style.display = 'flex';
    });

    settingOverlay.querySelector('#btn-save-setting').addEventListener('click', () => {
        Config.ctx = parseInt(document.getElementById('cfg-ctx').value) || 3;
        Config.timeOffset = parseFloat(document.getElementById('cfg-timeoffset').value) || 0;
        Config.rewindSec = Math.min(10, Math.max(1, parseInt(document.getElementById('cfg-rewind-sec').value) || 5));
        Config.autoVi = document.getElementById('cfg-autovi').checked;
        Config.overlap = document.getElementById('cfg-overlap').checked;
        Config.aiUrl = document.getElementById('cfg-ai-url').value.trim();
        Config.aiKey = document.getElementById('cfg-ai-key').value.trim();
        Config.aiModel = document.getElementById('cfg-ai-model').value.trim();

        if (btnRewind) {
            btnRewind.title = `Tua lại ${Config.rewindSec}s`;
            btnRewind.setAttribute('aria-label', `Tua lại ${Config.rewindSec}s`);
        }

        settingOverlay.style.display = 'none';

        const video = document.querySelector('video');
        if (video) {
            UIState.lastRenderedIndex = -1;
            UIState.lastStartIndex = -1;
            syncTranscript(video.currentTime);
        }
    });

    const textArea = document.createElement('div');
    textArea.id = 'custom-sub-text';
    textArea.style.cssText = `
        flex-grow: 1;
        font-size: 18px;
        overflow-y: auto;
        white-space: pre-wrap;
        -webkit-user-select: text !important;
        user-select: text !important;
        color: #fff;
        padding-bottom: 10px;
    `;

    // Cơ chế LazyColumn: Tự động nạp thêm dữ liệu khi người dùng cuộn lên (quá khứ) hoặc cuộn xuống (tương lai)
    textArea.addEventListener('scroll', () => {
        UIState.isUserScrolling = true;
        clearTimeout(UIState.userScrollTimer);
        UIState.userScrollTimer = setTimeout(() => {
            UIState.isUserScrolling = false;
        }, 1500);

        const subs = SubtitleState.parsedSubs;
        if (!subs || subs.length === 0) return;
        const win = UIState.lazyWindow;
        if (win.start === -1) return;

        // Cuộn gần lên đỉnh (còn cách <= 40px) -> Nạp thêm các câu quá khứ
        if (textArea.scrollTop <= 40 && win.start > 0) {
            const addCount = 5;
            const newStart = Math.max(0, win.start - addCount);
            if (newStart < win.start) {
                let prependHtml = "";
                for (let i = newStart; i < win.start; i++) {
                    prependHtml += buildSubBlockHtml(subs[i], i, false);
                }
                const oldScrollHeight = textArea.scrollHeight;
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = safeHTML(prependHtml);
                while (tempDiv.lastChild) {
                    textArea.insertBefore(tempDiv.lastChild, textArea.firstChild);
                }
                textArea.scrollTop += (textArea.scrollHeight - oldScrollHeight);
                win.start = newStart;
            }
        }

        // Cuộn gần xuống đáy (còn cách <= 40px) -> Nạp thêm các câu tương lai
        if (textArea.scrollTop + textArea.clientHeight >= textArea.scrollHeight - 40 && win.end < subs.length - 1) {
            const addCount = 8;
            const newEnd = Math.min(subs.length - 1, win.end + addCount);
            if (newEnd > win.end) {
                let appendHtml = "";
                for (let i = win.end + 1; i <= newEnd; i++) {
                    appendHtml += buildSubBlockHtml(subs[i], i, false);
                }
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = safeHTML(appendHtml);
                while (tempDiv.firstChild) {
                    textArea.appendChild(tempDiv.firstChild);
                }
                win.end = newEnd;
            }
        }
    }, { passive: true });

    panel.appendChild(textArea);

    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        border-top: 1px solid #333;
        padding-top: 10px;
    `;

    const btnGoogle = createToolButton('language', 'Dịch bằng Google Translate');
    const btnAi = createToolButton('sparkles', 'Dịch bằng AI');
    const btnAdd = createToolButton('bookmarkPlus', 'Lưu từ vựng thường');
    const btnOutput = createToolButton('microphonePlus', 'Thêm vào hệ thống học output');
    btnRewind = createToolButton('rewind', `Tua lại ${Config.rewindSec}s`);
    const btnPlay = createToolButton('playerPlay', 'Phát tiếp video');

    bottomBar.appendChild(btnGoogle);
    bottomBar.appendChild(btnAi);
    bottomBar.appendChild(btnAdd);
    bottomBar.appendChild(btnOutput);
    bottomBar.appendChild(btnRewind);
    bottomBar.appendChild(btnPlay);

    panel.appendChild(bottomBar);

    btnRewind.addEventListener('click', () => {
        const video = document.querySelector('video');
        if (video) {
            const sec = Number(Config.rewindSec || 5);
            video.currentTime = Math.max(0, video.currentTime - sec);
            UIState.lastRenderedIndex = -1;
            syncTranscript(video.currentTime);

            btnRewind.style.transform = 'scale(0.88)';
            setTimeout(() => {
                btnRewind.style.transform = '';
            }, 120);
        }
    });

    btnPin.addEventListener('click', () => {
        UIState.isMenuPinned = !UIState.isMenuPinned;
        if (UIState.isMenuPinned) {
            btnPin.style.color = "#ffaa00";
            btnPin.style.background = "rgba(255, 170, 0, 0.15)";
            btnPin.style.borderColor = "rgba(255, 170, 0, 0.45)";
            btnPlay.innerHTML = safeHTML(iconSvg('x'));
            btnPlay.title = "Đóng menu";
            btnPlay.dataset.icon = 'x';
        } else {
            btnPin.style.color = "";
            btnPin.style.background = "";
            btnPin.style.borderColor = "";
            btnPlay.innerHTML = safeHTML(iconSvg('playerPlay'));
            btnPlay.title = "Phát tiếp video";
            btnPlay.dataset.icon = 'playerPlay';
        }
    });

    function getTargetBlock() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let container = selection.getRangeAt(0).commonAncestorContainer;
            if (container.nodeType === Node.TEXT_NODE) {
                container = container.parentNode;
            }
            const block = container.closest ? container.closest('.sub-block') : null;
            if (block) return block;
        }
        return document.querySelector('.sub-block.ytse-active') || textArea;
    }

    btnGoogle.addEventListener('click', () => {
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            alert("Bạn chưa bôi đen từ nào.");
            return;
        }
        const targetBlock = getTargetBlock();
        const textSpan = createInlineBox(targetBlock, "#00ffcc");

        API.translateGoogle(selectedText, 
            (resText) => { textSpan.innerText = resText; },
            (errMsg) => { textSpan.innerText = errMsg; }
        );
    });

    btnAi.addEventListener('click', () => {
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            alert("Bạn chưa bôi đen từ nào.");
            return;
        }
        const targetBlock = getTargetBlock();
        const textSpan = createInlineBox(targetBlock, "#ff9ff3");

        API.translateAI(selectedText, UIState.lastContextText,
            (resText) => { textSpan.innerText = resText; },
            (errMsg) => { textSpan.innerText = errMsg; }
        );
    });

    btnAdd.addEventListener('click', () => {
        const { selectedText, sourceSentence } = getSelectedSubInfo();
        const videoElement = document.querySelector('video');

        if (!selectedText) {
            alert("Bạn chưa bôi đen từ nào.");
            return;
        }

        setToolButtonState(btnAdd, 'loading');

        const payload = {
            action: "add_normal_vocab",
            type: "reading_input",
            status: "new",
            createdAt: new Date().toISOString(),
            videoId: SubtitleState.currentVideoId,
            videoUrl: window.location.href,
            videoTitle: document.title.replace(" - YouTube", ""),
            word: selectedText,
            sourceSentence: sourceSentence,
            contextText: UIState.lastContextText,
            time: videoElement ? videoElement.currentTime : null
        };

        API.saveVocab(payload, false, 
            () => {
                setToolButtonState(btnAdd, 'success');
                setTimeout(() => setToolButtonState(btnAdd, 'normal'), 2000);
            },
            (errMsg) => {
                alert(errMsg);
                setToolButtonState(btnAdd, 'error');
                setTimeout(() => setToolButtonState(btnAdd, 'normal'), 2000);
            }
        );
    });

    btnOutput.addEventListener('click', () => {
        const { selectedText, sourceSentence } = getSelectedSubInfo();
        const videoElement = document.querySelector('video');

        if (!selectedText) {
            alert("Bạn chưa bôi đen từ/cụm cần học output.");
            return;
        }

        const allBtns = bottomBar.querySelectorAll('.ytse-tool-btn');
        allBtns.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.4';
            btn.style.cursor = 'not-allowed';
        });

        const originalIcon = btnOutput.innerHTML;
        btnOutput.innerHTML = safeHTML(`<span style="font-size:11px; font-weight:bold; white-space:nowrap;"> ⏳  ĐANG XỬ LÝ (20s)...</span>`);
        btnOutput.style.width = "auto";
        btnOutput.style.padding = "0 10px";
        btnOutput.style.background = "#555";
        btnOutput.style.borderColor = "#777";
        btnOutput.style.color = "#ffaa00";

        const urlParams = new URLSearchParams(window.location.search);
        const vid = urlParams.get('v') || SubtitleState.currentVideoId || '';

        const payload = {
            action: "add_output_vocab",
            type: "speaking_output",
            status: "new",
            createdAt: new Date().toISOString(),
            videoId: vid,
            videoUrl: window.location.href,
            videoTitle: document.title.replace(" - YouTube", ""),
            word: selectedText,
            sourceSentence: sourceSentence,
            contextText: UIState.lastContextText,
            time: videoElement ? videoElement.currentTime : null
        };

        API.saveVocab(payload, true,
            () => {
                restoreBtns();
                setToolButtonState(btnOutput, 'success');
                setTimeout(() => setToolButtonState(btnOutput, 'normal'), 2000);
            },
            (errMsg) => {
                restoreBtns();
                alert(errMsg);
                setToolButtonState(btnOutput, 'error');
                setTimeout(() => setToolButtonState(btnOutput, 'normal'), 2000);
            }
        );

        function restoreBtns() {
            allBtns.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
            btnOutput.style.width = "44px";
            btnOutput.style.padding = "0";
            btnOutput.style.background = "";
            btnOutput.style.borderColor = "";
            btnOutput.style.color = "";
            btnOutput.innerHTML = originalIcon;
        }
    });

    btnPlay.addEventListener('click', () => {
        if (UIState.isMenuPinned) {
            UIState.isMenuPinned = false;
            btnPin.style.color = "";
            btnPin.style.background = "";
            btnPin.style.borderColor = "";
            btnPlay.innerHTML = safeHTML(iconSvg('playerPlay'));
            btnPlay.title = "Phát tiếp video";
            btnPlay.dataset.icon = 'playerPlay';
            const p = document.getElementById('custom-sub-panel');
            if (p) p.style.display = 'none';

            const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            const videoElement = document.querySelector('video');
            if (player) {
                player.style.removeProperty('width');
                player.style.removeProperty('left');
            }
            if (videoElement) {
                videoElement.style.removeProperty('width');
                videoElement.style.removeProperty('object-fit');
            }
        } else {
            const player = document.getElementById('movie_player');
            if (player && typeof player.playVideo === 'function') {
                player.playVideo();
            } else {
                const videoElement = document.querySelector('video');
                if (videoElement) {
                    videoElement.play();
                }
            }
        }
    });

    document.body.appendChild(panel);
    UIState.isUiInjected = true;
}