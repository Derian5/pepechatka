(function() {
    // ==================== 1. Управление количеством товаров ====================
    let orderData = {};

    function getItemKey(article) {
        const titleElem = article.querySelector('.pr-2 .text-sm.font-semibold');
        if (titleElem) return titleElem.innerText.trim();
        const input = article.querySelector('input');
        return input ? input.getAttribute('aria-label') : 'unknown';
    }

    function getCurrentQuantity(article) {
        const input = article.querySelector('input[type="number"]');
        if (input && input.value !== undefined) {
            return parseInt(input.value, 10) || 0;
        }
        const p = Array.from(article.querySelectorAll('p')).find(p => p.innerText.includes('Количество:'));
        if (p) {
            const match = p.innerText.match(/Количество:\s(\d+)/);
            if (match) return parseInt(match[1], 10);
        }
        return 0;
    }

    function updateQuantity(article, newQuantity) {
        const input = article.querySelector('input[type="number"]');
        if (input) input.value = newQuantity;

        const quantityText = Array.from(article.querySelectorAll('p')).find(p => p.innerText.includes('Количество:'));
        if (quantityText) quantityText.innerText = `Количество: ${newQuantity}`;

        const key = getItemKey(article);
        orderData[key] = newQuantity;
        console.log(`[${key}] = ${newQuantity}`);
    }

    function initOrderData() {
        const articles = document.querySelectorAll('article.rounded-3xl.border');
        articles.forEach(article => {
            const qty = getCurrentQuantity(article);
            const key = getItemKey(article);
            orderData[key] = qty;
        });
        console.log('Инициализированный заказ:', orderData);
    }

    function bindQuantityEvents() {
        document.querySelectorAll('button[aria-label*="Увеличить количество"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const article = btn.closest('article.rounded-3xl.border');
                if (!article) return;
                let current = getCurrentQuantity(article);
                updateQuantity(article, current + 1);
            });
        });

        document.querySelectorAll('button[aria-label*="Уменьшить количество"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const article = btn.closest('article.rounded-3xl.border');
                if (!article) return;
                let current = getCurrentQuantity(article);
                let newVal = current - 1;
                if (newVal < 0) newVal = 0;
                updateQuantity(article, newVal);
            });
        });

        document.querySelectorAll('article.rounded-3xl.border input[type="number"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const article = input.closest('article.rounded-3xl.border');
                if (article) {
                    let val = parseInt(input.value, 10);
                    if (isNaN(val) || val < 0) val = 0;
                    updateQuantity(article, val);
                }
            });
        });
    }

    // ==================== 2. Сворачивание секций (все свёрнуты по умолчанию) ====================
    function initCollapsibleSections() {
        let sections = [];
        const calculator = document.querySelector('#calculator');
        if (calculator) {
            sections = Array.from(calculator.querySelectorAll('section')).filter(section =>
                section.querySelector('button .text-lg.font-bold') !== null
            );
        } else {
            sections = Array.from(document.querySelectorAll('section.rounded-3xl.border.border-df-border.bg-white.p-5.shadow-sm'));
        }

        console.log(`Найдено секций калькулятора: ${sections.length}`);

        sections.forEach(section => {
            const toggleBtn = section.querySelector('button');
            if (!toggleBtn) return;

            const titleSpan = toggleBtn.querySelector('.text-lg.font-bold');
            if (!titleSpan) return;

            let panel = toggleBtn.nextElementSibling;
            while (panel && panel.nodeType !== 1) panel = panel.nextElementSibling;
            if (!panel || !panel.classList || !panel.classList.contains('mt-5')) {
                console.warn('Панель не найдена для секции', section);
                return;
            }

            const iconSpan = toggleBtn.querySelector('span.mt-1.flex.h-10.w-10.items-center.justify-center');

            // Сворачиваем все секции
            panel.style.display = 'none';
            if (iconSpan) iconSpan.textContent = '+';
            toggleBtn.setAttribute('aria-expanded', 'false');

            toggleBtn.addEventListener('click', (e) => {
                const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                toggleBtn.setAttribute('aria-expanded', !expanded);
                if (expanded) {
                    panel.style.display = 'none';
                    if (iconSpan) iconSpan.textContent = '+';
                } else {
                    panel.style.display = '';
                    if (iconSpan) iconSpan.textContent = '−';
                }
            });
        });

        if (sections.length === 0) {
            console.error('Не удалось найти секции калькулятора.');
        }
    }

    // ==================== 3. Закрытие cookie-уведомления ====================
    function initCookieConsent() {
        const COOKIE_KEY = 'cookie_consent_accepted';
        const cookieBlock = document.querySelector('div[role="alert"][aria-label="Уведомление о cookie"]');

        if (!cookieBlock) {
            console.warn('Блок cookie не найден');
            return;
        }

        // Если пользователь уже согласился, скрываем блок сразу
        if (localStorage.getItem(COOKIE_KEY) === 'true') {
            cookieBlock.style.display = 'none';
            return;
        }

        // Находим кнопку "Понятно"
        const acceptBtn = cookieBlock.querySelector('button');
        if (acceptBtn && acceptBtn.innerText.trim() === 'Понятно') {
            acceptBtn.addEventListener('click', () => {
                cookieBlock.style.display = 'none';
                localStorage.setItem(COOKIE_KEY, 'true');
                console.log('Cookie согласие сохранено');
            });
        } else {
            console.warn('Кнопка "Понятно" не найдена в блоке cookie');
        }
    }
