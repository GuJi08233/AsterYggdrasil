import { useReducer } from "react";
import type {
	MinecraftTextureModel,
	MinecraftTextureType,
	MinecraftWardrobeTextureMetadata,
	YggdrasilProfile,
} from "@/types/api";

export type TextureWardrobePageState = {
	activeTexture: MinecraftWardrobeTextureMetadata | null;
	deleteDialogOpen: boolean;
	deleteTexture: MinecraftWardrobeTextureMetadata | null;
	dialogOpen: boolean;
	file: File | null;
	loading: boolean;
	model: MinecraftTextureModel;
	profileQuery: string;
	profiles: YggdrasilProfile[];
	query: string;
	selectedProfileId: string;
	submitting: boolean;
	textures: MinecraftWardrobeTextureMetadata[];
	textureType: MinecraftTextureType;
};

export type TextureWardrobePageAction =
	| { type: "activeTexture"; value: MinecraftWardrobeTextureMetadata | null }
	| { type: "deleteDialogOpen"; value: boolean }
	| { type: "deleteTexture"; value: MinecraftWardrobeTextureMetadata | null }
	| { type: "dialogOpen"; value: boolean }
	| { type: "file"; value: File | null }
	| {
			type: "loadSuccess";
			profiles: YggdrasilProfile[];
			textures: MinecraftWardrobeTextureMetadata[];
	  }
	| { type: "loading"; value: boolean }
	| { type: "model"; value: MinecraftTextureModel }
	| { type: "profileQuery"; value: string }
	| { type: "query"; value: string }
	| { type: "selectedProfileId"; value: string | ((current: string) => string) }
	| { type: "submitting"; value: boolean }
	| { type: "textureType"; value: MinecraftTextureType }
	| { type: "prependTexture"; value: MinecraftWardrobeTextureMetadata }
	| { type: "removeTexture"; id: number };

const initialState: TextureWardrobePageState = {
	activeTexture: null,
	deleteDialogOpen: false,
	deleteTexture: null,
	dialogOpen: false,
	file: null,
	loading: true,
	model: "default",
	profileQuery: "",
	profiles: [],
	query: "",
	selectedProfileId: "",
	submitting: false,
	textures: [],
	textureType: "skin",
};

function reducer(
	state: TextureWardrobePageState,
	action: TextureWardrobePageAction,
): TextureWardrobePageState {
	switch (action.type) {
		case "activeTexture":
		case "deleteDialogOpen":
		case "deleteTexture":
		case "dialogOpen":
		case "file":
		case "loading":
		case "model":
		case "profileQuery":
		case "query":
		case "submitting":
		case "textureType":
			return { ...state, [action.type]: action.value };
		case "loadSuccess":
			return {
				...state,
				loading: false,
				profiles: action.profiles,
				selectedProfileId:
					state.selectedProfileId || action.profiles[0]?.id || "",
				textures: action.textures,
			};
		case "prependTexture":
			return { ...state, textures: [action.value, ...state.textures] };
		case "removeTexture":
			return {
				...state,
				textures: state.textures.filter((texture) => texture.id !== action.id),
			};
		case "selectedProfileId":
			return {
				...state,
				selectedProfileId:
					typeof action.value === "function"
						? action.value(state.selectedProfileId)
						: action.value,
			};
	}
}

export function useTextureWardrobePageState() {
	return useReducer(reducer, initialState);
}
