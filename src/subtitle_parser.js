export const SubtitleState = {
    currentVideoId: '',
    rawSrtData: '',
    parsedSubs: [],
    enSubs: [],
    viSubs: []
};

function formatTime(seconds) {
    let h = Math.floor(seconds / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    let s = Math.floor(seconds % 60);
    let ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function mergeSubs() {
    const enList = SubtitleState.enSubs;
    const viList = SubtitleState.viSubs;
    if (!enList || enList.length === 0) return;

    let viIdx = 0;
    const viLen = viList.length;
    const parsed = new Array(enList.length);
    const srtParts = [];

    // Tối ưu: Thuật toán 2 con trỏ O(N + M) thay vì quét lặp lồng nhau O(N*M)
    for (let i = 0; i < enList.length; i++) {
        const en = enList[i];
        let viText = "";

        if (viLen > 0) {
            // Tịnh tiến con trỏ viIdx đến vùng thời gian tương ứng
            while (viIdx < viLen && viList[viIdx].end < en.start - 0.5) {
                viIdx++;
            }
            // Tìm phần tử viSub gần nhất trong phạm vi lân cận cực nhỏ (tối đa 4 phần tử)
            let bestVi = null;
            let minDiff = 0.5;
            const searchLimit = Math.min(viLen, viIdx + 4);
            for (let k = Math.max(0, viIdx - 1); k < searchLimit; k++) {
                const diff = Math.abs(viList[k].start - en.start);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestVi = viList[k];
                }
            }
            if (bestVi) {
                viText = bestVi.text;
            } else if (i < viLen && Math.abs(viList[i].start - en.start) < 1.0) {
                viText = viList[i].text;
            }
        }

        parsed[i] = {
            start: en.start,
            end: en.end,
            text: en.text,
            text_vi: viText
        };

        srtParts.push(`${i + 1}\n${formatTime(en.start)} --> ${formatTime(en.end)}\n${en.text}\n\n`);
    }

    SubtitleState.parsedSubs = parsed;
    SubtitleState.rawSrtData = srtParts.join('');

    let vid = new URLSearchParams(window.location.search).get('v');
    if (!vid && window.location.pathname.includes('/shorts/')) {
        vid = window.location.pathname.split('/shorts/')[1];
    }
    SubtitleState.currentVideoId = vid || '';
}

function processInterceptedData(url, text, isVietsub) {
    if (!text) return;

    // Chuyển việc parse ra ngoài luồng render để không bao giờ làm khựng video
    setTimeout(() => {
        try {
            const jsonObj = JSON.parse(text);
            if (jsonObj.events) {
                let tempSubs = [];
                for (let event of jsonObj.events) {
                    if (!event.segs) continue;
                    let startMs = event.tStartMs || 0;
                    let durationMs = event.dDurationMs || 0;
                    let sentence = event.segs
                        .map(seg => seg.utf8)
                        .join("")
                        .replace(/\n/g, " ")
                        .trim();
                    if (!sentence) continue;
                    let startSec = startMs / 1000;
                    let endSec = (startMs + durationMs) / 1000;

                    // Tối ưu: Chỉ so sánh với phần tử cuối cùng O(1) thay vì some() duyệt toàn bộ mảng O(N)
                    const last = tempSubs[tempSubs.length - 1];
                    if (last && Math.abs(last.start - startSec) < 0.1 && last.text === sentence) {
                        continue;
                    }

                    tempSubs.push({
                        start: startSec,
                        end: endSec,
                        text: sentence
                    });
                }

                if (!isVietsub) {
                    SubtitleState.enSubs = tempSubs;
                    if (!url.includes('tlang=')) {
                        let viUrl = url + (url.includes('?') ? '&' : '?') + 'tlang=vi';
                        fetch(viUrl)
                            .then(r => r.text())
                            .then(t => processInterceptedData(viUrl, t, true))
                            .catch(() => {});
                    }
                } else {
                    SubtitleState.viSubs = tempSubs;
                }
                mergeSubs();
                return;
            }
        } catch(e) {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, "text/xml");
                const textNodes = xmlDoc.getElementsByTagName('text');
                if (textNodes.length > 0) {
                    let tempSubs = [];
                    for (let i = 0; i < textNodes.length; i++) {
                        let node = textNodes[i];
                        let start = parseFloat(node.getAttribute('start'));
                        let dur = parseFloat(node.getAttribute('dur'));
                        let sentence = node.textContent
                            .replace(/&amp;/g, '&')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'")
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .trim();

                        const last = tempSubs[tempSubs.length - 1];
                        if (last && Math.abs(last.start - start) < 0.1 && last.text === sentence) {
                            continue;
                        }

                        tempSubs.push({
                            start: start,
                            end: start + dur,
                            text: sentence
                        });
                    }

                    if (!isVietsub) {
                        SubtitleState.enSubs = tempSubs;
                        if (!url.includes('tlang=')) {
                            let viUrl = url + (url.includes('?') ? '&' : '?') + 'tlang=vi';
                            fetch(viUrl)
                                .then(r => r.text())
                                .then(t => processInterceptedData(viUrl, t, true))
                                .catch(() => {});
                        }
                    } else {
                        SubtitleState.viSubs = tempSubs;
                    }
                    mergeSubs();
                }
            } catch(ex) {}
        }
    }, 0);
}

export function setupInterceptors() {
    function rewriteUrlToAsr(url) {
        if (typeof url !== 'string' || !url.includes('/api/timedtext')) return url;
        if (url.includes('tlang=')) return url;
        try {
            const isAbsolute = url.startsWith('http');
            const baseUrl = isAbsolute ? url : window.location.origin + url;
            const urlObj = new URL(baseUrl);
            
            urlObj.searchParams.set('kind', 'asr');
            urlObj.searchParams.set('lang', 'en');
            urlObj.searchParams.delete('name');
            urlObj.searchParams.delete('trackName');
            
            return isAbsolute ? urlObj.toString() : urlObj.pathname + urlObj.search;
        } catch (e) {
            return url;
        }
    }

    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        url = rewriteUrlToAsr(url);
        this._url = url;
        return origOpen.apply(this, [method, url]);
    };

    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
            if (this._url && typeof this._url === 'string' && this._url.includes('/api/timedtext')) {
                processInterceptedData(this._url, this.responseText, this._url.includes('tlang=vi'));
            }
        });
        return origSend.apply(this, arguments);
    };

    const origFetch = window.fetch;
    window.fetch = async function(...args) {
        let url = args[0] instanceof Request ? args[0].url : args[0];
        url = rewriteUrlToAsr(url);
        
        if (args[0] instanceof Request) {
            args[0] = new Request(url, args[0]);
        } else {
            args[0] = url;
        }
        
        const response = await origFetch.apply(this, args);
        try {
            if (typeof url === 'string' && url.includes('/api/timedtext')) {
                const clone = response.clone();
                clone.text()
                    .then(text => processInterceptedData(url, text, url.includes('tlang=vi')))
                    .catch(() => {});
            }
        } catch(e) {}
        return response;
    };
}