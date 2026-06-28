from app.core.files import ResumeError, sanitize_filename, sniff_resume, validate_resume

MAX = 4 * 1024 * 1024


def test_sanitize_strips_path_components():
    assert sanitize_filename("../../etc/passwd") == "passwd"
    assert sanitize_filename("C:\\Users\\me\\cv.pdf") == "cv.pdf"


def test_sanitize_replaces_unsafe_chars_and_quotes():
    assert sanitize_filename('my résumé "final".pdf') == "my_r_sum___final_.pdf"


def test_sanitize_handles_hidden_and_empty():
    assert sanitize_filename("...hidden") == "hidden"
    assert sanitize_filename("") == "resume"


def test_validate_ok():
    assert validate_resume("cv.pdf", "application/pdf", 1000, MAX) is None


def test_validate_empty():
    assert validate_resume("cv.pdf", "application/pdf", 0, MAX).reason == ResumeError.EMPTY


def test_validate_too_large():
    assert (
        validate_resume("cv.pdf", "application/pdf", MAX + 1, MAX).reason == ResumeError.TOO_LARGE
    )


def test_validate_bad_extension():
    assert validate_resume("cv.exe", "application/pdf", 10, MAX).reason == ResumeError.BAD_EXTENSION


def test_validate_bad_content_type():
    assert validate_resume("cv.pdf", "application/x-evil", 10, MAX).reason == ResumeError.BAD_TYPE


def test_sniff_accepts_real_signatures():
    assert sniff_resume(b"%PDF-1.7\n...") is None
    assert sniff_resume(b"PK\x03\x04rest-of-docx") is None  # DOCX is a zip
    assert sniff_resume(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1rest") is None  # legacy .doc OLE2


def test_sniff_rejects_spoofed_file():
    assert sniff_resume(b"<html>not a real document").reason == ResumeError.BAD_CONTENT
