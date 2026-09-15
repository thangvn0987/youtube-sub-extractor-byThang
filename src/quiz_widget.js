// ============================================================
// QUIZ_WIDGET.JS — Trợ Thủ Học Tập & Luyện Đề Đa Năng Trên Mọi Trang Web
// Bao gồm: Dịch Google, Dịch AI, Phân Tích TOEIC (Xác nhận lưu Anki), Cài đặt ⚙️
// ============================================================

import { API } from './api.js';
import { Config } from './config.js';

export function initQuizFloatingWidget() {
    if (document.getElementById('toeic-floating-root')) return;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => createWidgetDOM());
    } else {
        createWidgetDOM();
    }
}

function createWidgetDOM() {
    if (document.getElementById('toeic-floating-root')) return;

    const root = document.createElement('div');
    root.id = 'toeic-floating-root';
    root.style.cssText = 'all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
    document.body.appendChild(root);

    // ==================== 1. NÚT NỔI FAB KÉO THẢ ====================
    const fab = document.createElement('div');
    fab.id = 'toeic-fab-btn';
    fab.innerHTML = '<span style="font-size: 17px; margin-right: 4px;">🎯</span><span style="font-size: 13px; font-weight: 700; letter-spacing: 0.3px;">HỌC & THI</span>';
    
    let savedPos = null;
    try {
        savedPos = JSON.parse(GM_getValue('toeic_fab_position', 'null'));
    } catch(e) {}

    fab.style.cssText = `
        position: fixed;
        ${savedPos && savedPos.left !== undefined ? `left: ${savedPos.left}px;` : `right: 16px;`}
        ${savedPos && savedPos.top !== undefined ? `top: ${savedPos.top}px;` : `bottom: 80px;`}
        z-index: 2147483645;
        background: linear-gradient(135deg, #0969da, #054da7);
        color: #ffffff;
        padding: 9px 14px;
        border-radius: 24px;
        box-shadow: 0 4px 16px rgba(9, 105, 218, 0.4), 0 2px 6px rgba(0,0,0,0.15);
        cursor: grab;
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: none;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    `;
    root.appendChild(fab);

    // ==================== 2. KHUNG MODAL CHÍNH ====================
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'toeic-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(2px);
        z-index: 2147483646;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 14px;
        box-sizing: border-box;
    `;

    const modalBox = document.createElement('div');
    modalBox.id = 'toeic-modal-box';
    modalBox.style.cssText = `
        background: #ffffff;
        color: #1f2328;
        width: 100%;
        max-width: 530px;
        max-height: 88vh;
        border-radius: 14px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: toeicPopIn 0.2s ease-out;
        position: relative;
    `;

    modalBox.innerHTML = `
        <style>
            @keyframes toeicPopIn {
                from { opacity: 0; transform: scale(0.94); }
                to { opacity: 1; transform: scale(1); }
            }
            .toeic-spin {
                display: inline-block;
                width: 18px; height: 18px;
                border: 2.5px solid rgba(0,0,0,0.15);
                border-radius: 50%;
                border-top-color: #0969da;
                animation: toeicSpin 0.7s linear infinite;
                vertical-align: middle;
                margin-right: 6px;
            }
            @keyframes toeicSpin {
                to { transform: rotate(360deg); }
            }
            .toeic-btn-tool {
                flex: 1;
                padding: 9px 8px;
                border: 1px solid #d0d7de;
                border-radius: 8px;
                background: #f6f8fa;
                color: #1f2328;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                transition: all 0.15s ease;
                white-space: nowrap;
            }
            .toeic-btn-tool:hover {
                background: #eaeef2;
                border-color: #0969da;
                color: #0969da;
            }
            .toeic-btn-primary {
                background: #1f883d !important;
                color: #ffffff !important;
                border-color: #1a7f37 !important;
            }
            .toeic-btn-primary:hover {
                background: #1a7f37 !important;
            }
        </style>

        <!-- Header -->
        <div style="background: #f6f8fa; padding: 12px 16px; border-bottom: 1px solid #d0d7de; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">🎯</span>
                <span style="font-size: 15px; font-weight: 700; color: #1f2328;">Trợ Thủ Học Tập & Luyện Đề</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button id="toeic-settings-btn" title="Cài đặt AI" style="background: none; border: none; font-size: 17px; cursor: pointer; padding: 4px; color: #57606a;">⚙️</button>
                <button id="toeic-close-btn" title="Đóng" style="background: none; border: none; font-size: 18px; color: #656d76; cursor: pointer; padding: 4px 8px; line-height: 1;">✕</button>
            </div>
        </div>

        <!-- Body -->
        <div style="padding: 14px 16px; overflow-y: auto; flex: 1;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #57606a; margin-bottom: 5px;">
                📝 Nội dung bôi đen (hoặc nhập/dán vào đây):
            </label>
            <textarea id="toeic-text-input" rows="4" style="width: 100%; box-sizing: border-box; padding: 8px 10px; font-size: 14px; font-family: inherit; line-height: 1.5; border: 1.5px solid #d0d7de; border-radius: 8px; outline: none; resize: vertical;" placeholder="Bôi đen từ vựng, câu hoặc đề bài trắc nghiệm trên trang web..."></textarea>

            <!-- Thanh công cụ 3 nút bấm -->
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button id="btn-trans-google" class="toeic-btn-tool" title="Dịch nghĩa nhanh">
                    <span>🌐</span> Dịch Google
                </button>
                <button id="btn-trans-ai" class="toeic-btn-tool" title="Dịch theo ngữ cảnh bằng AI">
                    <span>✨</span> Dịch AI
                </button>
                <button id="btn-analyze-toeic" class="toeic-btn-tool toeic-btn-primary" title="Bóc tách dạng bài, logic loại trừ">
                    <span>🎯</span> Phân Tích TOEIC
                </button>
            </div>

            <!-- Vùng hiển thị kết quả -->
            <div id="toeic-result-box" style="display: none; margin-top: 14px;"></div>
        </div>

        <!-- Overlay Cài Đặt (Ẩn mặc định) -->
        <div id="toeic-settings-overlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #ffffff; z-index: 20; padding: 16px; box-sizing: border-box; flex-direction: column; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #d0d7de; padding-bottom: 8px; margin-bottom: 14px;">
                <b style="font-size: 16px; color: #1f2328;">⚙️ CÀI ĐẶT CẤU HÌNH AI</b>
                <button id="toeic-settings-close" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #57606a;">✕</button>
            </div>
            
            <label style="font-size: 12px; font-weight: 600; color: #57606a;">Endpoint API URL:</label>
            <input type="text" id="cfg-widget-url" value="${Config.aiUrl}" style="width: 100%; padding: 8px; margin: 4px 0 12px; border: 1px solid #d0d7de; border-radius: 6px; font-size: 13px; box-sizing: border-box;">

            <label style="font-size: 12px; font-weight: 600; color: #57606a;">API Key:</label>
            <input type="password" id="cfg-widget-key" value="${Config.aiKey}" style="width: 100%; padding: 8px; margin: 4px 0 12px; border: 1px solid #d0d7de; border-radius: 6px; font-size: 13px; box-sizing: border-box;">

            <label style="font-size: 12px; font-weight: 600; color: #57606a;">Tên Model (Model Name):</label>
            <input type="text" id="cfg-widget-model" value="${Config.aiModel}" placeholder="gemini-3.1-flash-lite hoặc gpt-4o-mini" style="width: 100%; padding: 8px; margin: 4px 0 16px; border: 1px solid #d0d7de; border-radius: 6px; font-size: 13px; box-sizing: border-box;">

            <button id="cfg-widget-save" style="background: #0969da; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer; width: 100%;">
                💾 LƯU CÀI ĐẶT
            </button>
        </div>
    `;

    modalOverlay.appendChild(modalBox);
    root.appendChild(modalOverlay);

    // ==================== LOGIC KÉO THẢ (DRAGGABLE) ====================
    let isDragging = false;
    let startX, startY;
    let initialLeft, initialTop;
    let hasMoved = false;

    function onPointerDown(clientX, clientY) {
        isDragging = true;
        hasMoved = false;
        startX = clientX;
        startY = clientY;

        const rect = fab.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        fab.style.transition = 'none';
        fab.style.cursor = 'grabbing';
    }

    function onPointerMove(clientX, clientY) {
        if (!isDragging) return;
        const dx = clientX - startX;
        const dy = clientY - startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
        }

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        const maxLeft = window.innerWidth - fab.offsetWidth - 8;
        const maxTop = window.innerHeight - fab.offsetHeight - 8;
        newLeft = Math.max(8, Math.min(newLeft, maxLeft));
        newTop = Math.max(8, Math.min(newTop, maxTop));

        fab.style.left = `${newLeft}px`;
        fab.style.top = `${newTop}px`;
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
    }

    function onPointerUp() {
        if (!isDragging) return;
        isDragging = false;
        fab.style.cursor = 'grab';
        fab.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';

        if (hasMoved) {
            const rect = fab.getBoundingClientRect();
            try {
                GM_setValue('toeic_fab_position', JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
            } catch(e) {}
        }
    }

    // Sự kiện chuột
    fab.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        onPointerDown(e.clientX, e.clientY);

        const onMouseMove = (e) => onPointerMove(e.clientX, e.clientY);
        const onMouseUp = () => {
            onPointerUp();
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });

    // Sự kiện cảm ứng (Mobile Kiwi)
    fab.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    fab.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    fab.addEventListener('touchend', () => {
        onPointerUp();
    });

    fab.addEventListener('click', (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        openModal();
    });

    // ==================== QUẢN LÝ MODAL & CÁC NÚT ====================
    const textInput = document.getElementById('toeic-text-input');
    const resultBox = document.getElementById('toeic-result-box');
    const closeBtn = document.getElementById('toeic-close-btn');

    const btnGoogle = document.getElementById('btn-trans-google');
    const btnAi = document.getElementById('btn-trans-ai');
    const btnToeic = document.getElementById('btn-analyze-toeic');

    const settingsBtn = document.getElementById('toeic-settings-btn');
    const settingsOverlay = document.getElementById('toeic-settings-overlay');
    const settingsClose = document.getElementById('toeic-settings-close');
    const settingsSave = document.getElementById('cfg-widget-save');

    function openModal() {
        let sel = "";
        try {
            sel = window.getSelection().toString().trim();
        } catch(e) {}

        if (sel) {
            textInput.value = sel;
        }

        resultBox.style.display = 'none';
        resultBox.innerHTML = '';
        settingsOverlay.style.display = 'none';
        modalOverlay.style.display = 'flex';
        textInput.focus();
    }

    function closeModal() {
        modalOverlay.style.display = 'none';
    }

    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Cài đặt
    settingsBtn.addEventListener('click', () => {
        document.getElementById('cfg-widget-url').value = Config.aiUrl;
        document.getElementById('cfg-widget-key').value = Config.aiKey;
        document.getElementById('cfg-widget-model').value = Config.aiModel;
        settingsOverlay.style.display = 'flex';
    });

    settingsClose.addEventListener('click', () => {
        settingsOverlay.style.display = 'none';
    });

    settingsSave.addEventListener('click', () => {
        Config.aiUrl = document.getElementById('cfg-widget-url').value.trim();
        Config.aiKey = document.getElementById('cfg-widget-key').value.trim();
        Config.aiModel = document.getElementById('cfg-widget-model').value.trim();
        settingsOverlay.style.display = 'none';
        alert('✅ Đã lưu cấu hình AI thành công!');
    });

    // 1. DỊCH GOOGLE
    btnGoogle.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (!text) {
            alert('Vui lòng bôi đen hoặc nhập văn bản cần dịch.');
            return;
        }

        showLoading('Đang dịch bằng Google Translate...');
        API.translateGoogle(
            text,
            (res) => {
                renderTranslationResult('🌐 Dịch Google Translate', res, '#0969da');
            },
            (err) => {
                renderError(err);
            }
        );
    });

    // 2. DỊCH AI
    btnAi.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (!text) {
            alert('Vui lòng bôi đen hoặc nhập văn bản cần dịch.');
            return;
        }

        showLoading('AI đang dịch theo ngữ cảnh...');
        API.translateAI(
            text,
            text,
            (res) => {
                renderTranslationResult('✨ Dịch Theo Ngữ Cảnh AI', res, '#8250df');
            },
            (err) => {
                renderError(err);
            }
        );
    });

    // 3. PHÂN TÍCH TOEIC (WORKFLOW 2 BƯỚC: Phân tích -> Đọc hiểu -> Nút xác nhận thêm vào Anki)
    btnToeic.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (!text) {
            alert('Vui lòng bôi đen cả câu hỏi trắc nghiệm và 4 đáp án A B C D.');
            return;
        }

        showLoading('AI đang giải mã câu hỏi & bóc tách bẫy (~2s)...');
        API.analyzeToeic(
            text,
            window.location.href,
            document.title,
            (data) => {
                renderToeicResult(data);
            },
            (err) => {
                renderError(err);
            }
        );
    });

    function showLoading(msg) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
            <div style="text-align: center; padding: 20px 14px; color: #0969da; background: #f6f8fa; border-radius: 8px;">
                <span class="toeic-spin" style="width: 22px; height: 22px; border-top-color: #0969da;"></span>
                <span style="font-weight: 600; font-size: 14px;">${msg}</span>
            </div>
        `;
    }

    function renderTranslationResult(title, text, badgeColor) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
            <div style="border: 1px solid #d0d7de; border-radius: 8px; padding: 12px 14px; background: #ffffff; animation: toeicPopIn 0.2s ease;">
                <div style="font-size: 13px; font-weight: 700; color: ${badgeColor}; margin-bottom: 8px;">${title}</div>
                <div style="font-size: 15px; line-height: 1.6; color: #1f2328;">${text}</div>
            </div>
        `;
    }

    function renderError(err) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
            <div style="background: #ffebe9; color: #cf222e; padding: 12px 14px; border-radius: 8px; font-size: 14px; border: 1px solid #ff8182;">
                <b>❌ Thất bại:</b> ${err}
            </div>
        `;
    }

    function renderToeicResult(data) {
        const cleanElim = (data.elim || []).map(item => {
            let s = String(item || "").replace(/\$\rightarrow\$/g, "→").replace(/->/g, "→").trim();
            return `<li style="margin-bottom: 6px; line-height: 1.5;">${s}</li>`;
        }).join('');

        resultBox.style.display = 'block';
        resultBox.innerHTML = `
            <div style="border-top: 1px dashed #d0d7de; padding-top: 14px; animation: toeicPopIn 0.2s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="background: #ddf4ff; color: #0969da; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 14px;">🏷️ ${data.type || "TOEIC"}</span>
                    <span style="background: #dafbe1; color: #1a7f37; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 15px;">Đáp án: ${data.ans || ""}</span>
                </div>

                <div style="background: #fff8c5; color: #7d4e00; padding: 10px 12px; border-radius: 8px; font-size: 14px; margin-bottom: 10px;">
                    <b>🎯 Dấu hiệu nhận biết:</b> ${data.signal || ""}
                </div>

                <div style="background: #f6f8fa; padding: 10px 14px; border-radius: 8px; font-size: 14px; margin-bottom: 10px;">
                    <b style="color: #cf222e;">✂️ Logic loại trừ & Chốt:</b>
                    <ul style="margin: 6px 0 0 16px; padding: 0;">
                        ${cleanElim}
                    </ul>
                </div>

                <div style="font-size: 14px; color: #57606a; font-style: italic; padding: 8px 10px; background: #ffffff; border: 1px solid #eaeef2; border-radius: 6px; margin-bottom: 14px;">
                    💡 <b>Dịch nghĩa:</b> ${data.trans || ""}
                </div>

                <!-- 2 NÚT HÀNH ĐỘNG: Đóng hoặc Xác nhận lưu vào Anki -->
                <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center;">
                    <button id="btn-toeic-cancel" style="background: #f6f8fa; color: #656d76; border: 1px solid #d0d7de; padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                        ✕ Bỏ qua (Không lưu)
                    </button>
                    <button id="btn-toeic-confirm-save" style="background: #1f883d; color: #ffffff; border: none; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(31, 136, 61, 0.3);">
                        <span>📥</span>
                        <span id="btn-toeic-save-label">Xác nhận thêm vào Anki</span>
                    </button>
                </div>
            </div>
        `;

        document.getElementById('btn-toeic-cancel').addEventListener('click', closeModal);

        const saveBtn = document.getElementById('btn-toeic-confirm-save');
        const saveLabel = document.getElementById('btn-toeic-save-label');

        saveBtn.addEventListener('click', () => {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.75';
            saveLabel.textContent = 'Đang lưu vào Sheet...';

            API.saveToeicCard(
                data,
                (msg) => {
                    saveBtn.style.background = '#0969da';
                    saveBtn.style.opacity = '1';
                    saveLabel.textContent = '✅ Đã lưu vào Anki!';
                    setTimeout(() => {
                        closeModal();
                    }, 1200);
                },
                (err) => {
                    saveBtn.disabled = false;
                    saveBtn.style.opacity = '1';
                    saveLabel.textContent = 'Thử lưu lại';
                    alert('Lỗi lưu thẻ: ' + err);
                }
            );
        });
    }
}
