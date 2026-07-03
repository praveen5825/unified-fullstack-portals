from django.apps import AppConfig


class DuplicateCheckConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'duplicate_check'

    def ready(self):
        import duplicate_check.signals  # noqa