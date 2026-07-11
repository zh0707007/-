from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Bazi API"
    app_version: str = "0.1.0"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    cors_origin_regex: str | None = None
    database_url: str = "sqlite:///./data/bazi.db"
    llm_base_url: str = "https://api.example.com/v1"
    llm_api_key: str = "replace-with-real-key"
    llm_model: str = "replace-with-model-name"
    llm_timeout_seconds: int = 60
    report_expires_hours: int = 24

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8-sig")


settings = Settings()
