"""
Services package initialization. Provides shared singletons for FastAPI and the Voice Agent.
"""
from functools import lru_cache
from app.services.activity_service import ActivityService
from app.services.permission_service import PermissionService
from app.services.system_service import SystemService
from app.services.verification_service import VerificationService

_activity_service = ActivityService()
_permission_service = PermissionService()
_system_service = SystemService()
_verification_service = VerificationService()


def get_activity_service() -> ActivityService:
    return _activity_service


def get_permission_service() -> PermissionService:
    return _permission_service


def get_system_service() -> SystemService:
    return _system_service


def get_verification_service() -> VerificationService:
    return _verification_service
