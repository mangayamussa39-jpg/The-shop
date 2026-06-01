const PHONE_SHEET_ID = "1mcSKIs1VsZVF9Z7MSc82gln5XdF1jWJo0GYVnnxqgMk"; 
let orderPhoneNumber = ""; 

const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') { document.body.classList.remove('light-mode'); document.getElementById('theme-icon').textContent = 'dark_mode'; }
else { document.body.classList.add('light-mode'); document.getElementById('theme-icon').textContent = 'light_mode'; }

let products = [];
let allCategories = [];
let activeCategories = []; 
let activeBrands = [];     
let currentSort = 'none'; 
let searchQuery = '';

let cart = JSON.parse(localStorage.getItem('saved_cart')) || {}; 

let activeProductId = null;
let currentPage = 1;
let searchActive = false; 

let currentPdpId = null;
let pdpHomeScrollPos = 0;
let relatedViewMode = 'grid';
let pendingBuyNow = null;

let pdpRabbitHoleDepth = 0;

function formatWhatsAppStyle(text) {
    if (!text) return '';
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    let lines = html.split('\n');
    let parsedLines = [];
    let inUl = false;
    let inOl = false;
    
    for (let i = 0; i < lines.length; i++) {
        let trimLine = lines[i].trim();
        let isUl = /^[-*]\s+(.+)/.exec(trimLine);
        let isOl = /^(\d+)\.\s+(.+)/.exec(trimLine);
        
        if (isUl) {
            if (inOl) { parsedLines.push('</ol>'); inOl = false; }
            if (!inUl) { parsedLines.push('<ul class="pdp-desc-ul">'); inUl = true; }
            parsedLines.push(`<li>${isUl[1]}</li>`);
        } else if (isOl) {
            if (inUl) { parsedLines.push('</ul>'); inUl = false; }
            if (!inOl) { parsedLines.push('<ol class="pdp-desc-ol">'); inOl = true; }
            parsedLines.push(`<li>${isOl[2]}</li>`);
        } else {
            if (inUl) { parsedLines.push('</ul>'); inUl = false; }
            if (inOl) { parsedLines.push('</ol>'); inOl = false; }
            
            if (trimLine.startsWith('&gt; ')) {
                parsedLines.push(`<blockquote class="pdp-desc-quote">${trimLine.substring(5)}</blockquote>`);
            } else if (trimLine === '') {
                parsedLines.push('<br>');
            } else {
                parsedLines.push(`${trimLine}<br>`);
            }
        }
    }
    if (inUl) parsedLines.push('</ul>');
    if (inOl) parsedLines.push('</ol>');
    
    let finalHtml = parsedLines.join('\n');
    
    finalHtml = finalHtml.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    finalHtml = finalHtml.replace(/_(.*?)_/g, '<em>$1</em>');
    finalHtml = finalHtml.replace(/~(.*?)~/g, '<del>$1</del>');
    finalHtml = finalHtml.replace(/`(.*?)`/g, '<code>$1</code>');
    
    return finalHtml.replace(/(<br>\n?)+$/g, '');
}

