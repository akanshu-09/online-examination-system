import base64
import hashlib
import hmac
import secrets


HASH_ALGORITHM = "pbkdf2_sha256"
HASH_ITERATIONS = 260_000
CODE_ITERATIONS = 100_000


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        HASH_ITERATIONS,
    )
    return f"{HASH_ALGORITHM}${HASH_ITERATIONS}${_encode(salt)}${_encode(digest)}"


def verify_password(password: str, stored_password: str) -> bool:
    try:
        algorithm, iterations, salt_text, digest_text = stored_password.split("$")
        if algorithm != HASH_ALGORITHM:
            return False

        expected_digest = _decode(digest_text)
        actual_digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            _decode(salt_text),
            int(iterations),
        )
        return hmac.compare_digest(actual_digest, expected_digest)
    except (ValueError, TypeError):
        return False


def hash_code(code: str) -> tuple[str, str]:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        code.encode("utf-8"),
        salt,
        CODE_ITERATIONS,
    )
    return _encode(digest), _encode(salt)


def verify_code(code: str, code_hash: str, code_salt: str) -> bool:
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        code.encode("utf-8"),
        _decode(code_salt),
        CODE_ITERATIONS,
    )
    return hmac.compare_digest(_encode(digest), code_hash)