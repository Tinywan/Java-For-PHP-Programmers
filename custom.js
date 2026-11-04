document.addEventListener("DOMContentLoaded", () => {
    // 自动将 > [!TIP] 等 GitHub 风格转换为彩色 Alert 卡片
    const blockquotes = document.querySelectorAll("blockquote");
    const alertTypes = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];
    
    blockquotes.forEach(bq => {
        const firstP = bq.querySelector("p");
        if (!firstP) return;
        
        for (const type of alertTypes) {
            const prefix = `[!${type}]`;
            if (firstP.innerHTML.trim().startsWith(prefix)) {
                bq.classList.add("markdown-alert", `markdown-alert-${type.toLowerCase()}`);
                const content = firstP.innerHTML.trim().substring(prefix.length).trim();
                const iconSvg = getIconSvg(type);
                firstP.innerHTML = `<div class="markdown-alert-title">${iconSvg}<span>${type}</span></div>${content ? `<div>${content}</div>` : ""}`;
                break;
            }
        }
    });

    // 右侧悬浮目录（PageTOC）自动生成
    const main = document.querySelector(".content main");
    if (!main) return;
    
    const headers = main.querySelectorAll("h2, h3");
    if (headers.length >= 2) {
        const pagetoc = document.createElement("div");
        pagetoc.className = "pagetoc-container";
        pagetoc.innerHTML = '<div class="pagetoc-title">本页目录</div><nav class="pagetoc-nav"></nav>';
        const nav = pagetoc.querySelector(".pagetoc-nav");
        
        headers.forEach(h => {
            if (!h.id) return;
            const a = document.createElement("a");
            a.href = "#" + h.id;
            a.textContent = h.textContent.replace(/^#+\s*/, "").trim();
            a.className = `pagetoc-link pagetoc-level-${h.tagName.toLowerCase()}`;
            nav.appendChild(a);
        });
        
        document.body.appendChild(pagetoc);
    }
});

function getIconSvg(type) {
    const svgs = {
        NOTE: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>',
        TIP: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path></svg>',
        IMPORTANT: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>',
        WARNING: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>',
        CAUTION: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M4.47.047A1.75 1.75 0 0 1 5.71 0h4.58a1.75 1.75 0 0 1 1.24.513l3.96 3.96c.33.33.51.78.51 1.24v4.58c0 .46-.18.91-.51 1.24l-3.96 3.96a1.75 1.75 0 0 1-1.24.513H5.71a1.75 1.75 0 0 1-1.24-.513L.51 11.533A1.75 1.75 0 0 1 0 10.293V5.713c0-.46.18-.91.51-1.24Zm.875 1.408a.25.25 0 0 0-.177.073L1.207 5.488a.25.25 0 0 0-.073.177v4.58c0 .066.026.13.073.177l3.96 3.96a.25.25 0 0 0 .177.073h4.58a.25.25 0 0 0 .177-.073l3.96-3.96a.25.25 0 0 0 .073-.177v-4.58a.25.25 0 0 0-.073-.177L9.927 1.528a.25.25 0 0 0-.177-.073ZM8 3.75a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 3.75Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>'
    };
    return svgs[type] || "";
}
