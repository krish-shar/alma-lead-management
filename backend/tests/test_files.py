from app.core.files import ResumeError, sanitize_filename, validate_resume

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
    assert validate_resume("cv.pdf", "application/pdf", MAX + 1, MAX).reason == ResumeError.TOO_LARGE


def test_validate_bad_extension():
    assert validate_resume("cv.exe", "application/pdf", 10, MAX).reason == ResumeError.BAD_EXTENSION


def test_validate_bad_content_type():
    assert (
        validate_resume("cv.pdf", "application/x-evil", 10, MAX).reason == ResumeError.BAD_TYPE
    )
