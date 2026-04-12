import uuid
from io import BytesIO

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image, UnidentifiedImageError

ALLOWED_MIME_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_DIMENSION = 1920

try:
    import magic
except ImportError:
    magic = None


class ImageService:
    @classmethod
    def validate_and_process(cls, uploaded_file) -> ContentFile:
        try:
            uploaded_file.seek(0)
        except (AttributeError, OSError):
            pass

        if uploaded_file.size > MAX_FILE_SIZE_BYTES:
            raise ValidationError("Plik za duży. Maksymalnie 10 MB.")

        ct = getattr(uploaded_file, "content_type", "") or ""
        if ct and ct not in ALLOWED_MIME_TYPES:
            raise ValidationError(f"Niedozwolony typ MIME: {ct}. Dozwolone: JPEG, PNG, WebP.")

        file_bytes = uploaded_file.read()
        uploaded_file.seek(0)
        if not file_bytes:
            raise ValidationError("Pusty plik.")

        if magic is not None:
            try:
                detected = magic.from_buffer(file_bytes[:2048], mime=True)
                if detected not in ALLOWED_MIME_TYPES:
                    raise ValidationError(f"Niedozwolony typ pliku: {detected}.")
            except Exception as e:
                # Na Windowsie magic często wyrzuca błędy przez brak DLL, ignorujemy to 
                # i polegamy na PIL (Image.open), które i tak weryfikuje obraz poniżej.
                print(f"Magic library error (ignored): {e}")

        try:
            img = Image.open(BytesIO(file_bytes))
            img.verify()
            img = Image.open(BytesIO(file_bytes))
            img = img.convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError) as e:
            print(f"Image processing error: {e}")
            raise ValidationError("Nieprawidłowy obraz lub uszkodzony plik.") from e

        if max(img.size) > MAX_IMAGE_DIMENSION:
            img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)

        out = BytesIO()
        img.save(out, format="JPEG", quality=85, optimize=True)
        out.seek(0)
        name = f"{uuid.uuid4().hex}.jpg"
        return ContentFile(out.read(), name=name)

    @classmethod
    def max_images(cls) -> int:
        return getattr(settings, "MAX_LISTING_IMAGES", 20)
