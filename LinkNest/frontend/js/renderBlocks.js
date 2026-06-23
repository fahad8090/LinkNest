document.addEventListener("DOMContentLoaded", async () => {
    const titleEl = document.getElementById('website-title');
    const container = document.getElementById('blocks-container');

    // 1. استخراج متغير slug من رابط الصفحة (URL Query Parameters)
    const urlParams = new URLSearchParams(window.location.search);
    let slug = urlParams.get('slug');

    if (!slug) {
        titleEl.textContent = 'الرابط غير صحيح';
        container.innerHTML = '<p style="text-align: center; color: #dc2626; padding: 1rem;">لم يتم توفير معرّف الصفحة (slug).</p>';
        return;
    }

    // إضافة تأثير Loading بسيط أثناء انتظار رد الـ API
    titleEl.textContent = 'جاري التحميل...';
    container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 1rem;">يرجى الانتظار، يتم جلب البيانات...</p>';

    try {
        // تحديد مسار الـ API الصحيح بناءً على الرابط الحالي
        const isFrontendPath = window.location.pathname.includes('/frontend/');
        const apiPath = isFrontendPath 
            ? `../backend/api/get_profile.php?slug=${encodeURIComponent(slug)}`
            : `backend/api/get_profile.php?slug=${encodeURIComponent(slug)}`;
        const trackApiPath = isFrontendPath 
            ? `../backend/api/track.php`
            : `backend/api/track.php`;
        // مسار إرسال الفورم للـ CRM
        const submitApiPath = isFrontendPath 
            ? `../backend/api/submit_form.php`
            : `backend/api/submit_form.php`;

        // 2. استخدام fetch للاتصال بـ API
        const response = await fetch(apiPath);
        
        // في حال فشل الطلب (مثل 404 Profile not found)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            titleEl.textContent = 'الصفحة غير موجودة';
            container.innerHTML = `<p style="text-align: center; color: #dc2626; padding: 1rem;">${errorData.error || 'عذراً، لم نتمكن من العثور على هذه الصفحة.'}</p>`;
            return;
        }

        const data = await response.json();

        // إرسال تتبع مشاهدة الصفحة (View Tracking) في الخلفية
        if (data.website && data.website.id) {
            fetch(trackApiPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_type: 'view', website_id: data.website.id })
            }).catch(e => console.error('View tracking error:', e));
        }

        // 3. في حال نجاح الطلب، عرض بيانات الموقع
        const websiteTitle = data.website.title || `@${slug}`;
        titleEl.textContent = websiteTitle;
        document.title = `${websiteTitle} - LinkNest`;
        
        if (data.website.theme_settings && data.website.theme_settings.bg_color) {
            document.body.style.backgroundColor = data.website.theme_settings.bg_color;
        }

        // إفراغ حاوية البلوكات
        container.innerHTML = '';

        // استخدام DocumentFragment لعمل Render سريع للبلوكات
        const fragment = document.createDocumentFragment();

        if (data.blocks && data.blocks.length > 0) {
            // ترتيب البلوكات حسب الحقل position
            data.blocks.sort((a, b) => a.position - b.position);

            data.blocks.forEach(block => {
                const el = document.createElement('div');
                el.className = `block block-${block.type}`;

                // معالجة المحتوى حسب نوع البلوك والتأكد من مطابقة هيكل JSON القادم من المحرر
                if (block.type === 'link') {
                    const a = document.createElement('a');
                    // المحرر يحفظ الرابط في الوصف والعنوان في title
                    a.href = block.content.description || block.content.url || '#';
                    a.textContent = block.content.title || block.content.text || 'رابط';
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    
                    // إرسال تتبع النقر على الرابط (Click Tracking) في الخلفية
                    a.addEventListener('click', () => {
                        fetch(trackApiPath, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ event_type: 'click', block_id: block.id })
                        }).catch(e => console.error('Click tracking error:', e));
                    });

                    el.appendChild(a);
                } 
                else if (block.type === 'text') {
                    const p = document.createElement('p');
                    p.className = 'block-text';
                    const titleHtml = block.content.title ? `<strong>${block.content.title}</strong>` : '';
                    const descHtml = block.content.description || block.content.text || '';
                    p.innerHTML = `${titleHtml}${descHtml}`;
                    el.appendChild(p);
                }
                // 🌟 تمت إضافة دعم بلوك الفورم هنا 🌟

                else if (block.type === 'countdown') {
                    const data = block.content || {};
                    let align = data.align || 'center';
                    el.innerHTML = `<div style="text-align:${align}; width:100%; padding:15px; background:var(--page-block-bg, rgba(128,128,128,0.05)); border-radius:12px;">
                        ${data.title ? `<h3 style="margin:0 0 10px; font-size:18px;">${data.title}</h3>` : ''}
                        <div style="font-size:24px; font-weight:bold; font-family:monospace;">00 : 00 : 00 : 00</div>
                        <div style="font-size:12px; opacity:0.7; display:flex; justify-content:center; gap:20px; margin-top:5px;"><span>Days</span><span>Hrs</span><span>Mins</span><span>Secs</span></div>
                    </div>`;
                }
                else if (block.type === 'map') {
                    const data = block.content || {};
                    let encodedAddress = encodeURIComponent(data.address || 'Riyadh, Saudi Arabia');
                    el.innerHTML = `<div style="width:100%; border-radius:12px; overflow:hidden;"><iframe width="100%" height="250" frameborder="0" style="border:0" src="https://www.google.com/maps?q=${encodedAddress}&output=embed" allowfullscreen></iframe></div>`;
                }
                else if (block.type === 'carousel') {
                    const data = block.content || {};
                    const images = data.images || [];
                    let html = `<div style="width:100%; display:flex; overflow-x:auto; gap:10px; scroll-snap-type: x mandatory; padding-bottom:10px;">`;
                    images.forEach(img => {
                        html += `<img src="${img}" style="height:200px; min-width:80%; object-fit:cover; border-radius:12px; scroll-snap-align: center;">`;
                    });
                    html += `</div>`;
                    el.innerHTML = html;
                }
                else if (block.type === 'audio') {
                    const data = block.content || {};
                    let url = data.url || '';
                    let embedUrl = url;
                    if (url.includes('spotify.com')) {
                        embedUrl = url.replace('open.spotify.com/', 'open.spotify.com/embed/');
                    } else if (url.includes('soundcloud.com')) {
                        embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
                    }
                    el.innerHTML = `<div style="width:100%; border-radius:12px; overflow:hidden;"><iframe style="border-radius:12px" src="${embedUrl}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div>`;
                }

                else if (block.type === 'divider') {
                    const data = block.content || {};
                    let type = data.type || 'solid';
                    let color = data.color || 'var(--page-text)';
                    let thickness = data.thickness || '1px';
                    let spacing = data.spacing || '20px';

                    if (type === 'spacer') {
                        el.innerHTML = `<div style="width:100%; height:${spacing};"></div>`;
                    } else {
                        el.innerHTML = `<div style="width:100%; padding:${spacing} 0;"><hr style="border:none; border-top:${thickness} ${type} ${color}; opacity:0.3; margin:0;"></div>`;
                    }
                }
                else if (block.type === 'testimonials') {
                    const data = block.content || {};
                    const items = data.items || [];
                    let html = `<div style="width:100%; display:flex; flex-direction:column; gap:16px;">`;
                    items.forEach(item => {
                        html += `<div style="padding:20px; background:var(--page-block-bg, rgba(128,128,128,0.05)); border-radius:12px; position:relative;">
                            <div style="font-size:24px; opacity:0.2; position:absolute; top:10px; left:15px;">"</div>
                            <p style="font-size:15px; font-style:italic; margin:0 0 15px 0; padding-left:15px; position:relative; z-index:1;">${item.text}</p>
                            <div style="display:flex; align-items:center; gap:12px;">
                                ${item.avatar ? `<img src="${item.avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">` : `<div style="width:40px; height:40px; border-radius:50%; background:rgba(128,128,128,0.2);"></div>`}
                                <div><div style="font-weight:bold; font-size:14px;">${item.name}</div>${item.role ? `<div style="font-size:12px; opacity:0.7;">${item.role}</div>` : ''}</div>
                            </div>
                        </div>`;
                    });
                    html += `</div>`;
                    el.innerHTML = html;
                }
                else if (block.type === 'quote') {
                    const data = block.content || {};
                    el.innerHTML = `<div style="width:100%; padding:24px; border-left: 4px solid var(--page-text); background:var(--page-block-bg, rgba(128,128,128,0.05)); border-radius:0 12px 12px 0;">
                        <p style="font-size:18px; font-style:italic; margin:0 0 10px 0; font-weight:500;">"${data.text}"</p>
                        ${data.author ? `<div style="font-size:14px; opacity:0.8; font-weight:bold;">— ${data.author}</div>` : ''}
                    </div>`;
                }
                else if (block.type === 'gallery') {
                    const data = block.content || {};
                    const images = data.images || [];
                    const columns = data.columns || 2;
                    let html = `<div style="width:100%; display:grid; grid-template-columns: repeat(${columns}, 1fr); gap:8px;">`;
                    images.forEach(img => {
                        html += `<img src="${img}" style="width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:8px;">`;
                    });
                    html += `</div>`;
                    el.innerHTML = html;
                }

                else if (block.type === 'pricing') {
                    const data = block.content || {};
                    const items = data.items || [];
                    let html = `<div style="width:100%; display:flex; flex-direction:column; gap:12px;">`;
                    items.forEach(item => {
                        html += `<div style="padding:16px; background:var(--page-block-bg, rgba(128,128,128,0.05)); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                            <div><div style="font-weight:bold; font-size:16px;">${item.name}</div>${item.desc ? `<div style="font-size:13px; opacity:0.7; margin-top:4px;">${item.desc}</div>` : ''}</div>
                            <div style="font-size:18px; font-weight:bold;">${item.price}</div>
                        </div>`;
                    });
                    html += `</div>`;
                    el.innerHTML = html;
                }
                else if (block.type === 'cta') {
                    const data = block.content || {};
                    let bg = data.bg || '#3b82f6';
                    let textCol = data.textCol || '#ffffff';
                    let isPill = data.style === 'pill';
                    el.innerHTML = `<div style="width:100%; display:flex; justify-content:center;"><a href="${data.url || '#'}" target="_blank" style="padding:14px 32px; background:${bg}; color:${textCol}; text-decoration:none; font-weight:bold; font-size:16px; border-radius:${isPill ? '50px' : '12px'}; display:inline-block; text-align:center; width:100%; max-width:300px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); transition:transform 0.2s;">${data.text || 'Click Here'}</a></div>`;
                }
                else if (block.type === 'customhtml') {
                    const data = block.content || {};
                    el.innerHTML = `<div style="width:100%; border-radius:12px; overflow:hidden;">${data.html || ''}</div>`;
                }
                else if (block.type === 'download') {
                    const data = block.content || {};
                    el.innerHTML = `<div style="width:100%; display:flex; justify-content:center;"><a href="${data.url || '#'}" download target="_blank" style="padding:14px 20px; background:var(--page-block-bg, rgba(128,128,128,0.05)); color:var(--page-text); border:1px solid rgba(128,128,128,0.2); text-decoration:none; font-weight:bold; font-size:15px; border-radius:12px; display:flex; align-items:center; justify-content:center; gap:10px; width:100%;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>${data.text || 'Download File'}</a></div>`;
                }
