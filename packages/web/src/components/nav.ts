import { appStore } from '../store';
import { icons } from './icons';

export function renderNav(): string {
  const { currentPage, isAuthenticated } = appStore.getState();

  // Do not render navigation for Auth and Onboarding pages
  if (!isAuthenticated || currentPage === '#auth' || currentPage === '#onboarding') {
    return '';
  }

  const navItems = [
    { hash: '#home', label: 'Home', icon: icons.home('nav-icon-svg') },
    { hash: '#tuner', label: 'Tuner', icon: icons.disc('nav-icon-svg') },
    { hash: '#coach', label: 'Coach', icon: icons.messageSquare('nav-icon-svg') },
    { hash: '#settings', label: 'Settings', icon: icons.settings('nav-icon-svg') }
  ];

  return `
    <nav class="bottom-navigation-bar animate-fade-in-up">
      <div class="nav-container">
        ${navItems
          .map(
            (item) => `
          <a href="${item.hash}" class="nav-tab-item ${currentPage === item.hash ? 'nav-tab-item-active' : ''}" data-hash="${item.hash}">
            <span class="nav-tab-icon">${item.icon}</span>
            <span class="nav-tab-label">${item.label}</span>
          </a>
        `
          )
          .join('')}
      </div>
    </nav>
  `;
}

export function setupNavEvents(): void {
  const tabs = document.querySelectorAll('.nav-tab-item');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      // Add subtle scale animation on click for haptic feedback
      tab.classList.add('nav-tab-clicked');
      setTimeout(() => tab.classList.remove('nav-tab-clicked'), 150);
    });
  });
}