function stripWhatsAppStyle(text) {
    if (!text) return '';
    let stripped = text.replace(/[*_~`]/g, '');
    stripped = stripped.replace(/^>\s*/gm, '');
    return stripped;
}

// BULLETPROOF NUMBER EXTRACTOR
function parseSheetNumber(val) {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;
    // Strip everything except numbers and decimals
    const cleaned = String(val).replace(/[^0-9.]/g, ""); 
    return cleaned !== '' ? parseFloat(cleaned) : null;
}

async function fetchPhoneNumber() {
    if (!PHONE_SHEET_ID) return; 
    const url = `https://docs.google.com/spreadsheets/d/${PHONE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=number`;
    try {
        const response = await fetch(url);
        const text = await response.text();
        const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/)[1];
        const data = JSON.parse(jsonString);
        
        if (data && data.table && data.table.rows && data.table.rows[0]) {
            const cell = data.table.rows[0].c;
            if (cell && cell[0] && cell[0].v) {
                orderPhoneNumber = String(cell[0].v).replace(/\D/g, ''); 
            }
        }
    } catch (err) {
        console.error("Phone Fetch Error:", err);
    }
}

async function fetchProductsFromSheet() {
    const sheetId = '1mURd9HVNEvcPGplKjCN8HPAksq8JjziRy7nM24ZxVoE';
    const sheetName = encodeURIComponent('perfume');
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`;
    
    try {
        const response = await fetch(url);
        const text = await response.text();
        const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/)[1];
        const data = JSON.parse(jsonString);
        
        if (!data || !data.table || !data.table.rows) throw new Error("Invalid sheet structure");

        const fetched = [];
        data.table.rows.forEach((row, i) => {
            const c = row.c;
            if (!c || !c[1]) return; 

            const id = c[0] && c[0].v !== null ? c[0].v : i; 
            const title = c[1] && c[1].v !== null ? c[1].v : 'Unnamed Product'; 
            const category = c[2] && c[2].v !== null ? c[2].v : 'Uncategorized'; 
            const brand = c[3] && c[3].v !== null ? c[3].v : 'Generic'; 
            
            // Read values from columns
            let val1 = c[4] && c[4].v !== null ? parseSheetNumber(c[4].v) : 0; 
            let val2 = c[5] && c[5].v !== null ? parseSheetNumber(c[5].v) : null; 
            
            let price = val1;
            let originalPrice = val2;

            // SMART SWAP: If the new price is accidentally larger than the old price, swap them automatically
            if (originalPrice !== null && price > originalPrice) {
                price = val2;
                originalPrice = val1;
            }

            // Calculate the exact percentage discount safely
            let discountPct = 0;
            if (originalPrice !== null && price > 0 && originalPrice > price) {
                discountPct = Math.round(((originalPrice - price) / originalPrice) * 100);
            }
            
            // DEBUG LOGGER: Press F12 in your browser to check these exact values!
            console.log(`Product: ${title} | New Price: ${price} | Old Price: ${originalPrice} | Discount: ${discountPct}%`);

            const description = c[6] && c[6].v !== null ? c[6].v : ''; 
            const mainImage = c[7] && c[7].v !== null ? c[7].v : ''; 
            
            let images = [mainImage];
            const galleryString = c[8] && c[8].v !== null ? c[8].v : '';
            if(galleryString) {
                const extra = galleryString.split(',').map(s => s.trim()).filter(s => s);
                images = [mainImage, ...extra];
            }

            let date = c[9] && c[9].v !== null ? c[9].v : Date.now();
            let timestamp = Date.now();
            if (typeof date === 'string') {
                if (date.startsWith('Date(')) {
                    const parts = date.match(/Date\((\d+),(\d+),(\d+)\)/);
                    if (parts) timestamp = new Date(parts[1], parts[2], parts[3]).getTime();
                } else timestamp = new Date(date).getTime();
            } else if (typeof date === 'number') timestamp = date; 

            fetched.push({
                id, title, subtitle: category, category, brand, price, originalPrice, discountPct,
                description, image: mainImage, images, date: timestamp
            });
        });
        return fetched;
    } catch (err) {
        console.error("Sheet Fetch Error:", err);
        return [];
    }
}

async function initApp() {
    await fetchPhoneNumber();
    updateCartBadge(); 
    products = await fetchProductsFromSheet();
    
    if (products.length === 0) {
        document.getElementById('product-container').innerHTML = `<div class="empty-state"><span class="material-icons empty-icon">error_outline</span><div class="empty-text">Failed to load data. Make sure sheet is public.</div></div>`;
        return;
    }

    for (let i = products.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [products[i], products[j]] = [products[j], products[i]];
    }

    allCategories = [...new Set(products.map(p => p.category))].filter(Boolean);
    
    const urlParams = new URLSearchParams(window.location.search);
    const productParam = urlParams.get('product');
    const cartParam = urlParams.get('cart');
    const categoryParam = urlParams.get('category');
    const brandParam = urlParams.get('brand');

    if (categoryParam) {
        const exactCat = allCategories.find(c => c.toLowerCase() === categoryParam.toLowerCase()) || categoryParam;
        activeCategories = [exactCat];
    }
    if (brandParam) {
        const uniqueBrands = [...new Set(products.map(p => p.brand))];
        const exactBrand = uniqueBrands.find(b => b.toLowerCase() === brandParam.toLowerCase()) || brandParam;
        activeBrands = [exactBrand];
    }

    renderCategoriesModal();
    renderChips();
    renderBrandsList();
    updateControlButtons();
    
    if (cartParam) {
        cart = {}; 

        cartParam.split(',').forEach(pair => {
            const [id, qty] = pair.split(':');
            if (id && qty && !isNaN(qty) && products.some(p => String(p.id) === String(id))) {
                cart[id] = parseInt(qty);
            }
        });
        saveCartData();
        updateCartBadge();
        
        pdpRabbitHoleDepth = 0;
        history.replaceState({ view: 'home', page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '', window.location.pathname);
        renderProducts();
        
        setTimeout(() => {
            renderCartItems();
            openModal('cart-modal');
        }, 300);

    } else if (productParam) {
        pdpRabbitHoleDepth = 0;
        history.replaceState({ view: 'pdp', id: productParam, depth: pdpRabbitHoleDepth }, '', '?product=' + productParam);
        renderProducts();
        openPDP(productParam, false);
    } else {
        pdpRabbitHoleDepth = 0;
        history.replaceState({ view: 'home', page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '', window.location.pathname);
        renderProducts();
    }
}

const smartHeader = document.getElementById('smart-header');
function adjustBodyPadding() { document.body.style.paddingTop = smartHeader.offsetHeight + 'px'; }

window.addEventListener('resize', () => {
    adjustBodyPadding(); closeGlobalActionMenu(); updateScrollFades();
    if(!document.getElementById('pdp-view').classList.contains('active')) renderProducts(); 
});

function updateScrollFades() {
    const scrollArea = document.getElementById('category-scroll-area');
    if (!scrollArea) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollArea;
    const isAtStart = scrollLeft <= 0;
    const isAtEnd = Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 2; 
    scrollArea.classList.remove('fade-left', 'fade-right', 'fade-both');
    if (isAtStart && isAtEnd) {} else if (isAtStart) scrollArea.classList.add('fade-right');
    else if (isAtEnd) scrollArea.classList.add('fade-left'); else scrollArea.classList.add('fade-both');
}
document.getElementById('category-scroll-area').addEventListener('scroll', updateScrollFades);

function renderChips() {
    const scrollArea = document.getElementById('category-scroll-area');
    const allChip = document.getElementById('all-chip');

    let displayCategories = [...allCategories];
    if (activeCategories.length > 0) {
        displayCategories = displayCategories.filter(c => !activeCategories.includes(c));
        displayCategories.unshift(...activeCategories);
    }

    scrollArea.innerHTML = displayCategories.map(cat => `<button class="chip ${activeCategories.includes(cat) ? 'active' : ''}" data-cat="${cat}">${cat}</button>`).join('');
    if (activeCategories.length === 0) allChip.classList.add('active'); else allChip.classList.remove('active');

    scrollArea.scrollLeft = 0;

    scrollArea.querySelectorAll('.chip[data-cat]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(document.getElementById('pdp-view').classList.contains('active')) handleUIBackButton();
            resetSearch(); const cat = e.target.getAttribute('data-cat');
            activeCategories = [cat]; currentPage = 1; syncCategoryModalCheckboxes();
            
            history.replaceState({ view: 'home', page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '');
            renderChips(); renderProducts();
        });
    });
    setTimeout(updateScrollFades, 0);
}

document.getElementById('all-chip').addEventListener('click', () => {
    if(document.getElementById('pdp-view').classList.contains('active')) handleUIBackButton();
    resetSearch(); activeCategories = []; currentPage = 1; syncCategoryModalCheckboxes();
    
    history.replaceState({ view: 'home', page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '');
    renderChips(); renderProducts();
});

document.getElementById('more-categories-btn').addEventListener('click', () => openModal('category-modal'));

function renderCategoriesModal() {
    const catList = document.getElementById('category-list');
    catList.innerHTML = allCategories.map(c => `<label class="checkbox-label"><input type="checkbox" name="cat_option" value="${c}">${c}</label>`).join('');
}

function syncCategoryModalCheckboxes() { document.querySelectorAll('input[name="cat_option"]').forEach(checkbox => { checkbox.checked = activeCategories.includes(checkbox.value); }); }

function updateControlButtons() {
    const sortWrapper = document.getElementById('sort-wrapper'); const sortText = document.getElementById('sort-text');
    const sortLabels = { 'none': 'Sort by', 'newest': 'Newest', 'price_asc': 'Lowest Price', 'price_desc': 'Highest Price', 'oldest': 'Oldest' };
    sortText.textContent = sortLabels[currentSort];
    if (currentSort !== 'none') sortWrapper.classList.add('active'); else sortWrapper.classList.remove('active');

    const brandBtn = document.getElementById('brand-btn'); const brandText = brandBtn.querySelector('.text');
    if (activeBrands.length > 0) { brandBtn.classList.add('active'); brandText.textContent = activeBrands.length === 1 ? activeBrands[0] : `Brands (${activeBrands.length})`;
    } else { brandBtn.classList.remove('active'); brandText.textContent = 'Brand'; }
}

function renderBrandsList() {
    const uniqueBrands = [...new Set(products.map(p => p.brand))];
    const brandList = document.getElementById('brand-list');
    brandList.innerHTML = uniqueBrands.map(b => `<label class="checkbox-label"><input type="checkbox" name="brand_option" value="${b}">${b}</label>`).join('');
}

function generateProductCardHTML(p) {
    const tzsPrice = p.price ? p.price.toLocaleString() : '0';
    const tzsOldPrice = p.originalPrice ? p.originalPrice.toLocaleString() : null;
    
    let discountHtml = '';
    if (p.discountPct > 0) {
        discountHtml = `<div class="discount-label">${p.discountPct}% OFF</div>`;
    }
    
    return `
    <div class="product-card" onclick="openPDP('${p.id}')">
        <div class="product-image-wrapper">
            ${discountHtml}
            <img class="product-image" loading="lazy" src="${p.image}" alt="${p.title}">
        </div>
        <div class="product-info">
            <div class="product-title">${p.title}</div>
            
            <div class="product-description-list">${stripWhatsAppStyle(p.description)}</div>
            
            <div class="product-price">
                <div class="price-group">
                    ${tzsOldPrice ? `<span class="old-price">TZS ${tzsOldPrice}</span>` : ''}
                    <span class="new-price">TZS ${tzsPrice}</span>
                </div>
                <div class="action-wrapper">
                    <span class="material-icons more-icon" onclick="openGlobalActionMenu(event, '${p.id}')">more_vert</span>
                </div>
            </div>
        </div>
    </div>`;
}

function renderProducts() {
    const pContainer = document.getElementById('product-container');
    const pagWrapper = document.getElementById('pagination-wrapper');
    
    if (searchActive && searchQuery.trim() === '') {
        pContainer.innerHTML = `<div class="empty-state"><span class="material-icons empty-icon">search</span><div class="empty-text">Type to search products...</div></div>`;
        pagWrapper.classList.remove('active');
        return;
    }

    const isListView = pContainer.classList.contains('list-view');
    const isDesktop = window.innerWidth >= 768;
    
    let itemsPerPage;
    if (isListView) { itemsPerPage = 24; } 
    else { const columns = isDesktop ? 4 : 2; itemsPerPage = 14 * columns; } 
    
    let filtered = products.filter(p => {
        let catMatch = activeCategories.length === 0 || activeCategories.includes(p.category);
        let brandMatch = activeBrands.length === 0 || activeBrands.includes(p.brand);
        let searchMatch = p.title.toLowerCase().includes(searchQuery) || p.subtitle.toLowerCase().includes(searchQuery);
        return catMatch && brandMatch && searchMatch;
    });

    if (currentSort !== 'none') {
        filtered.sort((a, b) => {
            if (currentSort === 'newest') return b.date - a.date; if (currentSort === 'oldest') return a.date - b.date;
            if (currentSort === 'price_asc') return a.price - b.price; if (currentSort === 'price_desc') return b.price - a.price; return 0;
        });
    }

    if(filtered.length === 0) {
         pContainer.innerHTML = `<div class="empty-state"><span class="material-icons empty-icon">error_outline</span><div class="empty-text">No products found</div></div>`;
         pagWrapper.classList.remove('active'); return;
    }

    let totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    let startIndex = (currentPage - 1) * itemsPerPage;
    let paginatedProducts = filtered.slice(startIndex, startIndex + itemsPerPage);

    pContainer.innerHTML = paginatedProducts.map(p => generateProductCardHTML(p)).join('');
    
    renderPaginationControls(totalPages);
    setTimeout(adjustBodyPadding, 50);
}

function renderPaginationControls(totalPages) {
    const pagWrapper = document.getElementById('pagination-wrapper');
    if (totalPages > 1) {
        pagWrapper.classList.add('active');
        pagWrapper.innerHTML = `
            <button class="page-item page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(-1)"><span class="material-icons" style="font-size:18px; margin-right:4px;">chevron_left</span> Prev</button>
            <div class="page-item page-info">
                Page <input type="number" id="page-jump-input" class="page-num-input" min="1" max="${totalPages}" value="${currentPage}" onchange="jumpToPage(this.value, ${totalPages})" onkeyup="if(event.key==='Enter') jumpToPage(this.value, ${totalPages})"> ${totalPages}
            </div>
            <button class="page-item page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(1)">Next <span class="material-icons" style="font-size:18px; margin-left:4px;">chevron_right</span></button>
        `;
    } else { pagWrapper.classList.remove('active'); }
}

function changePage(delta) { 
    currentPage += delta; 
    history.pushState({ view: 'home', page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '');
    renderProducts(); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function jumpToPage(val, maxPages) {
    let num = parseInt(val);
    if (isNaN(num) || num < 1) num = 1;
    if (num > maxPages) num = maxPages;
    
    if (num !== currentPage) {
        currentPage = num;
        history.pushState({ view: 'home', page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '');
        renderProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    } else {
        document.getElementById('page-jump-input').value = currentPage; 
    }
}

function openLightbox() {
    pdpRabbitHoleDepth++;
    history.pushState({ overlay: true, view: currentPdpId ? 'pdp' : 'home', id: currentPdpId, depth: pdpRabbitHoleDepth }, '');
    document.getElementById('lightbox-img').src = document.getElementById('pdp-main-image').src;
    document.getElementById('lightbox-overlay').classList.add('active');
    document.body.classList.add('modal-open');
}
function closeLightbox() {
    document.getElementById('lightbox-overlay').classList.remove('active');
    if(!document.querySelectorAll('.fullscreen-modal.active, .center-modal.active').length) document.body.classList.remove('modal-open');
    history.replaceState({ view: currentPdpId ? 'pdp' : 'home', id: currentPdpId, page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '');
}

function handleUIBackButton() {
    if (document.getElementById('pdp-view').classList.contains('active')) {
        if (pdpRabbitHoleDepth > 0) {
            history.go(-pdpRabbitHoleDepth);
        } else {
            closePDP(true); 
            window.scrollTo({ top: 0, behavior: 'instant' }); 
        }
    } else {
        history.back(); 
    }
}

window.addEventListener('popstate', (e) => {
    const modals = document.querySelectorAll('.fullscreen-modal.active, .center-modal.active');
    const sheet = document.getElementById('global-action-sheet');
    const lightbox = document.getElementById('lightbox-overlay');
    const backdrop = document.getElementById('modal-backdrop');
    
    let wasOverlayOpen = modals.length > 0 || sheet.classList.contains('show') || lightbox.classList.contains('active');
    
    if (wasOverlayOpen) {
        modals.forEach(m => m.classList.remove('active'));
        backdrop.classList.remove('active');
        sheet.classList.remove('show');
        document.getElementById('sheet-overlay').classList.remove('show');
        lightbox.classList.remove('active');
        document.body.classList.remove('modal-open');
        pendingBuyNow = null;
    }

    if (e.state) {
        pdpRabbitHoleDepth = e.state.depth || 0;
        
        if (e.state.view === 'pdp' && currentPdpId !== e.state.id) {
            openPDP(e.state.id, false);
        } else if (e.state.view === 'home') {
            if (currentPdpId !== null) closePDP(false);
            
            let needsRender = false;
            if (e.state.page && currentPage !== e.state.page) { currentPage = e.state.page; needsRender = true; }
            if (e.state.cats && JSON.stringify(activeCategories) !== JSON.stringify(e.state.cats)) { activeCategories = e.state.cats; needsRender = true; }
            
            if (needsRender || wasOverlayOpen) {
                syncCategoryModalCheckboxes();
                renderChips();
                renderProducts();
            }
        }
    } else {
        pdpRabbitHoleDepth = 0;
        if (currentPdpId !== null) closePDP(false);
    }
});

function togglePdpDescription() {
    const descBody = document.getElementById('pdp-description');
    const descIcon = document.getElementById('pdp-desc-toggle-icon');
    if (descBody.style.display === 'none' || descBody.style.display === '') {
        descBody.style.display = 'block';
        descIcon.textContent = 'expand_less';
    } else {
        descBody.style.display = 'none';
        descIcon.textContent = 'expand_more';
    }
}

function openPDP(id, pushHistory = true) {
    if(!document.getElementById('pdp-view').classList.contains('active')) {
        pdpHomeScrollPos = window.pageYOffset || document.documentElement.scrollTop;
    }
    currentPdpId = id;
    const p = products.find(prod => String(prod.id) === String(id));
    if(!p) return;
    
    if (pushHistory) {
        pdpRabbitHoleDepth++;
        history.pushState({ view: 'pdp', id: id, depth: pdpRabbitHoleDepth }, '', '?product=' + id);
    }
    
    document.getElementById('main-header-title').style.display = 'none';
    document.getElementById('pdp-header-back').style.display = 'inline-flex';

    document.getElementById('home-view').style.display = 'none';
    document.getElementById('home-sub-header').style.display = 'none';
    document.getElementById('pdp-view').classList.add('active');
    
    setMainImage(p.images[0]);
    
    let existingLabel = document.getElementById('pdp-discount-label');
    if(existingLabel) existingLabel.remove();
    
    let pdpDiscountHtml = '';
    // Apply the smart calculated percentage here too
    if (p.discountPct > 0) {
        pdpDiscountHtml = `<div id="pdp-discount-label" class="discount-label pdp-discount-label">${p.discountPct}% OFF</div>`;
    }
    
    if(pdpDiscountHtml) {
        document.getElementById('pdp-main-image-container').insertAdjacentHTML('afterbegin', pdpDiscountHtml);
    }
    
    const thumbContainer = document.getElementById('pdp-thumbnails');
    if (p.images.length > 1) {
        thumbContainer.style.display = 'flex';
        thumbContainer.innerHTML = p.images.map((img, idx) => `<img src="${img}" loading="lazy" class="pdp-thumbnail ${idx === 0 ? 'active' : ''}" onclick="changePDPImage(this, '${img}')">`).join('');
    } else {
        thumbContainer.style.display = 'none';
        thumbContainer.innerHTML = '';
    }
    
    document.getElementById('pdp-title').textContent = p.title;
    document.getElementById('pdp-category').textContent = p.category;
    
    document.getElementById('pdp-new-price').textContent = `TZS ${p.price ? p.price.toLocaleString() : '0'}`;
    const oldPriceEl = document.getElementById('pdp-old-price');
    if(p.originalPrice) { oldPriceEl.textContent = `TZS ${p.originalPrice.toLocaleString()}`; oldPriceEl.style.display = 'inline'; }
    else { oldPriceEl.style.display = 'none'; }
    
    document.getElementById('pdp-description').innerHTML = formatWhatsAppStyle(p.description);
    document.getElementById('pdp-description').style.display = 'none';
    document.getElementById('pdp-desc-toggle-icon').textContent = 'expand_more';

    document.getElementById('pdp-qty-input').value = cart[id] ? cart[id] : 1;

    updatePdpCartBtn();
    renderRelatedProducts();
    
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(adjustBodyPadding, 50);
}

function closePDP(pushHistory = true) {
    document.getElementById('pdp-view').classList.remove('active');
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('home-sub-header').style.display = 'block';
    
    document.getElementById('main-header-title').style.display = 'block';
    document.getElementById('pdp-header-back').style.display = 'none';

    if (pushHistory) {
        pdpRabbitHoleDepth = 0;
        history.pushState({ view: 'home', page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '', window.location.pathname);
    }
    
    if(searchActive && searchQuery.trim() === '') {
        document.getElementById('product-container').innerHTML = `<div class="empty-state"><span class="material-icons empty-icon">search</span><div class="empty-text">Type to search products...</div></div>`;
        document.getElementById('pagination-wrapper').classList.remove('active');
    } else { renderProducts(); }
    
    window.scrollTo({ top: pdpHomeScrollPos, behavior: 'instant' });
    setTimeout(adjustBodyPadding, 50);
    currentPdpId = null;
}

function changePdpQty(delta) {
    const inp = document.getElementById('pdp-qty-input');
    let v = parseInt(inp.value);
    if(isNaN(v)) v = 1;
    v += delta;
    if(v < 1) v = 1;
    inp.value = v;
}

function validatePdpQty() {
    const inp = document.getElementById('pdp-qty-input');
    let v = parseInt(inp.value);
    if(isNaN(v) || v < 1) {
        if (inp.value.trim() === "" || inp.value.trim() === "0") return;
        inp.value = 1;
    }
}

function changePDPImage(thumbEl, url) {
    setMainImage(url);
    document.querySelectorAll('.pdp-thumbnail').forEach(el => el.classList.remove('active'));
    thumbEl.classList.add('active');
}

function setMainImage(url) { document.getElementById('pdp-main-image').src = url; }

function addPdpToCart() {
    let qty = parseInt(document.getElementById('pdp-qty-input').value);
    if (isNaN(qty) || qty < 1) qty = 1;
    
    if (cart[currentPdpId]) delete cart[currentPdpId];
    else cart[currentPdpId] = qty;
    
    saveCartData();
    updateCartBadge();
    updatePdpCartBtn();
}

function updatePdpCartBtn() {
    if(!currentPdpId) return;
    const btn = document.getElementById('pdp-cart-btn');
    const icon = document.getElementById('pdp-cart-icon');
    const txt = document.getElementById('pdp-cart-text');
    if(cart[currentPdpId]) {
        btn.classList.add('remove-state');
        icon.textContent = 'remove_shopping_cart';
        txt.textContent = 'Remove';
    } else {
        btn.classList.remove('remove-state');
        icon.textContent = 'add_shopping_cart';
        txt.textContent = 'Add to cart';
    }
}

function buyFromPdp() {
    let qty = parseInt(document.getElementById('pdp-qty-input').value);
    if (isNaN(qty) || qty < 1) qty = 1;
    buyNow(currentPdpId, qty);
}

function buyNow(id, specificQty = null) {
    const p = products.find(prod => String(prod.id) === String(id));
    if(!p) return;
    
    let qtyToBuy = specificQty !== null ? specificQty : 1;
    const otherItemsExist = Object.keys(cart).some(cartId => cartId !== String(id));
    
    if (otherItemsExist) {
        pendingBuyNow = { id: id, qty: qtyToBuy };
        openModal('buy-now-modal');
    } else {
        cart[id] = qtyToBuy;
        saveCartData();
        updateCartBadge();
        updatePdpCartBtn();
        renderCartItems();
        openModal('cart-modal');
    }
}

function resolveBuyNow(action) {
    if(!pendingBuyNow) return;
    
    if (action === 'clear') {
        cart = {}; 
        cart[pendingBuyNow.id] = pendingBuyNow.qty;
    } else if (action === 'keep') {
        cart[pendingBuyNow.id] = pendingBuyNow.qty;
    }
    
    saveCartData();
    updateCartBadge();
    updatePdpCartBtn();
    renderCartItems();
    
    document.getElementById('buy-now-modal').classList.remove('active');
    document.getElementById('cart-modal').classList.add('active');
    pendingBuyNow = null;
}

function applyRelatedView() {
    const container = document.getElementById('related-products');
    const toggleIcon = document.getElementById('related-view-toggle');
    if(relatedViewMode === 'list') {
        container.classList.add('list-view');
        toggleIcon.textContent = 'grid_view';
    } else {
        container.classList.remove('list-view');
        toggleIcon.textContent = 'format_list_bulleted';
    }
}

function toggleRelatedView() {
    relatedViewMode = relatedViewMode === 'grid' ? 'list' : 'grid';
    applyRelatedView();
}

function renderRelatedProducts() {
    if(!currentPdpId) return;
    let pool = products.filter(p => String(p.id) !== String(currentPdpId)).sort(() => 0.5 - Math.random()).slice(0, 8);
    const container = document.getElementById('related-products');
    container.innerHTML = pool.map(p => generateProductCardHTML(p)).join('');
    applyRelatedView();
}

function openGlobalActionMenu(e, id) {
    e.stopPropagation(); const sheet = document.getElementById('global-action-sheet');
    if (activeProductId === id && sheet.classList.contains('show')) { closeGlobalActionMenu(); return; }
    activeProductId = id; const p = products.find(prod => String(prod.id) === String(id));
    if(!p) return;
    
    pdpRabbitHoleDepth++;
    history.pushState({ overlay: true, view: currentPdpId ? 'pdp' : 'home', id: currentPdpId, depth: pdpRabbitHoleDepth }, '');
    
    document.getElementById('sheet-img').src = p.image; document.getElementById('sheet-title').textContent = p.title;
    document.getElementById('sheet-price').textContent = `TZS ${p.price ? p.price.toLocaleString() : '0'}`;
    const oldPriceEl = document.getElementById('sheet-old-price');
    if(p.originalPrice) { oldPriceEl.textContent = `TZS ${p.originalPrice.toLocaleString()}`; oldPriceEl.style.display = 'block'; }
    else { oldPriceEl.style.display = 'none'; }

    const addIcon = document.getElementById('sheet-add-icon'); const addText = document.getElementById('sheet-add-text');
    if (cart[id]) { 
        addIcon.textContent = 'remove_shopping_cart'; 
        addIcon.className = 'material-icons action-icon-circle remove-bg'; 
        addText.textContent = 'Remove from cart'; 
    } else { 
        addIcon.textContent = 'add_shopping_cart'; 
        addIcon.className = 'material-icons action-icon-circle add-bg'; 
        addText.textContent = 'Add to cart'; 
    }

    sheet.style.top = ''; sheet.style.left = '';
    if (window.innerWidth >= 768) {
        const rect = e.target.getBoundingClientRect(); const sheetWidth = 280; const assumedHeight = 220; 
        let calcTop = rect.bottom + 5; let calcLeft = rect.left - (sheetWidth - 24); 
        if (calcLeft < 20) calcLeft = 20; if (calcLeft + sheetWidth > window.innerWidth - 20) calcLeft = window.innerWidth - sheetWidth - 20;
        if (calcTop + assumedHeight > window.innerHeight) calcTop = rect.top - assumedHeight - 5; 
        sheet.style.top = calcTop + 'px'; sheet.style.left = calcLeft + 'px';
    }
    sheet.classList.add('show'); document.getElementById('sheet-overlay').classList.add('show');
}

function closeGlobalActionMenu() {
    const sheet = document.getElementById('global-action-sheet');
    if(sheet && sheet.classList.contains('show')) {
        sheet.classList.remove('show'); document.getElementById('sheet-overlay').classList.remove('show');
        history.replaceState({ view: currentPdpId ? 'pdp' : 'home', id: currentPdpId, page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '');
        setTimeout(() => { if(!sheet.classList.contains('show')) activeProductId = null; }, 300);
    }
}

function handleSheetAction(action) {
    if (!activeProductId) return;
    if (action === 'cart') { toggleCartItemBase(activeProductId); updatePdpCartBtn(); } 
    else if (action === 'share') shareProductBase(activeProductId);
    else if (action === 'buy') buyNow(activeProductId, 1);
    closeGlobalActionMenu();
}

function toggleCartItemBase(id) { 
    if(cart[id]) delete cart[id]; 
    else cart[id] = 1; 
    saveCartData();
    updateCartBadge(); 
}

let toastTimer;
function showToast(msg) {
    const toast = document.getElementById('custom-toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

function shareProductBase(id) {
    const realUrl = window.location.origin + window.location.pathname + '?product=' + id;
    if (navigator.share) {
        navigator.share({ title: 'Check out this product!', url: realUrl }).catch(e => console.log(e));
    } else { 
        navigator.clipboard.writeText(realUrl).then(() => {
            showToast("Link copied!");
        }).catch(e => console.log(e)); 
    }
}

function saveCartData() {
    localStorage.setItem('saved_cart', JSON.stringify(cart));
}

function updateCartBadge() {
    let totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
    const badge = document.getElementById('cart-badge'); const fab = document.getElementById('cart-fab');
    badge.textContent = totalItems;
    if(totalItems > 0) fab.classList.remove('hidden'); else fab.classList.add('hidden');
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalPriceEl = document.getElementById('cart-total-price');
    let total = 0; let html = '';

    if (Object.keys(cart).length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="material-icons empty-icon">remove_shopping_cart</span><div class="empty-text">Your cart is empty</div></div>`;
        totalPriceEl.textContent = '0'; return;
    }

    products.forEach(p => {
        if(cart[p.id]) {
            let qty = cart[p.id]; total += (p.price * qty);
            html += `
                <div class="cart-item-card">
                    <span class="material-icons remove-item-btn" onclick="removeItemExact('${p.id}')">close</span>
                    <img src="${p.image}" loading="lazy" style="width: 65px; height: 65px; border-radius: var(--img-radius); object-fit: cover; cursor: pointer;" onclick="closeAllModals(); openPDP('${p.id}')">
                    <div style="flex:1; cursor: pointer;" onclick="closeAllModals(); openPDP('${p.id}')">
                        <div class="product-title">${p.title}</div>
                        <div style="font-size: 14px; color: var(--text-sub); margin-top: 4px;">TZS ${p.price.toLocaleString()}</div>
                    </div>
                    <div class="qty-controls-wrapper">
                        <input type="number" class="qty-input" value="${qty}" onchange="updateQtyExact('${p.id}', this.value)" onkeyup="updateQtyExact('${p.id}', this.value)">
                    </div>
                </div>`;
        }
    });

    container.innerHTML = html; totalPriceEl.textContent = total.toLocaleString();
}

