use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use std::fmt;
#[cfg(all(debug_assertions, feature = "openapi"))]
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(32))")]
#[serde(rename_all = "snake_case")]
pub enum SystemConfigValueType {
    #[sea_orm(string_value = "string")]
    String,
    #[sea_orm(string_value = "multiline")]
    Multiline,
    #[sea_orm(string_value = "string_array")]
    StringArray,
    #[sea_orm(string_value = "string_enum")]
    StringEnum,
    #[sea_orm(string_value = "string_enum_set")]
    StringEnumSet,
    #[sea_orm(string_value = "number")]
    Number,
    #[sea_orm(string_value = "boolean")]
    Boolean,
}

impl SystemConfigValueType {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::String => "string",
            Self::Multiline => "multiline",
            Self::StringArray => "string_array",
            Self::StringEnum => "string_enum",
            Self::StringEnumSet => "string_enum_set",
            Self::Number => "number",
            Self::Boolean => "boolean",
        }
    }

    pub fn from_str_name(value: &str) -> Option<Self> {
        match value {
            "string" => Some(Self::String),
            "multiline" => Some(Self::Multiline),
            "string_array" => Some(Self::StringArray),
            "string_enum" => Some(Self::StringEnum),
            "string_enum_set" => Some(Self::StringEnumSet),
            "number" => Some(Self::Number),
            "boolean" => Some(Self::Boolean),
            _ => None,
        }
    }

    pub const fn is_multiline(self) -> bool {
        matches!(self, Self::Multiline)
    }

    pub const fn is_string_array(self) -> bool {
        matches!(self, Self::StringArray)
    }

    pub const fn is_string_enum_set(self) -> bool {
        matches!(self, Self::StringEnumSet)
    }

    pub const fn is_string_list(self) -> bool {
        matches!(self, Self::StringArray | Self::StringEnumSet)
    }
}

impl fmt::Display for SystemConfigValueType {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl From<aster_forge_config::ConfigValueType> for SystemConfigValueType {
    fn from(value: aster_forge_config::ConfigValueType) -> Self {
        match value {
            aster_forge_config::ConfigValueType::String => Self::String,
            aster_forge_config::ConfigValueType::Multiline => Self::Multiline,
            aster_forge_config::ConfigValueType::StringArray => Self::StringArray,
            aster_forge_config::ConfigValueType::StringEnum => Self::StringEnum,
            aster_forge_config::ConfigValueType::StringEnumSet => Self::StringEnumSet,
            aster_forge_config::ConfigValueType::Number => Self::Number,
            aster_forge_config::ConfigValueType::Boolean => Self::Boolean,
        }
    }
}

impl From<SystemConfigValueType> for aster_forge_config::ConfigValueType {
    fn from(value: SystemConfigValueType) -> Self {
        match value {
            SystemConfigValueType::String => Self::String,
            SystemConfigValueType::Multiline => Self::Multiline,
            SystemConfigValueType::StringArray => Self::StringArray,
            SystemConfigValueType::StringEnum => Self::StringEnum,
            SystemConfigValueType::StringEnumSet => Self::StringEnumSet,
            SystemConfigValueType::Number => Self::Number,
            SystemConfigValueType::Boolean => Self::Boolean,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(16))")]
#[serde(rename_all = "snake_case")]
#[derive(Default)]
pub enum SystemConfigSource {
    #[sea_orm(string_value = "system")]
    #[default]
    System,
    #[sea_orm(string_value = "custom")]
    Custom,
}

impl SystemConfigSource {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::System => "system",
            Self::Custom => "custom",
        }
    }
}

impl fmt::Display for SystemConfigSource {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl From<aster_forge_config::ConfigSource> for SystemConfigSource {
    fn from(value: aster_forge_config::ConfigSource) -> Self {
        match value {
            aster_forge_config::ConfigSource::System => Self::System,
            aster_forge_config::ConfigSource::Custom => Self::Custom,
        }
    }
}

impl From<SystemConfigSource> for aster_forge_config::ConfigSource {
    fn from(value: SystemConfigSource) -> Self {
        match value {
            SystemConfigSource::System => Self::System,
            SystemConfigSource::Custom => Self::Custom,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[cfg_attr(all(debug_assertions, feature = "openapi"), derive(ToSchema))]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(16))")]
#[serde(rename_all = "snake_case")]
#[derive(Default)]
pub enum SystemConfigVisibility {
    #[sea_orm(string_value = "private")]
    #[default]
    Private,
    #[sea_orm(string_value = "public")]
    Public,
    #[sea_orm(string_value = "authenticated")]
    Authenticated,
}

impl SystemConfigVisibility {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Private => "private",
            Self::Public => "public",
            Self::Authenticated => "authenticated",
        }
    }
}

impl fmt::Display for SystemConfigVisibility {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl From<aster_forge_config::ConfigVisibility> for SystemConfigVisibility {
    fn from(value: aster_forge_config::ConfigVisibility) -> Self {
        match value {
            aster_forge_config::ConfigVisibility::Private => Self::Private,
            aster_forge_config::ConfigVisibility::Public => Self::Public,
            aster_forge_config::ConfigVisibility::Authenticated => Self::Authenticated,
        }
    }
}

impl From<SystemConfigVisibility> for aster_forge_config::ConfigVisibility {
    fn from(value: SystemConfigVisibility) -> Self {
        match value {
            SystemConfigVisibility::Private => Self::Private,
            SystemConfigVisibility::Public => Self::Public,
            SystemConfigVisibility::Authenticated => Self::Authenticated,
        }
    }
}
