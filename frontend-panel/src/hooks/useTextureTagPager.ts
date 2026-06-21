import { useCallback, useEffect, useRef, useState } from "react";
import { TEXTURE_TAG_PAGE_SIZE } from "@/services/yggdrasilService";
import type { MinecraftTextureTagInfo } from "@/types/api";

type TextureTagPage = {
	items: MinecraftTextureTagInfo[];
	next_cursor?: TextureTagCursor | null;
	total: number;
};

type TextureTagCursor = {
	id: number;
	name: string;
	sort_order: number;
};

type TextureTagPageLoader = (params: {
	after_id?: number;
	after_name?: string;
	after_sort_order?: number;
	keyword?: string;
	limit: number;
}) => Promise<TextureTagPage>;

export function useTextureTagPager({
	loadPage,
	onError,
	retainedTagIds,
}: {
	loadPage: TextureTagPageLoader;
	onError: (error: unknown) => void;
	retainedTagIds: number[];
}) {
	const [tags, setTags] = useState<MinecraftTextureTagInfo[]>([]);
	const [nextCursor, setNextCursor] = useState<TextureTagCursor | null>(null);
	const [keyword, setKeyword] = useState("");
	const [loading, setLoading] = useState(false);
	const loadPageRef = useRef(loadPage);
	const onErrorRef = useRef(onError);
	const retainedTagIdsRef = useRef(retainedTagIds);
	const ensuredKeywordRef = useRef<string | null>(null);
	const hasMore = nextCursor !== null;

	useEffect(() => {
		loadPageRef.current = loadPage;
	}, [loadPage]);

	useEffect(() => {
		onErrorRef.current = onError;
	}, [onError]);

	useEffect(() => {
		retainedTagIdsRef.current = retainedTagIds;
	}, [retainedTagIds]);

	const load = useCallback(
		async (
			params: {
				append?: boolean;
				cursor?: TextureTagCursor | null;
				keyword?: string;
			} = {},
		) => {
			const nextKeyword = params.keyword ?? keyword;
			const cursor = params.cursor ?? null;
			if (!params.append && cursor === null) {
				ensuredKeywordRef.current = nextKeyword;
			}
			setLoading(true);
			try {
				const page = await loadPageRef.current({
					limit: TEXTURE_TAG_PAGE_SIZE,
					keyword: nextKeyword || undefined,
					after_sort_order: cursor?.sort_order,
					after_name: cursor?.name,
					after_id: cursor?.id,
				});
				setTags((current) => {
					if (params.append) {
						return mergeTextureTags(current, page.items);
					}
					const retainedTagIdSet = new Set(retainedTagIdsRef.current);
					const retained = current.filter((tag) =>
						retainedTagIdSet.has(tag.id),
					);
					return mergeTextureTags(retained, page.items);
				});
				setNextCursor(page.next_cursor ?? null);
			} catch (error) {
				onErrorRef.current(error);
			} finally {
				setLoading(false);
			}
		},
		[keyword],
	);

	const ensureLoaded = useCallback(() => {
		if (tags.length > 0 || loading || ensuredKeywordRef.current === keyword) {
			return;
		}
		void load({ keyword });
	}, [keyword, load, loading, tags.length]);

	const search = useCallback(
		(nextKeyword: string) => {
			if (nextKeyword === keyword) return;
			setKeyword(nextKeyword);
			setNextCursor(null);
			void load({ keyword: nextKeyword });
		},
		[keyword, load],
	);

	const loadMore = useCallback(() => {
		if (loading || !hasMore) return;
		void load({ keyword, cursor: nextCursor, append: true });
	}, [hasMore, keyword, load, loading, nextCursor]);

	const addTags = useCallback((nextTags: MinecraftTextureTagInfo[]) => {
		setTags((current) => mergeTextureTags(current, nextTags));
	}, []);

	const resetEnsureLoaded = useCallback(() => {
		ensuredKeywordRef.current = null;
	}, []);

	return {
		addTags,
		ensureLoaded,
		hasMore,
		keyword,
		load,
		loadMore,
		loading,
		resetEnsureLoaded,
		search,
		tags,
	};
}

function mergeTextureTags(
	current: MinecraftTextureTagInfo[],
	next: MinecraftTextureTagInfo[],
) {
	const tagsById = new Map<number, MinecraftTextureTagInfo>();
	for (const tag of current) {
		tagsById.set(tag.id, tag);
	}
	for (const tag of next) {
		tagsById.set(tag.id, tag);
	}
	return Array.from(tagsById.values());
}