function updateQtyExact(id, val) {
    let num = parseInt(val);
    if (isNaN(num) || num <= 0) { 
        if (val.trim() === "0" || val.trim().startsWith("-")) { 
            delete cart[id]; saveCartData(); updateCartBadge(); renderCartItems(); updatePdpCartBtn(); 
        } 
        return; 
    }
    cart[id] = num; 
    saveCartData();
    updateCartBadge();
    let total = 0; products.forEach(p => { if(cart[p.id]) total += (p.price * cart[p.id]); });
    document.getElementById('cart-total-price').textContent = total.toLocaleString();
}
function removeItemExact(id) { delete cart[id]; saveCartData(); updateCartBadge(); renderCartItems(); updatePdpCartBtn(); }
function clearCart() { cart = {}; saveCartData(); updateCartBadge(); renderCartItems(); updatePdpCartBtn(); }

function placeOrder() {
    if(Object.keys(cart).length === 0) return;

    if (!orderPhoneNumber) {
        showToast("Seller phone number not loaded. Please try again or refresh.");
        return;
    }
    
    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";

    const cartParamString = Object.entries(cart).map(([id, qty]) => `${id}:${qty}`).join(',');
    const shareableCartUrl = window.location.origin + window.location.pathname + '?cart=' + cartParamString;

    let orderText = `*${greeting}!* 👋\n\nI would like to place an order for the following items:\n\n`; 
    let total = 0;
    
    products.forEach(p => { 
        if(cart[p.id]) { 
            orderText += ` ● *${cart[p.id]}x* ${p.title}\n`; 
            total += (p.price * cart[p.id]); 
        } 
    });
    
    orderText += `\n*Total Amount:* TZS ${total.toLocaleString()}\n\n`;
    orderText += `_Cart Link:_\n${shareableCartUrl}`;

    const whatsappUrl = `https://wa.me/${orderPhoneNumber}?text=${encodeURIComponent(orderText)}`; 
    window.open(whatsappUrl, '_blank');
}