// ==================== 4. КОРЗИНА И ОТПРАВКА БОТУ ====================

// Соответствие названий товаров и цен (точно по HTML)
    const priceMap = {
        "A4 Ч/Б, 1 сторона": 5,
        "A4 Ч/Б, 2 стороны": 6,
        "A4 цвет, 1 сторона": 8,
        "A4 цвет, 2 стороны": 14,
        "Чертёж A3, Ч/Б": 32,
        "Чертёж A3, цвет": 40,
        "Чертёж A3, заливка до 50%": 56,
        "Чертёж A3, заливка более 50%": 68,
        "Чертёж A2, Ч/Б": 48,
        "Чертёж A2, цвет": 68,
        "Чертёж A2, заливка до 50%": 112,
        "Чертёж A2, заливка более 50%": 144,
        "Чертёж A1, Ч/Б": 880,
        "Чертёж A1, цвет": 104,
        "Чертёж A1, заливка до 50%": 192,
        "Чертёж A1, заливка более 50%": 288,
        "Чертёж A0, Ч/Б": 200,
        "Чертёж A0, цвет": 250,
        "Чертёж A0, заливка до 50%": 350,
        "Чертёж A0, заливка более 50%": 400,
        "Пластик до 50 листов": 48,
        "Пластик до 80 листов": 64,
        "Пластик до 100 листов": 80,
        "Пластик до 200 страниц": 160,
        "Пластик более 200 страниц": 240,
        "Бечёвка": 24,
        "Фальц A3 > A4": 20,
        "Фальц A1/A2 > A4": 28,
        "Фальц A0 > A4": 60,
        "Фото A4, глянцевая": 110,
        "Фото A4, матовая": 90,
        "Сканирование, 1 сторона": 10,
        "Сканирование, 2 стороны": 15,
        "Правки Word": 50,
        "Правки PDF": 50,
        "Правки DWG": 70,
        "DWG > PDF": 100,
        "Папка-скоросшиватель": 50
    };

    function renderCart() {
        const container = document.getElementById('cart-items-list');
        const totalSpan = document.getElementById('cart-total');
        if (!container) return;

        const selected = Object.entries(orderData).filter(([_, qty]) => qty > 0);
        if (selected.length === 0) {
            container.innerHTML = '<p class="text-df-text/50 italic">Ничего не выбрано</p>';
            totalSpan.textContent = '0';
            return;
        }

        let total = 0;
        const itemsHtml = selected.map(([name, qty]) => {
            const price = priceMap[name] || 0;
            const sum = price * qty;
            total += sum;
            return `
            <div class="flex justify-between items-center border-b border-df-border pb-2">
                <div>
                    <span class="font-medium">${escapeHtml(name)}</span>
                    <span class="ml-2 text-xs text-df-text/50">× ${qty}</span>
                </div>
                <div class="font-semibold text-df-brand">${sum} ₽</div>
            </div>
        `;
        }).join('');
        container.innerHTML = `<div class="space-y-3">${itemsHtml}</div>`;
        totalSpan.textContent = total;
    }

