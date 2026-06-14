import { type ComponentType, type LazyExoticComponent, lazy } from "react";

// React.lazy constrains modules to ComponentType<any>; keeping that boundary here
// preserves prop inference for callers while still exposing preload().
// biome-ignore lint/suspicious/noExplicitAny: React.lazy uses ComponentType<any> internally.
type LazyCompatibleComponent = ComponentType<any>;

type LazyModule<T extends LazyCompatibleComponent> = {
	default: T;
};

export type PreloadableLazyComponent<T extends LazyCompatibleComponent> =
	LazyExoticComponent<T> & {
		preload: () => Promise<LazyModule<T>>;
	};

export function lazyWithPreload<T extends LazyCompatibleComponent>(
	load: () => Promise<LazyModule<T>>,
): PreloadableLazyComponent<T> {
	let cachedPromise: Promise<LazyModule<T>> | null = null;

	const preload = () => {
		cachedPromise ??= load();
		return cachedPromise;
	};

	const LazyComponent = lazy(preload) as PreloadableLazyComponent<T>;
	LazyComponent.preload = preload;
	return LazyComponent;
}