document.addEventListener('click', (e) => { if(!e.target.closest('#sort-wrapper')) document.getElementById('sort-list').classList.remove('show'); });
window.addEventListener('scroll', () => { closeGlobalActionMenu(); document.getElementById('sort-list').classList.remove('show'); }, { passive: true });

function openModal(id) { 
    pdpRabbitHoleDepth++;
    history.pushState({ overlay: true, view: currentPdpId ? 'pdp' : 'home', id: currentPdpId, depth: pdpRabbitHoleDepth }, '');
    document.getElementById(id).classList.add('active'); 
    document.getElementById('modal-backdrop').classList.add('active');
    document.body.classList.add('modal-open'); 
}
function closeModal(id) { 
    document.getElementById(id).classList.remove('active'); 
    
    if(!document.querySelectorAll('.fullscreen-modal.active, .center-modal.active').length) {
        document.getElementById('modal-backdrop').classList.remove('active');
        document.body.classList.remove('modal-open'); 
    }
    
    if(id === 'buy-now-modal') pendingBuyNow = null;
    
    history.replaceState({ view: currentPdpId ? 'pdp' : 'home', id: currentPdpId, page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '');
}

function closeAllModals() {
    document.querySelectorAll('.fullscreen-modal.active, .center-modal.active').forEach(m => m.classList.remove('active'));
    document.getElementById('modal-backdrop').classList.remove('active');
    document.body.classList.remove('modal-open');
    pendingBuyNow = null;
    history.replaceState({ view: currentPdpId ? 'pdp' : 'home', id: currentPdpId, page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '');
}

document.getElementById('menu-btn').addEventListener('click', () => openModal('menu-modal'));
document.getElementById('cart-fab').addEventListener('click', () => { renderCartItems(); openModal('cart-modal'); });
document.querySelectorAll('.close-modal').forEach(btn => { btn.addEventListener('click', (e) => {
    if(e.target.dataset.target === 'buy-now-modal') pendingBuyNow = null;
    closeModal(e.target.dataset.target);
});});

const searchIcon = document.getElementById('search-icon'); 
const searchInput = document.getElementById('search-input');
const searchContainer = document.getElementById('search-container'); 
const topHeader = document.querySelector('.header');
const searchExecuteBtn = document.getElementById('search-execute-btn');

function executeSearch() {
    searchQuery = searchInput.value.toLowerCase(); 
    currentPage = 1; 
    
    if(document.getElementById('pdp-view').classList.contains('active')) {
        closePDP(true);
    }
    renderProducts();
}

searchIcon.addEventListener('click', () => {
    if (searchContainer.classList.contains('active')) { 
        searchContainer.classList.remove('active'); 
        searchIcon.classList.remove('active'); 
        topHeader.classList.remove('search-active'); 
        searchIcon.textContent = 'search'; 
        searchActive = false;
        
        if (searchQuery !== '') {
            searchQuery = '';
            searchInput.value = '';
            if(!document.getElementById('pdp-view').classList.contains('active')) renderProducts();
        } else {
            searchInput.value = '';
        }
    }
    else { 
        searchContainer.classList.add('active'); 
        searchIcon.classList.add('active'); 
        topHeader.classList.add('search-active'); 
        searchInput.focus(); 
        searchIcon.textContent = 'close'; 
        searchActive = true;
    }
});

searchExecuteBtn.addEventListener('click', executeSearch);

searchInput.addEventListener('keydown', (e) => { 
    if(e.key === 'Enter') {
        executeSearch();
    }
});

function resetSearch() {
    if (searchContainer.classList.contains('active')) {
        searchContainer.classList.remove('active'); 
        searchIcon.classList.remove('active'); 
        topHeader.classList.remove('search-active'); 
        searchInput.value = ''; 
        searchQuery = '';
        searchIcon.textContent = 'search';
        searchActive = false;
    }
}

const sortWrapper = document.getElementById('sort-wrapper'); const sortList = document.getElementById('sort-list'); const clearSortIcon = document.getElementById('sort-clear-icon');
sortWrapper.addEventListener('click', (e) => { if (e.target === clearSortIcon) return; e.stopPropagation(); sortList.classList.toggle('show'); });
sortList.querySelectorAll('li').forEach(item => { item.addEventListener('click', (e) => { e.stopPropagation(); currentSort = e.target.getAttribute('data-value'); sortList.classList.remove('show'); currentPage = 1; updateControlButtons(); renderProducts(); }); });
clearSortIcon.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); currentSort = 'none'; currentPage = 1; updateControlButtons(); renderProducts(); sortList.classList.remove('show'); });

