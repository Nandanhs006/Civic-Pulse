"""Tests for the AI spam / test-entry filter on submissions."""


def _submit(client, content):
    return client.post("/api/v1/suggestions/", data={"content": content, "language_code": "en"})


def test_spam_is_dropped(client):
    for junk in ["test", "testing 123", "asdfghjkl", "aaaaaa", "hello", "just a test"]:
        d = _submit(client, junk).json()
        assert d.get("is_spam") is True, f"{junk!r} should be spam"
        assert "id" not in d  # never persisted


def test_real_issue_passes(client):
    d = _submit(client, "Broken water pipeline flooding the street near the school").json()
    assert not d.get("is_spam")
    assert d["id"] and d["category"]
