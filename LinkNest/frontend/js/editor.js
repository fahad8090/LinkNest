document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================
    // 🌟 1. المتغيرات العامة والحالة (Global States)
    // ==========================================
    let currentUserSlug = null; 
    let hasUnsavedChanges = false; 
    let isNewBlock = false;
    let originalBlockHTML = '';
    let originalBlockDataset = {};
    let editingBlock = null; 

    let activeThemeSettings = { bg_color: "#ffffff", text_color: "#111827", block_bg: "transparent", bg_image: "", font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" };
    let currentFormFields = [{ id: 'f_email', type: 'email', label: 'Email', required: true, placeholder: 'Enter your email' }];
    let editingFieldIndex = null;
    let formStyles = { radius: '12px', stickerUrl: '', inputsBg: 'rgba(128, 128, 128, 0.15)', btnTextCol: '#ffffff', btnBg: '#111827', formBg: 'transparent' };
    let colorPickerTarget = null; 
    let currentColorFieldTarget = null; 
    let currentProfileData = { title: '', subtitle: '', avatar: '', cover: '', shape: 'circle', align: 'center' };
    let currentSocialLinks = [];
    let currentSocialStyles = { size: 'medium', align: 'center', color: '' }; 
    let currentVideoLinks = [];
    let currentVideoStyles = { layout: 'stack', fullWidth: false };
    let currentFaqItems = [];
    let currentFaqStyles = { qStyle: 'normal', aStyle: 'normal' };
    let editingFaqIndex = null;

    // 🌟 إعدادات Giphy
    const GIPHY_API_KEY = 'csb_v1_vfEsVkji2cR_1bQQtdGBQSLxZdlxkEe_g6KmarroMKA';
    let currentGiphyData = { url: '', bg: 'transparent', padding: '12px' };
    let currentGiphyType = 'gifs'; 
    let giphySearchTimeout = null;

    // ==========================================
    // 🌟 2. عناصر الـ DOM
    // ==========================================
    const phoneScreen = document.getElementById('phone-screen');
    const overlay = document.getElementById('sheet-overlay');
    const previewArea = document.getElementById('preview-area');
    const emptyState = document.getElementById('empty-state');
    const confirmModal = document.getElementById('confirm-modal');
    const deleteModal = document.getElementById('delete-modal');
    const colorPickerModal = document.getElementById('color-picker-modal');
    const bottomNav = document.getElementById('bottom-nav');
    const actionToolbar = document.getElementById('action-toolbar');
    const previewToolbar = document.getElementById('preview-toolbar');

    const sheets = {
        choose: document.getElementById('sheet-choose-block'),
        profile: document.getElementById('sheet-profile-editor'),
        form: document.getElementById('sheet-form-editor'),
        formField: document.getElementById('sheet-form-field'), 
        chooseField: document.getElementById('sheet-choose-field'),
        text: document.getElementById('sheet-text-editor'),
        link: document.getElementById('sheet-link-editor'),
        formRadius: document.getElementById('sheet-form-radius'),
        formSticker: document.getElementById('sheet-form-sticker'),
        formPlaceholder: document.getElementById('sheet-form-placeholder'),
        style: document.getElementById('sheet-style-menu'),
        themes: document.getElementById('sheet-themes'),
        format: document.getElementById('sheet-text-format'),
        bgImage: document.getElementById('sheet-bg-image'),
        fonts: document.getElementById('sheet-fonts'),
        social: document.getElementById('sheet-social-editor'),
        video: document.getElementById('sheet-video-editor'),
        faq: document.getElementById('sheet-faq-editor'),
        giphy: document.getElementById('sheet-giphy-editor')
    };

    const inputs = {
        profileTitle: document.getElementById('profile-title-input'), 
        profileSubtitle: document.getElementById('profile-subtitle-input'),
        text: document.getElementById('text-input'),
        linkTitle: document.getElementById('link-title-input'),
        linkUrl: document.getElementById('link-url-input'),
        formBtnLabel: document.getElementById('form-btn-label-input'), 
        formSuccessText: document.getElementById('form-success-text-input'),
        fieldLabel: document.getElementById('field-label-input'), 
        fieldRequired: document.getElementById('field-required-toggle') 
    };

    Object.values(inputs).forEach(input => {
        if(input) { input.addEventListener('input', () => { hasUnsavedChanges = true; }); }
    });

    // ==========================================
    // 🌟 3. دوال Giphy (البحث والشبكة والتبويبات)
    // ==========================================
    const giphyPreviewSheet = document.getElementById('giphy-live-preview-sheet');
    const giphyResultsGrid = document.getElementById('giphy-results-grid');
    const giphySearchInput = document.getElementById('giphy-search-input');
    const tabGifs = document.getElementById('tab-gifs');
    const tabStickers = document.getElementById('tab-stickers');


    function buildFaqBlockHTML(items, styles) {
        if (!items || items.length === 0) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add FAQ Items</div>`;
        let html = '<div class="linknest-faq-wrapper" style="width:100%; display:flex; flex-direction:column; gap:8px;">';
        items.forEach((item, index) => {
            html += `
            <details class="linknest-faq-item">
                <summary style="padding:12px 16px; cursor:pointer; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                    <span style="${styles.qStyle === 'bold' ? 'font-weight:bold;' : 'font-weight:normal;'}">${item.q}</span>
                    <span class="faq-icon">+</span>
                </summary>
                <div style="padding:0 16px 12px; ${styles.aStyle === 'italic' ? 'font-style:italic;' : ''}">${item.a}</div>
            </details>`;
        });
        html += '</div>';
        return html;
    }

    function buildVideoBlockHTML(links, styles) {
        if (!links || links.length === 0 || !links[0].url) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add Video URL</div>`;
        let html = '<div style="width:100%; display:flex; flex-direction:column; gap:12px;">';
        links.forEach(link => {
            if (!link.url) return;
            // Simple iframe embed for youtube/vimeo placeholder
            let embedUrl = link.url;
            if (link.url.includes('youtube.com/watch?v=')) {
                embedUrl = link.url.replace('watch?v=', 'embed/');
            }
            html += `<iframe src="${embedUrl}" ${styles.fullWidth ? 'width="100%"' : 'width="80%" style="margin: 0 auto; display: block;"'} height="200" frameborder="0" allowfullscreen style="border-radius:12px;"></iframe>`;
        });
        html += '</div>';
        return html;
    }

    function buildSocialBlockHTML(links, styles, isPreview) {
        if (!links || links.length === 0) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add Social Links</div>`;
        let size = styles.size === 'small' ? '24px' : (styles.size === 'large' ? '48px' : '32px');
        let align = styles.align || 'center';
        let html = `<div style="width:100%; display:flex; justify-content:${align}; gap:12px; flex-wrap:wrap;">`;
        links.forEach(link => {
            let iconStr = link.url.includes('instagram') ? 'IG' : (link.url.includes('twitter') ? 'TW' : '🔗');
            html += `<a href="${link.url}" target="_blank" style="width:${size}; height:${size}; background:${styles.color || 'var(--page-text)'}; color:var(--page-bg); display:flex; align-items:center; justify-content:center; border-radius:50%; text-decoration:none; font-weight:bold; font-size:12px;">${iconStr}</a>`;
        });
        html += '</div>';
        return html;
    }

    function buildProfileBlockHTML(data) {
        let align = data.align || 'center';
        let borderRadius = data.shape === 'square' ? '8px' : '50%';
        let html = `<div class="profile-block" style="text-align:${align};">`;
        if (data.cover) {
            html += `<div style="width:100%; height:120px; background-image:url('${data.cover}'); background-size:cover; background-position:center; border-radius:12px 12px 0 0;"></div>`;
        }
        if (data.avatar) {
            html += `<img src="${data.avatar}" style="width:96px; height:96px; border-radius:${borderRadius}; margin: ${data.cover ? '-48px' : '0'} auto 12px; border: 4px solid var(--page-bg); object-fit:cover; display:inline-block;">`;
        } else {
            html += `<div style="width:96px; height:96px; border-radius:${borderRadius}; margin: ${data.cover ? '-48px' : '0'} auto 12px; border: 4px solid var(--page-bg); background:#e5e7eb; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:12px; font-weight:bold;">Avatar</div>`;
        }
        if (data.title) html += `<h2 style="margin:0 0 4px; font-size:20px; font-weight:bold; color:var(--page-text);">${data.title}</h2>`;
        if (data.subtitle) html += `<p style="margin:0; font-size:15px; color:var(--page-text); opacity:0.8;">${data.subtitle}</p>`;

        if(!data.avatar && !data.cover && !data.title && !data.subtitle) {
            return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Setup Profile</div>`;
        }

        html += `</div>`;
        return html;
    }


    // 🌟 New Blocks Builders
    function buildCountdownBlockHTML(data) {
        if (!data || !data.targetDate) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Setup Countdown Timer</div>`;
        let align = data.align || 'center';
        return `<div style="text-align:${align}; width:100%; padding:15px; background:var(--page-block-bg); border-radius:12px;">
            ${data.title ? `<h3 style="margin:0 0 10px; color:var(--page-text); font-size:18px;">${data.title}</h3>` : ''}
            <div style="font-size:24px; font-weight:bold; color:var(--page-text); font-family:monospace;">
                00 : 00 : 00 : 00
            </div>
            <div style="font-size:12px; color:var(--page-text); opacity:0.7; display:flex; justify-content:center; gap:20px; margin-top:5px;">
                <span>Days</span><span>Hrs</span><span>Mins</span><span>Secs</span>
            </div>
        </div>`;
    }

    function buildMapBlockHTML(data) {
        if (!data || !data.address) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Setup Google Maps Address</div>`;
        let encodedAddress = encodeURIComponent(data.address);
        return `<div style="width:100%; border-radius:12px; overflow:hidden;">
            <iframe width="100%" height="250" frameborder="0" style="border:0"
                src="https://www.google.com/maps?q=${encodedAddress}&output=embed" allowfullscreen>
            </iframe>
        </div>`;
    }

    function buildCarouselBlockHTML(data) {
        if (!data || !data.images || data.images.length === 0) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add Carousel Images</div>`;
        let html = `<div style="width:100%; display:flex; overflow-x:auto; gap:10px; scroll-snap-type: x mandatory; padding-bottom:10px;">`;
        data.images.forEach(img => {
            html += `<img src="${img}" style="height:200px; min-width:80%; object-fit:cover; border-radius:12px; scroll-snap-align: center;">`;
        });
        html += `</div>`;
        return html;
    }

    function buildAudioBlockHTML(data) {
        if (!data || !data.url) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add Spotify/Soundcloud Link</div>`;
        // Simple heuristic for Spotify embed
        let embedUrl = data.url;
        let height = "152";
        if (data.url.includes('spotify.com')) {
            embedUrl = data.url.replace('open.spotify.com/', 'open.spotify.com/embed/');
        } else if (data.url.includes('soundcloud.com')) {
            embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(data.url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
        }
        return `<div style="width:100%; border-radius:12px; overflow:hidden;">
            <iframe style="border-radius:12px" src="${embedUrl}" width="100%" height="${height}" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        </div>`;
    }


    function buildDividerBlockHTML(data) {
        let type = (data && data.type) ? data.type : 'solid';
        let color = (data && data.color) ? data.color : 'var(--page-text)';
        let thickness = (data && data.thickness) ? data.thickness : '1px';
        let spacing = (data && data.spacing) ? data.spacing : '20px';

        if (type === 'spacer') {
            return `<div style="width:100%; height:${spacing};"></div>`;
        }
        return `<div style="width:100%; padding:${spacing} 0;">
            <hr style="border:none; border-top:${thickness} ${type} ${color}; opacity:0.3; margin:0;">
        </div>`;
    }

    function buildTestimonialsBlockHTML(data) {
        if (!data || !data.items || data.items.length === 0) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add Testimonial</div>`;
        let html = `<div style="width:100%; display:flex; flex-direction:column; gap:16px;">`;
        data.items.forEach(item => {
            html += `<div style="padding:20px; background:var(--page-block-bg, rgba(128,128,128,0.05)); border-radius:12px; position:relative;">
                <div style="font-size:24px; color:var(--page-text); opacity:0.2; position:absolute; top:10px; left:15px;">"</div>
                <p style="font-size:15px; color:var(--page-text); font-style:italic; margin:0 0 15px 0; padding-left:15px; position:relative; z-index:1;">${item.text}</p>
                <div style="display:flex; align-items:center; gap:12px;">
                    ${item.avatar ? `<img src="${item.avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : `<div style="width:40px; height:40px; border-radius:50%; background:#e5e7eb;"></div>`}
                    <div>
                        <div style="font-weight:bold; color:var(--page-text); font-size:14px;">${item.name}</div>
                        ${item.role ? `<div style="font-size:12px; color:var(--page-text); opacity:0.7;">${item.role}</div>` : ''}
                    </div>
                </div>
            </div>`;
        });
        html += `</div>`;
        return html;
    }

    function buildQuoteBlockHTML(data) {
        if (!data || !data.text) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add Quote</div>`;
        return `<div style="width:100%; padding:24px; border-left: 4px solid var(--page-text); background:var(--page-block-bg, rgba(128,128,128,0.05)); border-radius:0 12px 12px 0;">
            <p style="font-size:18px; color:var(--page-text); font-style:italic; margin:0 0 10px 0; font-weight:500;">"${data.text}"</p>
            ${data.author ? `<div style="font-size:14px; color:var(--page-text); opacity:0.8; font-weight:bold;">— ${data.author}</div>` : ''}
        </div>`;
    }

    function buildGalleryBlockHTML(data) {
        if (!data || !data.images || data.images.length === 0) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add Gallery Images</div>`;
        let columns = data.columns || 2;
        let html = `<div style="width:100%; display:grid; grid-template-columns: repeat(${columns}, 1fr); gap:8px;">`;
        data.images.forEach(img => {
            html += `<img src="${img}" style="width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:8px;">`;
        });
        html += `</div>`;
        return html;
    }


    function buildPricingBlockHTML(data) {
        if (!data || !data.items || data.items.length === 0) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add Pricing Items</div>`;
        let html = `<div style="width:100%; display:flex; flex-direction:column; gap:12px;">`;
        data.items.forEach(item => {
            html += `<div style="padding:16px; background:var(--page-block-bg, rgba(128,128,128,0.05)); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold; font-size:16px; color:var(--page-text);">${item.name}</div>
                    ${item.desc ? `<div style="font-size:13px; color:var(--page-text); opacity:0.7; margin-top:4px;">${item.desc}</div>` : ''}
                </div>
                <div style="font-size:18px; font-weight:bold; color:var(--page-text);">${item.price}</div>
            </div>`;
        });
        html += `</div>`;
        return html;
    }

    function buildCtaBlockHTML(data) {
        if (!data || !data.text) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Setup CTA Button</div>`;
        let bg = data.bg || '#3b82f6';
        let textCol = data.textCol || '#ffffff';
        let isPill = data.style === 'pill';
        return `<div style="width:100%; display:flex; justify-content:center;">
            <a href="${data.url || '#'}" target="_blank" style="padding:14px 32px; background:${bg}; color:${textCol}; text-decoration:none; font-weight:bold; font-size:16px; border-radius:${isPill ? '50px' : '12px'}; display:inline-block; text-align:center; width:100%; max-width:300px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); transition:transform 0.2s;">
                ${data.text}
            </a>
        </div>`;
    }

    function buildCustomhtmlBlockHTML(data) {
        if (!data || !data.html) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add Custom HTML</div>`;
        return `<div style="width:100%; border-radius:12px; overflow:hidden;">${data.html}</div>`;
    }

    function buildDownloadBlockHTML(data) {
        if (!data || !data.url) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Add Download File</div>`;
        return `<div style="width:100%; display:flex; justify-content:center;">
            <a href="${data.url}" download target="_blank" style="padding:14px 20px; background:var(--page-block-bg, rgba(128,128,128,0.05)); color:var(--page-text); border:1px solid rgba(128,128,128,0.2); text-decoration:none; font-weight:bold; font-size:15px; border-radius:12px; display:flex; align-items:center; justify-content:center; gap:10px; width:100%;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                ${data.text || 'Download File'}
            </a>
        </div>`;
    }

