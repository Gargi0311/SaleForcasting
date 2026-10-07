"""Holds the active dataset and trained model, and persists them to disk."""
from __future__ import annotations

import io
import json
import logging
import shutil
import threading
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from . import config, ml
from .data import DatasetError, clean, fingerprint, load_dataset, read_table

log = logging.getLogger(__name__)
ACTIVE_META = config.UPLOAD_DIR / "active.json"


class AppState:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.df: pd.DataFrame | None = None
        self.monthly: pd.DataFrame | None = None
        self.bundle: dict[str, Any] | None = None
        self.source: dict[str, Any] = {}
        self._forecast_cache: dict[int, pd.DataFrame] = {}

    # ------------------------------------------------------------------ lifecycle
    def startup(self) -> None:
        path, name, kind = self._active_dataset_path()
        try:
            df = load_dataset(path)
        except (DatasetError, FileNotFoundError) as exc:
            log.warning("Active dataset unusable (%s); falling back to sample data", exc)
            path, name, kind = self._sample_path(), "superstore_dataset.csv", "sample"
            df = load_dataset(path)
        self._activate(df, {"filename": name, "kind": kind})

    def _sample_path(self) -> Path:
        if not config.SAMPLE_DATASET.exists():
            from scripts.generate_sample_data import generate  # type: ignore

            config.SAMPLE_DATASET.parent.mkdir(parents=True, exist_ok=True)
            generate().to_csv(config.SAMPLE_DATASET, index=False, date_format="%Y-%m-%d")
        return config.SAMPLE_DATASET

    def _active_dataset_path(self) -> tuple[Path, str, str]:
        if ACTIVE_META.exists():
            meta = json.loads(ACTIVE_META.read_text())
            path = config.UPLOAD_DIR / meta["stored_as"]
            if path.exists():
                return path, meta["filename"], "upload"
        return self._sample_path(), "superstore_dataset.csv", "sample"

    def _activate(self, df: pd.DataFrame, source: dict[str, Any]) -> None:
        fp = fingerprint(df)
        bundle = None
        if config.MODEL_PATH.exists():
            try:
                cached = joblib.load(config.MODEL_PATH)
                if cached.get("fingerprint") == fp and cached.get("features") == ml.FEATURES:
                    bundle = cached
            except Exception as exc:  # corrupted / incompatible pickle
                log.warning("Ignoring cached model: %s", exc)
        if bundle is None:
            log.info("Training model on %s rows...", len(df))
            bundle = ml.train(df)
            bundle["fingerprint"] = fp
            config.MODEL_DIR.mkdir(parents=True, exist_ok=True)
            joblib.dump(bundle, config.MODEL_PATH)

        with self._lock:
            self.df = df
            self.monthly = ml.build_monthly(df)
            self.bundle = bundle
            self.source = {**source, "fingerprint": fp}
            self._forecast_cache = {}

    # ------------------------------------------------------------------ actions
    def upload(self, content: bytes, filename: str) -> None:
        df = clean(read_table(io.BytesIO(content), filename))
        config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        stored_as = "active" + Path(filename).suffix.lower()
        for old in config.UPLOAD_DIR.glob("active.*"):
            if old.name != "active.json":
                old.unlink()
        (config.UPLOAD_DIR / stored_as).write_bytes(content)
        ACTIVE_META.write_text(json.dumps({"filename": filename, "stored_as": stored_as}))
        self._activate(df, {"filename": filename, "kind": "upload"})

    def reset_to_sample(self) -> None:
        if config.UPLOAD_DIR.exists():
            shutil.rmtree(config.UPLOAD_DIR)
        self._activate(load_dataset(self._sample_path()), {"filename": "superstore_dataset.csv", "kind": "sample"})

    def retrain(self) -> None:
        assert self.df is not None
        if config.MODEL_PATH.exists():
            config.MODEL_PATH.unlink()
        self._activate(self.df, {k: v for k, v in self.source.items() if k != "fingerprint"})

    def forecast(self, horizon: int) -> pd.DataFrame:
        with self._lock:
            cached = self._forecast_cache.get(horizon)
            if cached is None:
                cached = ml.forecast(self.bundle, self.monthly, horizon)
                self._forecast_cache[horizon] = cached
            return cached


state = AppState()
