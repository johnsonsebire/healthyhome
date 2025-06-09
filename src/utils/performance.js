import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';

// Memoization helpers
export const memoizedComponent = (Component, areEqual) => {
  return memo(Component, areEqual);
};

// Custom hook for memoized callbacks with dependencies
export const useOptimizedCallback = (callback, dependencies) => {
  return useCallback(callback, dependencies);
};

// Custom hook for memoized values
export const useOptimizedMemo = (factory, dependencies) => {
  return useMemo(factory, dependencies);
};

// Lazy loading wrapper with fallback
export const createLazyComponent = (importFunc, fallback) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={fallback || <LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Default loading fallback
const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <ActivityIndicator size="large" color="#6366f1" />
  </View>
);

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  const startTime = useMemo(() => Date.now(), []);
  
  React.useEffect(() => {
    const mountTime = Date.now() - startTime;
    if (__DEV__) {
      console.log(`🚀 Component ${componentName} mounted in ${mountTime}ms`);
    }
    
    return () => {
      if (__DEV__) {
        console.log(`🏁 Component ${componentName} unmounted`);
      }
    };
  }, [componentName, startTime]);
};

// Optimized FlatList props for better performance
export const getOptimizedFlatListProps = (itemHeight) => ({
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 10,
  windowSize: 5,
  getItemLayout: itemHeight ? (data, index) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  }) : undefined,
});

// Image optimization props
export const getOptimizedImageProps = () => ({
  resizeMode: 'cover',
  fadeDuration: 200,
  progressiveRenderingEnabled: true,
});

// Debounce hook for search and input optimization
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook for scroll and gesture optimization
export const useThrottle = (value, delay) => {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastRun = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun.current >= delay) {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }
    }, delay - (Date.now() - lastRun.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
};

// Memory usage optimization for large datasets
export const usePagination = (data, pageSize = 20) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(0, endIndex);
  }, [data, currentPage, pageSize]);
  
  const loadMore = useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);
  
  const hasMore = useMemo(() => {
    return currentPage * pageSize < data.length;
  }, [currentPage, pageSize, data.length]);
  
  return {
    data: paginatedData,
    loadMore,
    hasMore,
    currentPage,
    totalPages: Math.ceil(data.length / pageSize)
  };
};

// Component cache for expensive computations
const componentCache = new Map();

export const useCachedComponent = (key, factory, dependencies = []) => {
  return useMemo(() => {
    const cacheKey = `${key}-${JSON.stringify(dependencies)}`;
    
    if (componentCache.has(cacheKey)) {
      return componentCache.get(cacheKey);
    }
    
    const component = factory();
    componentCache.set(cacheKey, component);
    
    // Clean up old cache entries (keep last 50)
    if (componentCache.size > 50) {
      const firstKey = componentCache.keys().next().value;
      componentCache.delete(firstKey);
    }
    
    return component;
  }, dependencies);
};

// Network-aware data loading
export const useNetworkAwareLoading = () => {
  const [isOnline, setIsOnline] = React.useState(true);
  const [loadingStrategy, setLoadingStrategy] = React.useState('full');
  
  React.useEffect(() => {
    const updateStrategy = (online) => {
      setIsOnline(online);
      setLoadingStrategy(online ? 'full' : 'cache-only');
    };
    
    // This would connect to your network service
    // networkService.addListener(updateStrategy);
    
    return () => {
      // networkService.removeListener(updateStrategy);
    };
  }, []);
  
  return { isOnline, loadingStrategy };
};

// Optimized style creation with caching
const styleCache = new Map();

export const createOptimizedStyles = (styleFactory, dependencies = []) => {
  const cacheKey = JSON.stringify(dependencies);
  
  if (styleCache.has(cacheKey)) {
    return styleCache.get(cacheKey);
  }
  
  const styles = styleFactory();
  styleCache.set(cacheKey, styles);
  
  // Clean up old styles
  if (styleCache.size > 100) {
    const firstKey = styleCache.keys().next().value;
    styleCache.delete(firstKey);
  }
  
  return styles;
};

// Bundle size optimization - dynamic imports
export const dynamicImport = (modulePath) => {
  return lazy(() => import(modulePath));
};

// Export all optimization utilities
export default {
  memoizedComponent,
  useOptimizedCallback,
  useOptimizedMemo,
  createLazyComponent,
  usePerformanceMonitor,
  getOptimizedFlatListProps,
  getOptimizedImageProps,
  useDebounce,
  useThrottle,
  usePagination,
  useCachedComponent,
  useNetworkAwareLoading,
  createOptimizedStyles,
  dynamicImport,
  LoadingFallback
};
