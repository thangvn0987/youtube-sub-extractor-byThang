// ============================================================
// QUIZ_WIDGET.JS — Menu Nổi Kéo Thả Phân Tích Câu Hỏi Luyện Đề (TOEIC Dual-Query)
// Hỗ trợ cảm ứng điện thoại (Kiwi Browser) & chuột máy tính
// ============================================================

import { API } from './api.js';

export function initQuizFloatingWidget() {
    if (document.getElementById('toeic-floating-root')) return;

    // Đảm bảo DOM đã tải
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => createWidgetDOM());
    } else {
        createWidgetDOM();
    }
}

function createWidgetDOM() {
    if (document.getElementById('toeic-floating-root')) return;

    // Container chính
    const root = document.createElement('div');
    root.id = 'toeic-floating-root';
    root.style.cssText = 'all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
    document.body.appendChild(root);

    // 1. NÚT NỔI FAB (Floating Action Button)
    const fab = document.createElement('div');
    fab.id = 'toeic-fab-btn';
    fab.innerHTML = '<span style="font-size: 18px; margin-right: 4px;">🎯</span><span style="font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">TOEIC</span>';
    
    // Khôi phục vị trí đã lưu
    let savedPos = null;
    try {
        savedPos = JSON.parse(GM_getValue('toeic_fab_position', 'null'));
    } catch(e) {}

    const defaultBottom = 80;
    const defaultRight = 16;

    fab.style.cssText = `
        position: fixed;
        ${savedPos && savedPos.left !== undefined ? `left: ${savedPos.left}px;` : `right: ${defaultRight}px;`}
        ${savedPos && savedPos.top !== undefined ? `top: ${savedPos.top}px;` : `bottom: ${defaultBottom}px;`}
        z-index: 2147483645;
        background: linear-gradient(135deg, #0969da, #054da7);
        color: #ffffff;
        padding: 10px 14px;
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

    // 2. MODAL DIALOG
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
        padding: 16px;
        box-sizing: border-box;
    `;

    const modalBox = document.createElement('div');
    modalBox.id = 'toeic-modal-box';
    modalBox.style.cssText = `
        background: #ffffff;
        color: #1f2328;
        width: 100%;
        max-width: 520px;
        max-height: 88vh;
        border-radius: 14px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: toeicPopIn 0.2s ease-out;
    `;

    modalBox.innerHTML = `
        <style>
            @keyframes toeicPopIn {
                from { opacity: 0; transform: scale(0.94); }
                to { opacity: 1; transform: scale(1); }
            }
            .toeic-spin {
                display: inline-block;
                width: 20px; height: 20px;
                border: 3px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: toeicSpin 0.7s linear infinite;
                vertical-align: middle;
                margin-right: 8px;
            }
            @keyframes toeicSpin {
                to { transform: rotate(360deg); }
            }
        </style>
        <div style="background: #f6f8fa; padding: 12px 16px; border-bottom: 1px solid #d0d7de; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">🎯</span>
                <span style="font-size: 16px; font-weight: 700; color: #1f2328;">Phân Tích TOEIC (Thẻ Truy Vấn Kép)</span>
            </div>
            <button id="toeic-close-btn" style="background: none; border: none; font-size: 20px; color: #656d76; cursor: pointer; padding: 4px 8px; line-height: 1;">✕</button>
        </div>

        <div style="padding: 16px; overflow-y: auto; flex: 1;">
            <div id="toeic-input-section">
                <label style="display: block; font-size: 13px; font-weight: 600; color: #57606a; margin-bottom: 6px;">
                    📝 Câu hỏi trắc nghiệm đã bắt được (hoặc dán vào đây):
                </label>
                <textarea id="toeic-question-input" rows="6" style="width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: 14px; font-family: inherit; line-height: 1.5; border: 1.5px solid #d0d7de; border-radius: 8px; outline: none; resize: vertical;" placeholder="Bôi đen câu hỏi trắc nghiệm gồm đề bài và 4 đáp án (A)(B)(C)(D) trên trang web..."></textarea>
                
                <div style="margin-top: 12px; display: flex; gap: 10px;">
                    <button id="toeic-submit-btn" style="flex: 1; background: #1f883d; color: #ffffff; border: none; padding: 11px 16px; font-size: 15px; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(31, 136, 61, 0.3);">
                        <span>🚀 Phân Tích & Lưu Thẻ Anki</span>
                    </button>
                </div>
            </div>

            <!-- Vùng hiển thị kết quả -->
            <div id="toeic-result-section" style="display: none; margin-top: 10px;"></div>
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

        // Giới hạn trong màn hình
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

    // Sự kiện chuột (Desktop)
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

    // Sự kiện cảm ứng (Mobile / Kiwi Browser)
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

    // Click mở modal (chỉ khi không phải đang kéo thả)
    fab.addEventListener('click', (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        openModal();
    });

    // ==================== LOGIC MODAL & GỬI AI ====================
    const closeBtn = document.getElementById('toeic-close-btn');
    const questionInput = document.getElementById('toeic-question-input');
    const submitBtn = document.getElementById('toeic-submit-btn');
    const resultSection = document.getElementById('toeic-result-section');

    function openModal() {
        // Tự động lấy đoạn văn bản người dùng đang bôi đen trên trang web
        let sel = "";
        try {
            sel = window.getSelection().toString().trim();
        } catch(e) {}

        if (sel) {
            questionInput.value = sel;
        }

        resultSection.style.display = 'none';
        resultSection.innerHTML = '';
        modalOverlay.style.display = 'flex';
        questionInput.focus();
    }

    function closeModal() {
        modalOverlay.style.display = 'none';
    }

    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    submitBtn.addEventListener('click', () => {
        const text = questionInput.value.trim();
        if (!text) {
            alert('Vui lòng bôi đen hoặc nhập câu hỏi trắc nghiệm.');
            questionInput.focus();
            return;
        }

        // Bật trạng thái Loading
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.innerHTML = '<span class="toeic-spin"></span><span>Đang phân tích AI (~2s)...</span>';

        resultSection.style.display = 'block';
        resultSection.innerHTML = `
            <div style="text-align: center; padding: 24px 16px; color: #0969da;">
                <span class="toeic-spin" style="width: 28px; height: 28px; border-width: 3px; border-color: rgba(9,105,218,0.2); border-top-color: #0969da;"></span>
                <div style="margin-top: 12px; font-weight: 600; font-size: 15px;">AI đang giải mã câu hỏi & bóc tách bẫy...</div>
                <div style="margin-top: 4px; font-size: 13px; color: #656d76;">Đang tạo Thẻ Truy Vấn Kép cho Anki</div>
            </div>
        `;

        API.analyzeToeic(
            text,
            window.location.href,
            document.title,
            (data) => {
                // Thành công: hiển thị kết quả súc tích
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.innerHTML = '<span>🚀 Phân Tích Câu Khác</span>';

                renderResult(data);
            },
            (errMsg) => {
                // Lỗi
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.innerHTML = '<span>Thử lại</span>';

                resultSection.innerHTML = `
                    <div style="background: #ffebe9; color: #cf222e; padding: 12px 14px; border-radius: 8px; font-size: 14px; border: 1px solid #ff8182;">
                        <b>❌ Thất bại:</b> ${errMsg}
                    </div>
                `;
            }
        );
    });

    function renderResult(data) {
        const cleanElim = (data.elim || []).map(item => {
            let s = String(item || "").replace(/\$\rightarrow\$/g, "→").replace(/->/g, "→").trim();
            return `<li style="margin-bottom: 6px; line-height: 1.5;">${s}</li>`;
        }).join('');

        resultSection.innerHTML = `
            <div style="border-top: 1px dashed #d0d7de; padding-top: 14px; animation: toeicPopIn 0.2s ease;">
                <div style="background: #dafbe1; color: #1a7f37; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; margin-bottom: 12px; display: inline-flex; align-items: center; gap: 6px;">
                    <span>✅ Đã lưu thẻ vào Google Sheet (ToeicCards)!</span>
                </div>

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

                <div style="font-size: 14px; color: #57606a; font-style: italic; padding: 8px 10px; background: #ffffff; border: 1px solid #eaeef2; border-radius: 6px;">
                    💡 <b>Dịch nghĩa:</b> ${data.trans || ""}
                </div>

                <div style="margin-top: 14px; text-align: right;">
                    <button id="toeic-done-btn" style="background: #0969da; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                        Đóng cửa sổ
                    </button>
                </div>
            </div>
        `;

        document.getElementById('toeic-done-btn').addEventListener('click', closeModal);
    }
}
