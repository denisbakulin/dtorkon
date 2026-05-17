from enum import Enum


class PostStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class AttachmentKind(str, Enum):
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    FILE = "file"


class AssetStatus(str, Enum):
    PENDING = "pending"
    READY = "ready"
    ORPHANED = "orphaned"


class SiteProfileLinkKind(str, Enum):
    EMAIL = "email"
    PHONE = "phone"
    TELEGRAM = "telegram"
    VK = "vk"
    LINK = "link"


class TranscriptStatus(str, Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class ErrorEventSource(str, Enum):
    BACKEND = "backend"
    FRONTEND = "frontend"


class ErrorEventLevel(str, Enum):
    WARNING = "warning"
    ERROR = "error"
