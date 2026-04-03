// Функция для ограничения частоты вызовов (throttle)
function throttle(func, limit) {
    let inThrottle;
    return function() {
        if (!inThrottle) {
            func.apply(this, arguments);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

document.addEventListener('DOMContentLoaded', function() {
    // 1. Установка текущего года в футере
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // 2. Плавная прокрутка для якорных ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            } else {
                console.warn(`Целевой элемент ${targetId} не найден`);
            }
        });
    });

    // 3. Обработка открытия аккордеона по хэшу
    function openAccordionByHash() {
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap не загружен');
            return;
        }

        const hash = location.hash;
        if (!hash) return;

        const targetElement = document.querySelector(hash);
        if (!targetElement) {
            console.warn(`Элемент по хэшу ${hash} не найден`);
            return;
        }

        let collapsePanel = targetElement.closest('.accordion-collapse');

        if (!collapsePanel) {
            const accordionItem = targetElement.closest('.accordion-item');
            if (accordionItem) {
                const toggleButton = accordionItem.querySelector('[data-bs-toggle="collapse"]');
                if (toggleButton) {
                    const targetId = toggleButton.getAttribute('data-bs-target');
                    collapsePanel = document.querySelector(targetId);
                }
            }
        }

        if (collapsePanel) {
            let collapseInstance = bootstrap.Collapse.getInstance(collapsePanel);
            if (!collapseInstance) {
                collapseInstance = new bootstrap.Collapse(collapsePanel, { toggle: false });
            }

            collapseInstance.show();

            collapsePanel.addEventListener('shown.bs.collapse', () => {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    // Запуск открытия аккордеона при загрузке страницы
    openAccordionByHash();

    // Отслеживание изменений хеша
    window.addEventListener('hashchange', openAccordionByHash);
    window.addEventListener('popstate', openAccordionByHash);

    // 4. Плавная прокрутка к заголовку аккордеона при его открытии
    document.querySelectorAll('.accordion-button').forEach(btn => {
        btn.addEventListener('click', function() {
            // Ждём завершения анимации Bootstrap
            setTimeout(() => {
                this.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'start'
                });
            }, 350);
        });
    });

    // 5. Обработка скролла для липкого меню
    const navbar = document.getElementById('sticky-navbar');
    let lastScrollPosition = 0;
    const hideThreshold = 300; // Скролл вниз на 300 px для скрытия меню
    const stickyThreshold = 100; // Активируем липкость после 100 px скролла

    window.addEventListener('scroll', throttle(() => {
        const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        // Активируем липкое меню после скролла вниз на 100 px
        if (currentScrollPosition > stickyThreshold) {
            navbar.classList.add('sticky-nav');
        } else {
            // При скролле вверх до верха страницы — убираем липкость
            navbar.classList.remove('sticky-nav');
            navbar.classList.remove('hidden'); // Убираем скрытие, если вернулись наверх
        }

        // Скрываем меню при скролле вниз (после 300 px)
        if (currentScrollPosition > hideThreshold && currentScrollPosition > lastScrollPosition) {
            navbar.classList.add('hidden');
        }
        // Показываем меню при скролле вверх
        else if (currentScrollPosition < lastScrollPosition && navbar.classList.contains('hidden')) {
            navbar.classList.remove('hidden');
        }

        lastScrollPosition = currentScrollPosition;
    }, 100)); // Вызываем не чаще чем раз в 100 мс
});
