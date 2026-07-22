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
                    content: "Dựa vào ngữ cảnh video, dịch ngắn gọn phần văn bản được chọn sang tiếng Việt."
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
    }
};