import { useCallback, useEffect, useRef, useState } from "react";
import { handleApiError } from "@/hooks/useApiError";

export function useApiList<T>(
	fetcher: () => Promise<{ items: T[]; total?: number }>,
	deps: unknown[] = [],
) {
	const [items, setItems] = useState<T[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const requestIdRef = useRef(0);

	const load = useCallback(async () => {
		const requestId = ++requestIdRef.current;
		try {
			setLoading(true);
			setError(null);
			const data = await fetcher();
			if (requestId !== requestIdRef.current) {
				return;
			}
			setItems(data.items);
			setTotal(data.total ?? data.items.length);
		} catch (nextError) {
			if (requestId === requestIdRef.current) {
				setError(
					nextError instanceof Error ? nextError.message : "Request failed",
				);
				handleApiError(nextError);
			}
		} finally {
			if (requestId === requestIdRef.current) {
				setLoading(false);
			}
		}
		// biome-ignore lint/correctness/useExhaustiveDependencies: deps is a dynamic parameter by design.
	}, deps);

	useEffect(() => {
		void load();
	}, [load]);

	return { error, items, loading, reload: load, setItems, setTotal, total };
}