document.getElementById('brand-btn').addEventListener('click', (e) => {
    if(e.target.closest('#brand-clear-icon')) { e.stopPropagation(); activeBrands = []; document.querySelectorAll('input[name="brand_option"]').forEach(r => r.checked = false); currentPage = 1; updateControlButtons(); renderProducts(); }
    else { openModal('brand-modal'); }
});
document.getElementById('apply-brand-btn').addEventListener('click', () => { activeBrands = Array.from(document.querySelectorAll('input[name="brand_option"]:checked')).map(cb => cb.value); currentPage = 1; updateControlButtons(); renderProducts(); closeModal('brand-modal'); });
document.getElementById('clear-brand-btn').addEventListener('click', () => { activeBrands = []; document.querySelectorAll('input[name="brand_option"]').forEach(r => r.checked = false); currentPage = 1; updateControlButtons(); renderProducts(); closeModal('brand-modal'); });

document.getElementById('apply-category-btn').addEventListener('click', () => { 
    if(document.getElementById('pdp-view').classList.contains('active')) handleUIBackButton(); 
    resetSearch(); 
    activeCategories = Array.from(document.querySelectorAll('input[name="cat_option"]:checked')).map(cb => cb.value); 
    currentPage = 1; 
    closeModal('category-modal');
    history.replaceState({ view: 'home', page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '');
    renderChips(); renderProducts(); 
});
document.getElementById('clear-category-btn').addEventListener('click', () => { 
    if(document.getElementById('pdp-view').classList.contains('active')) handleUIBackButton(); 
    resetSearch(); 
    activeCategories = []; 
    document.querySelectorAll('input[name="cat_option"]').forEach(r => r.checked = false); 
    currentPage = 1; 
    closeModal('category-modal');
    history.replaceState({ view: 'home', page: currentPage, cats: activeCategories, depth: pdpRabbitHoleDepth }, '');
    renderChips(); renderProducts(); 
});

const viewToggleBtn = document.getElementById('view-toggle'); const productContainer = document.getElementById('product-container');
viewToggleBtn.addEventListener('click', () => {
    productContainer.classList.toggle('list-view');
    viewToggleBtn.textContent = productContainer.classList.contains('list-view') ? 'grid_view' : 'format_list_bulleted';
    currentPage = 1; renderProducts(); setTimeout(adjustBodyPadding, 50);
});

const themeSwitch = document.getElementById('theme-switch'); const themeIcon = document.getElementById('theme-icon');
themeSwitch.addEventListener('click', () => {
    document.body.classList.toggle('light-mode'); const isLight = document.body.classList.contains('light-mode');
    themeIcon.textContent = isLight ? 'light_mode' : 'dark_mode'; localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

document.getElementById('fullscreen-btn').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => console.log(err)); else if (document.exitFullscreen) document.exitFullscreen();
});

let lastScrollY = window.pageYOffset || document.documentElement.scrollTop; let headerY = 0;
window.addEventListener('scroll', () => {
    const currentY = window.pageYOffset || document.documentElement.scrollTop; const delta = currentY - lastScrollY; const headerHeight = smartHeader.offsetHeight;
    if (currentY <= 0) headerY = 0; else { headerY -= delta; if (headerY < -headerHeight) headerY = -headerHeight; if (headerY > 0) headerY = 0; }
    smartHeader.style.transform = `translateY(${headerY}px)`; lastScrollY = currentY <= 0 ? 0 : currentY; 
}, { passive: true });

// INITIALIZE APP
initApp();