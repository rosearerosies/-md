(() => {
  const { text, one, all, meta, clean } = window.PageMd;
  const siteName = (host) => ({
    "www.bilibili.com": "哔哩哔哩", "bilibili.com": "哔哩哔哩", "www.douyin.com": "抖音",
    "www.zhihu.com": "知乎", "zhuanlan.zhihu.com": "知乎", "www.xiaoheihe.cn": "小黑盒", "blog.csdn.net": "CSDN"
  }[host] || document.title.split("-").at(-1)?.trim() || host);

  function jsonLd() {
    const values = [];
    for (const node of all('script[type="application/ld+json"]')) {
      try { values.push(...[].concat(JSON.parse(node.textContent))); } catch { /* ignore invalid data */ }
    }
    return values.flatMap((item) => item?.['@graph'] || item || []);
  }

  function bvidFromUrl() {
    return location.pathname.match(/\/video\/(BV[\w]+)/i)?.[1] || "";
  }

  function api(url) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "fetch-json", url }, (response) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!response?.ok) return reject(new Error(response?.error || "请求失败"));
        resolve(response.data);
      });
    });
  }

  async function bilibili() {
    const bvid = bvidFromUrl();
    const base = {
      kind: "video", site: "哔哩哔哩", title: meta("og:title") || text(one("h1")),
      author: text(one(".up-name, .username")), publishedAt: meta("pubdate", "article:published_time"),
      body: text(one(".desc-info-text, #v_desc")), chapters: all(".video-section-list .title, .section .title").map((n) => ({ title: text(n) }))
    };
    if (!bvid) return base;
    try {
      const view = await api(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`);
      const data = view.data;
      if (!data) return base;
      base.title ||= data.title;
      base.author ||= data.owner?.name;
      base.publishedAt ||= data.pubdate ? new Date(data.pubdate * 1000).toLocaleString() : "";
      base.body ||= data.desc || "";
      base.chapters = data.pages?.map((page) => ({ time: page.part ? `P${page.page}` : "", title: page.part })) || base.chapters;
      const cid = data.cid;
      const player = cid && await api(`https://api.bilibili.com/x/player/v2?bvid=${encodeURIComponent(bvid)}&cid=${cid}`);
      const subtitle = player?.data?.subtitle?.subtitles?.[0]?.subtitle_url;
      if (subtitle) {
        const sub = await api(subtitle.startsWith("//") ? `https:${subtitle}` : subtitle);
        base.transcript = sub.body?.map((item) => item.content).join("\n") || "";
      }
    } catch { /* page DOM remains usable */ }
    return base;
  }

  function videoDom(site) {
    const ld = jsonLd().find((x) => String(x?.['@type']).toLowerCase().includes("video")) || {};
    return {
      kind: "video", site, title: meta("og:title", "twitter:title") || ld.name || text(one("h1")),
      author: meta("author", "article:author") || ld.author?.name || text(one(".author, [data-e2e*=author]")),
      publishedAt: meta("article:published_time", "datePublished") || ld.uploadDate || "",
      body: meta("og:description", "description") || ld.description || "",
      transcript: "",
      chapters: []
    };
  }

  function article(site) {
    return {
      kind: "article", site,
      title: meta("og:title", "twitter:title") || text(one("h1")),
      author: meta("author", "article:author") || text(one(".author, .AuthorInfo-name, .article-info .name")),
      publishedAt: meta("article:published_time", "datePublished") || text(one("time, .time, .date")),
      bodyRoot: one("article, .Post-RichTextContainer, .RichContent-inner, .article-content, #content, main")
    };
  }

  async function extractAdapter() {
    const host = location.hostname.replace(/^m\./, "");
    if (host.endsWith("bilibili.com") && location.pathname.includes("/video/")) return bilibili();
    if (host.endsWith("douyin.com")) return videoDom("抖音");
    if (host.endsWith("zhihu.com")) return article("知乎");
    if (host.endsWith("xiaoheihe.cn")) return article("小黑盒");
    if (host.endsWith("csdn.net")) return article("CSDN");
    return { kind: "article", site: siteName(host), title: meta("og:title", "twitter:title") || text(one("h1")), author: meta("author", "article:author"), publishedAt: meta("article:published_time", "datePublished"), bodyRoot: one("article, main, [role=main], .post-content, .entry-content, .article-content, #content") };
  }
  window.PageMd.extractAdapter = extractAdapter;
})();
