import { useReducer } from "react";
import type {
	MinecraftTextureMetadata,
	MinecraftTextureModel,
	MinecraftTextureType,
	YggdrasilProfile,
} from "@/types/api";

export type PreviewMotion = "idle" | "walk";

export type ProfilesPageState = {
	accessToken: string;
	file: File | null;
	loading: boolean;
	model: MinecraftTextureModel;
	previewMotion: PreviewMotion;
	profileName: string;
	profiles: YggdrasilProfile[];
	query: string;
	selectedUuid: string;
	textures: MinecraftTextureMetadata[];
	texturesLoading: boolean;
	textureType: MinecraftTextureType;
};

export type ProfilesPageAction =
	| { type: "accessToken"; value: string }
	| { type: "file"; value: File | null }
	| { type: "loading"; value: boolean }
	| { type: "model"; value: MinecraftTextureModel }
	| { type: "previewMotion"; value: PreviewMotion }
	| { type: "profileName"; value: string }
	| { type: "profiles"; value: YggdrasilProfile[] }
	| { type: "query"; value: string }
	| { type: "selectedUuid"; value: string }
	| { type: "textures"; value: MinecraftTextureMetadata[] }
	| { type: "texturesLoading"; value: boolean }
	| { type: "textureType"; value: MinecraftTextureType };

const initialState: ProfilesPageState = {
	accessToken: "",
	file: null,
	loading: false,
	model: "default",
	previewMotion: "idle",
	profileName: "",
	profiles: [],
	query: "",
	selectedUuid: "",
	textures: [],
	texturesLoading: false,
	textureType: "skin",
};

function reducer(
	state: ProfilesPageState,
	action: ProfilesPageAction,
): ProfilesPageState {
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
				profiles: action.value,
				selectedUuid: state.selectedUuid || action.value[0]?.id || "",
			};
	}
}

export function useProfilesPageState() {
	return useReducer(reducer, initialState);
}
