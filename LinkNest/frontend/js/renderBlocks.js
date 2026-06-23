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