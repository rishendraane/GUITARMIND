import { appStore } from './store';

export interface Route {
  path: string; // e.g. '#home', '#auth', '#onboarding', '#tuner', etc.
  render: () => Promise<string>;
  onMount?: () => void;
  onUnmount?: () => void;
}

class Router {
  private routes: Map<string, Route> = new Map();
  private currentRoute: Route | null = null;

  register(route: Route): void {
    this.routes.set(route.path, route);
  }

  navigate(path: string): void {
    window.location.hash = path;
  }

  private async handleRouteChange(): Promise<void> {
    const hash = window.location.hash || '#auth';
    
    // Check if user is authenticated
    const { isAuthenticated } = appStore.getState();
    let targetHash = hash;

    if (!isAuthenticated && targetHash !== '#auth' && targetHash !== '#onboarding') {
      // Redirect unauthenticated users to auth
      targetHash = '#auth';
      window.location.hash = '#auth';
    } else if (isAuthenticated && targetHash === '#auth') {
      // Authenticated users shouldn't go to auth
      targetHash = '#home';
      window.location.hash = '#home';
    }

    const route = this.routes.get(targetHash);
    if (!route) {
      console.error(`Route not found: ${targetHash}`);
      return;
    }

    if (this.currentRoute && this.currentRoute.onUnmount) {
      try {
        this.currentRoute.onUnmount();
      } catch (err) {
        console.error('Error onUnmount route:', err);
      }
    }

    this.currentRoute = route;
    appStore.setState({ currentPage: targetHash });

    const appContainer = document.getElementById('app');
    if (appContainer) {
      // Render content
      appContainer.innerHTML = await route.render();
      
      // Execute post-mount lifecycle hook
      if (route.onMount) {
        try {
          route.onMount();
        } catch (err) {
          console.error('Error onMount route:', err);
        }
      }
    }
  }

  start(): void {
    window.addEventListener('hashchange', () => this.handleRouteChange());
    // Trigger initial route load
    this.handleRouteChange();
  }
}

export const router = new Router();
