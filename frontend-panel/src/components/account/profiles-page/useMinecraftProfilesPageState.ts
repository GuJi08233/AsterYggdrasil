import { useReducer } from "react";
import type {
	MinecraftTextureMetadata,
	MinecraftTextureModel,
	MinecraftTextureType,
	YggdrasilProfile,
} from "@/types/api";

export type PreviewMotion = "idle" | "walk";

export type MinecraftProfilesPageState = {
	accessToken: string;
	file: File | null;
	loading: boolean;
	model: MinecraftTextureModel;
	previewMotion: PreviewMotion;
	profileName: string;
	profileTotal: number;
	profiles: YggdrasilProfile[];
	query: string;
	selectedUuid: string;
	textures: MinecraftTextureMetadata[];
	texturesLoading: boolean;
	textureType: MinecraftTextureType;
};

export type MinecraftProfilesPageAction =
	| { type: "accessToken"; value: string }
	| { type: "file"; value: File | null }
	| { type: "loading"; value: boolean }
	| { type: "model"; value: MinecraftTextureModel }
	| { type: "previewMotion"; value: PreviewMotion }
	| { type: "profileName"; value: string }
	| { type: "profilePage"; value: { items: YggdrasilProfile[]; total: number } }
	| { type: "profiles"; value: YggdrasilProfile[] }
	| { type: "query"; value: string }
	| { type: "selectedUuid"; value: string }
	| { type: "textures"; value: MinecraftTextureMetadata[] }
	| { type: "texturesLoading"; value: boolean }
	| { type: "textureType"; value: MinecraftTextureType };

const initialState: MinecraftProfilesPageState = {
	accessToken: "",
	file: null,
	loading: false,
	model: "default",
	previewMotion: "idle",
	profileName: "",
	profileTotal: 0,
	profiles: [],
	query: "",
	selectedUuid: "",
	textures: [],
	texturesLoading: false,
	textureType: "skin",
};

function reducer(
	state: MinecraftProfilesPageState,
	action: MinecraftProfilesPageAction,
): MinecraftProfilesPageState {
	switch (action.type) {
		case "accessToken":
		case "file":
		case "loading":
		case "model":
		case "previewMotion":
		case "profileName":
		case "query":
		case "selectedUuid":
		case "textures":
		case "texturesLoading":
		case "textureType":
			return { ...state, [action.type]: action.value };
		case "profiles":
			return {
				...state,
				profileTotal: action.value.length,
				profiles: action.value,
				selectedUuid: state.selectedUuid || action.value[0]?.id || "",
			};
		case "profilePage":
			return {
				...state,
				profileTotal: action.value.total,
				profiles: action.value.items,
				selectedUuid: state.selectedUuid || action.value.items[0]?.id || "",
			};
	}
}

export function useMinecraftProfilesPageState() {
	return useReducer(reducer, initialState);
}
