"""Gemini key/model rotation — the thing that beats free-tier rate limits."""

import pytest

from app.services.gemini_client import GeminiPool, is_quota_error


class _Settings:
    """Stand-in for app settings so tests don't need real keys."""

    def __init__(self, keys, models="m1,m2", mock=False):
        self.GEMINI_API_KEYS = keys
        self.GEMINI_API_KEY = None
        self.GEMINI_MODELS = models
        self.MOCK_AI_PIPELINE = mock


@pytest.fixture
def pool(monkeypatch):
    def make(keys="k1,k2,k3", models="m1,m2", mock=False):
        p = GeminiPool()
        monkeypatch.setattr(
            "app.services.gemini_client.settings", _Settings(keys, models, mock)
        )
        return p

    return make


def test_quota_error_detection():
    assert is_quota_error(Exception("429 Too Many Requests"))
    assert is_quota_error(Exception("RESOURCE_EXHAUSTED: quota exceeded"))
    assert is_quota_error(Exception("rate limit reached"))
    assert not is_quota_error(Exception("invalid argument"))


def test_keys_merge_and_dedupe(pool, monkeypatch):
    p = pool(keys="k1, k2,k1")
    assert p.keys == ["k1", "k2"]  # de-duplicated, order preserved
    assert p.models == ["m1", "m2"]
    assert p.enabled is True


def test_disabled_when_mock_or_no_keys(pool):
    assert pool(keys="k1", mock=True).enabled is False
    assert pool(keys="").enabled is False


def test_rotates_to_next_key_on_quota_error(pool):
    p = pool(keys="k1,k2,k3")
    tried = []

    def fn(key, model):
        tried.append((key, model))
        if key in ("k1", "k2"):
            raise Exception("429 quota exceeded")
        return "ok"

    assert p._run(fn, what="t") == "ok"
    # It burned through the rate-limited keys and succeeded on the third.
    assert [k for k, _ in tried] == ["k1", "k2", "k3"]
    assert p.status()["key_rotations"] == 2


def test_falls_back_to_next_model_when_all_keys_exhausted(pool):
    p = pool(keys="k1,k2", models="m1,m2")
    tried = []

    def fn(key, model):
        tried.append((key, model))
        if model == "m1":
            raise Exception("429 quota")  # every key exhausted on m1
        return f"ok:{model}"

    assert p._run(fn, what="t") == "ok:m2"
    # All keys tried on m1, then it moved to m2.
    assert [m for _, m in tried] == ["m1", "m1", "m2"]


def test_round_robin_start_spreads_load(pool):
    p = pool(keys="k1,k2,k3")
    firsts = []

    def fn(key, model):
        firsts.append(key)
        return "ok"

    for _ in range(3):
        p._run(fn, what="t")
    # Each call starts on a different key rather than always hammering k1.
    assert firsts == ["k1", "k2", "k3"]


def test_raises_only_after_every_combo_fails(pool):
    p = pool(keys="k1,k2", models="m1,m2")
    calls = []

    def fn(key, model):
        calls.append((key, model))
        raise Exception("429 quota")

    with pytest.raises(Exception):
        p._run(fn, what="t")
    assert len(calls) == 4  # 2 keys x 2 models
    assert "quota" in (p.status()["last_error"] or "")


def test_no_keys_raises(pool):
    p = pool(keys="")
    with pytest.raises(RuntimeError):
        p._run(lambda k, m: "x", what="t")
