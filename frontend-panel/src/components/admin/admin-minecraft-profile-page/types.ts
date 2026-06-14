import type {
	MinecraftTextureMetadata,
	MinecraftTextureModel,
} from "@/types/api";

export type AdminMinecraftProfileInfo = {
	id: number;
	user_id: number;
	uuid: string;
	name: string;
	texture_model: MinecraftTextureModel;
	uploadable_textures: string;
	created_at: string;
	updated_at: string;
};

export type { MinecraftTextureMetadata };
