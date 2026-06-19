export class WebPerformanceOptimizer {
  private static instance: WebPerformanceOptimizer;
  private observers: PerformanceObserver[] = [];

  private constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.setupPerformanceObservers();
    }
  }

  static getInstance(): WebPerformanceOptimizer {
    if (!WebPerformanceOptimizer.instance) {
      WebPerformanceOptimizer.instance = new WebPerformanceOptimizer();
    }
    return WebPerformanceOptimizer.instance;
  }

  private setupPerformanceObservers() {
    // Monitor Core Web Vitals
    this.observeMetrics(['largest-contentful-paint'], (entries) => {
      entries.forEach((entry: any) => {
        console.log('[Performance] LCP:', entry.startTime);
        this.reportMetric('LCP', entry.startTime);
      });
    });

    this.observeMetrics(['first-input-delay'], (entries) => {
      entries.forEach((entry: any) => {
        console.log('[Performance] FID:', entry.processingStart - entry.startTime);
        this.reportMetric('FID', entry.processingStart - entry.startTime);
      });
    });

    this.observeMetrics(['layout-shift'], (entries) => {
      let clsValue = 0;
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      console.log('[Performance] CLS:', clsValue);
      this.reportMetric('CLS', clsValue);
    });

    this.observeMetrics(['paint'], (entries) => {
      entries.forEach((entry: any) => {
        console.log('[Performance] Paint:', entry.name, entry.startTime);
      });
    });
  }

  private observeMetrics(entryTypes: string[], callback: (entries: PerformanceEntryList) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ entryTypes });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[Performance] Could not observe metrics:', entryTypes, e);
    }
  }

  private reportMetric(name: string, value: number) {
    // In production, you would send this to your analytics service
    // For now, we'll just log it
    if (process.env.NODE_ENV === 'production') {
      // Send to analytics service
      // analyticsService.track('performance_metric', { name, value });
    }
  }

  measureRenderTime(componentName: string, renderFn: () => void) {
    if (typeof performance === 'undefined') {
      renderFn();
      return;
    }

    const start = performance.now();
    renderFn();
    const end = performance.now();

    console.log(`[Performance] ${componentName} render time:`, end - start);
    this.reportMetric(`${componentName}_render`, end - start);
  }

  trackMemoryUsage() {
    if (typeof window !== 'undefined' && 'memory' in (window as any).performance) {
      const memory = (window as any).performance.memory;
      console.log('[Performance] Memory usage:', {
        used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
      });
    }
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  // Optimize images by lazy loading
  setupLazyLoading() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1,
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // Implement requestIdleCallback fallback
  runWhenIdle(callback: () => void, timeout: number = 2000) {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(
        () => callback(),
        { timeout }
      );
    } else {
      setTimeout(callback, timeout);
    }
  }
}

export const webPerformance = WebPerformanceOptimizer.getInstance();