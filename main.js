document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Default to dark mode
    body.classList.remove('light-mode');
    themeToggle.textContent = 'Light';
    themeToggle.setAttribute('aria-label', 'Switch to light mode');

    themeToggle.addEventListener('click', function() {
        body.classList.toggle('light-mode');
        const isLightMode = body.classList.contains('light-mode');
        themeToggle.textContent = isLightMode ? 'Dark' : 'Light';
        themeToggle.setAttribute('aria-label', isLightMode ? 'Switch to dark mode' : 'Switch to light mode');
    });
});
