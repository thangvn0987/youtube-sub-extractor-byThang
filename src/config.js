export const Config = {
    // Lấy và lưu cài đặt ngữ cảnh
    get ctx() { return GM_getValue('cfgCtx', 3); },
    set ctx(val) { GM_setValue('cfgCtx', val); },

    // Lấy và lưu cài đặt hiển thị Vietsub
    get autoVi() { return GM_getValue('cfgAutoVi', false); },
    set autoVi(val) { GM_setValue('cfgAutoVi', val); },

    // Lấy và lưu cài đặt gối đầu câu (overlap)
    get overlap() { return GM_getValue('cfgOverlap', false); },
    set overlap(val) { GM_setValue('cfgOverlap', val); },

    // Cấu hình AI
    get aiUrl() { return GM_getValue('cfgAiUrl', 'https://api.openai.com/v1/chat/completions'); },
    set aiUrl(val) { GM_setValue('cfgAiUrl', val); },

    get aiKey() { return GM_getValue('cfgAiKey', ''); },
    set aiKey(val) { GM_setValue('cfgAiKey', val); },

    get aiModel() { return GM_getValue('cfgAiModel', 'gpt-3.5-turbo'); },
    set aiModel(val) { GM_setValue('cfgAiModel', val); },

    // Cài đặt bù trừ thời gian (giúp câu tiếp theo sáng lên nhanh hơn)
    get timeOffset() { return GM_getValue('cfgTimeOffset', 0.4); },
    set timeOffset(val) { GM_setValue('cfgTimeOffset', val); },

    // Các thông số tĩnh (Hệ thống backend)
    MASTER_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbzLGxMDjEk1YSk1_ZQrNNo5Z5OQfVONoC0i18bYm48-RxYjcGOiRR8i4rn3Jg6cm2O5/exec",
    OUTPUT_BACKEND_TOKEN: "victor-output-vocab-001",
    NORMAL_BACKEND_TOKEN: "victor-normal-vocab-001"
};