// Простая защита от XSS
    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function getOrderMessage() {
        const selected = Object.entries(orderData).filter(([_, qty]) => qty > 0);
        if (selected.length === 0) return null;

        const timeSelect = document.getElementById('ready-time');
        const deliveryRadio = document.querySelector('input[name="delivery"]:checked');
        const readyTime = timeSelect ? timeSelect.value : 'Как можно быстрее';
        const deliveryMethod = deliveryRadio ? deliveryRadio.value : 'Самовывоз (Ярославское шоссе, 26к6)';

        let total = 0;
        let itemsText = '';
        for (const [name, qty] of selected) {
            const price = priceMap[name] || 0;
            const sum = price * qty;
            total += sum;
            itemsText += `• ${name} — ${qty} шт. = ${sum} ₽\n`;
        }

        let message = `🛒 Новый заказ с сайта Пепечатка\n\n`;
        message += `Состав:\n${itemsText}\n`;
        message += `Итого: ${total} ₽\n`;
        message += `Время готовности: ${readyTime}\n`;
        message += `Способ получения: ${deliveryMethod}\n\n`;

        return message;
    }

    function sendOrderToBot() {
        const text = getOrderMessage();
        if (!text) {
            alert('Корзина пуста. Добавьте хотя бы одну позицию.');
            return;
        }
        // Отправка конкретному боту без выбора получателя
        const botUsername = 'PepeChatka_bot';
        const encodedText = encodeURIComponent(text);
        const url = `tg://resolve?domain=${botUsername}&text=${encodedText}`;
        window.open(url, '_blank');
    }

// Обновление корзины при любом изменении orderData
    function observeOrderData() {
        // Сохраняем оригинальную функцию updateQuantity, если она определена
        // Но проще добавить вызов renderCart в существующий updateQuantity
        // Так как наш скрипт уже содержит updateQuantity, мы переопределим её с сохранением логики.
        // Для этого найдём область видимости. Поскольку всё внутри IIFE, сделаем так:
        const originalUpdateQuantity = updateQuantity;
        window.updateQuantity = function(article, newQuantity) {
            originalUpdateQuantity(article, newQuantity);
            renderCart();
        };
        // Также нужно вызывать renderCart при ручном вводе, но там уже будет вызываться updateQuantity.
        // Для надёжности повесим MutationObserver или просто вызовем renderCart по таймеру?
        // Лучше просто вызывать renderCart после каждого изменения.
        // Поскольку мы не можем перехватить каждое изменение напрямую, используем setInterval (лёгкий и надёжный)
        setInterval(() => renderCart(), 300);
    }

// Инициализация корзины
    function initCart() {
        renderCart();
        const sendBtn = document.getElementById('send-to-telegram');
        if (sendBtn) sendBtn.addEventListener('click', sendOrderToBot);
        observeOrderData();
    }
    // ==================== 4. Запуск всех модулей после загрузки DOM ====================
    document.addEventListener('DOMContentLoaded', () => {
        initOrderData();
        bindQuantityEvents();
        initCollapsibleSections();
        initCookieConsent();
        initCart();
    });
})();