else if (block.type === 'form') {
                    // يعتمد على كيفية حفظ المحرر للفورم، غالباً يحفظ الـ HTML المولد في content.html أو content.code
                    const formHtml = block.content.html || block.content.code || block.content.text || '';
                    if (formHtml) {
                        el.innerHTML = formHtml;
                    } else {
                        // في حال لم يكن هناك HTML جاهز، بناء فورم ديناميكي بسيط لتجنب تعطل الصفحة
                        el.innerHTML = `
                            <div style="background:#fff; padding:16px; border-radius:12px; border:1px solid #e5e7eb; width:100%;">
                                ${block.content.title ? `<h3 style="font-weight:bold; margin-bottom:12px;">${block.content.title}</h3>` : ''}
                                <form style="display:flex; flex-direction:column; gap:12px;">
                                    <input type="text" name="Name" placeholder="Name" required style="padding:10px; border-radius:8px; border:1px solid #d1d5db; width:100%;">
                                    <input type="email" name="Email" placeholder="Email" required style="padding:10px; border-radius:8px; border:1px solid #d1d5db; width:100%;">
                                    <textarea name="Message" placeholder="Message" rows="3" style="padding:10px; border-radius:8px; border:1px solid #d1d5db; width:100%;"></textarea>
                                    <button type="submit" style="padding:12px; border-radius:8px; border:none; background-color:#3b82f6; color:#fff; font-weight:bold; cursor:pointer;">Send</button>
                                </form>
                            </div>
                        `;
                    }
                }

                fragment.appendChild(el);
            });
            
            // حقن البلوكات في الصفحة دفعة واحدة
            container.appendChild(fragment);

            // 🌟 استدعاء دالة التقاط الفورم بعد حقن جميع البلوكات في الصفحة 🌟
            initVisitorForms(slug, submitApiPath);

        } else {
            container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 1rem;">لا توجد روابط مضافة حتى الآن.</p>';
        }

    } catch (error) {
        console.error("Fetch error:", error);
        titleEl.textContent = 'خطأ في الاتصال';
        container.innerHTML = '<p style="text-align: center; color: #dc2626; padding: 1rem;">حدث خطأ أثناء محاولة جلب البيانات. يرجى التأكد من اتصالك.</p>';
    }
});

