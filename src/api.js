import { Config } from './config.js';

export const API = {
    translateGoogle(text, onSuccess, onError) {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(text)}`,
            onload: function(res) {
                try {
                    let json = JSON.parse(res.responseText);
                    onSuccess(json[0].map(x => x[0]).join(''));
                } catch(e) {
                    onError("Lỗi dịch Google.");
                }
            },
            onerror: () => onError("Lỗi mạng.")
        });
    },

    translateAI(selectedText, contextText, onSuccess, onError) {
        if (!Config.aiKey) {
            onError("Vui lòng vào Cài Đặt nhập API Key.");
            return;
        }

        let payload = {
            model: Config.aiModel,
            messages: [
                {
                    role: "system",
                    content: "Bạn là một công cụ dịch thuật nội tuyến (inline translator). Dựa vào ngữ cảnh, hãy trả về kết quả dịch sang tiếng Việt cho phần văn bản được chọn. YÊU CẦU BẮT BUỘC: Chỉ trả về duy nhất cụm từ/câu được dịch. Tuyệt đối KHÔNG giải thích, KHÔNG dùng câu hoàn chỉnh (như 'Có nghĩa là...', 'Trong ngữ cảnh này...'), KHÔNG bọc kết quả trong dấu ngoặc kép hoặc markdown in đậm."
                },
                {
                    role: "user",
                    content: `Ngữ cảnh:\n"${contextText}"\n\nCần dịch:\n"${selectedText}"`
                }
            ]
        };

        GM_xmlhttpRequest({
            method: "POST",
            url: Config.aiUrl,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + Config.aiKey
            },
            data: JSON.stringify(payload),
            onload: function(res) {
                try {
                    let json = JSON.parse(res.responseText);
                    if (json.choices && json.choices.length > 0) {
                        onSuccess(json.choices[0].message.content.trim());
                    } else {
                        onError("Lỗi AI response.");
                    }
                } catch(e) {
                    onError("Lỗi parse dữ liệu AI.");
                }
            },
            onerror: () => onError("Lỗi kết nối AI.")
        });
    },

    saveVocab(payload, isOutput, onSuccess, onError) {
        payload.token = isOutput ? Config.OUTPUT_BACKEND_TOKEN : Config.NORMAL_BACKEND_TOKEN;
        
        GM_xmlhttpRequest({
            method: "POST",
            url: Config.MASTER_WEB_APP_URL,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(payload),
            timeout: 120000,
            ontimeout: function() {
                onError("Đã quá thời gian chờ (120s). Tuy nhiên, AI có thể vẫn đang xử lý ngầm và lưu vào Google Sheet.");
            },
            onload: function(response) {
                try {
                    let res = JSON.parse(response.responseText);
                    if (res && res.status === "success") {
                        onSuccess();
                    } else {
                        onError("Lỗi backend: " + (res.message || "Unknown error"));
                    }
                } catch (err) {
                    onError("Backend trả về dữ liệu không hợp lệ.");
                }
            },
            onerror: function(err) {
                let errDetail = err.error || err.statusText || err.responseText || "Bị chặn bởi bảo mật (CORS).";
                onError("Lỗi mạng gửi đi bị từ chối:\nNguyên nhân: " + errDetail);
            }
        });
    },

    analyzeToeic(rawText, sourceUrl, pageTitle, onSuccess, onError) {
        let payload = {
            action: "analyze_toeic_question",
            token: Config.TOEIC_BACKEND_TOKEN || "victor-toeic-vocab-001",
            text: rawText,
            sourceUrl: sourceUrl || window.location.href,
            pageTitle: pageTitle || document.title
        };

        GM_xmlhttpRequest({
            method: "POST",
            url: Config.MASTER_WEB_APP_URL,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(payload),
            timeout: 60000,
            ontimeout: function() {
                onError("Đã quá thời gian chờ (60s). AI có thể đang xử lý, vui lòng kiểm tra lại sau.");
            },
            onload: function(response) {
                try {
                    let res = JSON.parse(response.responseText);
                    if (res && res.status === "success" && res.data) {
                        onSuccess(res.data);
                    } else {
                        onError("Lỗi backend: " + (res.message || "Không có dữ liệu"));
                    }
                } catch (err) {
                    onError("Backend trả về dữ liệu không hợp lệ.");
                }
            },
            onerror: function(err) {
                let errDetail = err.error || err.statusText || err.responseText || "Lỗi mạng hoặc CORS.";
                onError("Lỗi gửi yêu cầu phân tích TOEIC:\n" + errDetail);
            }
        });
    },

    saveToeicCard(cardData, onSuccess, onError) {
        let payload = {
            action: "save_toeic_card",
            token: Config.TOEIC_BACKEND_TOKEN || "victor-toeic-vocab-001",
            cardData: cardData,
            sourceUrl: window.location.href,
            pageTitle: document.title
        };

        GM_xmlhttpRequest({
            method: "POST",
            url: Config.MASTER_WEB_APP_URL,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(payload),
            timeout: 30000,
            ontimeout: function() {
                onError("Quá thời gian chờ (30s) khi lưu thẻ.");
            },
            onload: function(response) {
                try {
                    let res = JSON.parse(response.responseText);
                    if (res && res.status === "success") {
                        onSuccess(res.message || "Đã lưu thẻ thành công!");
                    } else {
                        onError("Lỗi backend: " + (res.message || "Unknown error"));
                    }
                } catch (err) {
                    onError("Phản hồi không hợp lệ.");
                }
            },
            onerror: function(err) {
                onError("Lỗi mạng khi lưu thẻ.");
            }
        });
    }
};