function buildGiphyBlockHTML(data) {
        if(!data.url) return `<div style="padding:15px; color:var(--page-text); opacity:0.5; font-weight:bold; font-size:14px; text-align:center;">+ Select a GIF</div>`;
        return `<div style="padding:${data.padding}; background:${data.bg}; border-radius:16px; width:100%; box-sizing:border-box; display:flex; justify-content:center; overflow:hidden;">
                    <img src="${data.url}" style="max-width:100%; height:auto; border-radius:12px; pointer-events:none;">
                </div>`;
    }

    function updateGiphyLiveEdit() {
        const innerContent = buildGiphyBlockHTML(currentGiphyData);
        if(giphyPreviewSheet) {
            if(!currentGiphyData.url) {
                giphyPreviewSheet.innerHTML = `<span style="color:#9ca3af; font-size:14px; font-weight:600;">Select a GIF to preview</span>`;
            } else {
                giphyPreviewSheet.innerHTML = `<img src="${currentGiphyData.url}" style="max-width:100%; height:100%; object-fit:contain;">`;
            }
        }
        if (editingBlock && editingBlock.dataset.type === 'giphy') {
            editingBlock.querySelector('.block-content').innerHTML = innerContent;
            editingBlock.dataset.giphyData = JSON.stringify(currentGiphyData);
        }
    }

    async function fetchGiphy(query, type) {
        if(!giphyResultsGrid) return;
        giphyResultsGrid.innerHTML = `<div style="grid-column: span 2; text-align:center; padding:20px; color:#9ca3af; font-size:14px;">Loading...</div>`;
        try {
            const endpoint = query 
                ? `https://api.giphy.com/v1/${type}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20`
                : `https://api.giphy.com/v1/${type}/trending?api_key=${GIPHY_API_KEY}&limit=20`;
            
            const response = await fetch(endpoint);
            const resData = await response.json();
            
            giphyResultsGrid.innerHTML = '';
            if(resData.data && resData.data.length > 0) {
                resData.data.forEach(item => {
                    const imgUrl = item.images.fixed_height.url;
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.className = 'giphy-grid-img';
                    img.style.width = '100%'; 
                    img.style.height = '120px'; 
                    img.style.objectFit = 'cover'; 
                    img.style.borderRadius = '8px'; 
                    img.style.cursor = 'pointer';
                    
                    img.addEventListener('click', () => {
                        currentGiphyData.url = imgUrl;
                        hasUnsavedChanges = true;
                        updateGiphyLiveEdit();
                    });
                    
                    giphyResultsGrid.appendChild(img);
                });
            } else {
                giphyResultsGrid.innerHTML = `<div style="grid-column: span 2; text-align:center; padding:20px; color:#ef4444; font-size:14px;">No results found!</div>`;
            }
        } catch (e) {
            console.error(e);
            giphyResultsGrid.innerHTML = `<div style="grid-column: span 2; text-align:center; padding:20px; color:#ef4444; font-size:14px;">Error fetching Giphy</div>`;
        }
    }

    if(giphySearchInput) {
        giphySearchInput.addEventListener('input', (e) => {
            clearTimeout(giphySearchTimeout);
            giphySearchTimeout = setTimeout(() => {
                fetchGiphy(e.target.value, currentGiphyType);
            }, 500);
        });
    }

    function switchGiphyTab(type) {
        currentGiphyType = type;
        if(type === 'gifs') {
            if(tabGifs) { tabGifs.style.background = '#3b82f6'; tabGifs.style.color = '#fff'; }
            if(tabStickers) { tabStickers.style.background = '#f3f4f6'; tabStickers.style.color = '#111827'; }
        } else {
            if(tabStickers) { tabStickers.style.background = '#3b82f6'; tabStickers.style.color = '#fff'; }
            if(tabGifs) { tabGifs.style.background = '#f3f4f6'; tabGifs.style.color = '#111827'; }
        }
        fetchGiphy(giphySearchInput ? giphySearchInput.value : '', currentGiphyType);
    }
    
    tabGifs?.addEventListener('click', () => switchGiphyTab('gifs'));
    tabStickers?.addEventListener('click', () => switchGiphyTab('stickers'));

    // 🌟 فتح نافذة Giphy

    // 🌟 New Blocks Click Listeners
    document.getElementById('select-countdown-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { title: 'Launch Date', targetDate: '2025-12-31T23:59', align: 'center' };
        const innerContent = buildCountdownBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'countdown'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        // In a real scenario we would open a specific sheet to edit this. For now we just add it.
        hideAllSheets(); autoSaveProfile();
    });

    document.getElementById('select-map-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { address: 'Riyadh, Saudi Arabia' };
        const innerContent = buildMapBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'map'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });

    document.getElementById('select-carousel-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=500', 'https://images.unsplash.com/photo-1535332371349-a5d229f49cb5?w=500'] };
        const innerContent = buildCarouselBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'carousel'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });

    document.getElementById('select-audio-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT' };
        const innerContent = buildAudioBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'audio'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });


    document.getElementById('select-divider-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { type: 'solid', color: 'var(--page-text)', thickness: '1px', spacing: '20px' };
        const innerContent = buildDividerBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'divider'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });

    document.getElementById('select-testimonials-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { items: [{text: 'This is amazing!', name: 'John Doe', role: 'CEO', avatar: ''}] };
        const innerContent = buildTestimonialsBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'testimonials'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });

    document.getElementById('select-quote-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' };
        const innerContent = buildQuoteBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'quote'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });

    document.getElementById('select-gallery-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=200', 'https://images.unsplash.com/photo-1535332371349-a5d229f49cb5?w=200'], columns: 2 };
        const innerContent = buildGalleryBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'gallery'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });


    document.getElementById('select-pricing-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { items: [{name: 'Basic Service', desc: '1 hour consultation', price: '$50'}, {name: 'Pro Package', desc: 'Full day support', price: '$300'}] };
        const innerContent = buildPricingBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'pricing'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });

    document.getElementById('select-cta-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { text: 'Book Now', url: '#', bg: '#3b82f6', textCol: '#ffffff', style: 'rounded' };
        const innerContent = buildCtaBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'cta'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });

    document.getElementById('select-customhtml-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { html: '<div style="padding:20px; text-align:center; border:2px dashed #ccc;">Your custom widget</div>' };
        const innerContent = buildCustomhtmlBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'customhtml'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });

    document.getElementById('select-download-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        let currentData = { text: 'Download My Resume', url: '#' };
        const innerContent = buildDownloadBlockHTML(currentData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'download'; div.dataset.content = JSON.stringify(currentData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight;
        hideAllSheets(); autoSaveProfile();
    });

document.getElementById('select-giphy-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); 
        resetEditorState();
        document.getElementById('save-giphy-btn').textContent = 'Add';
        currentGiphyData = { url: '', bg: 'transparent', padding: '12px' };
        
        const innerContent = buildGiphyBlockHTML(currentGiphyData);
        const div = document.createElement('div'); 
        div.className = 'block-item selected'; 
        div.dataset.type = 'giphy'; 
        div.dataset.giphyData = JSON.stringify(currentGiphyData);
        div.innerHTML = createBlockHTML(innerContent); 
        previewArea.appendChild(div);
        
        editingBlock = div; 
        isNewBlock = true; 
        hasUnsavedChanges = true;
        previewArea.scrollTop = previewArea.scrollHeight; 
        
        updateGiphyLiveEdit();
        if(giphySearchInput) giphySearchInput.value = '';
        switchGiphyTab('gifs');
        showSheet('giphy');
    });

    // 🌟 حفظ وإضافة Giphy
    document.getElementById('save-giphy-btn')?.addEventListener('click', () => {
        if(!currentGiphyData.url) { 
            alert("Please select an image from Giphy first!"); 
            return; 
        }
        const actualContent = buildGiphyBlockHTML(currentGiphyData);
        if (editingBlock) { 
            editingBlock.querySelector('.block-content').innerHTML = actualContent; 
            editingBlock.dataset.giphyData = JSON.stringify(currentGiphyData);
            editingBlock.classList.remove('selected'); 
            updateActionToolbar(); 
        }
        isNewBlock = false; 
        hasUnsavedChanges = false;
        hideAllSheets(); 
        previewArea.scrollTop = previewArea.scrollHeight; 
        autoSaveProfile();
    });

    document.getElementById('close-giphy-editor-btn')?.addEventListener('click', () => {
        handleSheetCloseRequest();
    });

    // ==========================================
    // 🌟 4. باقي دوال المحرك والبلوكات الأخرى
    // ==========================================
    
    function createBlockHTML(contentHTML) { 
        return `<div class="block-checkbox"></div><div class="block-content">${contentHTML}</div><div class="block-drag-handle"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></svg></div>`; 
    }
    
    function checkEmptyState() { 
        const blocks = previewArea.querySelectorAll('.block-item'); 
        if (blocks.length === 0) emptyState.style.display = 'flex'; 
        else emptyState.style.display = 'none'; 
    }
    
    function applyThemeStyles() {
        phoneScreen.style.background = activeThemeSettings.bg_image ? `url(${activeThemeSettings.bg_image}) center/cover no-repeat` : (activeThemeSettings.bg_color || '#ffffff');
        phoneScreen.style.setProperty('--page-text', activeThemeSettings.text_color || '#111827');
        phoneScreen.style.setProperty('--page-block-bg', activeThemeSettings.block_bg || 'transparent');
        previewArea.style.setProperty('--page-font', activeThemeSettings.font_family || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif");
    }

    function resetEditorState() {
        editingBlock = null;
        hasUnsavedChanges = false;
        
        currentProfileData = { title: '', subtitle: '', avatar: '', cover: '', shape: 'circle', align: 'center' };
        if(inputs.profileTitle) inputs.profileTitle.value = ''; 
        if(inputs.profileSubtitle) inputs.profileSubtitle.value = ''; 
        updateProfileLiveEdit();

        if(inputs.text) inputs.text.innerHTML = ''; 
        if(inputs.linkTitle) inputs.linkTitle.value = ''; 
        if(inputs.linkUrl) inputs.linkUrl.value = '';
        
        currentFormFields = [{ id: 'f_email', type: 'email', label: 'Email', required: true, placeholder: 'Enter your email' }];
        formStyles = { radius: '12px', stickerUrl: '', inputsBg: 'rgba(128, 128, 128, 0.15)', btnTextCol: '#ffffff', btnBg: '#111827', formBg: 'transparent' };
        if(inputs.formBtnLabel) inputs.formBtnLabel.value = 'Send';
        if(inputs.formSuccessText) inputs.formSuccessText.value = 'Sent successfully!';
        updateFormLivePreview();
        
        currentSocialLinks = []; currentSocialStyles = { size: 'medium', align: 'center', color: '' };
        renderSocialInputs();
        if(document.getElementById('social-live-preview-sheet')) document.getElementById('social-live-preview-sheet').innerHTML = `<div style="width:100%; display:flex; justify-content:center;">${buildSocialBlockHTML(currentSocialLinks, currentSocialStyles, true)}</div>`;

        currentVideoLinks = []; currentVideoStyles = { layout: 'stack', fullWidth: false };
        renderVideoInputs();
        const vps = document.getElementById('video-live-preview-sheet');
        if(vps) vps.innerHTML = buildVideoBlockHTML(currentVideoLinks, currentVideoStyles);

        currentFaqItems = []; currentFaqStyles = { qStyle: 'normal', aStyle: 'normal' };
        renderFaqInputs();
        if(document.getElementById('faq-live-preview-sheet')) document.getElementById('faq-live-preview-sheet').innerHTML = buildFaqBlockHTML(currentFaqItems, currentFaqStyles);

        currentGiphyData = { url: '', bg: 'transparent', padding: '12px' };
        updateGiphyLiveEdit();
        if(document.getElementById('giphy-search-input')) document.getElementById('giphy-search-input').value = '';

        document.querySelectorAll('.block-item.selected').forEach(b => b.classList.remove('selected'));
        updateActionToolbar();
    }

    function handleSheetCloseRequest() {
        if (hasUnsavedChanges) {
            confirmModal.classList.add('active');
            overlay.classList.add('active');
        } else {
            if (isNewBlock && editingBlock) { editingBlock.remove(); }
            hideAllSheets();
        }
    }

    function hideAllSheets() {
        isNewBlock = false;
        hasUnsavedChanges = false;
        Object.values(sheets).forEach(s => { if (s) s.classList.remove('active'); });
        if (overlay) overlay.classList.remove('active'); 
        if (confirmModal) confirmModal.classList.remove('active'); 
        if (deleteModal) deleteModal.classList.remove('active'); 
        if (colorPickerModal) colorPickerModal.classList.remove('active');
        
        document.getElementById('sheet-social-link-input')?.classList.remove('active');
        document.getElementById('social-popup-overlay')?.classList.remove('active');
        document.getElementById('sheet-faq-item-input')?.classList.remove('active');
        document.getElementById('faq-popup-overlay')?.classList.remove('active');
        
        resetEditorState(); 
    }

    function showSheet(sheetName) {
        Object.values(sheets).forEach(s => { if (s) s.classList.remove('active'); });
        if (confirmModal) confirmModal.classList.remove('active'); 
        if (deleteModal) deleteModal.classList.remove('active'); 
        if (colorPickerModal) colorPickerModal.classList.remove('active'); 
        
        document.getElementById('sheet-social-link-input')?.classList.remove('active');
        document.getElementById('social-popup-overlay')?.classList.remove('active');
        document.getElementById('sheet-faq-item-input')?.classList.remove('active');
        document.getElementById('faq-popup-overlay')?.classList.remove('active');
        
        if (overlay) overlay.classList.add('active');
        if (sheets[sheetName]) sheets[sheetName].classList.add('active');
    }

    const autoSaveProfile = () => {
        if (!currentUserSlug) return;
        checkEmptyState(); 
        const blocks = [];
        previewArea.querySelectorAll('.block-item').forEach((el, index) => {
            const type = el.dataset.type; const contentDiv = el.querySelector('.block-content'); let content = {};
            if (type === 'text') { content = { text: contentDiv.innerHTML }; } 
            else if (type === 'link') { const aTag = contentDiv.querySelector('a'); content = { title: aTag ? aTag.textContent : '', url: aTag ? aTag.href : '' }; }
            else if (type === 'profile') { content = JSON.parse(el.dataset.profileData || '{}'); }
            else if (type === 'form') { content = { btnLabel: contentDiv.querySelector('.form-render-btn')?.textContent || 'Send', successText: el.dataset.success || 'Sent successfully!', fields: JSON.parse(el.dataset.fields || '[]'), styles: JSON.parse(el.dataset.styles || '{}'), html: contentDiv.innerHTML }; }
            else if (type === 'social') { content = { links: JSON.parse(el.dataset.links || '[]'), styles: JSON.parse(el.dataset.styles || '{"size":"medium", "align":"center"}') }; }
            else if (type === 'video') { content = { links: JSON.parse(el.dataset.links || '[]'), styles: JSON.parse(el.dataset.styles || '{"layout":"stack", "fullWidth":false}') }; }
            else if (type === 'faq') { content = { items: JSON.parse(el.dataset.items || '[]'), styles: JSON.parse(el.dataset.styles || '{"qStyle":"normal", "aStyle":"normal"}') }; }
            else if (type === 'giphy') { content = JSON.parse(el.dataset.giphyData || '{"url":"", "bg":"transparent", "padding":"12px"}'); }
            blocks.push({ type, content, position: index + 1 });
        });
        fetch('../backend/api/save_profile.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: currentUserSlug, theme_settings: activeThemeSettings, blocks: blocks }) }).catch(err => console.error('Error:', err));
    };

    const updateActionToolbar = () => {
        const selectedCount = document.querySelectorAll('.block-item.selected').length;
        if (selectedCount > 0) { bottomNav.classList.add('hidden'); actionToolbar.classList.add('active'); document.getElementById('action-edit-btn').style.opacity = selectedCount > 1 ? '0.3' : '1'; document.getElementById('action-edit-btn').style.pointerEvents = selectedCount > 1 ? 'none' : 'auto'; } 
        else { actionToolbar.classList.remove('active'); bottomNav.classList.remove('hidden'); }
    };

    // السحب والافلات
    previewArea.addEventListener('click', (e) => {
        if(previewArea.classList.contains('preview-mode')) return;
        const block = e.target.closest('.block-item');
        if (!block || e.target.closest('.block-drag-handle')) return; 
        block.classList.toggle('selected'); updateActionToolbar();
    });

    let draggedItem = null;
    function getDragAfterElement(container, y, selector) {
        const draggableElements = [...container.querySelectorAll(selector)];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    previewArea.addEventListener('mousedown', (e) => { if(previewArea.classList.contains('preview-mode')) return; const handle = e.target.closest('.block-drag-handle'); if (handle) handle.closest('.block-item').setAttribute('draggable', 'true'); });
    previewArea.addEventListener('dragstart', (e) => { if(e.target.classList.contains('block-item')) { draggedItem = e.target; setTimeout(() => e.target.classList.add('dragging'), 0); } });
    previewArea.addEventListener('dragend', (e) => { if(e.target.classList.contains('block-item')) { e.target.classList.remove('dragging'); e.target.removeAttribute('draggable'); draggedItem = null; autoSaveProfile(); } });
    previewArea.addEventListener('dragover', (e) => { e.preventDefault(); const afterElement = getDragAfterElement(previewArea, e.clientY, '.block-item:not(.dragging)'); if (draggedItem) { if (afterElement == null) previewArea.appendChild(draggedItem); else previewArea.insertBefore(draggedItem, afterElement); } });
    previewArea.addEventListener('touchstart', (e) => { if(previewArea.classList.contains('preview-mode')) return; const handle = e.target.closest('.block-drag-handle'); if (handle) { draggedItem = handle.closest('.block-item'); setTimeout(() => draggedItem.classList.add('dragging'), 0); previewArea.style.overflow = 'hidden'; } }, {passive: false});
    previewArea.addEventListener('touchmove', (e) => { if (!draggedItem) return; e.preventDefault(); const touchY = e.touches[0].clientY; const afterElement = getDragAfterElement(previewArea, touchY, '.block-item:not(.dragging)'); if (afterElement == null) previewArea.appendChild(draggedItem); else previewArea.insertBefore(draggedItem, afterElement); }, {passive: false});
    previewArea.addEventListener('touchend', () => { if (!draggedItem) return; draggedItem.classList.remove('dragging'); draggedItem = null; previewArea.style.overflow = 'auto'; autoSaveProfile(); });

    // ==========================================
    // 🌟 5. أزرار التحكم الرئيسية
    // ==========================================
    document.getElementById('action-close-btn')?.addEventListener('click', () => { document.querySelectorAll('.block-item.selected').forEach(b => b.classList.remove('selected')); updateActionToolbar(); });
    
    document.getElementById('action-edit-btn')?.addEventListener('click', () => {
        const selectedBlocks = document.querySelectorAll('.block-item.selected');
        if (selectedBlocks.length !== 1) return; 
        editingBlock = selectedBlocks[0]; 
        const type = editingBlock.dataset.type; 
        const contentDiv = editingBlock.querySelector('.block-content');
        
        isNewBlock = false; 
        hasUnsavedChanges = false; 
        originalBlockHTML = contentDiv.innerHTML; 
        originalBlockDataset = { ...editingBlock.dataset };

        if (type === 'form') {
            document.getElementById('add-form-btn').textContent = 'Save';
            currentFormFields = JSON.parse(editingBlock.dataset.fields || '[]');
            formStyles = JSON.parse(editingBlock.dataset.styles || '{}');
            inputs.formBtnLabel.value = contentDiv.querySelector('.form-render-btn')?.textContent || 'Send';
            inputs.formSuccessText.value = editingBlock.dataset.success || 'Sent successfully!';
            updateFormLivePreview();
            showSheet('form');
        } 
        else if (type === 'text') {
            document.getElementById('add-text-btn').textContent = 'Save';
            inputs.text.innerHTML = contentDiv.innerHTML;
            showSheet('text');
        } 
        else if (type === 'link') {
            document.getElementById('add-link-btn').textContent = 'Save';
            const aTag = contentDiv.querySelector('a');
            inputs.linkTitle.value = aTag ? aTag.textContent : '';
            inputs.linkUrl.value = aTag ? aTag.href : '';
            showSheet('link');
        } 
        else if (type === 'profile') { 
            document.getElementById('add-profile-btn').textContent = 'Save'; 
            currentProfileData = JSON.parse(editingBlock.dataset.profileData || '{"title":"","subtitle":"","shape":"circle","align":"center", "avatar":"", "cover":""}');
            inputs.profileTitle.value = currentProfileData.title || ''; 
            inputs.profileSubtitle.value = currentProfileData.subtitle || ''; 
            document.getElementById('profile-shape-text').innerHTML = currentProfileData.shape === 'circle' ? 'Circle<br>Avatar' : 'Square<br>Avatar';
            document.getElementById('profile-align-text').innerHTML = currentProfileData.align.charAt(0).toUpperCase() + currentProfileData.align.slice(1) + '<br>Alignment';
            updateProfileLiveEdit(); 
            showSheet('profile'); 
        } 
        else if (type === 'social') {
            document.getElementById('save-social-btn').textContent = 'Save';
            currentSocialLinks = JSON.parse(editingBlock.dataset.links || '[]');
            currentSocialStyles = JSON.parse(editingBlock.dataset.styles || '{"size":"medium", "align":"center"}');
            const textSizeEl = document.getElementById('social-size-text'); if (textSizeEl) textSizeEl.innerHTML = currentSocialStyles.size.charAt(0).toUpperCase() + currentSocialStyles.size.slice(1) + '<br>Size';
            const textAlignEl = document.getElementById('social-align-text'); if (textAlignEl) textAlignEl.innerHTML = currentSocialStyles.align.charAt(0).toUpperCase() + currentSocialStyles.align.slice(1) + '<br>Alignment';
            renderSocialInputs();
            updateSocialLiveEdit();
            showSheet('social');
        }
        else if (type === 'video') {
            document.getElementById('save-video-btn').textContent = 'Save';
            currentVideoLinks = JSON.parse(editingBlock.dataset.links || '[]');
            currentVideoStyles = JSON.parse(editingBlock.dataset.styles || '{"layout":"stack", "fullWidth":false}');
            const fwEl = document.getElementById('video-fullwidth-text'); if(fwEl) fwEl.innerHTML = currentVideoStyles.fullWidth ? 'Full<br>Width' : 'Normal<br>Width';
            const loEl = document.getElementById('video-layout-text'); if(loEl) loEl.innerHTML = currentVideoStyles.layout === 'grid' ? 'Grid<br>Layout' : 'Stack<br>Layout';
            renderVideoInputs();
            updateVideoLiveEdit();
            showSheet('video');
        }
        else if (type === 'faq') {
            document.getElementById('save-faq-btn').textContent = 'Save';
            currentFaqItems = JSON.parse(editingBlock.dataset.items || '[]');
            currentFaqStyles = JSON.parse(editingBlock.dataset.styles || '{"qStyle":"normal", "aStyle":"normal"}');
            const qEl = document.getElementById('faq-q-style-text'); if(qEl) qEl.innerHTML = currentFaqStyles.qStyle.charAt(0).toUpperCase() + currentFaqStyles.qStyle.slice(1) + '<br>Question';
            const aEl = document.getElementById('faq-a-style-text'); if(aEl) aEl.innerHTML = currentFaqStyles.aStyle.charAt(0).toUpperCase() + currentFaqStyles.aStyle.slice(1) + '<br>Answer';
            renderFaqInputs();
            updateFaqLiveEdit();
            showSheet('faq');
        }
        else if (type === 'giphy') {
            document.getElementById('save-giphy-btn').textContent = 'Save';
            currentGiphyData = JSON.parse(editingBlock.dataset.giphyData || '{"url":"", "bg":"transparent", "padding":"12px"}');
            updateGiphyLiveEdit();
            switchGiphyTab('gifs'); // تحميل الصور
            showSheet('giphy');
        }
    });

    document.getElementById('action-delete-btn')?.addEventListener('click', () => { overlay.classList.add('active'); deleteModal.classList.add('active'); });
    document.getElementById('delete-cancel-btn')?.addEventListener('click', () => { deleteModal.classList.remove('active'); overlay.classList.remove('active'); });
    document.getElementById('delete-confirm-btn')?.addEventListener('click', () => { document.querySelectorAll('.block-item.selected').forEach(b => b.remove()); deleteModal.classList.remove('active'); overlay.classList.remove('active'); updateActionToolbar(); autoSaveProfile(); });

    document.getElementById('open-choose-block-btn')?.addEventListener('click', () => showSheet('choose'));
    document.getElementById('close-choose-block-btn')?.addEventListener('click', hideAllSheets);
    
    document.getElementById('nav-preview-btn')?.addEventListener('click', () => { hideAllSheets(); bottomNav.classList.add('hidden'); previewToolbar.classList.add('active'); previewArea.classList.add('preview-mode'); actionToolbar.classList.remove('active'); document.querySelectorAll('.block-item.selected').forEach(b => b.classList.remove('selected')); document.getElementById('header-share-btn').style.display = 'none'; document.getElementById('header-publish-btn').style.display = 'block'; });
    document.getElementById('close-preview-btn')?.addEventListener('click', () => { previewToolbar.classList.remove('active'); bottomNav.classList.remove('hidden'); previewArea.classList.remove('preview-mode'); document.getElementById('header-share-btn').style.display = 'flex'; document.getElementById('header-publish-btn').style.display = 'none'; if(phoneScreen) { phoneScreen.parentElement.style.maxWidth = '440px'; phoneScreen.parentElement.style.borderRadius = '40px'; phoneScreen.parentElement.style.borderWidth = '10px'; } document.getElementById('preview-mobile-btn').style.color = '#3b82f6'; document.getElementById('preview-desktop-btn').style.color = '#4b5563'; });
    document.getElementById('preview-desktop-btn')?.addEventListener('click', () => { if(phoneScreen) { phoneScreen.parentElement.style.maxWidth = '100%'; phoneScreen.parentElement.style.borderRadius = '0px'; phoneScreen.parentElement.style.borderWidth = '0px'; } document.getElementById('preview-desktop-btn').style.color = '#3b82f6'; document.getElementById('preview-mobile-btn').style.color = '#4b5563'; });
    document.getElementById('preview-mobile-btn')?.addEventListener('click', () => { if(phoneScreen) { phoneScreen.parentElement.style.maxWidth = '440px'; phoneScreen.parentElement.style.borderRadius = '40px'; phoneScreen.parentElement.style.borderWidth = '10px'; } document.getElementById('preview-mobile-btn').style.color = '#3b82f6'; document.getElementById('preview-desktop-btn').style.color = '#4b5563'; });

    document.getElementById('modal-leave-btn')?.addEventListener('click', () => { 
        if (editingBlock) {
            if (isNewBlock) {
                editingBlock.remove();
            } else {
                editingBlock.querySelector('.block-content').innerHTML = originalBlockHTML;
                Object.keys(editingBlock.dataset).forEach(key => delete editingBlock.dataset[key]);
                Object.keys(originalBlockDataset).forEach(key => {
                    editingBlock.dataset[key] = originalBlockDataset[key];
                });
            }
        }
        hasUnsavedChanges = false; 
        hideAllSheets(); 
        autoSaveProfile();
    });
    document.getElementById('modal-back-btn')?.addEventListener('click', () => { confirmModal.classList.remove('active'); overlay.classList.add('active');}); 

    // ==========================================
    // 🌟 6. دوال إضافة البلوكات الأخرى (FAQ, Video, Profile, ...)
    // ==========================================
    
    // Social
    document.getElementById('select-social-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        document.getElementById('save-social-btn').textContent = 'Add';
        currentSocialStyles = { size: 'medium', align: 'center', color: '' }; currentSocialLinks = [];
        const innerContent = buildSocialBlockHTML(currentSocialLinks, currentSocialStyles, false);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'social'; div.dataset.links = '[]'; div.dataset.styles = JSON.stringify(currentSocialStyles); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight; 
        const sizeEl = document.getElementById('social-size-text'); if(sizeEl) sizeEl.innerHTML = 'Medium<br>Size';
        const alignEl = document.getElementById('social-align-text'); if(alignEl) alignEl.innerHTML = 'Center<br>Alignment';
        renderSocialInputs(); updateSocialLiveEdit(); showSheet('social');
    });

    // Video
    document.getElementById('select-video-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        document.getElementById('save-video-btn').textContent = 'Add';
        currentVideoStyles = { layout: 'stack', fullWidth: false }; currentVideoLinks = [{ url: '' }]; 
        const innerContent = buildVideoBlockHTML(currentVideoLinks, currentVideoStyles);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'video'; div.dataset.links = '[{"url":""}]'; div.dataset.styles = JSON.stringify(currentVideoStyles); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight; 
        const layoutEl = document.getElementById('video-layout-text'); if(layoutEl) layoutEl.innerHTML = 'Stack<br>Layout';
        const fwEl = document.getElementById('video-fullwidth-text'); if(fwEl) fwEl.innerHTML = 'Normal<br>Width';
        renderVideoInputs(); updateVideoLiveEdit(); showSheet('video');
    });

    // FAQ
    document.getElementById('select-faq-block')?.addEventListener('click', (e) => {
        e.stopPropagation(); resetEditorState();
        document.getElementById('save-faq-btn').textContent = 'Add';
        currentFaqStyles = { qStyle: 'normal', aStyle: 'normal' }; currentFaqItems = []; 
        const innerContent = buildFaqBlockHTML(currentFaqItems, currentFaqStyles);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'faq'; div.dataset.items = '[]'; div.dataset.styles = JSON.stringify(currentFaqStyles); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight; 
        const qEl = document.getElementById('faq-q-style-text'); if(qEl) qEl.innerHTML = 'Normal<br>Question';
        const aEl = document.getElementById('faq-a-style-text'); if(aEl) aEl.innerHTML = 'Normal<br>Answer';
        renderFaqInputs(); updateFaqLiveEdit(); showSheet('faq');
    });

    // Link
    document.getElementById('select-link-block')?.addEventListener('click', (e) => { 
        e.stopPropagation(); resetEditorState(); document.getElementById('add-link-btn').textContent = 'Add'; 
        const innerContent = `<a href="#" target="_blank" style="display:block; padding:10px; width:100%; text-decoration:none; color:inherit; font-weight:600;">New Link</a>`; 
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'link'; div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div); 
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight; showSheet('link'); 
    });

    // Profile
    document.getElementById('select-profile-block')?.addEventListener('click', (e) => { 
        e.stopPropagation(); resetEditorState(); document.getElementById('add-profile-btn').textContent = 'Add';
        currentProfileData = { title: '', subtitle: '', avatar: '', cover: '', shape: 'circle', align: 'center' };
        const innerContent = buildProfileBlockHTML(currentProfileData);
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'profile'; div.dataset.profileData = JSON.stringify(currentProfileData); div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div);
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight; 
        inputs.profileTitle.value = ''; inputs.profileSubtitle.value = ''; document.getElementById('profile-shape-text').innerHTML = 'Circle<br>Avatar'; document.getElementById('profile-align-text').innerHTML = 'Center<br>Alignment';
        updateProfileLiveEdit(); showSheet('profile'); 
    });

    // Text
    document.getElementById('select-text-block')?.addEventListener('click', (e) => { 
        e.stopPropagation(); resetEditorState(); document.getElementById('add-text-btn').textContent = 'Add'; 
        const innerContent = `<div style="padding:10px; width:100%;">New Text Block</div>`; 
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'text'; div.innerHTML = createBlockHTML(innerContent); previewArea.appendChild(div); 
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight; showSheet('text'); 
    });

    // Form
    document.getElementById('select-form-block')?.addEventListener('click', (e) => { 
        e.stopPropagation(); resetEditorState(); document.getElementById('add-form-btn').textContent = 'Add'; 
        const finalFormHTML = buildFormHTML(); 
        const div = document.createElement('div'); div.className = 'block-item selected'; div.dataset.type = 'form'; div.dataset.success = 'Sent successfully!'; div.dataset.fields = JSON.stringify(currentFormFields); div.dataset.styles = JSON.stringify(formStyles); div.innerHTML = createBlockHTML(finalFormHTML); previewArea.appendChild(div); 
        editingBlock = div; isNewBlock = true; hasUnsavedChanges = true; previewArea.scrollTop = previewArea.scrollHeight; showSheet('form'); 
    });

    // ==========================================
    // 🌟 حفظ البلوكات 🌟
    // ==========================================
    document.getElementById('close-link-editor-btn')?.addEventListener('click', handleSheetCloseRequest);
    document.getElementById('close-profile-editor-btn')?.addEventListener('click', handleSheetCloseRequest);
    document.getElementById('close-text-editor-btn')?.addEventListener('click', handleSheetCloseRequest);
    document.getElementById('close-form-editor-btn')?.addEventListener('click', handleSheetCloseRequest);

    document.getElementById('add-link-btn')?.addEventListener('click', () => { 
        const title = inputs.linkTitle.value || 'New Link'; const url = inputs.linkUrl.value || '#'; 
        const innerContent = `<a href="${url}" target="_blank" style="display:block; padding:10px; width:100%; text-decoration:none; color:inherit; font-weight:600;">${title}</a>`; 
        if (editingBlock) { editingBlock.querySelector('.block-content').innerHTML = innerContent; editingBlock.classList.remove('selected'); updateActionToolbar(); } 
        isNewBlock = false; hasUnsavedChanges = false; hideAllSheets(); previewArea.scrollTop = previewArea.scrollHeight; autoSaveProfile(); 
    });

    document.getElementById('add-profile-btn')?.addEventListener('click', () => {
        const title = inputs.profileTitle?.value || ''; if(!title) { document.getElementById('profile-title-error').style.display='block'; return; }
        const innerContent = buildProfileBlockHTML(currentProfileData);
        if (editingBlock) { editingBlock.querySelector('.block-content').innerHTML = innerContent; editingBlock.dataset.profileData = JSON.stringify(currentProfileData); editingBlock.classList.remove('selected'); updateActionToolbar(); } 
        isNewBlock = false; hasUnsavedChanges = false; hideAllSheets(); previewArea.scrollTop = previewArea.scrollHeight; autoSaveProfile(); 
    });

    document.getElementById('add-text-btn')?.addEventListener('click', () => { 
        const textContent = inputs.text.innerHTML || 'New Text Block'; 
        const innerContent = `<div style="padding:10px; width:100%;">${textContent}</div>`; 
        if (editingBlock) { editingBlock.querySelector('.block-content').innerHTML = innerContent; editingBlock.classList.remove('selected'); updateActionToolbar(); } 
        isNewBlock = false; hasUnsavedChanges = false; hideAllSheets(); previewArea.scrollTop = previewArea.scrollHeight; autoSaveProfile(); 
    });

    document.getElementById('add-form-btn')?.addEventListener('click', () => { 
        const successText = inputs.formSuccessText?.value.trim() || 'Sent successfully!'; 
        currentFormFields = currentFormFields.map(f => { if (!f.name) f.name = f.label; return f; }); 
        let finalFormHTML = buildFormHTML().replace(/disabled/g, ''); 
        currentFormFields.forEach(f => { const regex = new RegExp(`type="${f.type}" class="form-render-input"`, 'g'); finalFormHTML = finalFormHTML.replace(regex, `type="${f.type}" name="${f.name}" class="form-render-input"`); }); 
        if (editingBlock) { editingBlock.querySelector('.block-content').innerHTML = finalFormHTML; editingBlock.dataset.success = successText; editingBlock.dataset.fields = JSON.stringify(currentFormFields); editingBlock.dataset.styles = JSON.stringify(formStyles); editingBlock.classList.remove('selected'); updateActionToolbar(); } 
        isNewBlock = false; hasUnsavedChanges = false; hideAllSheets(); previewArea.scrollTop = previewArea.scrollHeight; autoSaveProfile(); 
    });

    function rebuildFormHTML(fields, styles, btnLabel) {
        let stickerHTML = styles?.stickerUrl ? `<img src="${styles.stickerUrl}" class="form-render-sticker">` : '';
        let formHTML = `<form class="form-render-container" style="background:${styles?.formBg || 'transparent'}; border-radius:${styles?.radius || '12px'};" onsubmit="event.preventDefault();">`;
        formHTML += stickerHTML;
        (fields || []).forEach(f => {
            const reqSpan = f.required ? ' <span style="color:#ef4444;">*</span>' : '';
            const reqAttr = f.required ? 'required' : '';
            const pText = f.placeholder || '';
            const inputsBg = styles?.inputsBg || 'rgba(128, 128, 128, 0.15)';
            const radius = styles?.radius || '12px';
            
            formHTML += `<div class="form-render-field-group">`;
            if (f.type !== 'checkbox') { formHTML += `<label class="form-render-label" style="color:var(--page-text);">${f.label}${reqSpan}</label>`; }
            
            if (f.type === 'textarea') { formHTML += `<textarea class="form-render-input" style="background:${inputsBg}; border-radius:${radius};" placeholder="${pText}" ${reqAttr} disabled></textarea>`; } 
            else if (f.type === 'color') { formHTML += `<div class="form-color-trigger" style="background:${inputsBg}; border-radius:${radius};" data-field-id="${f.id}"><div class="color-indicator"></div> <span style="opacity:0.6">${pText}</span></div>`; } 
            else if (f.type === 'checkbox') { formHTML += `<div class="form-check-group"><input type="checkbox" class="form-check-input" ${reqAttr} disabled> <label class="form-check-label" style="color:var(--page-text);">${f.label}${reqSpan}</label></div>`; } 
            else if (f.type === 'select' || f.type === 'radio') { formHTML += `<input type="text" class="form-render-input" style="background:${inputsBg}; border-radius:${radius};" placeholder="Select an option" disabled>`; } 
            else { formHTML += `<input type="${f.type}" class="form-render-input" style="background:${inputsBg}; border-radius:${radius};" placeholder="${pText}" ${reqAttr} disabled>`; }
            formHTML += `</div>`;
        });
        const bBg = styles?.btnBg || '#111827'; const bText = styles?.btnTextCol || '#ffffff'; const bRad = styles?.radius || '12px';
        formHTML += `<button type="submit" class="form-render-btn" style="background:${bBg}; color:${bText}; border-radius:${bRad};" disabled>${btnLabel || 'Send'}</button></form>`;
        return formHTML;
    }

    function buildFormHTML() {
        let stickerHTML = formStyles.stickerUrl ? `<img src="${formStyles.stickerUrl}" class="form-render-sticker">` : '';
        let formHTML = `<form class="form-render-container" style="background:${formStyles.formBg}; border-radius:${formStyles.radius};" onsubmit="event.preventDefault();">`;
        formHTML += stickerHTML;
        currentFormFields.forEach(f => {
            const reqSpan = f.required ? ' <span>*</span>' : ''; const reqAttr = f.required ? 'required' : ''; const pText = f.placeholder || '';
            formHTML += `<div class="form-render-field-group">`;
            if (f.type !== 'checkbox') { formHTML += `<label class="form-render-label" style="color:var(--page-text);">${f.label}${reqSpan}</label>`; }
            if (f.type === 'textarea') { formHTML += `<textarea class="form-render-input" style="background:${formStyles.inputsBg}; border-radius:${formStyles.radius};" placeholder="${pText}" ${reqAttr} disabled></textarea>`; } 
            else if (f.type === 'color') { formHTML += `<div class="form-color-trigger" style="background:${formStyles.inputsBg}; border-radius:${formStyles.radius};" data-field-id="${f.id}"><div class="color-indicator"></div> <span style="opacity:0.6">${pText}</span></div>`; } 
            else if (f.type === 'checkbox') { formHTML += `<div class="form-check-group"><input type="checkbox" class="form-check-input" ${reqAttr} disabled> <label class="form-check-label" style="color:var(--page-text);">${f.label}${reqSpan}</label></div>`; } 
            else if (f.type === 'select' || f.type === 'radio') { formHTML += `<input type="text" class="form-render-input" style="background:${formStyles.inputsBg}; border-radius:${formStyles.radius};" placeholder="Select an option" disabled>`; } 
            else { formHTML += `<input type="${f.type}" class="form-render-input" style="background:${formStyles.inputsBg}; border-radius:${formStyles.radius};" placeholder="${pText}" ${reqAttr} disabled>`; }
            formHTML += `</div>`;
        });
        formHTML += `<button type="submit" class="form-render-btn" style="background:${formStyles.btnBg}; color:${formStyles.btnTextCol}; border-radius:${formStyles.radius};" disabled>${inputs.formBtnLabel.value || 'Send'}</button></form>`;
        return formHTML;
    }

    function updateFormLivePreview() {
        document.getElementById('fe-live-preview').innerHTML = buildFormHTML();
        const listContainer = document.getElementById('form-fields-list-container');
        listContainer.innerHTML = '';
        currentFormFields.forEach((f, idx) => {
            const reqStar = f.required ? ' <span style="color:#ef4444; margin-left:2px;">*</span>' : '';
            const card = document.createElement('div'); card.className = 'form-field-card'; card.dataset.index = idx; 
            card.innerHTML = `<div class="field-drag-handle"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></svg></div><div class="form-field-info">${f.label}${reqStar}</div><button class="btn-delete-field"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
            card.querySelector('.form-field-info').addEventListener('click', () => { editingFieldIndex = idx; inputs.fieldLabel.value = f.label; inputs.fieldRequired.checked = f.required; showSheet('formField'); });
            card.querySelector('.btn-delete-field').addEventListener('click', (e) => { e.stopPropagation(); currentFormFields.splice(idx, 1); hasUnsavedChanges = true; updateFormLivePreview(); });
            listContainer.appendChild(card);
        });

        if (!listContainer.dataset.dragInit) {
            listContainer.dataset.dragInit = "true"; let draggedField = null;
            listContainer.addEventListener('mousedown', (e) => { const handle = e.target.closest('.field-drag-handle'); if(handle) handle.closest('.form-field-card').setAttribute('draggable', 'true'); });
            listContainer.addEventListener('dragstart', (e) => { if(e.target.classList.contains('form-field-card')) { draggedField = e.target; setTimeout(() => draggedField.classList.add('dragging'), 0); } });
            listContainer.addEventListener('dragend', (e) => { if(e.target.classList.contains('form-field-card')) { e.target.classList.remove('dragging'); e.target.removeAttribute('draggable'); draggedField = null; reorderFieldsArray(); } });
            listContainer.addEventListener('dragover', (e) => { e.preventDefault(); const afterElement = getDragAfterElement(listContainer, e.clientY, '.form-field-card:not(.dragging)'); if (draggedField) { if (afterElement == null) listContainer.appendChild(draggedField); else listContainer.insertBefore(draggedField, afterElement); } });
            listContainer.addEventListener('touchstart', (e) => { const handle = e.target.closest('.field-drag-handle'); if(handle) { draggedField = handle.closest('.form-field-card'); setTimeout(() => draggedField.classList.add('dragging'), 0); document.querySelector('.fe-form-settings')?.setAttribute('style', 'overflow:hidden;'); } }, {passive: false});
            listContainer.addEventListener('touchmove', (e) => { if(!draggedField) return; e.preventDefault(); const afterElement = getDragAfterElement(listContainer, e.touches[0].clientY, '.form-field-card:not(.dragging)'); if (afterElement == null) listContainer.appendChild(draggedField); else listContainer.insertBefore(draggedField, afterElement); }, {passive: false});
            listContainer.addEventListener('touchend', () => { if(!draggedField) return; draggedField.classList.remove('dragging'); draggedField = null; document.querySelector('.fe-form-settings')?.removeAttribute('style'); reorderFieldsArray(); });
        }
        function reorderFieldsArray() { const newFields = []; listContainer.querySelectorAll('.form-field-card').forEach(card => { const oldIndex = card.dataset.index; newFields.push(currentFormFields[oldIndex]); }); currentFormFields = newFields; hasUnsavedChanges = true; updateFormLivePreview(); }
    }

    inputs.formBtnLabel?.addEventListener('input', updateFormLivePreview);
    document.getElementById('close-choose-field-btn')?.addEventListener('click', () => showSheet('form'));
    document.getElementById('save-form-field-btn')?.addEventListener('click', () => { if(editingFieldIndex !== null) { currentFormFields[editingFieldIndex].label = inputs.fieldLabel.value || 'Field'; currentFormFields[editingFieldIndex].required = inputs.fieldRequired.checked; hasUnsavedChanges = true; updateFormLivePreview(); showSheet('form'); } });

    document.getElementById('tool-form-radius')?.addEventListener('click', () => showSheet('formRadius'));
    document.getElementById('close-form-radius-btn')?.addEventListener('click', () => showSheet('form'));
    document.getElementById('input-form-radius')?.addEventListener('input', (e) => { document.getElementById('radius-preview-box').style.borderRadius = e.target.value + 'px'; hasUnsavedChanges = true; });
    document.getElementById('save-form-radius-btn')?.addEventListener('click', () => { formStyles.radius = document.getElementById('input-form-radius').value + 'px'; updateFormLivePreview(); showSheet('form'); });

    document.getElementById('tool-form-placeholder')?.addEventListener('click', () => { const phContainer = document.getElementById('placeholders-list-container'); phContainer.innerHTML = ''; currentFormFields.forEach((f, idx) => { const wrap = document.createElement('div'); wrap.innerHTML = `<label class="form-label">${f.label} Placeholder</label><input type="text" class="form-input ph-input" data-index="${idx}" value="${f.placeholder || ''}">`; phContainer.appendChild(wrap); }); showSheet('formPlaceholder'); });
    document.getElementById('close-form-placeholder-btn')?.addEventListener('click', () => showSheet('form'));
    document.getElementById('save-form-placeholder-btn')?.addEventListener('click', () => { document.querySelectorAll('.ph-input').forEach(input => { const idx = input.dataset.index; currentFormFields[idx].placeholder = input.value; }); hasUnsavedChanges = true; updateFormLivePreview(); showSheet('form'); });

    document.getElementById('tool-form-sticker')?.addEventListener('click', () => showSheet('formSticker'));
    document.getElementById('close-form-sticker-btn')?.addEventListener('click', () => showSheet('form'));
    document.getElementById('input-form-sticker')?.addEventListener('change', function() { if (this.files && this.files[0]) { const reader = new FileReader(); reader.onload = function(e) { formStyles.stickerUrl = e.target.result; hasUnsavedChanges = true; updateFormLivePreview(); showSheet('form'); }; reader.readAsDataURL(this.files[0]); } });

    const hexInput = document.getElementById('hex-color-display'); const nativePicker = document.getElementById('native-color-picker');
    const openFormColorPicker = (action, title, currentColor) => { colorPickerTarget = action; document.getElementById('color-picker-title').textContent = title; let colorToSet = '#3b82f6'; if (currentColor && currentColor !== 'transparent' && currentColor.startsWith('#')) { colorToSet = currentColor; } if (nativePicker) nativePicker.value = colorToSet; if (hexInput) hexInput.value = colorToSet; overlay.classList.add('active'); colorPickerModal.classList.add('active'); };

    document.getElementById('tool-inputs-bg')?.addEventListener('click', () => openFormColorPicker('inputsBg', 'Inputs Background', formStyles.inputsBg));
    document.getElementById('tool-btn-text-color')?.addEventListener('click', () => openFormColorPicker('btnTextCol', 'Button Text Color', formStyles.btnTextCol));
    document.getElementById('tool-btn-bg')?.addEventListener('click', () => openFormColorPicker('btnBg', 'Button Background', formStyles.btnBg));
    document.getElementById('tool-form-bg')?.addEventListener('click', () => openFormColorPicker('formBg', 'Section Background', formStyles.formBg));

    nativePicker?.addEventListener('input', (e) => { hexInput.value = e.target.value.toUpperCase(); });
    document.getElementById('apply-color-btn')?.addEventListener('click', () => { const finalColor = nativePicker.value; if (colorPickerTarget === 'pageBg') { activeThemeSettings.bg_color = finalColor; activeThemeSettings.bg_image = ''; applyThemeStyles(); autoSaveProfile(); } else if (colorPickerTarget) { formStyles[colorPickerTarget] = finalColor; updateFormLivePreview(); colorPickerTarget = null; hasUnsavedChanges = true; } else if (currentColorFieldTarget) { currentColorFieldTarget.querySelector('.color-indicator').style.background = finalColor; currentColorFieldTarget.dataset.value = finalColor; currentColorFieldTarget = null; hasUnsavedChanges = true; } colorPickerModal.classList.remove('active'); overlay.classList.remove('active'); });
    document.getElementById('close-color-picker-btn')?.addEventListener('click', () => { colorPickerModal.classList.remove('active'); overlay.classList.remove('active'); });

    document.getElementById('nav-style-btn')?.addEventListener('click', () => showSheet('style')); document.getElementById('close-style-menu-btn')?.addEventListener('click', hideAllSheets); document.getElementById('btn-open-bg-color')?.addEventListener('click', () => { openFormColorPicker('pageBg', 'Page Background', activeThemeSettings.bg_color || '#ffffff'); }); document.getElementById('btn-open-bg-image')?.addEventListener('click', () => showSheet('bgImage')); document.getElementById('close-bg-image-btn')?.addEventListener('click', hideAllSheets); document.getElementById('input-bg-image-upload')?.addEventListener('change', function() { if (this.files && this.files[0]) { const reader = new FileReader(); reader.onload = function(e) { activeThemeSettings.bg_image = e.target.result; applyThemeStyles(); hideAllSheets(); autoSaveProfile(); }; reader.readAsDataURL(this.files[0]); } });

    const fontFamilies = [ { name: 'Default', val: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }, { name: 'Modern (Inter)', val: "'Inter', sans-serif" }, { name: 'Classic (Georgia)', val: "Georgia, serif" }, { name: 'Elegant (Times)', val: "'Times New Roman', Times, serif" }, { name: 'Clean (Arial)', val: "Arial, sans-serif" }, { name: 'Tech (Courier)', val: "'Courier New', Courier, monospace" } ];
    document.getElementById('btn-open-fonts')?.addEventListener('click', () => { const container = document.getElementById('fonts-list-container'); container.innerHTML = ''; fontFamilies.forEach(f => { const div = document.createElement('div'); div.className = 'font-item'; div.style.fontFamily = f.val; div.innerHTML = f.name; div.addEventListener('click', () => { activeThemeSettings.font_family = f.val; applyThemeStyles(); hideAllSheets(); autoSaveProfile(); }); container.appendChild(div); }); showSheet('fonts'); }); document.getElementById('close-fonts-btn')?.addEventListener('click', hideAllSheets);

    const themesList = [ 
        { name: 'Minimal Light', bg: '#ffffff', text: '#111827', block: '#f3f4f6', pro: false }, { name: 'Minimal Dark', bg: '#111827', text: '#ffffff', block: 'rgba(255,255,255,0.05)', pro: false },
        { name: 'Soft Blue', bg: '#eff6ff', text: '#1e3a8a', block: '#dbeafe', pro: false }, { name: 'Mint Green', bg: '#ecfdf5', text: '#064e3b', block: '#d1fae5', pro: false },
        { name: 'Warm Peach', bg: '#fff7ed', text: '#78350f', block: '#ffedd5', pro: false }, { name: 'Midnight Blue', bg: '#1e3a8a', text: '#eff6ff', block: 'rgba(255,255,255,0.1)', pro: false },
        { name: 'Forest', bg: '#064e3b', text: '#ecfdf5', block: 'rgba(255,255,255,0.1)', pro: false }, { name: 'Deep Rose', bg: '#9f1239', text: '#fff1f2', block: 'rgba(255,255,255,0.1)', pro: false },
        { name: 'Lavender', bg: '#fdf4ff', text: '#881337', block: '#ffe4e6', pro: false }, { name: 'Slate Gray', bg: '#0f172a', text: '#f8fafc', block: 'rgba(255,255,255,0.05)', pro: false },
        { name: 'Sunset Gradient', bg: 'linear-gradient(135deg, #f97316, #eab308)', text: '#ffffff', block: 'rgba(0,0,0,0.2)', pro: true }, { name: 'Ocean Gradient', bg: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', text: '#ffffff', block: 'rgba(0,0,0,0.2)', pro: true },
        { name: 'Purple Dream', bg: 'linear-gradient(135deg, #a855f7, #ec4899)', text: '#ffffff', block: 'rgba(0,0,0,0.2)', pro: true }, { name: 'Emerald Gradient', bg: 'linear-gradient(135deg, #10b981, #059669)', text: '#ffffff', block: 'rgba(0,0,0,0.2)', pro: true },
        { name: 'Cosmic Night', bg: 'linear-gradient(135deg, #312e81, #0f172a)', text: '#e0e7ff', block: 'rgba(255,255,255,0.1)', pro: true }, { name: 'Fire Engine', bg: 'linear-gradient(135deg, #ef4444, #b91c1c)', text: '#ffffff', block: 'rgba(0,0,0,0.2)', pro: true },
        { name: 'Golden Hour', bg: 'linear-gradient(135deg, #fcd34d, #f97316)', text: '#451a03', block: 'rgba(255,255,255,0.4)', pro: true }, { name: 'Neon Cyber', bg: '#000000', text: '#22d3ee', block: 'rgba(34, 211, 238, 0.1)', pro: true },
        { name: 'Cherry Blossom', bg: 'linear-gradient(135deg, #f43f5e, #fbbf24)', text: '#ffffff', block: 'rgba(0,0,0,0.2)', pro: true }, { name: 'Deep Space', bg: 'linear-gradient(135deg, #000000, #4c1d95)', text: '#e0e7ff', block: 'rgba(255,255,255,0.1)', pro: true },
        { name: 'Silver Steel', bg: 'linear-gradient(135deg, #9ca3af, #4b5563)', text: '#ffffff', block: 'rgba(0,0,0,0.2)', pro: true }, { name: 'Earth & Wood', bg: 'linear-gradient(135deg, #78350f, #451a03)', text: '#ffedd5', block: 'rgba(255,255,255,0.1)', pro: true },
        { name: 'Teal Glow', bg: 'linear-gradient(135deg, #14b8a6, #0284c7)', text: '#ffffff', block: 'rgba(0,0,0,0.2)', pro: true }, { name: 'Candy Pink', bg: 'linear-gradient(135deg, #ec4899, #be185d)', text: '#ffffff', block: 'rgba(0,0,0,0.2)', pro: true },
        { name: 'Desert Sand', bg: '#fef3c7', text: '#78350f', block: '#fde68a', pro: false }, { name: 'Arctic Blue', bg: '#e0f2fe', text: '#0369a1', block: '#bae6fd', pro: false },
        { name: 'Plum Royale', bg: '#4a044e', text: '#fdf4ff', block: 'rgba(255,255,255,0.1)', pro: false }, { name: 'Carbon Black', bg: '#171717', text: '#e5e7eb', block: 'rgba(255,255,255,0.05)', pro: true },
        { name: 'Gold Leaf', bg: '#fef08a', text: '#713f12', block: '#fde047', pro: true }, { name: 'Crystal Clear', bg: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', text: '#1e293b', block: 'rgba(255,255,255,0.5)', pro: true }
    ];
    document.getElementById('btn-open-themes')?.addEventListener('click', () => { const container = document.getElementById('themes-grid-container'); container.innerHTML = ''; themesList.forEach(theme => { const isGradient = theme.bg.includes('gradient'); const bgStyle = isGradient ? `background: ${theme.bg};` : `background-color: ${theme.bg};`; const card = document.createElement('div'); card.className = 'theme-card'; card.innerHTML = `<div class="theme-preview-box" style="${bgStyle}">${theme.pro ? '<span class="pro-badge" style="position:absolute; top:4px; right:4px;">Pro</span>' : ''}<div style="color:${theme.text}; font-weight:bold; font-size:12px;">Text</div><div class="theme-mock-text" style="background:${theme.block}"></div></div><div class="theme-card-title">${theme.name}</div>`; card.addEventListener('click', () => { document.querySelectorAll('.theme-preview-box').forEach(c => c.classList.remove('selected')); card.querySelector('.theme-preview-box').classList.add('selected'); activeThemeSettings.bg_color = theme.bg; activeThemeSettings.text_color = theme.text; activeThemeSettings.block_bg = theme.block; activeThemeSettings.bg_image = ''; formStyles.btnBg = activeThemeSettings.block_bg; formStyles.btnTextCol = activeThemeSettings.text_color; document.querySelectorAll('.block-item[data-type="form"]').forEach(block => { let styles = JSON.parse(block.dataset.styles || '{}'); styles.btnBg = activeThemeSettings.block_bg; styles.btnTextCol = activeThemeSettings.text_color; block.dataset.styles = JSON.stringify(styles); let btn = block.querySelector('.form-render-btn'); if(btn) { btn.style.background = activeThemeSettings.block_bg; btn.style.color = activeThemeSettings.text_color; } }); }); container.appendChild(card); }); showSheet('themes'); });

    // 🌟 تفعيل Field Types
    const fieldTypesDef = [ { type: 'text', icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', name: 'Name', pro: false }, { type: 'tel', icon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>', name: 'Phone', pro: false }, { type: 'email', icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>', name: 'Email', pro: false }, { type: 'textarea', icon: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>', name: 'Text', pro: true }, { type: 'checkbox', icon: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', name: 'Checkbox', pro: true }, { type: 'color', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>', name: 'Color', pro: true }, { type: 'select', icon: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', name: 'List', pro: true }, { type: 'radio', icon: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>', name: 'Radio button', pro: true }, { type: 'text', icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', name: 'Country', pro: true }, { type: 'date', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', name: 'Date', pro: true }, { type: 'time', icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', name: 'Time', pro: true }, { type: 'number', icon: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>', name: 'Number', pro: true } ];
    const fieldTypesList = document.getElementById('field-types-list');
    if(fieldTypesList) {
        fieldTypesDef.forEach(def => { const item = document.createElement('div'); item.className = 'block-option'; const proBadge = def.pro ? '<span class="pro-badge" style="background-color: #3b82f6;">Pro</span>' : ''; item.innerHTML = `<div class="block-option-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${def.icon}</svg></div><span>${def.name}</span> ${proBadge}`; item.addEventListener('click', () => { currentFormFields.push({ id: 'f_' + Date.now(), type: def.type, label: def.name, required: false, placeholder: 'Enter text...' }); hasUnsavedChanges = true; updateFormLivePreview(); showSheet('form'); }); fieldTypesList.appendChild(item); });
    }

    // 🌟 روابط السوشيال
    document.getElementById('close-social-input-modal')?.addEventListener('click', () => { document.getElementById('sheet-social-link-input')?.classList.remove('active'); document.getElementById('social-popup-overlay')?.classList.remove('active'); }); 
    document.getElementById('social-popup-overlay')?.addEventListener('click', () => { document.getElementById('sheet-social-link-input')?.classList.remove('active'); document.getElementById('social-popup-overlay')?.classList.remove('active'); });
    document.getElementById('save-social-input-modal')?.addEventListener('click', () => { const socialUrlInput = document.getElementById('social-url-input'); const url = socialUrlInput.value.trim(); if(url) { currentSocialLinks.push({ url: url }); hasUnsavedChanges = true; document.getElementById('sheet-social-link-input')?.classList.remove('active'); document.getElementById('social-popup-overlay')?.classList.remove('active'); renderSocialInputs(); updateSocialLiveEdit(); } else { document.getElementById('social-input-error').style.display = 'block'; } });
    
    // 🌟 روابط FAQ
    document.getElementById('close-faq-input-modal')?.addEventListener('click', () => { document.getElementById('sheet-faq-item-input')?.classList.remove('active'); document.getElementById('faq-popup-overlay')?.classList.remove('active'); }); 
    document.getElementById('faq-popup-overlay')?.addEventListener('click', () => { document.getElementById('sheet-faq-item-input')?.classList.remove('active'); document.getElementById('faq-popup-overlay')?.classList.remove('active'); });
    document.getElementById('save-faq-input-modal')?.addEventListener('click', () => { const q = document.getElementById('faq-q-input').value.trim(); const a = document.getElementById('faq-a-input').value.trim(); if(q && a) { if(editingFaqIndex !== null) { currentFaqItems[editingFaqIndex] = { q, a }; } else { currentFaqItems.push({ q, a }); } hasUnsavedChanges = true; document.getElementById('sheet-faq-item-input')?.classList.remove('active'); document.getElementById('faq-popup-overlay')?.classList.remove('active'); renderFaqInputs(); updateFaqLiveEdit(); } else { document.getElementById('faq-input-error').style.display = 'block'; } });

    // 🌟 إغلاق النوافذ
    document.querySelectorAll('.text-format-btn').forEach(btn => { btn.addEventListener('click', (e) => { e.preventDefault(); document.execCommand(btn.dataset.command, false, null); hasUnsavedChanges = true; inputs.text.focus(); }); });
    document.getElementById('btn-open-format')?.addEventListener('click', () => showSheet('format'));
    document.getElementById('close-text-format-btn')?.addEventListener('click', () => showSheet('text'));
    document.querySelectorAll('.format-option').forEach(opt => { opt.addEventListener('click', () => { document.execCommand('formatBlock', false, opt.dataset.format); hasUnsavedChanges = true; showSheet('text'); }); });

});