// 🌟 الدالة السحرية لإرسال بيانات الزائر إلى الـ CRM 🌟
function initVisitorForms(websiteSlug, submitApiUrl) {
    const forms = document.querySelectorAll('form'); 

    forms.forEach(form => {
        // منع إضافة الحدث أكثر من مرة لنفس الفورم
        if (form.dataset.crmInitialized) return;
        form.dataset.crmInitialized = "true";

        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // إيقاف الانتقال الافتراضي للصفحة

            const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]');
            if (!submitBtn) return;

            const originalText = submitBtn.innerHTML || submitBtn.value;

            // تأثير بصري للزر (جاري الإرسال)
            submitBtn.disabled = true;
            if (submitBtn.tagName === 'BUTTON') {
                submitBtn.innerHTML = '<span style="letter-spacing: 2px;">...</span>'; 
            } else {
                submitBtn.value = '...';
            }
            submitBtn.style.opacity = '0.8';

            // تجميع بيانات الحقول بشكل ديناميكي (يقبل أي حقل تمت إضافته في المحرر بشرط وجود خاصية name)
            const formData = new FormData(form);
            const formObject = {};
            formData.forEach((value, key) => {
                formObject[key] = value;
            });

            try {
                // إرسال البيانات للباك اند
                const response = await fetch(submitApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slug: websiteSlug,
                        form_data: formObject
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    // تأثير بصري للنجاح (تحويل الزر للون الأخضر)
                    if (submitBtn.tagName === 'BUTTON') submitBtn.innerHTML = 'Sent successfully! ✔';
                    else submitBtn.value = 'Sent successfully! ✔';
                    
                    submitBtn.style.backgroundColor = '#10b981'; // Green color
                    submitBtn.style.color = '#fff';
                    submitBtn.style.opacity = '1';
                    
                    form.reset(); // تفريغ حقول الفورم
                    
                    // إرجاع الزر لشكله الطبيعي بعد 3 ثواني
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        if (submitBtn.tagName === 'BUTTON') submitBtn.innerHTML = originalText;
                        else submitBtn.value = originalText;
                        submitBtn.style.backgroundColor = ''; // العودة للون الأصلي (حسب الـ CSS)
                    }, 3000);
                } else {
                    throw new Error(data.error || 'Failed to send');
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                
                // تأثير بصري للخطأ (تحويل الزر للون الأحمر)
                if (submitBtn.tagName === 'BUTTON') submitBtn.innerHTML = 'Error! Try Again';
                else submitBtn.value = 'Error! Try Again';
                
                submitBtn.style.backgroundColor = '#ef4444'; // Red color
                submitBtn.style.color = '#fff';
                
                setTimeout(() => {
                    submitBtn.disabled = false;
                    if (submitBtn.tagName === 'BUTTON') submitBtn.innerHTML = originalText;
                    else submitBtn.value = originalText;
                    submitBtn.style.backgroundColor = '';
                }, 3000);
            }
        });
    });
}